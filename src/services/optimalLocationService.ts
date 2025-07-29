// Enhanced OptimalLocationService with improved competitor detection integration
import { CompetitorDetectionService } from './competitorDetectionService';

interface Location {
  lat: number;
  lng: number;
}

interface BusinessCategory {
  id: string;
  name: string;
  searchTerms: string[];
  placeTypes: string[];
  minRadius?: number;
}

interface OptimalLocation {
  location: Location;
  nearestCompetitorDistance: number;
  coverageScore: number;
  totalCompetitorsInRadius: number;
  marketSaturation: number;
  opportunityScore: number;
  competitors: any[];
  searchQuality?: number;
  searchStats?: {
    primaryResults: number;
    fallbackResults: number;
    totalSearches: number;
    searchMethods: string[];
  };
}

interface OptimalLocationResult {
  bestLocations: OptimalLocation[];
  allPoints: OptimalLocation[];
  analysisRadius: number;
  targetRadius: number;
  totalCompetitorsFound: number;
  averageCompetitorDistance: number;
  marketSaturation: number;
  recommendations: string[];
  searchStats: {
    totalRequests: number;
    cacheHits: number;
    timeElapsed: number;
    pointsAnalyzed: number;
    locationsFound: number;
    primaryResults: number;
    fallbackResults: number;
    searchEfficiency: number;
  };
}

export class OptimalLocationService {
  private competitorService: CompetitorDetectionService;
  private isStopRequested = false;

  constructor(
    private onProgress: (progress: number, found: number, total: number) => void,
    private onLocationFound: (location: OptimalLocation) => void
  ) {
    this.competitorService = new CompetitorDetectionService();
  }

  async findOptimalLocations(
    center: Location,
    business: BusinessCategory & { minRadius?: number },
    analysisRadius: number,
    targetRadius: number,
    gridDensity: number = 6
  ): Promise<OptimalLocationResult> {
    this.isStopRequested = false;
    const startTime = Date.now();
    
    // Generate grid points within analysis radius
    const gridPoints = this.generateGridPoints(center, analysisRadius, gridDensity);

    const optimalLocations: OptimalLocation[] = [];
    let totalRequests = 0;
    let cacheHits = 0;
    let totalPrimaryResults = 0;
    let totalFallbackResults = 0;

    console.log(`🚀 Starting enhanced optimal location search with ${gridPoints.length} grid points`);
    console.log(`📋 Business: ${business.name}, Analysis Radius: ${analysisRadius}km, Target Radius: ${targetRadius}km`);

    for (let i = 0; i < gridPoints.length; i++) {
      if (this.isStopRequested) {
        console.log('⏹️ Search stopped by user request');
        break;
      }

      const point = gridPoints[i];
      
      try {
        // Find competitors near this point using enhanced detection
        const competitorResult = await this.competitorService.findCompetitorsNearLocation(
          point,
          business.id,
          Math.max(analysisRadius, 3)
        );
        
        totalRequests++;
        totalPrimaryResults += competitorResult.searchStats?.primaryResults || 0;
        totalFallbackResults += competitorResult.searchStats?.fallbackResults || 0;

        console.log(`📍 Point ${i + 1}/${gridPoints.length}: Found ${competitorResult.competitors.length} competitors (Quality: ${competitorResult.searchQuality}%)`);

        // Enhanced location validation with better metrics
        if (this.isLocationOptimalEnhanced(competitorResult, business, targetRadius)) {
          
          // Calculate comprehensive scoring with enhanced metrics
          const locationAnalysis = this.analyzeLocationEnhanced(
            point,
            competitorResult,
            targetRadius,
            analysisRadius
          );
          
          // Attach enhanced search statistics
          locationAnalysis.searchQuality = competitorResult.searchQuality;
          locationAnalysis.searchStats = competitorResult.searchStats;

          // Only include locations with good opportunity scores (lowered threshold for sparse areas)
          const minOpportunityScore = business.id === 'pharmacy' ? 30 : 40;
          if (locationAnalysis.opportunityScore >= minOpportunityScore) {
            optimalLocations.push(locationAnalysis);
            
            // Notify about new location found in real-time
            this.onLocationFound(locationAnalysis);
            
            console.log(`✅ Added optimal location with ${locationAnalysis.opportunityScore}% opportunity score`);
          } else {
            console.log(`⚠️ Location below opportunity threshold: ${locationAnalysis.opportunityScore}% < ${minOpportunityScore}%`);
          }
        } else {
          const reason = this.getValidationFailureReason(competitorResult, business, targetRadius);
          console.log(`❌ Location failed validation: ${reason}`);
        }

      } catch (error) {
        console.error(`💥 Error analyzing point ${i + 1}:`, error);
      }

      // Update progress
      const progress = Math.round(((i + 1) / gridPoints.length) * 100);
      this.onProgress(progress, optimalLocations.length, i + 1);

      // Adaptive delay based on results found
      if (i % 5 === 0) {
        const delay = optimalLocations.length > 10 ? 50 : 100; // Faster if finding many results
        await this.delay(delay);
      }
    }

    // Sort by opportunity score (highest first)
    optimalLocations.sort((a, b) => b.opportunityScore - a.opportunityScore);

    // Take top 20 results for main list, keep all for heatmap
    const topLocations = optimalLocations.slice(0, 20);

    console.log(`📊 Search complete: ${optimalLocations.length} total opportunities found`);
    console.log(`🎯 Top ${topLocations.length} locations selected for detailed analysis`);

    const searchEfficiency = totalRequests > 0 ? 
      Math.round((totalPrimaryResults / (totalPrimaryResults + totalFallbackResults)) * 100) : 0;

    const analysisResult: OptimalLocationResult = {
      bestLocations: topLocations,
      allPoints: optimalLocations, // All found locations for heatmap
      analysisRadius,
      targetRadius,
      totalCompetitorsFound: this.calculateTotalCompetitors(topLocations),
      averageCompetitorDistance: this.calculateAverageDistance(topLocations),
      marketSaturation: this.calculateMarketSaturation(topLocations),
      recommendations: this.generateEnhancedRecommendations(topLocations, optimalLocations, business),
      searchStats: {
        totalRequests,
        cacheHits: cacheHits,
        timeElapsed: Date.now() - startTime,
        pointsAnalyzed: gridPoints.length,
        locationsFound: optimalLocations.length,
        primaryResults: totalPrimaryResults,
        fallbackResults: totalFallbackResults,
        searchEfficiency
      }
    };

    console.log(`🏁 Analysis complete in ${Math.round(analysisResult.searchStats.timeElapsed / 1000)}s`);
    console.log(`📈 Search efficiency: ${searchEfficiency}% (${totalPrimaryResults} primary, ${totalFallbackResults} fallback results)`);

    return analysisResult;
  }

  // Enhanced location validation with better criteria
  private isLocationOptimalEnhanced(
    result: { nearestDistance: number; searchQuality: number; competitors: any[] },
    business: BusinessCategory & { minRadius?: number },
    targetRadius: number
  ): boolean {
    const minDistance = business.minRadius || targetRadius;
    const minQuality = business.id === 'pharmacy' ? 30 : 50; // Lower quality threshold for pharmacies
    
    const hasMinDistance = result.nearestDistance >= minDistance * 0.8; // Allow 20% tolerance
    const hasMinQuality = result.searchQuality >= minQuality;
    
    return hasMinDistance && hasMinQuality;
  }

  // Get human-readable validation failure reason
  private getValidationFailureReason(
    result: { nearestDistance: number; searchQuality: number },
    business: BusinessCategory & { minRadius?: number },
    targetRadius: number
  ): string {
    const minDistance = business.minRadius || targetRadius;
    const minQuality = business.id === 'pharmacy' ? 30 : 50;
    
    if (result.nearestDistance < minDistance * 0.8) {
      return `Too close to competitors (${result.nearestDistance.toFixed(2)}km < ${(minDistance * 0.8).toFixed(1)}km)`;
    }
    if (result.searchQuality < minQuality) {
      return `Low search quality (${result.searchQuality}% < ${minQuality}%)`;
    }
    return 'Unknown validation failure';
  }

  // Enhanced location analysis with improved scoring
  private analyzeLocationEnhanced(
    location: Location,
    competitorResult: { competitors: any[]; nearestDistance: number; totalCount: number; searchQuality: number },
    targetRadius: number,
    analysisRadius: number
  ): OptimalLocation {
    
    // Enhanced coverage score calculation
    const maxExpectedDistance = analysisRadius / 1.5; // More realistic expectation
    const coverageScore = Math.min(100, (competitorResult.nearestDistance / maxExpectedDistance) * 100);
    
    // Enhanced market saturation calculation
    const areaKm2 = Math.PI * Math.pow(analysisRadius, 2);
    const expectedDensity = this.getExpectedCompetitorDensity(location); // Competitors per km²
    const expectedCompetitors = areaKm2 * expectedDensity;
    const marketSaturation = Math.min(100, (competitorResult.totalCount / expectedCompetitors) * 100);
    
    // Enhanced opportunity score with multiple factors
    const distanceScore = Math.min(100, (competitorResult.nearestDistance / 3) * 100); // Max at 3km+
    const saturationScore = Math.max(0, 100 - marketSaturation);
    const qualityScore = competitorResult.searchQuality;
    
    // Weighted combination with search quality factor
    const opportunityScore = Math.round(
      (distanceScore * 0.4) + 
      (saturationScore * 0.3) + 
      (qualityScore * 0.2) + 
      (coverageScore * 0.1)
    );

    console.log(`📊 Location analysis: Distance=${distanceScore.toFixed(1)}, Saturation=${saturationScore.toFixed(1)}, Quality=${qualityScore}, Coverage=${coverageScore.toFixed(1)} → Opportunity=${opportunityScore}%`);

    return {
      location,
      nearestCompetitorDistance: competitorResult.nearestDistance,
      coverageScore: Math.round(coverageScore),
      totalCompetitorsInRadius: competitorResult.totalCount,
      marketSaturation: Math.round(marketSaturation),
      opportunityScore,
      competitors: competitorResult.competitors
    };
  }

  // Get expected competitor density based on business type and location
  private getExpectedCompetitorDensity(location: Location): number {
    // This could be enhanced with real demographic data
    // For now, use reasonable estimates per km²
    const baseDensities = {
      pharmacy: 0.15,     // ~1 pharmacy per 6-7 km²
      restaurant: 0.5,    // ~1 restaurant per 2 km²
      coffee_shop: 0.3,   // ~1 coffee shop per 3-4 km²
      grocery_store: 0.1, // ~1 grocery store per 10 km²
      gas_station: 0.08   // ~1 gas station per 12-13 km²
    };
    
    // Adjust based on location (urban vs suburban estimation)
    // This is a simple heuristic - could be improved with real data
    const urbanMultiplier = 1.0; // Could vary based on population density
    
    return (baseDensities.pharmacy || 0.2) * urbanMultiplier;
  }

  // Generate enhanced recommendations with better insights
  private generateEnhancedRecommendations(
    topLocations: OptimalLocation[], 
    allLocations: OptimalLocation[],
    business: BusinessCategory
  ): string[] {
    const recommendations: string[] = [];
    
    if (allLocations.length === 0) {
      recommendations.push(`No viable locations found for ${business.name}. Consider expanding search radius or exploring different areas.`);
      recommendations.push('The enhanced search used multiple strategies but found insufficient opportunities in this region.');
      return recommendations;
    }

    const bestLocation = topLocations[0];
    const avgDistance = this.calculateAverageDistance(topLocations);
    const avgOpportunity = topLocations.length > 0 ? 
      topLocations.reduce((sum, loc) => sum + loc.opportunityScore, 0) / topLocations.length : 0;
    
    // Quality assessment
    if (avgOpportunity >= 70) {
      recommendations.push(`Excellent market opportunities identified! Average opportunity score of ${avgOpportunity.toFixed(1)}% indicates strong potential.`);
    } else if (avgOpportunity >= 50) {
      recommendations.push(`Good market potential found with ${avgOpportunity.toFixed(1)}% average opportunity score.`);
    } else {
      recommendations.push(`Market opportunities are limited (${avgOpportunity.toFixed(1)}% avg). Consider alternative locations or business strategies.`);
    }

    // Best location highlight
    recommendations.push(`Top opportunity: ${bestLocation.opportunityScore}% score at coordinates ${bestLocation.location.lat.toFixed(4)}, ${bestLocation.location.lng.toFixed(4)} with nearest competitor ${bestLocation.nearestCompetitorDistance.toFixed(1)}km away.`);
    
    // Market spacing analysis
    if (avgDistance > 2.0) {
      recommendations.push(`Excellent market spacing - average competitor distance of ${avgDistance.toFixed(1)}km suggests underserved market areas.`);
    } else if (avgDistance > 1.0) {
      recommendations.push(`Good market spacing with ${avgDistance.toFixed(1)}km average competitor distance.`);
    } else {
      recommendations.push(`Tight market spacing (${avgDistance.toFixed(1)}km avg). Success will depend on differentiation and service quality.`);
    }
    
    // Location count recommendations
    if (topLocations.length >= 15) {
      recommendations.push(`Abundant opportunities found (${allLocations.length} total). Focus on top 5-8 locations for detailed site evaluation.`);
    } else if (topLocations.length >= 8) {
      recommendations.push(`Multiple viable options identified. Recommend visiting top 3-5 locations to assess foot traffic and accessibility.`);
    } else if (topLocations.length >= 3) {
      recommendations.push(`Limited but viable options found. Thorough site visits recommended for all ${topLocations.length} locations.`);
    } else {
      recommendations.push(`Very few opportunities in this area (${topLocations.length}). Consider expanding search radius or exploring adjacent markets.`);
    }

    // Business-specific recommendations
    if (business.id === 'pharmacy') {
      const hasHighQuality = topLocations.some(loc => (loc.searchQuality || 0) >= 80);
      if (hasHighQuality) {
        recommendations.push('High-quality pharmacy data found. Consider proximity to medical facilities, senior communities, and residential density.');
      } else {
        recommendations.push('Pharmacy search quality varied. Recommend ground-truth validation and consideration of local healthcare facilities.');
      }
      
      if (avgDistance < 1.5) {
        recommendations.push('Pharmacy market appears competitive. Focus on specialized services, extended hours, or unique product offerings.');
      }
    }

    // Search methodology insights
    const fallbackUsage = topLocations.filter(loc => 
      loc.searchStats && loc.searchStats.fallbackResults > loc.searchStats.primaryResults
    ).length;
    
    if (fallbackUsage > topLocations.length * 0.3) {
      recommendations.push('Enhanced search methods were crucial for finding opportunities. This may indicate an underserved or emerging market.');
    }

    return recommendations;
  }

  private generateGridPoints(center: Location, radius: number, density: number): Location[] {
    const points: Location[] = [];
    const latRange = radius / 111;
    const lngRange = radius / (111 * Math.cos(center.lat * Math.PI / 180));

    for (let i = 0; i < density; i++) {
      for (let j = 0; j < density; j++) {
        const lat = center.lat + ((i - density/2 + 0.5) * 2 * latRange / density);
        const lng = center.lng + ((j - density/2 + 0.5) * 2 * lngRange / density);
        
        const distance = this.calculateDistance(center, { lat, lng });
        if (distance <= radius) {
          points.push({ lat, lng });
        }
      }
    }

    return points;
  }

  private calculateDistance(point1: Location, point2: Location): number {
    const R = 6371;
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLng = this.toRadians(point2.lng - point1.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.lat)) *
      Math.cos(this.toRadians(point2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private calculateTotalCompetitors(locations: OptimalLocation[]): number {
    return locations.reduce((sum, loc) => sum + loc.totalCompetitorsInRadius, 0);
  }

  private calculateAverageDistance(locations: OptimalLocation[]): number {
    if (locations.length === 0) return 0;
    return locations.reduce((sum, loc) => sum + loc.nearestCompetitorDistance, 0) / locations.length;
  }

  private calculateMarketSaturation(locations: OptimalLocation[]): number {
    if (locations.length === 0) return 0;
    return locations.reduce((sum, loc) => sum + loc.marketSaturation, 0) / locations.length;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public stop(): void {
    this.isStopRequested = true;
    console.log('🛑 Optimal location search stop requested');
  }
}

// Factory function to create the service
export function createOptimalLocationSearch(
  onProgress: (progress: number, found: number, total: number) => void,
  onLocationFound: (location: OptimalLocation) => void
) {
  return new OptimalLocationService(onProgress, onLocationFound);
} 