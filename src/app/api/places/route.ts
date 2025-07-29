import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const radius = searchParams.get('radius');
  const keyword = searchParams.get('keyword'); // Used as type
  // const type = searchParams.get('type'); // Not used in new API

  console.log('🔍 Places API (New) Request:', { lat, lng, radius, keyword });

  if (!lat || !lng || !radius || !keyword) {
    console.error('❌ Missing required parameters');
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    );
  }

  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('❌ Google Places API key not found');
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    // Build request for Places API (New)
    const url = 'https://places.googleapis.com/v1/places:searchNearby';
    const body = {
      includedTypes: [keyword],
      maxResultCount: 20,
      locationRestriction: {
        circle: {
          center: {
            latitude: parseFloat(lat),
            longitude: parseFloat(lng)
          },
          radius: parseFloat(radius) // in meters
        }
      }
    };
    // Field mask: only fetch what we need
    const fieldMask = [
      'places.id',
      'places.displayName',
      'places.location',
      'places.types',
      'places.rating'
    ].join(',');

    console.log('🌐 Making request to Places API (New):', url, body);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': fieldMask
      },
      body: JSON.stringify(body)
    });
    const data = await response.json();

    // Filter results to ensure only true competitors (by type)
    let results = (data.places || []).filter((place: any) => {
      // Must have the keyword as a type
      return place.types && place.types.includes(keyword);
    });

    // Map to legacy-like format for frontend compatibility
    results = results.map((place: any) => ({
      place_id: place.id,
      name: place.displayName?.text || '',
      geometry: {
        location: {
          lat: place.location?.latitude,
          lng: place.location?.longitude
        }
      },
      types: place.types,
      rating: place.rating
    }));

    console.log('📊 Places API (New) Response:', {
      resultsCount: results.length,
      keyword
    });

    return NextResponse.json({ status: 'OK', results });
  } catch (error) {
    console.error('🚨 Places API (New) error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch places data' },
      { status: 500 }
    );
  }
} 