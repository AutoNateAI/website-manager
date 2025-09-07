import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { supabase } from "../_shared/supabase.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { locationString, locationId } = await req.json();
    
    if (!locationString) {
      return new Response(
        JSON.stringify({ error: 'Location string is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mapboxToken = Deno.env.get('MAPBOX_PUBLIC_TOKEN');
    if (!mapboxToken) {
      console.error('MAPBOX_PUBLIC_TOKEN not found');
      return new Response(
        JSON.stringify({ error: 'Mapbox token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Mapbox Geocoding API
    const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(locationString)}.json?access_token=${mapboxToken}&limit=1`;
    
    console.log('Geocoding request for:', locationString);
    
    const response = await fetch(geocodeUrl);
    const data = await response.json();
    
    if (!data.features || data.features.length === 0) {
      console.log('No results found for:', locationString);
      return new Response(
        JSON.stringify({ error: 'Location not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const feature = data.features[0];
    const [longitude, latitude] = feature.center;
    
    console.log('Geocoded coordinates:', { latitude, longitude, locationString });

    // Update the location in the database if locationId is provided
    if (locationId) {
      const { error: updateError } = await supabase
        .from('locations')
        .update({ 
          latitude: latitude,
          longitude: longitude 
        })
        .eq('id', locationId);

      if (updateError) {
        console.error('Error updating location coordinates:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update location coordinates' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ 
        latitude, 
        longitude, 
        placeName: feature.place_name 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in geocode-location function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});