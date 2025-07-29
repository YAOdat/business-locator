// Enhanced competitor detection service with comprehensive pharmacy search
export class CompetitorDetectionService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  // Enhanced business configurations with more comprehensive search strategies
  private readonly businessConfigs: Record<string, {
    searchTerms: string[];
    placeTypes: string[];
    excludeTypes: string[];
    minDistance: number;
    maxDistance: number;
    fallbackSearchTerms: string[]; // Additional terms for fallback searches
    broadPlaceTypes: string[]; // Broader categories for fallback
    requiresMultiPass: boolean; // Whether to do multiple search passes
  }> = {
    pharmacy: {
      searchTerms: [
        'pharmacy', 'drugstore', 'cvs', 'walgreens', 'rite aid', 'صيدلية', 'دواء', 'صيدلة',
        'pharmacie', 'apotheke', 'farmacia', 'chemist', 'apothecary', 'medical store',
        'pharmacy store', 'drug shop', 'medicine store', 'medical pharmacy'
      ],
      placeTypes: ['pharmacy', 'drugstore'],
      excludeTypes: ['hospital', 'clinic', 'doctor', 'dental', 'veterinary_care'],
      minDistance: 0.3,
      maxDistance: 10,
      fallbackSearchTerms: [
        'medicine', 'medical', 'health store', 'prescription', 'pharmaceutical',
        'صحة', 'طب', 'علاج', 'دوائية', 'طبية'
      ],
      broadPlaceTypes: ['health', 'store', 'establishment'],
      requiresMultiPass: true
    },
    restaurant: {
      searchTerms: ['restaurant', 'dining', 'mcdonalds', 'burger king'],
      placeTypes: ['restaurant', 'food', 'meal_takeaway'],
      excludeTypes: ['grocery_or_supermarket', 'gas_station', 'bar'],
      minDistance: 0.1,
      maxDistance: 3,
      fallbackSearchTerms: ['food', 'eating', 'cuisine'],
      broadPlaceTypes: ['establishment'],
      requiresMultiPass: false
    },
    coffee_shop: {
      searchTerms: ['coffee shop', 'cafe', 'starbucks', 'dunkin'],
      placeTypes: ['cafe', 'bakery'],
      excludeTypes: ['restaurant', 'bar', 'night_club'],
      minDistance: 0.2,
      maxDistance: 2,
      fallbackSearchTerms: ['coffee', 'espresso', 'cappuccino'],
      broadPlaceTypes: ['establishment'],
      requiresMultiPass: false
    },
    gas_station: {
      searchTerms: ['gas station', 'shell', 'bp', 'exxon'],
      placeTypes: ['gas_station'],
      excludeTypes: ['car_repair', 'car_dealer'],
      minDistance: 1.0,
      maxDistance: 8,
      fallbackSearchTerms: ['fuel', 'petrol', 'gasoline'],
      broadPlaceTypes: ['establishment'],
      requiresMultiPass: false
    },
    grocery_store: {
      searchTerms: ['grocery store', 'supermarket', 'walmart', 'kroger'],
      placeTypes: ['grocery_or_supermarket', 'supermarket'],
      excludeTypes: ['restaurant', 'pharmacy', 'gas_station'],
      minDistance: 0.8,
      maxDistance: 10,
      fallbackSearchTerms: ['groceries', 'food store', 'market'],
      broadPlaceTypes: ['establishment'],
      requiresMultiPass: false
    }
  };

  async findCompetitorsNearLocation(
    location: { lat: number; lng: number },
    businessType: string,
    radiusKm: number = 3
  ): Promise<{
    competitors: Array<{
      place_id: string;
      name: string;
      distance: number;
      rating?: number;
      vicinity?: string;
      coordinates: { lat: number; lng: number };
      searchMethod?: string; // Track how this competitor was found
    }>;
    nearestDistance: number;
    totalCount: number;
    searchQuality: number;
    searchStats: {
      primaryResults: number;
      fallbackResults: number;
      totalSearches: number;
      searchMethods: string[];
    };
  }> {
    const cacheKey = `${location.lat.toFixed(4)}-${location.lng.toFixed(4)}-${businessType}-${radiusKm}`;
    
    // Check cache first
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    try {
      console.log(`🔍 Enhanced search for ${businessType} competitors near ${location.lat}, ${location.lng} within ${radiusKm}km`);
      const config = this.getBusinessConfig(businessType);
      const allResults = new Map<string, any>();
      const searchStats = {
        primaryResults: 0,
        fallbackResults: 0,
        totalSearches: 0,
        searchMethods: [] as string[]
      };

      // PHASE 1: Primary searches (existing logic)
      console.log('📍 Phase 1: Primary place type searches');
      for (const placeType of config.placeTypes) {
        console.log(`   Searching by place type: ${placeType}`);
        const results = await this.searchByPlaceType(location, placeType, radiusKm);
        console.log(`   Found ${results.length} results for ${placeType}`);
        
        results.forEach(r => {
          r.searchMethod = `place_type:${placeType}`;
        });
        
        this.addValidResults(results, allResults, config);
        searchStats.primaryResults += results.length;
        searchStats.totalSearches++;
        searchStats.searchMethods.push(`place_type:${placeType}`);
      }

      console.log('🔤 Phase 1: Primary text searches');
      for (const term of config.searchTerms) {
        console.log(`   Searching by text: "${term}"`);
        const results = await this.searchByText(location, term, radiusKm);
        console.log(`   Found ${results.length} results for "${term}"`);
        
        results.forEach(r => {
          r.searchMethod = `text:${term}`;
        });
        
        this.addValidResults(results, allResults, config);
        searchStats.primaryResults += results.length;
        searchStats.totalSearches++;
        searchStats.searchMethods.push(`text:${term}`);
      }

      const primaryCount = allResults.size;
      console.log(`📊 Phase 1 complete: ${primaryCount} unique results found`);

      // PHASE 2: Enhanced fallback searches (if enabled and needed)
      if (config.requiresMultiPass && (allResults.size < 3 || businessType === 'pharmacy')) {
        console.log('🔄 Phase 2: Enhanced fallback searches');
        
        // Broader radius search
        const extendedRadius = Math.min(radiusKm * 1.5, 15);
        console.log(`   Searching with extended radius: ${extendedRadius}km`);
        
        for (const placeType of config.broadPlaceTypes) {
          const results = await this.searchByPlaceType(location, placeType, extendedRadius);
          const filteredResults = this.filterPharmacyResults(results, config);
          console.log(`   Extended search by ${placeType}: ${results.length} -> ${filteredResults.length} filtered`);
          
          filteredResults.forEach(r => {
            r.searchMethod = `extended_${placeType}`;
          });
          
          this.addValidResults(filteredResults, allResults, config);
          searchStats.fallbackResults += filteredResults.length;
          searchStats.totalSearches++;
          searchStats.searchMethods.push(`extended_${placeType}`);
        }

        // Fallback text searches
        for (const term of config.fallbackSearchTerms) {
          console.log(`   Fallback text search: "${term}"`);
          const results = await this.searchByText(location, term, radiusKm);
          const filteredResults = this.filterPharmacyResults(results, config);
          console.log(`   Fallback "${term}": ${results.length} -> ${filteredResults.length} filtered`);
          
          filteredResults.forEach(r => {
            r.searchMethod = `fallback:${term}`;
          });
          
          this.addValidResults(filteredResults, allResults, config);
          searchStats.fallbackResults += filteredResults.length;
          searchStats.totalSearches++;
          searchStats.searchMethods.push(`fallback:${term}`);
        }

        // PHASE 3: Grid-based search for pharmacies (if still low results)
        if (businessType === 'pharmacy' && allResults.size < 2) {
          console.log('🔍 Phase 3: Grid-based micro-search for pharmacies');
          const gridResults = await this.performGridSearch(location, radiusKm, config);
          gridResults.forEach(r => {
            r.searchMethod = 'grid_search';
          });
          this.addValidResults(gridResults, allResults, config);
          searchStats.fallbackResults += gridResults.length;
          searchStats.totalSearches++;
          searchStats.searchMethods.push('grid_search');
        }
      }

      console.log(`📊 All phases complete: ${allResults.size} total unique results (${allResults.size - primaryCount} from fallbacks)`);

      // Process and sort competitors
      const competitors = this.processCompetitors(Array.from(allResults.values()), location, config.maxDistance);
      const nearestDistance = competitors.length > 0 ? competitors[0].distance : Infinity;
      const searchQuality = this.calculateEnhancedSearchQuality(competitors, allResults.size, searchStats);

      console.log(`✅ Final competitors: ${competitors.length}, nearest: ${nearestDistance.toFixed(2)}km`);
      
      // Log search method breakdown
      const methodBreakdown = competitors.reduce((acc, comp) => {
        const method = comp.searchMethod || 'unknown';
        acc[method] = (acc[method] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log('📈 Search method breakdown:', methodBreakdown);

      const result = {
        competitors,
        nearestDistance,
        totalCount: competitors.length,
        searchQuality,
        searchStats
      };

      this.setCachedResult(cacheKey, result);
      return result;

    } catch (error) {
      console.error('❌ Error finding competitors:', error);
      return {
        competitors: [],
        nearestDistance: Infinity,
        totalCount: 0,
        searchQuality: 0,
        searchStats: {
          primaryResults: 0,
          fallbackResults: 0,
          totalSearches: 0,
          searchMethods: []
        }
      };
    }
  }

  // New method: Filter results specifically for pharmacies using smarter heuristics
  private filterPharmacyResults(results: any[], config: any): any[] {
    if (!config.searchTerms.includes('pharmacy')) {
      return results;
    }

    return results.filter(result => {
      const name = (result.name || '').toLowerCase();
      const types = (result.types || []).map((t: string) => t.toLowerCase());
      
      // Positive indicators for pharmacies
      const pharmacyKeywords = [
        'pharmacy', 'drugstore', 'صيدلية', 'دواء', 'medicine', 'medical',
        'health', 'drug', 'pharmaceutical', 'chemist', 'apothecary'
      ];
      
      const hasPharmacyKeyword = pharmacyKeywords.some(keyword => 
        name.includes(keyword) || types.some((type: string) => type.includes(keyword))
      );
      
      // Negative indicators (strong exclusions)
      const strongExclusions = [
        'hospital', 'clinic', 'doctor', 'dental', 'veterinary_care', 'bank', 
        'restaurant', 'hotel', 'school', 'church', 'mosque', 'gas_station'
      ];
      
      const hasStrongExclusion = strongExclusions.some(exclusion =>
        types.includes(exclusion) || name.includes(exclusion.replace('_', ' '))
      );
      
      return hasPharmacyKeyword && !hasStrongExclusion;
    });
  }

  // New method: Perform grid-based micro-search for better coverage
  private async performGridSearch(
    center: { lat: number; lng: number },
    radiusKm: number,
    config: any
  ): Promise<any[]> {
    const results: any[] = [];
    const gridSize = 4; // 4x4 grid
    const stepLat = (radiusKm / 111) / gridSize; // Convert km to degrees
    const stepLng = (radiusKm / (111 * Math.cos(center.lat * Math.PI / 180))) / gridSize;
    
    console.log('🕸️ Starting grid search with 4x4 grid');
    
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const lat = center.lat + (i - gridSize/2 + 0.5) * stepLat;
        const lng = center.lng + (j - gridSize/2 + 0.5) * stepLng;
        
        // Quick search around each grid point
        const gridResults = await this.searchByText(
          { lat, lng }, 
          'pharmacy', 
          radiusKm / gridSize
        );
        
        results.push(...gridResults);
        
        // Small delay to avoid rate limiting
        await this.delay(50);
      }
    }
    
    console.log(`🕸️ Grid search complete: ${results.length} results found`);
    return results;
  }

  // Enhanced method: More detailed debugging with location context
  async testSpecificLocation(lat: number, lng: number, radiusKm: number = 1): Promise<any> {
    console.log(`🔍 ENHANCED Testing specific location: ${lat}, ${lng} within ${radiusKm}km`);
    
    const location = { lat, lng };
    const allResults = new Map<string, any>();
    
    // Test all pharmacy-related searches with enhanced terms
    const testTerms = [
      'pharmacy', 'drugstore', 'صيدلية', 'دواء', 'medicine', 'medical store',
      'health store', 'pharmaceutical', 'chemist', 'prescription'
    ];
    const testTypes = ['pharmacy', 'drugstore', 'health', 'store', 'establishment'];
    
    // Phase 1: Standard searches
    console.log('=== PHASE 1: STANDARD SEARCHES ===');
    for (const term of testTerms) {
      console.log(`🔤 Testing text search: "${term}"`);
      const results = await this.searchByText(location, term, radiusKm);
      console.log(`   Found ${results.length} results for "${term}":`);
      results.forEach((r, index) => {
        const distance = this.calculateDistance(location, this.extractCoordinates(r) || location);
        console.log(`     ${index + 1}. "${r.name}" - Types: [${r.types?.join(', ') || 'none'}] - Distance: ${distance.toFixed(2)}km`);
      });
      results.forEach(r => allResults.set(r.place_id, r));
    }
    
    for (const type of testTypes) {
      console.log(`📍 Testing type search: "${type}"`);
      const results = await this.searchByPlaceType(location, type, radiusKm);
      console.log(`   Found ${results.length} results for type "${type}":`);
      results.forEach((r, index) => {
        const distance = this.calculateDistance(location, this.extractCoordinates(r) || location);
        console.log(`     ${index + 1}. "${r.name}" - Types: [${r.types?.join(', ') || 'none'}] - Distance: ${distance.toFixed(2)}km`);
      });
      results.forEach(r => allResults.set(r.place_id, r));
    }
    
    console.log(`📊 Phase 1 Total unique results: ${allResults.size}`);
    
    // Phase 2: Extended radius searches
    console.log('\n=== PHASE 2: EXTENDED RADIUS SEARCHES ===');
    const extendedRadius = radiusKm * 2;
    console.log(`🔍 Testing with larger radius (${extendedRadius}km):`);
    
    const extendedResults = await this.searchByPlaceType(location, 'pharmacy', extendedRadius);
    console.log(`   Found ${extendedResults.length} pharmacy results within ${extendedRadius}km:`);
    extendedResults.forEach((r, index) => {
      const coords = this.extractCoordinates(r);
      const distance = coords ? this.calculateDistance(location, coords) : 'unknown';
      console.log(`     ${index + 1}. "${r.name}" - Distance: ${distance}km - Types: [${r.types?.join(', ') || 'none'}]`);
    });
    
    // Phase 3: Grid micro-search
    console.log('\n=== PHASE 3: GRID MICRO-SEARCH ===');
    const config = this.getBusinessConfig('pharmacy');
    const gridResults = await this.performGridSearch(location, radiusKm, config);
    console.log(`🕸️ Grid search found ${gridResults.length} additional results`);
    gridResults.forEach(r => allResults.set(r.place_id, r));
    
    console.log(`\n📊 FINAL SUMMARY: ${allResults.size} total unique results found`);
    
    // Analyze why some might be missing
    console.log('\n=== ANALYSIS: Potential Issues ===');
    console.log('1. Check if Google Places API has complete coverage in this region');
    console.log('2. Some pharmacies might be categorized differently in local database');
    console.log('3. Business might be too new or not verified on Google');
    console.log('4. Regional language/naming differences might affect search');
    
    return Array.from(allResults.values());
  }

  // Enhanced validation with smarter filtering
  private isValidCompetitor(place: any, config: any): boolean {
    if (!place.place_id || !place.name) return false;

    const types = (place.types || []).map((t: string) => t.toLowerCase());
    const name = place.name.toLowerCase();

    // Special handling for pharmacies
    if (config.searchTerms.includes('pharmacy')) {
      console.log(`🔍 Validating competitor: "${place.name}" (${types.join(', ')})`);
      
      // More lenient validation for pharmacies
      const pharmacyIndicators = [
        'pharmacy', 'drugstore', 'صيدلية', 'دواء', 'medicine', 'medical',
        'health', 'drug', 'pharmaceutical', 'chemist'
      ];
      
      const hasPharmacyIndicator = pharmacyIndicators.some(indicator =>
        name.includes(indicator) || types.some((type: string) => type.includes(indicator))
      );
      
      // Only exclude if it's clearly not a pharmacy
      const definitelyNotPharmacy = [
        'hospital', 'clinic', 'doctor', 'dental', 'veterinary_care',
        'bank', 'restaurant', 'hotel', 'school', 'church', 'mosque'
      ];
      
      const isDefinitelyNotPharmacy = definitelyNotPharmacy.some(exclude =>
        types.includes(exclude) || name.includes(exclude.replace('_', ' '))
      );
      
      if (isDefinitelyNotPharmacy) {
        console.log(`   ❌ Definitely not pharmacy: ${place.name}`);
        return false;
      }
      
      // If it has pharmacy indicators, accept it
      if (hasPharmacyIndicator) {
        console.log(`   ✅ Valid pharmacy: ${place.name}`);
        return true;
      }
      
      // For broad searches (health, store), be more selective
      if (place.searchMethod && place.searchMethod.includes('extended_')) {
        console.log(`   ⚠️ Extended search result, requires pharmacy indicator: ${place.name}`);
        return false;
      }
      
      console.log(`   ✅ Accepted (benefit of doubt): ${place.name}`);
      return true;
    }

    // Original validation logic for other business types
    if (config.excludeTypes.some((exclude: string) => 
      types.includes(exclude) || name.includes(exclude.replace('_', ' '))
    )) {
      return false;
    }

    const universalExcludes = ['atm', 'bank', 'school', 'church', 'cemetery'];
    if (types.some((type: string) => universalExcludes.includes(type))) {
      return false;
    }

    return true;
  }

  // Enhanced search quality calculation
  private calculateEnhancedSearchQuality(
    competitors: any[], 
    totalFound: number, 
    searchStats: any
  ): number {
    if (totalFound === 0) return 0;
    
    let qualityScore = 40; // Lower base score, earn it back
    
    // Boost for having competitors
    if (competitors.length > 0) qualityScore += 20;
    if (competitors.length > 2) qualityScore += 15;
    if (competitors.length > 5) qualityScore += 10;
    
    // Boost for quality data
    const withRatings = competitors.filter(c => c.rating && c.rating > 0).length;
    if (withRatings > 0) qualityScore += Math.min(withRatings * 3, 15);
    
    // Boost for search method diversity
    const uniqueMethods = new Set(competitors.map(c => c.searchMethod)).size;
    if (uniqueMethods > 1) qualityScore += 5;
    if (uniqueMethods > 2) qualityScore += 5;
    
    // Penalty if too dependent on fallbacks
    const fallbackRatio = searchStats.fallbackResults / Math.max(1, searchStats.primaryResults + searchStats.fallbackResults);
    if (fallbackRatio > 0.7) qualityScore -= 10;
    
    return Math.min(Math.max(qualityScore, 0), 100);
  }

  // Rest of the methods remain the same...
  private getBusinessConfig(businessType: string) {
    return this.businessConfigs[businessType] || {
      searchTerms: [businessType],
      placeTypes: ['establishment'],
      excludeTypes: [],
      minDistance: 0.5,
      maxDistance: 5,
      fallbackSearchTerms: [businessType],
      broadPlaceTypes: ['establishment'],
      requiresMultiPass: false
    };
  }

  private async searchByPlaceType(
    location: { lat: number; lng: number },
    placeType: string,
    radiusKm: number
  ): Promise<any[]> {
    return this.performPlacesSearch({
      location: new google.maps.LatLng(location.lat, location.lng),
      radius: Math.min(radiusKm * 1000, 50000),
      type: placeType as any
    });
  }

  private async searchByText(
    location: { lat: number; lng: number },
    query: string,
    radiusKm: number
  ): Promise<any[]> {
    const results = await this.performTextSearch({
      query: `${query} near ${location.lat},${location.lng}`,
      location: new google.maps.LatLng(location.lat, location.lng),
      radius: Math.min(radiusKm * 1000, 50000)
    });

    return results.filter(result => {
      const coords = this.extractCoordinates(result);
      return coords && this.calculateDistance(location, coords) <= radiusKm;
    });
  }

  private performPlacesSearch(request: any): Promise<any[]> {
    return new Promise((resolve) => {
      if (!this.isGoogleMapsAvailable()) {
        resolve([]);
        return;
      }

      const service = new google.maps.places.PlacesService(document.createElement('div'));
      service.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          resolve(results);
        } else {
          console.warn(`Places search failed with status: ${status}`);
          resolve([]);
        }
      });
    });
  }

  private performTextSearch(request: any): Promise<any[]> {
    return new Promise((resolve) => {
      if (!this.isGoogleMapsAvailable()) {
        resolve([]);
        return;
      }

      const service = new google.maps.places.PlacesService(document.createElement('div'));
      service.textSearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          resolve(results);
        } else {
          console.warn(`Text search failed with status: ${status}`);
          resolve([]);
        }
      });
    });
  }

  private addValidResults(results: any[], resultMap: Map<string, any>, config: any): void {
    results.forEach(result => {
      if (this.isValidCompetitor(result, config) && !resultMap.has(result.place_id)) {
        resultMap.set(result.place_id, result);
      }
    });
  }

  private processCompetitors(
    competitors: any[], 
    center: { lat: number; lng: number },
    maxDistance: number
  ): any[] {
    return competitors
      .map(competitor => {
        const coords = this.extractCoordinates(competitor);
        if (!coords) return null;

        const distance = this.calculateDistance(center, coords);
        return {
          place_id: competitor.place_id,
          name: competitor.name,
          distance,
          rating: competitor.rating,
          vicinity: competitor.vicinity,
          coordinates: coords,
          searchMethod: competitor.searchMethod
        };
      })
      .filter((competitor): competitor is NonNullable<typeof competitor> => 
        competitor !== null && competitor.distance <= maxDistance
      )
      .sort((a, b) => a.distance - b.distance);
  }

  private extractCoordinates(place: any): { lat: number; lng: number } | null {
    if (!place.geometry?.location) return null;

    try {
      const location = place.geometry.location;
      const lat = typeof location.lat === 'function' ? location.lat() : location.lat;
      const lng = typeof location.lng === 'function' ? location.lng() : location.lng;

      if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    } catch (error) {
      console.warn('Error extracting coordinates:', error);
    }

    return null;
  }

  private calculateDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number {
    const R = 6371;
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLng = this.toRadians(point2.lng - point1.lng);
    const a = Math.sin(dLat / 2) ** 2 + 
              Math.cos(this.toRadians(point1.lat)) * 
              Math.cos(this.toRadians(point2.lat)) * 
              Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private isGoogleMapsAvailable(): boolean {
    return typeof window !== 'undefined' && 
           typeof google !== 'undefined' && 
           !!google.maps && 
           !!google.maps.places;
  }

  public isLocationOptimal(
    result: { nearestDistance: number; searchQuality: number },
    businessType: string
  ): boolean {
    const config = this.getBusinessConfig(businessType);
    return result.nearestDistance >= config.minDistance && result.searchQuality >= 40; // Lowered threshold
  }

  public clearCache(): void {
    this.cache.clear();
  }

  private getCachedResult(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    if (cached) this.cache.delete(key);
    return null;
  }

  private setCachedResult(key: string, data: any): void {
    if (this.cache.size > 50) {
      const now = Date.now();
      for (const [k, v] of this.cache.entries()) {
        if (now - v.timestamp > this.CACHE_TTL) {
          this.cache.delete(k);
        }
      }
    }

    this.cache.set(key, { data, timestamp: Date.now() });
  }
}