'use client';

import { useMapStore } from '../store/mapStore';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

export const LocationFeedback: React.FC = () => {
  const { selectedLocation, selectedBusiness } = useMapStore();

  if (!selectedLocation) return null;

  return (
    <div className="absolute bottom-4 right-4 z-10 bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow-lg p-3 border border-green-200">
      <div className="flex items-center space-x-2">
        <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-gray-900">
            Location Selected
          </p>
          <p className="text-xs text-gray-600">
            {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
          </p>
          {selectedBusiness && (
            <p className="text-xs text-blue-600">
              {selectedBusiness.name} • {selectedLocation.lat.toFixed(1)} km radius
            </p>
          )}
        </div>
      </div>
    </div>
  );
}; 