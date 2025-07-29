'use client';

import { useMapStore } from '../store/mapStore';
import { AnalysisResult } from '../types/business';
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface ScoreCardProps {
  title: string;
  score: number;
  description: string;
  color: string;
}

const ScoreCard: React.FC<ScoreCardProps> = ({ title, score, description, color }) => (
  <div className={`bg-white p-4 rounded-lg shadow-sm border-l-4 ${color}`}>
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <div className={`text-2xl font-bold ${color.replace('border-', 'text-')}`}>
        {score}
      </div>
    </div>
  </div>
);

export const AnalysisResults: React.FC = () => {
  const { analysisResult, selectedBusiness, selectedLocation } = useMapStore();

  if (!analysisResult || !selectedBusiness || !selectedLocation) {
    return null;
  }

  const getSuccessColor = (probability: number) => {
    if (probability >= 80) return 'text-green-600';
    if (probability >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSuccessIcon = (probability: number) => {
    if (probability >= 80) return '🎉';
    if (probability >= 60) return '👍';
    return '⚠️';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="text-4xl mb-2">{getSuccessIcon(analysisResult.successProbability)}</div>
        <h2 className="text-2xl font-bold text-gray-900">Success Probability</h2>
        <div className={`text-4xl font-bold ${getSuccessColor(analysisResult.successProbability)}`}>
          {analysisResult.successProbability}%
        </div>
        <p className="text-gray-600 mt-2">
          Analysis for {selectedBusiness.name} at selected location
        </p>
      </div>

      {/* Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ScoreCard
          title="Competition Score"
          score={analysisResult.competitionScore}
          description="Based on nearby competitors"
          color="border-blue-500"
        />
        <ScoreCard
          title="Demographic Score"
          score={analysisResult.demographicScore}
          description="Population and income factors"
          color="border-green-500"
        />
        <ScoreCard
          title="Location Score"
          score={analysisResult.locationScore}
          description="Accessibility and visibility"
          color="border-purple-500"
        />
      </div>

      {/* Competition Details */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Competition Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Competitors</p>
            <p className="text-xl font-semibold text-gray-900">{analysisResult.totalCompetitors}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Nearest Competitor</p>
            <p className="text-xl font-semibold text-gray-900">
              {analysisResult.nearestCompetitorDistance.toFixed(1)} km
            </p>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {analysisResult.recommendations.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
            Recommendations
          </h3>
          <ul className="space-y-2">
            {analysisResult.recommendations.map((recommendation, index) => (
              <li key={index} className="flex items-start">
                <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">{recommendation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risks */}
      {analysisResult.risks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mr-2" />
            Potential Risks
          </h3>
          <ul className="space-y-2">
            {analysisResult.risks.map((risk, index) => (
              <li key={index} className="flex items-start">
                <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Location Info */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
          <InformationCircleIcon className="h-5 w-5 text-blue-500 mr-2" />
          Selected Location
        </h3>
        <div className="text-sm text-gray-700">
          <p>Latitude: {selectedLocation.lat.toFixed(6)}</p>
          <p>Longitude: {selectedLocation.lng.toFixed(6)}</p>
          <p>Service Radius: {analysisResult.nearestCompetitorDistance.toFixed(1)} km</p>
        </div>
      </div>
    </div>
  );
}; 