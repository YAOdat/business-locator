'use client';

import { useState, useEffect } from 'react';
import { MapPinIcon, XMarkIcon } from '@heroicons/react/24/outline';

export const MapInstructions: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Hide instructions after 5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="absolute top-4 left-4 z-10 bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow-lg p-4 max-w-xs border border-gray-200">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <MapPinIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              Select Location
            </h3>
            <p className="text-xs text-gray-600">
              Click anywhere on the map to place your business location. A blue circle will show your service radius.
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}; 