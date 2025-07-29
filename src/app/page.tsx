'use client';

import { useState } from 'react';
import { MapComponent } from '../components/MapComponent';
import { BusinessSelector } from '../components/BusinessSelector';
import { AnalysisResults } from '../components/AnalysisResults';
import { OptimalLocationAnalysis } from '../components/OptimalLocationAnalysis';
import { useMapStore } from '../store/mapStore';
import { analyzeLocation } from '../services/analysisService';
import { Location } from '../types/business';
import { MagnifyingGlassIcon, MapPinIcon, ArrowTrendingUpIcon, ChartBarIcon } from '@heroicons/react/24/outline';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'basic' | 'optimal'>('basic');
  
  const { 
    selectedLocation, 
    selectedBusiness, 
    selectedRadius, 
    analysisResult, 
    isLoading,
    setSelectedLocation, 
    setAnalysisResult, 
    setLoading 
  } = useMapStore();

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
  };

  const handleAnalyze = async () => {
    if (!selectedLocation || !selectedBusiness) {
      alert('Please select both a location and business type');
      return;
    }

    setLoading(true);
    try {
      const result = await analyzeLocation(selectedLocation, selectedBusiness, selectedRadius);
      setAnalysisResult(result);
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canAnalyze = selectedLocation && selectedBusiness && !isLoading;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <MapPinIcon className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Business Locator</h1>
                <p className="text-sm text-gray-600">Find the perfect location for your business</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('basic')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'basic'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ChartBarIcon className="h-5 w-5 inline mr-2" />
              Basic Analysis
            </button>
            <button
              onClick={() => setActiveTab('optimal')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'optimal'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ArrowTrendingUpIcon className="h-5 w-5 inline mr-2" />
              Optimal Location Finder
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'basic' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Map and Controls */}
            <div className="lg:col-span-2 space-y-6">
              {/* Map */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Location</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Click on the map to select your desired business location
                </p>
                <MapComponent onLocationSelect={handleLocationSelect} />
                
                {selectedLocation && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Selected:</strong> {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                    </p>
                  </div>
                )}
              </div>

              {/* Business Selection */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Business Configuration</h2>
                <BusinessSelector />
              </div>

              {/* Analyze Button */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <button
                  onClick={handleAnalyze}
                  disabled={!canAnalyze}
                  className={`w-full py-3 px-4 rounded-lg font-medium text-white flex items-center justify-center ${
                    canAnalyze
                      ? 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
                      Analyze Location
                    </>
                  )}
                </button>
                
                {!selectedLocation && (
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    Select a location on the map first
                  </p>
                )}
                
                {!selectedBusiness && selectedLocation && (
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    Choose a business type to continue
                  </p>
                )}
              </div>
            </div>

            {/* Right Column - Results */}
            <div className="lg:col-span-1">
              {analysisResult ? (
                <AnalysisResults />
              ) : (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <div className="text-center text-gray-500">
                    <MapPinIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Analyze</h3>
                    <p className="text-sm text-gray-600">
                      Select a location and business type, then click "Analyze Location" to see your success probability.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <OptimalLocationAnalysis />
        )}
      </div>
    </div>
  );
}
