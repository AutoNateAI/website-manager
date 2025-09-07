import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, MapPin, Building2, Users, Calendar } from 'lucide-react';

interface LocationNode {
  id: string;
  name: string;
  city?: string;
  state?: string;
  country: string;
  continent: string;
  coordinates?: [number, number];
  timezone?: string;
  data: any;
}

interface NetworkMapProps {
  className?: string;
}

// Mapbox public token - will be set from edge function
const MAPBOX_TOKEN = 'pk.eyJ1IjoidGVzdC11c2VyIiwiYSI6ImNsb3ZkaXgwdjA1aGYya2x3bXJ3NDJwY3kifQ.dummy'; // This will be replaced by the actual token

export const NetworkMap = ({ className }: NetworkMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const { toast } = useToast();
  
  const [locations, setLocations] = useState<LocationNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<LocationNode | null>(null);
  const [locationEvents, setLocationEvents] = useState<any[]>([]);
  const [locationCompanies, setLocationCompanies] = useState<any[]>([]);
  const [locationPeople, setLocationPeople] = useState<any[]>([]);
  const [mapboxToken, setMapboxToken] = useState<string>('');

  // Fetch Mapbox token from edge function
  useEffect(() => {
    const fetchMapboxToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error) throw error;
        setMapboxToken(data.token);
      } catch (error) {
        console.error('Error fetching Mapbox token:', error);
        toast({
          title: "Error",
          description: "Failed to load map configuration",
          variant: "destructive",
        });
      }
    };

    fetchMapboxToken();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-98.5795, 39.8283], // Center of US
      zoom: 3,
      projection: 'mercator' as any
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [mapboxToken]);

  // Fetch and process location data
  useEffect(() => {
    fetchLocationData();
  }, []);

  const fetchLocationData = async () => {
    try {
      setLoading(true);
      
      // Fetch all locations
      const { data: locationsData, error } = await supabase
        .from('locations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const locationNodes: LocationNode[] = locationsData?.map(location => ({
        id: location.id,
        name: [location.city, location.state, location.country].filter(Boolean).join(', '),
        city: location.city,
        state: location.state,
        country: location.country,
        continent: location.continent,
        coordinates: location.latitude && location.longitude ? 
          [location.longitude, location.latitude] : undefined,
        timezone: location.timezone,
        data: location
      })) || [];

      // Add markers to map
      await addLocationMarkers(locationNodes);
      setLocations(locationNodes);

    } catch (error) {
      console.error('Error fetching location data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch location data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addLocationMarkers = async (locationNodes: LocationNode[]) => {
    if (!map.current) return;
    
    for (const location of locationNodes) {
      let coordinates: [number, number];
      
      if (location.coordinates) {
        coordinates = location.coordinates;
      } else {
        // Use approximate coordinates if exact coordinates not available
        coordinates = getApproximateCoordinates(location.name);
      }
      
      location.coordinates = coordinates;
      
      // Create marker for location
      const marker = new mapboxgl.Marker({ color: '#8B5CF6' })
        .setLngLat(coordinates)
        .setPopup(new mapboxgl.Popup().setHTML(`
          <div class="p-3">
            <h3 class="font-semibold">${location.name}</h3>
            <div class="text-sm space-y-1 mt-2">
              ${location.city ? `<p><strong>City:</strong> ${location.city}</p>` : ''}
              ${location.state ? `<p><strong>State:</strong> ${location.state}</p>` : ''}
              <p><strong>Country:</strong> ${location.country}</p>
              <p><strong>Continent:</strong> ${location.continent}</p>
              ${location.timezone ? `<p><strong>Timezone:</strong> ${location.timezone}</p>` : ''}
            </div>
          </div>
        `))
        .addTo(map.current);

      // Add click handler
      marker.getElement().addEventListener('click', () => {
        handleLocationSelect(location);
      });
    }
  };

  const getApproximateCoordinates = (location: string): [number, number] => {
    // Simple location mapping - in a real app, use proper geocoding
    const locationMap: { [key: string]: [number, number] } = {
      'New York, NY': [-74.006, 40.7128],
      'Los Angeles, CA': [-118.2437, 34.0522],
      'Chicago, IL': [-87.6298, 41.8781],
      'Houston, TX': [-95.3698, 29.7604],
      'Phoenix, AZ': [-112.0740, 33.4484],
      'Philadelphia, PA': [-75.1652, 39.9526],
      'San Antonio, TX': [-98.4936, 29.4241],
      'San Diego, CA': [-117.1611, 32.7157],
      'Dallas, TX': [-96.7970, 32.7767],
      'San Jose, CA': [-121.8863, 37.3382],
    };

    // Try exact match first
    if (locationMap[location]) {
      return locationMap[location];
    }

    // Try partial match
    for (const [key, coords] of Object.entries(locationMap)) {
      if (location.toLowerCase().includes(key.toLowerCase()) || 
          key.toLowerCase().includes(location.toLowerCase())) {
        return coords;
      }
    }

    // Default to center US with some random offset
    return [-98.5795 + (Math.random() - 0.5) * 20, 39.8283 + (Math.random() - 0.5) * 10];
  };

  const getEntityColor = (type: string): string => {
    const colors = {
      company: '#8B5CF6', // purple
      person: '#06B6D4', // cyan
      event: '#F59E0B', // amber
      product: '#10B981', // emerald
      service: '#EF4444', // red
      social_post: '#EC4899', // pink
      blog: '#6366F1' // indigo
    };
    return colors[type as keyof typeof colors] || '#64748B';
  };

  const handleLocationSelect = async (location: LocationNode) => {
    setSelectedLocation(location);
    
    // Pan camera to location
    if (map.current && location.coordinates) {
      map.current.flyTo({
        center: location.coordinates,
        zoom: 10,
        duration: 2000
      });
    }
    
    // Fetch associated data for this location
    await fetchLocationDetails(location);
  };

  const fetchLocationDetails = async (location: LocationNode) => {
    try {
      // Fetch events at this location
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select(`
          *,
          companies!events_company_id_fkey(id, name, location, website),
          people!events_organizer_person_id_fkey(id, name, location, linkedin_url)
        `)
        .or(`location.eq.${location.name},location.ilike.%${location.city}%,location.ilike.%${location.state}%`);

      if (eventsError) throw eventsError;
      setLocationEvents(events || []);

      // Extract unique companies and people from events
      const companies = new Map();
      const people = new Map();

      events?.forEach(event => {
        if (event.companies) {
          companies.set(event.companies.id, event.companies);
        }
        if (event.people) {
          people.set(event.people.id, event.people);
        }
      });

      setLocationCompanies(Array.from(companies.values()));
      setLocationPeople(Array.from(people.values()));

    } catch (error) {
      console.error('Error fetching location data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch location details",
        variant: "destructive",
      });
    }
  };

  const filteredLocations = locations.filter(location => {
    const matchesSearch = location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         location.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         location.state?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         location.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         location.continent.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || 
                         filterType === 'city' && location.city ||
                         filterType === 'state' && location.state ||
                         filterType === 'country' && !location.city && !location.state ||
                         filterType === 'continent';
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controls */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Interactive Network Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search locations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="city">Cities</SelectItem>
                <SelectItem value="state">States</SelectItem>
                <SelectItem value="country">Countries</SelectItem>
                <SelectItem value="continent">Continents</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Location Summary */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="outline" className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <MapPin className="h-3 w-3" />
              {locations.length} Locations
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Map */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          <Card className="glass-card h-[600px]">
            <div ref={mapContainer} className="w-full h-full rounded-lg" />
            {loading && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                  <span>Loading network data...</span>
                </div>
              </div>
            )}
          </Card>
        </div>
        
        {/* Entity Details Panel */}
        <div className="lg:col-span-1">
          <Card className="glass-card h-[600px] overflow-y-auto">
            <CardHeader>
              <CardTitle className="text-lg">
                {selectedLocation ? 'Location Details' : 'Location List'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedLocation ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold">{selectedLocation.name}</h3>
                    <div className="space-y-1 text-sm text-muted-foreground mt-2">
                      {selectedLocation.city && <p><strong>City:</strong> {selectedLocation.city}</p>}
                      {selectedLocation.state && <p><strong>State:</strong> {selectedLocation.state}</p>}
                      <p><strong>Country:</strong> {selectedLocation.country}</p>
                      <p><strong>Continent:</strong> {selectedLocation.continent}</p>
                      {selectedLocation.timezone && <p><strong>Timezone:</strong> {selectedLocation.timezone}</p>}
                      {selectedLocation.coordinates && (
                        <p><strong>Coordinates:</strong> {selectedLocation.coordinates[1]}, {selectedLocation.coordinates[0]}</p>
                      )}
                    </div>
                  </div>

                  {/* Events Section */}
                  {locationEvents.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Events ({locationEvents.length})
                      </h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {locationEvents.map(event => (
                          <div key={event.id} className="p-2 bg-muted/50 rounded text-xs">
                            <p className="font-medium">{event.title}</p>
                            <p className="text-muted-foreground">
                              {event.date_time ? new Date(event.date_time).toLocaleDateString() : 'Date TBD'}
                            </p>
                            <p className="text-muted-foreground capitalize">{event.event_type}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Companies Section */}
                  {locationCompanies.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Companies ({locationCompanies.length})
                      </h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {locationCompanies.map(company => (
                          <div key={company.id} className="p-2 bg-muted/50 rounded text-xs">
                            <p className="font-medium">{company.name}</p>
                            {company.location && (
                              <p className="text-muted-foreground">{company.location}</p>
                            )}
                            {company.website && (
                              <p className="text-muted-foreground truncate">{company.website}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* People Section */}
                  {locationPeople.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        People ({locationPeople.length})
                      </h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {locationPeople.map(person => (
                          <div key={person.id} className="p-2 bg-muted/50 rounded text-xs">
                            <p className="font-medium">{person.name}</p>
                            {person.location && (
                              <p className="text-muted-foreground">{person.location}</p>
                            )}
                            {person.linkedin_url && (
                              <p className="text-muted-foreground truncate">LinkedIn Profile</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSelectedLocation(null);
                      setLocationEvents([]);
                      setLocationCompanies([]);
                      setLocationPeople([]);
                    }}
                  >
                    Back to List
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredLocations.slice(0, 20).map(location => (
                    <div
                      key={location.id}
                      className="p-2 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleLocationSelect(location)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500" />
                        <MapPin className="h-4 w-4" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{location.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {location.continent}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredLocations.length > 20 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      Showing 20 of {filteredLocations.length} locations
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};