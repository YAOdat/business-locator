import { Location, BusinessCategory } from '../types/business';

interface OptimalLocation {
  location: Location;
  nearestCompetitorDistance: number;
  coverageScore: number;
  totalCompetitorsInRadius: number;
  marketSaturation: number;
  opportunityScore: number;
}

interface OptimalLocationResult {
  bestLocations: OptimalLocation[];
  analysisRadius: number;
  totalCompetitorsFound: number;
  averageCompetitorDistance: number;
  marketSaturation: number;
  recommendations: string[];
  allPoints: OptimalLocation[];
  searchStats: {
    totalRequests: number;
    cachehits: number;
    timeElapsed: number;
  };
}

// Cache for competitor data to reduce API calls
class CompetitorCache {
  private cache = new Map<string, any[]>();
  private readonly CACHE_RADIUS = 2; // km
  
  getCacheKey(lat: number, lng: number): string {
    // Round to ~200m precision to enable cache hits
    const roundedLat = Math.round(lat * 1000) / 1000;
    const roundedLng = Math.round(lng * 1000) / 1000;
    return `${roundedLat},${roundedLng}`;
  }
  
  get(lat: number, lng: number): any[] | null {
    const key = this.getCacheKey(lat, lng);
    return this.cache.get(key) || null;
  }
  
  set(lat: number, lng: number, competitors: any[]): void {
    const key = this.getCacheKey(lat, lng);
    this.cache.set(key, competitors);
  }
  
  clear(): void {
    this.cache.clear();
  }
}

// Optimized search controller
export class OptimalLocationSearch {
  private shouldStop = false;
  private cache = new CompetitorCache();
  private searchStats = {
    totalRequests: 0,
    cachehits: 0,
    startTime: 0
  };
  
  constructor(
    private onProgress: (progress: number, found: number, total: number) => void,
    private onLocationFound: (location: OptimalLocation) => void
  ) {}
  
  stop(): void {
    this.shouldStop = true;
  }
  
  reset(): void {
    this.shouldStop = false;
    this.cache.clear();
    this.searchStats = { totalRequests: 0, cachehits: 0, startTime: Date.now() };
  }
  
  // Generate smart search points using hexagonal pattern (more efficient than grid)
  private generateHexagonalPoints(
    centerLat: number, 
    centerLng: number, 
    radius: number, 
    density: number
  ): Location[] {
    const points: Location[] = [];
    const rings = Math.ceil(density / 2);
    const kmPerDegreeLat = 111;
    const kmPerDegreeLng = 111 * Math.cos(centerLat * Math.PI / 180);
    
    // Add center point
    points.push({ lat: centerLat, lng: centerLng });
    
    // Generate hexagonal rings
    for (let ring = 1; ring <= rings; ring++) {
      const ringRadius = (radius / rings) * ring;
      const pointsInRing = ring * 6;
      
      for (let i = 0; i < pointsInRing; i++) {
        const angle = (2 * Math.PI * i) / pointsInRing;
        const deltaLat = (ringRadius * Math.cos(angle)) / kmPerDegreeLat;
        const deltaLng = (ringRadius * Math.sin(angle)) / kmPerDegreeLng;
        
        points.push({
          lat: centerLat + deltaLat,
          lng: centerLng + deltaLng
        });
      }
    }
    
    return points.filter(point => {
      const distance = this.calculateDistance(centerLat, centerLng, point.lat, point.lng);
      return distance <= radius;
    });
  }
  
  // Batch competitor search to reduce API calls
  private async batchFindCompetitors(
    points: Location[], 
    business: BusinessCategory, 
    searchRadius: number
  ): Promise<Map<string, any[]>> {
    const results = new Map<string, any[]>();
    const BATCH_SIZE = 5; // Process 5 locations at once
    
    for (let i = 0; i < points.length && !this.shouldStop; i += BATCH_SIZE) {
      const batch = points.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (point) => {
        // Check cache first
        const cached = this.cache.get(point.lat, point.lng);
        if (cached) {
          this.searchStats.cachehits++;
          return { point, competitors: cached };
        }
        
        // Make API request
        this.searchStats.totalRequests++;
        try {
          const competitors = await this.findCompetitorsNearLocation(point, business, searchRadius);
          this.cache.set(point.lat, point.lng, competitors);
          return { point, competitors };
        } catch (error) {
          console.warn(`Failed to fetch competitors for ${point.lat}, ${point.lng}:`, error);
          return { point, competitors: [] };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ point, competitors }) => {
        const key = `${point.lat},${point.lng}`;
        results.set(key, competitors);
      });
      
      // Update progress
      const progress = Math.min(100, Math.round(((i + batch.length) / points.length) * 100));
      this.onProgress(progress, results.size, points.length);
      
      // Small delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }
  
  // Simulate competitor finding (replace with actual Google Places API)
  private async findCompetitorsNearLocation(
    location: Location, 
    business: BusinessCategory, 
    radius: number
  ): Promise<any[]> {
    // This would be replaced with actual Google Places API call
    // For now, simulating with random data
    await new Promise(resolve => setTimeout(resolve, 200)); // Simulate API delay
    
    const competitorCount = Math.floor(Math.random() * 8);
    const competitors = [];
    
    for (let i = 0; i < competitorCount; i++) {
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * radius;
      const deltaLat = (distance * Math.cos(angle)) / 111;
      const deltaLng = (distance * Math.sin(angle)) / (111 * Math.cos(location.lat * Math.PI / 180));
      
      competitors.push({
        id: `competitor_${i}`,
        name: `${business.name} ${i + 1}`,
        location: {
          lat: location.lat + deltaLat,
          lng: location.lng + deltaLng
        },
        rating: 3.5 + Math.random() * 1.5,
        distance: distance
      });
    }
    
    return competitors;
  }
  
  // Calculate opportunity score with improved algorithm
  private calculateOpportunityScore(
    location: Location,
    competitors: any[],
    targetRadius: number,
    analysisRadius: number
  ): OptimalLocation {
    const competitorsInTarget = competitors.filter(c => c.distance <= targetRadius);
    const nearestDistance = competitors.length > 0 ? 
      Math.min(...competitors.map(c => c.distance)) : analysisRadius;
    
    // Improved scoring algorithm
    const distanceScore = Math.min(100, (nearestDistance / targetRadius) * 50);
    const densityScore = Math.max(0, 100 - (competitorsInTarget.length * 15));
    const coverageScore = Math.min(100, (targetRadius / nearestDistance) * 30);
    const marketSaturation = Math.min(100, (competitors.length / 10) * 100);
    
    const opportunityScore = Math.round(
      (distanceScore * 0.4) + 
      (densityScore * 0.3) + 
      (coverageScore * 0.3)
    );
    
    return {
      location,
      nearestCompetitorDistance: nearestDistance,
      coverageScore: Math.round(coverageScore),
      totalCompetitorsInRadius: competitorsInTarget.length,
      marketSaturation: Math.round(marketSaturation),
      opportunityScore
    };
  }
  
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
  
  // Main search function
  async findOptimalLocations(
    searchCenter: Location,
    business: BusinessCategory,
    analysisRadius: number,
    targetRadius: number,
    density: number = 6
  ): Promise<OptimalLocationResult> {
    this.reset();
    
    try {
      // Generate search points using hexagonal pattern
      const searchPoints = this.generateHexagonalPoints(
        searchCenter.lat,
        searchCenter.lng,
        analysisRadius,
        density
      );
      
      // Batch process competitor searches
      const competitorMap = await this.batchFindCompetitors(
        searchPoints,
        business,
        analysisRadius
      );
      
      if (this.shouldStop) {
        // Early exit if stopped
      }
      
      // Calculate opportunity scores for all points
      const allLocations: OptimalLocation[] = [];
      let totalCompetitors = 0;
      
      for (const [pointKey, competitors] of competitorMap.entries()) {
        const [lat, lng] = pointKey.split(',').map(Number);
        const location = { lat, lng };
        
        const optimalLocation = this.calculateOpportunityScore(
          location,
          competitors,
          targetRadius,
          analysisRadius
        );
        
        allLocations.push(optimalLocation);
        totalCompetitors += competitors.length;
        
        // Notify about found location in real-time
        if (optimalLocation.opportunityScore >= 60) {
          this.onLocationFound(optimalLocation);
        }
      }
      
      // Sort and get best locations
      const bestLocations = allLocations
        .sort((a, b) => b.opportunityScore - a.opportunityScore)
        .slice(0, 10);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(
        bestLocations,
        totalCompetitors,
        searchPoints.length
      );
      
      const timeElapsed = Date.now() - this.searchStats.startTime;
      
      return {
        bestLocations,
        analysisRadius,
        totalCompetitorsFound: totalCompetitors,
        averageCompetitorDistance: allLocations.length > 0 ? 
          allLocations.reduce((sum, loc) => sum + loc.nearestCompetitorDistance, 0) / allLocations.length : 0,
        marketSaturation: allLocations.length > 0 ?
          allLocations.reduce((sum, loc) => sum + loc.marketSaturation, 0) / allLocations.length : 0,
        recommendations,
        allPoints: allLocations,
        searchStats: {
          totalRequests: this.searchStats.totalRequests,
          cachehits: this.searchStats.cachehits,
          timeElapsed
        }
      };
      
    } catch (error) {
      console.error('Optimal location search failed:', error);
      throw error;
    }
  }
  
  private generateRecommendations(
    bestLocations: OptimalLocation[],
    totalCompetitors: number,
    totalPoints: number
  ): string[] {
    const recommendations: string[] = [];
    
    if (bestLocations.length === 0) {
      recommendations.push('No suitable locations found. Consider expanding your search radius.');
      return recommendations;
    }
    
    const bestScore = bestLocations[0].opportunityScore;
    const avgScore = bestLocations.reduce((sum, loc) => sum + loc.opportunityScore, 0) / bestLocations.length;
    
    if (bestScore >= 80) {
      recommendations.push('Excellent opportunities found! The top locations show minimal competition.');
    } else if (bestScore >= 60) {
      recommendations.push('Good opportunities available with moderate competition levels.');
    } else {
      recommendations.push('Limited opportunities detected. Market appears saturated in this area.');
    }
    
    if (totalCompetitors / totalPoints > 0.5) {
      recommendations.push('High competitor density detected. Consider differentiation strategies.');
    }
    
    const lowSaturationAreas = bestLocations.filter(loc => loc.marketSaturation < 30).length;
    if (lowSaturationAreas > 3) {
      recommendations.push(`${lowSaturationAreas} areas with low market saturation identified.`);
    }
    
    return recommendations;
  }
}

// Factory function for creating search instances
export function createOptimalLocationSearch(
  onProgress: (progress: number, found: number, total: number) => void,
  onLocationFound: (location: OptimalLocation) => void
): OptimalLocationSearch {
  return new OptimalLocationSearch(onProgress, onLocationFound);
} 