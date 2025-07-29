'use client';

import { useEffect, useRef } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';

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

interface OptimalLocationsMapProps {
  center: google.maps.LatLngLiteral;
  optimalLocations: OptimalLocation[];
  selectedLocation: OptimalLocation | null;
  onLocationSelect: (location: OptimalLocation) => void;
  // New: allPoints for heatmap
  allPoints?: OptimalLocation[];
  // New props for radii and center
  analysisRadius?: number;
  targetRadius?: number;
  searchCenter?: { lat: number; lng: number };
  competitors?: Competitor[]; // New prop for competitor markers
}

// Add Competitor type for clarity
interface Competitor {
  place_id: string;
  name: string;
  geometry: { location: { lat: number; lng: number } };
  [key: string]: any;
}

const render = (status: Status) => {
  if (status === Status.LOADING) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  if (status === Status.FAILURE) return <div className="text-red-500">Error loading map</div>;
  return <div className="flex items-center justify-center h-96"><div className="text-gray-500">Loading...</div></div>;
};

const Map: React.FC<OptimalLocationsMapProps> = ({ 
  center, 
  optimalLocations, 
  selectedLocation, 
  onLocationSelect,
  allPoints = [],
  // New props for radii and center
  analysisRadius,
  targetRadius,
  searchCenter,
  competitors = [] // New
}) => {
  // Debug: log competitors
  console.log('[OptimalLocationsMap] competitors:', competitors);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const heatmapRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);
  const analysisCircleRef = useRef<google.maps.Circle | null>(null);
  const targetCircleRef = useRef<google.maps.Circle | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = new google.maps.Map(mapRef.current, {
      center,
      zoom: 12,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      scrollwheel: true,
      gestureHandling: 'cooperative',
    });

    mapInstanceRef.current = map;

    return () => {
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      if (heatmapRef.current) heatmapRef.current.setMap(null);
      if (analysisCircleRef.current) analysisCircleRef.current.setMap(null);
      if (targetCircleRef.current) targetCircleRef.current.setMap(null);
    };
  }, [center]);

  // Update markers, heatmap, and circles when locations or radii change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Create heatmap data from allPoints (or optimalLocations if not provided)
    const heatmapData: google.maps.visualization.WeightedLocation[] = (allPoints.length ? allPoints : optimalLocations).map(loc => ({
      location: new google.maps.LatLng(loc.location.lat, loc.location.lng),
      weight: Math.max(1, loc.opportunityScore)
    }));

    optimalLocations.forEach((location, index) => {
      const position = new google.maps.LatLng(location.location.lat, location.location.lng);
      const marker = new google.maps.Marker({
        position,
        map: mapInstanceRef.current,
        title: `Opportunity Score: ${location.opportunityScore}%`,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="16" fill="${location.opportunityScore >= 80 ? '#10B981' : location.opportunityScore >= 60 ? '#F59E0B' : location.opportunityScore >= 40 ? '#F97316' : '#EF4444'}" fill-opacity="0.8"/>
              <circle cx="16" cy="16" r="8" fill="white"/>
              <text x="16" y="20" text-anchor="middle" font-size="12" font-weight="bold" fill="black">${Math.round(location.opportunityScore)}</text>
            </svg>
          `),
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 16),
        },
        zIndex: optimalLocations.length - index,
      });
      marker.addListener('click', () => {
        onLocationSelect(location);
      });
      markersRef.current.push(marker);
    });

    // Render competitor markers (distinct color/icon)
    competitors.forEach((competitor) => {
      const { lat, lng } = competitor.geometry.location;
      const position = new google.maps.LatLng(lat, lng);
      // Debug: log each competitor marker
      console.log('[OptimalLocationsMap] Rendering competitor marker:', { name: competitor.name, lat, lng });
      const marker = new google.maps.Marker({
        position,
        map: mapInstanceRef.current,
        title: competitor.name,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="14" fill="#8B5CF6" fill-opacity="0.85"/>
              <text x="16" y="21" text-anchor="middle" font-size="13" font-weight="bold" fill="white">C</text>
            </svg>
          `),
          scaledSize: new google.maps.Size(28, 28),
          anchor: new google.maps.Point(14, 14),
        },
        zIndex: 1,
      });
      marker.addListener('click', () => {
        // Optionally, show info window or highlight
      });
      markersRef.current.push(marker);
    });

    // Create heatmap layer
    if (window.google?.maps?.visualization) {
      if (heatmapRef.current) {
        heatmapRef.current.setMap(null);
      }
      heatmapRef.current = new google.maps.visualization.HeatmapLayer({
        data: heatmapData,
        map: mapInstanceRef.current,
        radius: 50,
        opacity: 0.5,
        gradient: [
          'rgba(0, 255, 255, 0)',
          'rgba(0, 255, 255, 1)',
          'rgba(0, 191, 255, 1)',
          'rgba(0, 127, 255, 1)',
          'rgba(0, 63, 255, 1)',
          'rgba(0, 0, 255, 1)',
          'rgba(0, 0, 223, 1)',
          'rgba(0, 0, 191, 1)',
          'rgba(0, 0, 159, 1)',
          'rgba(0, 0, 127, 1)',
          'rgba(63, 0, 91, 1)',
          'rgba(127, 0, 63, 1)',
          'rgba(191, 0, 31, 1)',
          'rgba(255, 0, 0, 1)'
        ]
      });
    }

  }, [optimalLocations, allPoints, onLocationSelect, competitors]);

  // Fit map to bounds only when optimalLocations change
  useEffect(() => {
    if (!mapInstanceRef.current || !optimalLocations.length) return;
    const bounds = new google.maps.LatLngBounds();
    optimalLocations.forEach(location => {
      const position = new google.maps.LatLng(location.location.lat, location.location.lng);
      bounds.extend(position);
    });
    if (!bounds.isEmpty()) mapInstanceRef.current.fitBounds(bounds);
  }, [optimalLocations]);

  // Draw analysis and target radius circles (separate effect for live updates)
  useEffect(() => {
    console.log('Drawing circles', { analysisRadius, targetRadius, searchCenter });
    if (!mapInstanceRef.current) return;
    if (analysisCircleRef.current) analysisCircleRef.current.setMap(null);
    if (targetCircleRef.current) targetCircleRef.current.setMap(null);
    if (searchCenter && analysisRadius) {
      analysisCircleRef.current = new google.maps.Circle({
        strokeColor: '#6B7280',
        strokeOpacity: 0.7,
        strokeWeight: 2,
        fillColor: '#9CA3AF',
        fillOpacity: 0.08,
        map: mapInstanceRef.current,
        center: searchCenter,
        radius: analysisRadius * 1000,
        clickable: false,
        zIndex: 1
      });
    }
    if (searchCenter && targetRadius) {
      targetCircleRef.current = new google.maps.Circle({
        strokeColor: '#2563EB',
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: '#3B82F6',
        fillOpacity: 0.12,
        map: mapInstanceRef.current,
        center: searchCenter,
        radius: targetRadius * 1000,
        clickable: false,
        zIndex: 2
      });
    }
  }, [analysisRadius, targetRadius, searchCenter]);

  return (
    <div className="relative w-full h-96 rounded-lg shadow-lg overflow-hidden">
      <div ref={mapRef} className="w-full h-full" />
      {/* Heatmap Legend */}
      <div className="absolute top-4 right-4 bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow-lg p-3 border border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Opportunity Heatmap</h3>
        <div className="flex items-center space-x-2 mb-1">
          <span className="w-4 h-4 rounded-full" style={{ background: 'rgba(16,185,129,0.8)' }}></span>
          <span className="text-xs text-gray-600">High Opportunity</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-4 h-4 rounded-full" style={{ background: 'rgba(239,68,68,0.8)' }}></span>
          <span className="text-xs text-gray-600">Low Opportunity</span>
        </div>
        <div className="flex items-center space-x-2 mt-2">
          <span className="inline-block w-4 h-4 rounded-full border-2 border-gray-400 bg-gray-200"></span>
          <span className="text-xs text-gray-600">Analysis Radius</span>
        </div>
        <div className="flex items-center space-x-2 mt-1">
          <span className="inline-block w-4 h-4 rounded-full border-2 border-blue-600 bg-blue-200"></span>
          <span className="text-xs text-gray-600">Target Radius</span>
        </div>
        <div className="flex items-center space-x-2 mt-1">
          <span className="inline-block w-4 h-4 rounded-full border-2 border-purple-600 bg-purple-200"></span>
          <span className="text-xs text-gray-600">Competitor</span>
        </div>
      </div>
    </div>
  );
};

export const OptimalLocationsMap: React.FC<OptimalLocationsMapProps> = (props) => {
  return (
    <div className="w-full">
      <Wrapper apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!} libraries={['places']} render={render}>
        <Map {...props} />
      </Wrapper>
    </div>
  );
}; 