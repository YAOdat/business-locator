export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

export interface BusinessCategory {
  id: string;
  name: string;
  minRadius: number;
  maxRadius: number;
  defaultRadius: number;
  icon: string;
  description: string;
}

export interface AnalysisResult {
  successProbability: number;
  competitionScore: number;
  demographicScore: number;
  locationScore: number;
  totalCompetitors: number;
  nearestCompetitorDistance: number;
  recommendations: string[];
  risks: string[];
}

export interface MapState {
  selectedLocation: Location | null;
  selectedRadius: number;
  selectedBusiness: BusinessCategory | null;
  analysisResult: AnalysisResult | null;
  isLoading: boolean;
} 