import { create } from 'zustand';
import { MapState, Location, BusinessCategory, AnalysisResult } from '../types/business';

interface OptimalLocation {
  location: Location;
  nearestCompetitorDistance: number;
  coverageScore: number;
  totalCompetitorsInRadius: number;
  marketSaturation: number;
  opportunityScore: number;
}

interface OptimalLocationResult {
  bestLocations: OptimalLocation[];
  analysisRadius: number;
  totalCompetitorsFound: number;
  averageCompetitorDistance: number;
  marketSaturation: number;
  recommendations: string[];
}

interface MapStore extends MapState {
  setSelectedLocation: (location: Location | null) => void;
  setSelectedRadius: (radius: number) => void;
  setSelectedBusiness: (business: BusinessCategory | null) => void;
  setAnalysisResult: (result: AnalysisResult | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;

  // Optimal location functionality
  optimalLocationResult: OptimalLocationResult | null;
  selectedOptimalLocation: OptimalLocation | null;
  setOptimalLocationResult: (result: OptimalLocationResult | null) => void;
  setSelectedOptimalLocation: (location: OptimalLocation | null) => void;

  // Dedicated state for optimal search
  optimalSearchLocation: Location | null;
  setOptimalSearchLocation: (location: Location | null) => void;
  optimalSearchBusiness: BusinessCategory | null;
  setOptimalSearchBusiness: (business: BusinessCategory | null) => void;
  optimalAnalysisRadius: number;
  setOptimalAnalysisRadius: (radius: number) => void;
  optimalTargetRadius: number;
  setOptimalTargetRadius: (radius: number) => void;
  resetOptimalSearch: () => void;
}

const initialState: MapState = {
  selectedLocation: null,
  selectedRadius: 2,
  selectedBusiness: null,
  analysisResult: null,
  isLoading: false,
};

const initialOptimalState = {
  optimalLocationResult: null,
  selectedOptimalLocation: null,
  optimalSearchLocation: null,
  optimalSearchBusiness: null,
  optimalAnalysisRadius: 10,
  optimalTargetRadius: 2,
};

export const useMapStore = create<MapStore>((set) => ({
  ...initialState,
  ...initialOptimalState,

  setSelectedLocation: (location) => set({ selectedLocation: location }),
  setSelectedRadius: (radius) => set({ selectedRadius: radius }),
  setSelectedBusiness: (business) => set({ 
    selectedBusiness: business,
    selectedRadius: business?.defaultRadius || 2 
  }),
  setAnalysisResult: (result) => set({ analysisResult: result }),
  setLoading: (loading) => set({ isLoading: loading }),
  reset: () => set({ ...initialState, ...initialOptimalState }),

  // Optimal location functions
  setOptimalLocationResult: (result) => set({ optimalLocationResult: result }),
  setSelectedOptimalLocation: (location) => set({ selectedOptimalLocation: location }),

  setOptimalSearchLocation: (location) => set({ optimalSearchLocation: location }),
  setOptimalSearchBusiness: (business) => set({ 
    optimalSearchBusiness: business,
    optimalTargetRadius: business?.defaultRadius || 2
  }),
  setOptimalAnalysisRadius: (radius) => set({ optimalAnalysisRadius: radius }),
  setOptimalTargetRadius: (radius) => set({ optimalTargetRadius: radius }),
  resetOptimalSearch: () => set({
    optimalLocationResult: null,
    selectedOptimalLocation: null,
    optimalSearchLocation: null,
    optimalSearchBusiness: null,
    optimalAnalysisRadius: 10,
    optimalTargetRadius: 2,
  }),
})); 