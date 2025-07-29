'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useMapStore } from '../store/mapStore';
import { createOptimalLocationSearch } from '../services/optimalLocationService';
import { OptimalLocationsMap } from './OptimalLocationsMap';
import { OptimalLocationsList } from './OptimalLocationsList';
import { OptimalMapComponent } from './OptimalMapComponent';
import { OptimalBusinessSelector } from './OptimalBusinessSelector';
import { MagnifyingGlassIcon, MapIcon, ArrowTrendingUpIcon, StopIcon } from '@heroicons/react/24/outline';
import { CompetitorDetectionService } from '../services/competitorDetectionService';

interface SearchStats {
  totalRequests: number;
  cacheHits: number;
  timeElapsed: number;
  locationsFound: number;
  locationsAnalyzed: number;
}

// Add a type for competitors
interface Competitor {
  place_id: string;
  name: string;
  coordinates: { lat: number; lng: number };
  geometry: { location: { lat: number; lng: number } };
  [key: string]: any;
}

export const OptimalLocationAnalysis: React.FC = () => {
  const {
    optimalSearchLocation,
    setOptimalSearchLocation,
    optimalSearchBusiness,
    setOptimalSearchBusiness,
    optimalAnalysisRadius,
    setOptimalAnalysisRadius,
    optimalTargetRadius,
    setOptimalTargetRadius,
    optimalLocationResult,
    selectedOptimalLocation,
    setOptimalLocationResult,
    setSelectedOptimalLocation,
    isLoading,
    setLoading,
    resetOptimalSearch
  } = useMapStore();

  const [progress, setProgress] = useState(0);
  const [gridDensity, setGridDensity] = useState(6);
  const [searchStats, setSearchStats] = useState<SearchStats>({
    totalRequests: 0,
    cacheHits: 0,
    timeElapsed: 0,
    locationsFound: 0,
    locationsAnalyzed: 0
  });
  const [realTimeLocations, setRealTimeLocations] = useState<any[]>([]);
  const searchInstanceRef = useRef<any>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [competitorService] = useState(() => new CompetitorDetectionService());

  useEffect(() => {
    resetOptimalSearch();
  }, [resetOptimalSearch]);

  const handleMapReady = useCallback(() => {
    setIsMapReady(true);
  }, []);

  // Debug function to test specific coordinates
  const testMissingPharmacies = async () => {
    console.log('🔍 Testing missing pharmacy locations...');
    
    const testCoords = [
      { lat: 31.924229369644934, lng: 35.96841256594942 },
      { lat: 31.9232993779508, lng: 35.97171764102688 },
      { lat: 31.918799598045688, lng: 35.98378259079345 }
    ];
    
    for (const coord of testCoords) {
      console.log(`\n📍 Testing coordinates: ${coord.lat}, ${coord.lng}`);
      await competitorService.testSpecificLocation(coord.lat, coord.lng, 1);
    }
  };

  // Handle progress updates
  const handleProgress = (progress: number, found: number, total: number) => {
    setProgress(progress);
    setSearchStats(prev => ({
      ...prev,
      locationsFound: found,
      locationsAnalyzed: total
    }));
  };

  // Handle real-time location updates
  const handleLocationFound = (location: any) => {
    setRealTimeLocations(prev => {
      const updated = [...prev, location];
      // Sort by opportunity score and keep top 20 for performance
      return updated
        .sort((a, b) => b.opportunityScore - a.opportunityScore)
        .slice(0, 20);
    });
  };

  const handleFindOptimalLocations = async () => {
    if (!isMapReady) {
      alert('Map is not ready yet. Please wait for the map to load.');
      return;
    }
    if (!optimalSearchLocation || !optimalSearchBusiness) {
      alert('Please select both a location and business type');
      return;
    }

    setLoading(true);
    setProgress(0);
    setRealTimeLocations([]);
    setOptimalLocationResult(null);
    
    // Reset search stats
    setSearchStats({
      totalRequests: 0,
      cacheHits: 0,
      timeElapsed: 0,
      locationsFound: 0,
      locationsAnalyzed: 0
    });

    try {
      // Create search instance
      searchInstanceRef.current = createOptimalLocationSearch(
        handleProgress,
        handleLocationFound
      );

      const startTime = Date.now();
      
      const result = await searchInstanceRef.current.findOptimalLocations(
        optimalSearchLocation,
        optimalSearchBusiness,
        optimalAnalysisRadius,
        optimalTargetRadius,
        gridDensity
      );

      // Update final stats
      setSearchStats(prev => ({
        ...prev,
        totalRequests: result.searchStats.totalRequests,
        cacheHits: result.searchStats.cacheHits,
        timeElapsed: Date.now() - startTime
      }));

      setOptimalLocationResult(result);
      
      // Clear real-time locations since we have final results
      setRealTimeLocations([]);
      
    } catch (error) {
      console.error('Optimal location analysis failed:', error);
      alert('Analysis failed. Please try again.');
    } finally {
      setLoading(false);
      searchInstanceRef.current = null;
    }
  };

  const handleStopSearch = () => {
    if (searchInstanceRef.current) {
      searchInstanceRef.current.stop();
      
      // Show current real-time locations as partial results
      if (realTimeLocations.length > 0) {
        const partialResult = {
          bestLocations: realTimeLocations,
          analysisRadius: optimalAnalysisRadius,
          totalCompetitorsFound: realTimeLocations.reduce((sum, loc) => sum + loc.totalCompetitorsInRadius, 0),
          averageCompetitorDistance: realTimeLocations.length > 0 ? 
            realTimeLocations.reduce((sum, loc) => sum + loc.nearestCompetitorDistance, 0) / realTimeLocations.length : 0,
          marketSaturation: realTimeLocations.length > 0 ?
            realTimeLocations.reduce((sum, loc) => sum + loc.marketSaturation, 0) / realTimeLocations.length : 0,
          recommendations: ['Search stopped by user. Showing partial results.'],
          allPoints: realTimeLocations,
          searchStats: {
            totalRequests: searchStats.totalRequests,
            cacheHits: searchStats.cacheHits,
            timeElapsed: searchStats.timeElapsed
          }
        };
        
        setOptimalLocationResult(partialResult);
      }
    }
  };

  const handleLocationSelect = (location: any) => {
    setSelectedOptimalLocation(location);
  };

  const canAnalyze = optimalSearchLocation && optimalSearchBusiness && !isLoading && isMapReady;
  
  // Use real-time locations during search, final results after
  const displayLocations = isLoading ? realTimeLocations : (optimalLocationResult?.bestLocations || []);
  const allPoints = isLoading ? realTimeLocations : (optimalLocationResult ? (optimalLocationResult as any).allPoints || [] : []);

  // Aggregate all unique competitors from all optimal locations
  const allCompetitors: Competitor[] = (() => {
    const competitorMap = new Map<string, Competitor>();
    (displayLocations || []).forEach(loc => {
      (loc.competitors || []).forEach((comp: any) => {
        if (comp.place_id && !competitorMap.has(comp.place_id)) {
          // Use coordinates property directly
          const { lat, lng } = comp.coordinates || {};
          if (typeof lat === 'number' && typeof lng === 'number') {
            const competitor: Competitor = {
              ...comp,
              geometry: { location: { lat, lng } }
            };
            competitorMap.set(comp.place_id, competitor);
          }
        }
      });
    });
    // Filter to ensure all have geometry
    return Array.from(competitorMap.values()).filter(c => c.geometry && c.geometry.location && typeof c.geometry.location.lat === 'number' && typeof c.geometry.location.lng === 'number') as Competitor[];
  })();

  return (
    <div className="space-y-6">
      {/* Section: Select Center */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <ArrowTrendingUpIcon className="h-5 w-5 mr-2 text-blue-600" />
          1. Select Search Center
        </h2>
        <p className="text-sm text-gray-600 mb-4">Click on the map to set the center of your optimal search area.</p>
        <OptimalMapComponent onLocationSelect={setOptimalSearchLocation} analysisRadius={optimalAnalysisRadius} targetRadius={optimalTargetRadius} center={optimalSearchLocation || undefined} onMapReady={handleMapReady} />
        {optimalSearchLocation && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Selected Center:</strong> {optimalSearchLocation.lat.toFixed(6)}, {optimalSearchLocation.lng.toFixed(6)}
            </p>
          </div>
        )}
      </div>

      {/* Section: Business Selector */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">2. Business Configuration</h2>
        <OptimalBusinessSelector />
      </div>

      {/* Section: Analysis Parameters */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">3. Search Parameters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Analysis Radius: {optimalAnalysisRadius} km
            </label>
            <input
              type="range"
              min="5"
              max="20"
              step="1"
              value={optimalAnalysisRadius}
              onChange={(e) => setOptimalAnalysisRadius(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              disabled={isLoading}
            />
            <p className="text-sm text-gray-600 mt-1">
              Area to search for competitors and opportunities
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Density: {gridDensity} (≈{Math.pow(gridDensity, 2)} points)
            </label>
            <input
              type="range"
              min="4"
              max="12"
              step="1"
              value={gridDensity}
              onChange={(e) => setGridDensity(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              disabled={isLoading}
            />
            <p className="text-sm text-gray-600 mt-1">
              Higher density = more thorough analysis but slower search
            </p>
          </div>
        </div>

        {/* Search Controls */}
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={handleFindOptimalLocations}
            disabled={!canAnalyze || isLoading}
            className={`py-3 px-6 rounded-lg font-medium text-white flex items-center justify-center ${
              canAnalyze && !isLoading
                ? 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Analyzing Locations...
              </>
            ) : (
              <>
                <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
                Find Optimal Locations
              </>
            )}
          </button>
          
          {isLoading && (
            <button
              onClick={handleStopSearch}
              className="py-3 px-6 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 flex items-center"
            >
              <StopIcon className="h-5 w-5 mr-2" />
              Stop Search
            </button>
          )}

          {/* Debug button */}
          <button
            onClick={testMissingPharmacies}
            className="py-3 px-6 rounded-lg font-medium text-gray-700 bg-yellow-100 hover:bg-yellow-200 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 flex items-center"
          >
            🐛 Test Missing Pharmacies
          </button>
        </div>

        {/* Progress and Stats */}
        {isLoading && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Search Progress</span>
              <span className="text-sm text-gray-600">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-blue-600">{searchStats.locationsFound}</div>
                <div className="text-gray-600">Opportunities Found</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-green-600">{searchStats.locationsAnalyzed}</div>
                <div className="text-gray-600">Locations Analyzed</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-purple-600">{searchStats.totalRequests}</div>
                <div className="text-gray-600">API Requests</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-orange-600">{searchStats.cacheHits}</div>
                <div className="text-gray-600">Cache Hits</div>
              </div>
            </div>
          </div>
        )}

        {/* Validation Messages */}
        {!optimalSearchLocation && (
          <p className="text-sm text-gray-500 mt-2 text-center">
            Select a center on the map first
          </p>
        )}
        {!optimalSearchBusiness && optimalSearchLocation && (
          <p className="text-sm text-gray-500 mt-2 text-center">
            Choose a business type to continue
          </p>
        )}
      </div>

      {/* Results Map */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
          <div className="flex items-center">
            <MapIcon className="h-5 w-5 mr-2 text-blue-600" />
            Optimal Locations Map
          </div>
          {isLoading && realTimeLocations.length > 0 && (
            <span className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              Live Results: {realTimeLocations.length} found
            </span>
          )}
        </h3>
        <OptimalLocationsMap
          center={optimalSearchLocation || { lat: 40.7128, lng: -74.0060 }}
          optimalLocations={displayLocations}
          selectedLocation={selectedOptimalLocation}
          onLocationSelect={handleLocationSelect}
          analysisRadius={optimalAnalysisRadius}
          targetRadius={optimalTargetRadius}
          searchCenter={optimalSearchLocation || undefined}
          allPoints={allPoints}
          competitors={allCompetitors}
        />
      </div>

      {/* Results List */}
      {(displayLocations.length > 0 || isLoading) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"></div>
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {isLoading ? 'Live Results' : 'Best Locations'}
                </h3>
                {isLoading && (
                  <div className="animate-pulse w-3 h-3 bg-green-500 rounded-full"></div>
                )}
              </div>
              <OptimalLocationsList
                locations={displayLocations}
                selectedLocation={selectedOptimalLocation}
                onLocationSelect={handleLocationSelect}
              />
            </div>
          </div>
        </div>
      )}

      {/* Final Analysis Summary */}
      {optimalLocationResult && !isLoading && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Analysis Summary</h3>
            <div className="text-sm text-gray-600">
              Completed in {Math.round(searchStats.timeElapsed / 1000)}s
            </div>
          </div>
          
          {/* Performance Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">{optimalLocationResult.totalCompetitorsFound}</div>
              <div className="text-sm text-blue-600">Total Competitors</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">{optimalLocationResult.averageCompetitorDistance.toFixed(1)} km</div>
              <div className="text-sm text-green-600">Avg. Competitor Distance</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-600">{Math.round(optimalLocationResult.marketSaturation)}%</div>
              <div className="text-sm text-yellow-600">Market Saturation</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-600">{optimalLocationResult.bestLocations[0]?.opportunityScore || 0}%</div>
              <div className="text-sm text-purple-600">Best Opportunity Score</div>
            </div>
          </div>

          {/* Search Efficiency Stats */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="text-md font-semibold text-gray-900 mb-3">Search Efficiency</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-gray-700">{(optimalLocationResult as any).searchStats?.totalRequests || searchStats.totalRequests}</div>
                <div className="text-gray-600">API Requests</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-700">{(optimalLocationResult as any).searchStats?.cacheHits || searchStats.cacheHits}</div>
                <div className="text-gray-600">Cache Hits</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-700">
                  {Math.round((
                    ((optimalLocationResult as any).searchStats?.cacheHits || searchStats.cacheHits) /
                    Math.max(1, ((optimalLocationResult as any).searchStats?.totalRequests || searchStats.totalRequests) +
                    ((optimalLocationResult as any).searchStats?.cacheHits || searchStats.cacheHits))
                  ) * 100)}%
                </div>
                <div className="text-gray-600">Cache Hit Rate</div>
              </div>
            </div>
          </div>
          
          {/* Recommendations */}
          {optimalLocationResult.recommendations.length > 0 && (
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-3">Recommendations</h4>
              <ul className="space-y-2">
                {optimalLocationResult.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <span className="text-sm text-gray-700">{recommendation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};