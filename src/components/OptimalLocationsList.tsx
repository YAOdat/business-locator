'use client';

import { StarIcon, MapPinIcon, ArrowTrendingUpIcon, UsersIcon } from '@heroicons/react/24/outline';

interface OptimalLocation {
  location: {
    lat: number;
    lng: number;
  };
  nearestCompetitorDistance: number;
  coverageScore: number;
  totalCompetitorsInRadius: number;
  marketSaturation: number;
  opportunityScore: number;
}

interface OptimalLocationsListProps {
  locations: OptimalLocation[];
  selectedLocation: OptimalLocation | null;
  onLocationSelect: (location: OptimalLocation) => void;
}

export const OptimalLocationsList: React.FC<OptimalLocationsListProps> = ({
  locations,
  selectedLocation,
  onLocationSelect
}) => {
  const getOpportunityColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (score >= 40) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getOpportunityIcon = (score: number) => {
    if (score >= 80) return '⭐';
    if (score >= 60) return '👍';
    if (score >= 40) return '🤔';
    return '⚠️';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Top Locations</h3>
        <span className="text-sm text-gray-500">{locations.length} locations found</span>
      </div>
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {locations.map((location, index) => (
          <div
            key={`${location.location.lat}-${location.location.lng}`}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
              selectedLocation === location
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
            onClick={() => onLocationSelect(location)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{getOpportunityIcon(location.opportunityScore)}</span>
                <span className="font-medium text-gray-900">Location #{index + 1}</span>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-semibold border ${getOpportunityColor(location.opportunityScore)}`}>
                {location.opportunityScore}%
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <MapPinIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Nearest competitor:</span>
                </div>
                <div className="ml-6 font-medium text-gray-900">
                  {location.nearestCompetitorDistance.toFixed(1)} km
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <UsersIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Competitors in radius:</span>
                </div>
                <div className="ml-6 font-medium text-gray-900">
                  {location.totalCompetitorsInRadius}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <ArrowTrendingUpIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Coverage score:</span>
                </div>
                <div className="ml-6 font-medium text-gray-900">
                  {location.coverageScore}%
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <StarIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Market saturation:</span>
                </div>
                <div className="ml-6 font-medium text-gray-900">
                  {location.marketSaturation}%
                </div>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-xs text-gray-500">
                Coordinates: {location.location.lat.toFixed(4)}, {location.location.lng.toFixed(4)}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {locations.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <MapPinIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No optimal locations found</p>
          <p className="text-sm">Try adjusting your search parameters</p>
        </div>
      )}
    </div>
  );
}; 