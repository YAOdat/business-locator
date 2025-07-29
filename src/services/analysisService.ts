import { Location, BusinessCategory, AnalysisResult } from '../types/business';

// Google Places API types
interface PlaceResult {
  place_id: string;
  name: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  user_ratings_total?: number;
  types: string[];
  vicinity: string;
}

interface PlacesResponse {
  results: PlaceResult[];
  status: string;
  error_message?: string;
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Get business type keywords for Google Places API
function getBusinessKeywords(businessType: string): string[] {
  const keywords: { [key: string]: string[] } = {
    supermarket: ['supermarket', 'grocery store', 'food store', 'market', 'convenience store'],
    laundry: ['laundry', 'dry cleaning', 'laundromat', 'wash and fold'],
    cafe: ['cafe', 'coffee shop', 'restaurant', 'coffee', 'café'],
    pharmacy: ['pharmacy', 'drugstore', 'chemist', 'pharmacies'],
    clothing: ['clothing store', 'fashion store', 'apparel', 'clothes', 'boutique'],
    hardware: ['hardware store', 'home improvement', 'tools', 'hardware'],
    beauty: ['beauty salon', 'hair salon', 'spa', 'beauty', 'salon'],
    bank: ['bank', 'credit union', 'financial services', 'banking']
  };
  
  return keywords[businessType] || [businessType];
}

// Get business types for Google Places API (fallback method)
function getBusinessTypes(businessType: string): string[] {
  const types: { [key: string]: string[] } = {
    supermarket: ['grocery_or_supermarket', 'food', 'store'],
    laundry: ['laundry', 'establishment'],
    cafe: ['restaurant', 'food', 'establishment'],
    pharmacy: ['pharmacy', 'health', 'establishment'],
    clothing: ['clothing_store', 'store', 'establishment'],
    hardware: ['hardware_store', 'store', 'establishment'],
    beauty: ['beauty_salon', 'health', 'establishment'],
    bank: ['bank', 'finance', 'establishment']
  };
  
  return types[businessType] || [];
}

export async function analyzeLocation(
  location: Location,
  business: BusinessCategory,
  radius: number
): Promise<AnalysisResult> {
  try {
    console.log('🔍 Starting analysis for:', business.name, 'at location:', location);
    console.log('📍 Radius:', radius, 'km');
    
    const keywords = getBusinessKeywords(business.id);
    const types = getBusinessTypes(business.id);
    console.log('🔑 Search keywords:', keywords);
    console.log('🏷️ Business types:', types);
    
    // Search for similar businesses in the area
    const competitors: PlaceResult[] = [];
    
    // First, try keyword-based search
    for (const keyword of keywords) {
      console.log(`🔎 Searching for keyword: "${keyword}"`);
      
      const searchUrl = `/api/places?lat=${location.lat}&lng=${location.lng}&radius=${radius * 1000}&keyword=${encodeURIComponent(keyword)}`;
      
      try {
        const response = await fetch(searchUrl);
        const data: PlacesResponse = await response.json();
        
        console.log(`📊 API Response for keyword "${keyword}":`, {
          status: data.status,
          resultsCount: data.results?.length || 0,
          error: data.error_message
        });
        
        if (data.status === 'OK' && data.results) {
          console.log(`✅ Found ${data.results.length} results for keyword "${keyword}"`);
          competitors.push(...data.results);
        } else if (data.status === 'ZERO_RESULTS') {
          console.log(`❌ No results found for keyword "${keyword}"`);
        } else {
          console.error(`❌ API Error for keyword "${keyword}":`, data.status, data.error_message);
        }
      } catch (error) {
        console.error(`🚨 Fetch error for keyword "${keyword}":`, error);
      }
    }
    
    // If no results from keywords, try type-based search
    if (competitors.length === 0 && types.length > 0) {
      console.log('🔄 No keyword results found, trying type-based search...');
      
      for (const type of types) {
        console.log(`🔎 Searching for type: "${type}"`);
        
        const searchUrl = `/api/places?lat=${location.lat}&lng=${location.lng}&radius=${radius * 1000}&type=${encodeURIComponent(type)}`;
        
        try {
          const response = await fetch(searchUrl);
          const data: PlacesResponse = await response.json();
          
          console.log(`📊 API Response for type "${type}":`, {
            status: data.status,
            resultsCount: data.results?.length || 0,
            error: data.error_message
          });
          
          if (data.status === 'OK' && data.results) {
            console.log(`✅ Found ${data.results.length} results for type "${type}"`);
            competitors.push(...data.results);
          } else if (data.status === 'ZERO_RESULTS') {
            console.log(`❌ No results found for type "${type}"`);
          } else {
            console.error(`❌ API Error for type "${type}":`, data.status, data.error_message);
          }
        } catch (error) {
          console.error(`🚨 Fetch error for type "${type}":`, error);
        }
      }
    }
    
    console.log(`📈 Total competitors found: ${competitors.length}`);
    
    // Remove duplicates based on place_id
    const uniqueCompetitors = competitors.filter((competitor, index, self) => 
      index === self.findIndex(c => c.place_id === competitor.place_id)
    );
    
    console.log(`🔄 After deduplication: ${uniqueCompetitors.length} unique competitors`);
    
    // Calculate distances to competitors
    const competitorDistances = uniqueCompetitors.map(competitor => {
      const distance = calculateDistance(
        location.lat, 
        location.lng, 
        competitor.geometry.location.lat, 
        competitor.geometry.location.lng
      );
      console.log(`📍 Competitor "${competitor.name}": ${distance.toFixed(2)} km away`);
      return distance;
    });
    
    const nearestCompetitorDistance = competitorDistances.length > 0 
      ? Math.min(...competitorDistances) 
      : radius;
    const totalCompetitors = uniqueCompetitors.length;
    
    console.log(`🎯 Nearest competitor: ${nearestCompetitorDistance.toFixed(2)} km`);
    console.log(`🏢 Total competitors: ${totalCompetitors}`);
    
    // Calculate competition score (0-100, lower is better)
    let competitionScore = 100;
    if (totalCompetitors > 0) {
      // Penalize based on number of competitors and proximity
      const proximityPenalty = Math.max(0, 50 - (nearestCompetitorDistance * 10));
      const densityPenalty = Math.min(40, totalCompetitors * 8);
      competitionScore = Math.max(0, 100 - proximityPenalty - densityPenalty);
    }
    
    console.log(`📊 Competition score: ${competitionScore}`);
    
    // Calculate demographic score (placeholder - would need Census API)
    const demographicScore = 70; // Placeholder
    
    // Calculate location score based on accessibility
    const locationScore = 80; // Placeholder - would analyze roads, transport
    
    // Calculate overall success probability
    const successProbability = Math.round(
      (competitionScore * 0.5 + demographicScore * 0.3 + locationScore * 0.2)
    );
    
    console.log(`🎯 Final success probability: ${successProbability}%`);
    
    // Generate recommendations and risks
    const recommendations: string[] = [];
    const risks: string[] = [];
    
    if (totalCompetitors === 0) {
      recommendations.push("No direct competitors found in the area - great opportunity!");
    } else if (totalCompetitors <= 2) {
      recommendations.push("Low competition environment - good market opportunity");
    } else {
      risks.push(`High competition: ${totalCompetitors} similar businesses in the area`);
    }
    
    if (nearestCompetitorDistance < 0.5) {
      risks.push("Very close competitor - consider differentiation strategy");
    } else if (nearestCompetitorDistance > radius * 0.8) {
      recommendations.push("Good distance from competitors - less direct competition");
    }
    
    if (successProbability >= 80) {
      recommendations.push("High success probability - excellent location choice");
    } else if (successProbability < 50) {
      risks.push("Low success probability - consider alternative locations");
    }
    
    const result = {
      successProbability,
      competitionScore,
      demographicScore,
      locationScore,
      totalCompetitors,
      nearestCompetitorDistance,
      recommendations,
      risks
    };
    
    console.log('✅ Analysis complete:', result);
    return result;
    
  } catch (error) {
    console.error('🚨 Analysis error:', error);
    throw new Error('Failed to analyze location');
  }
} 