'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { useMapStore } from '../store/mapStore';
import { Location } from '../types/business';
import { MapInstructions } from './MapInstructions';
import { LocationFeedback } from './LocationFeedback';

const render = (status: Status) => {
  if (status === Status.LOADING) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  if (status === Status.FAILURE) return <div className="text-red-500">Error loading map</div>;
  return <div className="flex items-center justify-center h-96"><div className="text-gray-500">Loading...</div></div>;
};

interface MapProps {
  center: google.maps.LatLngLiteral;
  zoom: number;
  onLocationSelect: (location: Location) => void;
  selectedRadius: number;
}

const Map: React.FC<MapProps> = ({ center, zoom, onLocationSelect, selectedRadius }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // Create custom marker icon
  const createCustomMarkerIcon = useCallback(() => {
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="16" fill="#3B82F6" fill-opacity="0.2"/>
          <circle cx="16" cy="16" r="8" fill="#3B82F6"/>
          <circle cx="16" cy="16" r="4" fill="white"/>
        </svg>
      `),
      scaledSize: new google.maps.Size(32, 32),
      anchor: new google.maps.Point(16, 16),
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const mapOptions: google.maps.MapOptions = {
      center,
      zoom,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      scrollwheel: true,
      gestureHandling: 'cooperative',
      // Performance optimizations
      disableDefaultUI: false,
      clickableIcons: false,
      draggableCursor: 'crosshair',
    };

    const map = new google.maps.Map(mapRef.current, mapOptions);
    mapInstanceRef.current = map;

    // Add map ready listener
    map.addListener('idle', () => {
      setIsMapReady(true);
    });

    // Add click listener with debouncing
    let clickTimeout: NodeJS.Timeout;
    map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;

      // Clear previous timeout
      clearTimeout(clickTimeout);

      // Debounce click events
      clickTimeout = setTimeout(() => {
        const location: Location = {
          lat: e.latLng!.lat(),
          lng: e.latLng!.lng(),
        };

        updateMarkerAndCircle(e.latLng!, selectedRadius);
        onLocationSelect(location);
      }, 100);
    });

    return () => {
      if (markerRef.current) markerRef.current.setMap(null);
      if (circleRef.current) circleRef.current.setMap(null);
      clearTimeout(clickTimeout);
    };
  }, [center, zoom, onLocationSelect, selectedRadius]);

  // Update marker and circle
  const updateMarkerAndCircle = useCallback((position: google.maps.LatLng, radius: number) => {
    if (!mapInstanceRef.current) return;

    // Remove existing marker and circle
    if (markerRef.current) {
      markerRef.current.setMap(null);
    }
    if (circleRef.current) {
      circleRef.current.setMap(null);
    }

    // Create new marker
    markerRef.current = new google.maps.Marker({
      position,
      map: mapInstanceRef.current,
      title: 'Selected Location',
      icon: createCustomMarkerIcon(),
      animation: google.maps.Animation.DROP,
      draggable: false,
    });

    // Create new circle
    circleRef.current = new google.maps.Circle({
      strokeColor: '#3B82F6',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#3B82F6',
      fillOpacity: 0.1,
      map: mapInstanceRef.current,
      center: position,
      radius: radius * 1000, // Convert km to meters
      clickable: false,
    });

    // Add marker drag listener
    markerRef.current.addListener('dragend', (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      
      const location: Location = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
      };

      // Update circle position
      if (circleRef.current) {
        circleRef.current.setCenter(e.latLng);
      }

      onLocationSelect(location);
    });
  }, [createCustomMarkerIcon, onLocationSelect]);

  // Update circle when radius changes
  useEffect(() => {
    if (circleRef.current && markerRef.current && isMapReady) {
      const position = markerRef.current.getPosition();
      if (position) {
        circleRef.current.setRadius(selectedRadius * 1000);
      }
    }
  }, [selectedRadius, isMapReady]);

  return (
    <div className="relative w-full h-96 rounded-lg shadow-lg overflow-hidden">
      <div ref={mapRef} className="w-full h-full" />
      <MapInstructions />
      <LocationFeedback />
      {!isMapReady && (
        <div className="absolute inset-0 bg-gray-100 bg-opacity-75 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
};

interface MapComponentProps {
  onLocationSelect: (location: Location) => void;
}

export const MapComponent: React.FC<MapComponentProps> = ({ onLocationSelect }) => {
  const { selectedLocation, selectedRadius } = useMapStore();
  
  const defaultCenter: google.maps.LatLngLiteral = {
    lat: 40.7128,
    lng: -74.0060,
  };

  return (
    <div className="w-full">
      <Wrapper apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!} libraries={['places']} render={render}>
        <Map
          center={selectedLocation || defaultCenter}
          zoom={selectedLocation ? 15 : 10}
          onLocationSelect={onLocationSelect}
          selectedRadius={selectedRadius}
        />
      </Wrapper>
    </div>
  );
}; 