// Duplicated from MapComponent, now as OptimalMapComponent
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
  return <></>;
};

const OptimalMapInner: React.FC<OptimalMapComponentProps> = ({ onLocationSelect, analysisRadius, targetRadius, center, onMapReady }) => {
  const { optimalSearchLocation, optimalAnalysisRadius, optimalTargetRadius } = useMapStore();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const analysisCircleRef = useRef<google.maps.Circle | null>(null);
  const targetCircleRef = useRef<google.maps.Circle | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

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

  useEffect(() => {
    console.log('[OptimalMapInner] mount, mapRef:', mapRef.current);
    if (!mapRef.current || mapInstanceRef.current) return;
    const mapOptions: google.maps.MapOptions = {
      center: center || optimalSearchLocation || { lat: 40.7128, lng: -74.0060 },
      zoom: (center || optimalSearchLocation) ? 15 : 10,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      scrollwheel: true,
      gestureHandling: 'cooperative',
      disableDefaultUI: false,
      clickableIcons: false,
      draggableCursor: 'crosshair',
    };
    console.log('[OptimalMapInner] Creating map with options:', mapOptions);
    const map = new google.maps.Map(mapRef.current, mapOptions);
    mapInstanceRef.current = map;
    console.log('[OptimalMapInner] Map instance created:', mapInstanceRef.current);
    map.addListener('idle', () => {
      console.log('[OptimalMapInner] Map idle event fired');
      setIsMapReady(true);
      // Only call onMapReady if the Places library is loaded
      console.log('[OptimalMapInner] window.google:', window.google);
      console.log('[OptimalMapInner] window.google.maps:', window.google?.maps);
      console.log('[OptimalMapInner] window.google.maps.places:', window.google?.maps?.places);
      if (onMapReady && window.google?.maps?.places) {
        onMapReady();
      }
    });
    let clickTimeout: NodeJS.Timeout;
    map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      clearTimeout(clickTimeout);
      clickTimeout = setTimeout(() => {
        const location: Location = {
          lat: e.latLng!.lat(),
          lng: e.latLng!.lng(),
        };
        updateMarker(e.latLng!);
        onLocationSelect(location);
      }, 100);
    });
    return () => {
      if (markerRef.current) markerRef.current.setMap(null);
      if (analysisCircleRef.current) analysisCircleRef.current.setMap(null);
      if (targetCircleRef.current) targetCircleRef.current.setMap(null);
      clearTimeout(clickTimeout);
    };
  }, [center, optimalSearchLocation, onLocationSelect, onMapReady]);

  const updateMarker = useCallback((position: google.maps.LatLng) => {
    if (!mapInstanceRef.current) return;
    if (markerRef.current) {
      markerRef.current.setMap(null);
    }
    markerRef.current = new google.maps.Marker({
      position,
      map: mapInstanceRef.current,
      title: 'Selected Location',
      icon: createCustomMarkerIcon(),
      animation: google.maps.Animation.DROP,
      draggable: false,
    });
  }, [createCustomMarkerIcon]);

  // Draw analysis and target radius circles live
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (analysisCircleRef.current) analysisCircleRef.current.setMap(null);
    if (targetCircleRef.current) targetCircleRef.current.setMap(null);
    const c = center || optimalSearchLocation;
    const aR = analysisRadius ?? optimalAnalysisRadius;
    const tR = targetRadius ?? optimalTargetRadius;
    if (c && aR) {
      analysisCircleRef.current = new google.maps.Circle({
        strokeColor: '#6B7280',
        strokeOpacity: 0.7,
        strokeWeight: 2,
        fillColor: '#9CA3AF',
        fillOpacity: 0.08,
        map: mapInstanceRef.current,
        center: c,
        radius: aR * 1000,
        clickable: false,
        zIndex: 1
      });
    }
    if (c && tR) {
      targetCircleRef.current = new google.maps.Circle({
        strokeColor: '#2563EB',
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: '#3B82F6',
        fillOpacity: 0.12,
        map: mapInstanceRef.current,
        center: c,
        radius: tR * 1000,
        clickable: false,
        zIndex: 2
      });
    }
  }, [center, optimalSearchLocation, analysisRadius, targetRadius, optimalAnalysisRadius, optimalTargetRadius]);

  return (
    <div id="optimal-map-container" className="relative w-full h-96 rounded-lg shadow-lg overflow-hidden">
      <div ref={mapRef} className="w-full h-full" />
      <MapInstructions />
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

interface OptimalMapComponentProps {
  onLocationSelect: (location: Location) => void;
  analysisRadius?: number;
  targetRadius?: number;
  center?: { lat: number; lng: number };
  onMapReady?: () => void;
}

export const OptimalMapComponent: React.FC<OptimalMapComponentProps> = (props) => (
  <Wrapper apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!} libraries={['places']} render={render}>
    <OptimalMapInner {...props} />
  </Wrapper>
); 