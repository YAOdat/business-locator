'use client';

import { useState } from 'react';
import { Listbox } from '@headlessui/react';
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/20/solid';
import { useMapStore } from '../store/mapStore';
import { businessCategories } from '../data/businessCategories';
import { BusinessCategory } from '../types/business';

export const OptimalBusinessSelector: React.FC = () => {
  const { optimalSearchBusiness, setOptimalSearchBusiness, optimalTargetRadius, setOptimalTargetRadius } = useMapStore();
  const [selected, setSelected] = useState<BusinessCategory | null>(optimalSearchBusiness);

  const handleBusinessChange = (business: BusinessCategory) => {
    setSelected(business);
    setOptimalSearchBusiness(business);
  };

  return (
    <div className="space-y-6">
      {/* Business Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Business Type
        </label>
        <Listbox value={selected} onChange={handleBusinessChange}>
          <div className="relative">
            <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm border border-gray-300">
              <span className="block truncate">
                {selected ? (
                  <span className="flex items-center">
                    <span className="text-lg mr-2">{selected.icon}</span>
                    {selected.name}
                  </span>
                ) : (
                  'Choose a business type...'
                )}
              </span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronUpDownIcon
                  className="h-5 w-5 text-gray-400"
                  aria-hidden="true"
                />
              </span>
            </Listbox.Button>
            <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-10">
              {businessCategories.map((business) => (
                <Listbox.Option
                  key={business.id}
                  className={({ active }) =>
                    `relative cursor-default select-none py-2 pl-10 pr-4 ${
                      active ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
                    }`
                  }
                  value={business}
                >
                  {({ selected }) => (
                    <>
                      <span className={`block truncate flex items-center`}>
                        <span className="text-lg mr-2">{business.icon}</span>
                        <div>
                          <div className="font-medium">{business.name}</div>
                          <div className="text-sm text-gray-500">{business.description}</div>
                        </div>
                      </span>
                      {selected ? (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
                        </span>
                      ) : null}
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </div>
        </Listbox>
      </div>

      {/* Radius Selection */}
      {selected && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Service Radius: {optimalTargetRadius} km
          </label>
          <input
            type="range"
            min={selected.minRadius}
            max={selected.maxRadius}
            step={0.1}
            value={optimalTargetRadius}
            onChange={(e) => setOptimalTargetRadius(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{selected.minRadius} km</span>
            <span>{selected.maxRadius} km</span>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Recommended range for {selected.name.toLowerCase()}: {selected.minRadius}-{selected.maxRadius} km
          </p>
        </div>
      )}
    </div>
  );
}; 