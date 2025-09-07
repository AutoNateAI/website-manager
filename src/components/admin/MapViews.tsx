import { useState, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Users, Building2, Calendar, Map as MapIcon, StickyNote } from "lucide-react";
import { NetworkMap } from "./NetworkMap";
import { AddLocationDialog } from "./AddLocationDialog";
import { LocationNotesManager } from "./LocationNotesManager";
import { EventsManager } from "./EventsManager";

interface LocationData {
  location: string;
  companies: number;
  people: number;
  events: number;
  coordinates?: [number, number];
}

interface CityData extends LocationData {
  state?: string;
  country?: string;
}

interface StateData extends LocationData {
  country?: string;
  cities: CityData[];
}

interface CountryData extends LocationData {
  continent?: string;
  states: StateData[];
}

export const MapViews = () => {
  const { toast } = useToast();
  const [cityData, setCityData] = useState<CityData[]>([]);
  const [stateData, setStateData] = useState<StateData[]>([]);
  const [countryData, setCountryData] = useState<CountryData[]>([]);
  const [continentData, setContinentData] = useState<LocationData[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetchLocationData();
  }, []);

  const fetchLocationData = async () => {
    try {
      setLoading(true);
      
      // Fetch structured locations from new table
      const { data: structuredLocations, error: locationsError } = await supabase
        .from('locations')
        .select('*')
        .order('created_at', { ascending: false });

      if (locationsError) throw locationsError;
      setLocations(structuredLocations || []);
      
      // Fetch companies with locations
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('location')
        .not('location', 'is', null);

      if (companiesError) throw companiesError;

      // Fetch people with locations
      const { data: people, error: peopleError } = await supabase
        .from('people')
        .select('location')
        .not('location', 'is', null);

      if (peopleError) throw peopleError;

      // Fetch events with locations
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('location, event_type')
        .not('location', 'is', null);

      if (eventsError) throw eventsError;

      // Process and aggregate location data
      const locationMap = new Map<string, LocationData>();

      // Process companies
      companies?.forEach(company => {
        if (company.location) {
          const key = company.location.toLowerCase().trim();
          const existing = locationMap.get(key) || { 
            location: company.location, 
            companies: 0, 
            people: 0, 
            events: 0 
          };
          existing.companies++;
          locationMap.set(key, existing);
        }
      });

      // Process people
      people?.forEach(person => {
        if (person.location) {
          const key = person.location.toLowerCase().trim();
          const existing = locationMap.get(key) || { 
            location: person.location, 
            companies: 0, 
            people: 0, 
            events: 0 
          };
          existing.people++;
          locationMap.set(key, existing);
        }
      });

      // Process events
      events?.forEach(event => {
        if (event.location && event.event_type === 'in_person') {
          const key = event.location.toLowerCase().trim();
          const existing = locationMap.get(key) || { 
            location: event.location, 
            companies: 0, 
            people: 0, 
            events: 0 
          };
          existing.events++;
          locationMap.set(key, existing);
        }
      });

      // Convert to array and categorize by type
      const allLocations = Array.from(locationMap.values());
      
      // Simple categorization based on location format
      const cities: CityData[] = [];
      const states: StateData[] = [];
      const countries: CountryData[] = [];
      const continents: LocationData[] = [];

      allLocations.forEach(location => {
        const parts = location.location.split(',').map(p => p.trim());
        
        if (parts.length >= 3) {
          // City, State, Country format
          cities.push({
            ...location,
            location: parts[0],
            state: parts[1],
            country: parts[2]
          });
        } else if (parts.length === 2) {
          // State, Country or City, Country format
          if (parts[0].length <= 3) {
            // Likely State abbreviation
            states.push({
              ...location,
              location: parts[0],
              country: parts[1],
              cities: []
            });
          } else {
            cities.push({
              ...location,
              location: parts[0],
              country: parts[1]
            });
          }
        } else {
          // Single location - could be country or continent
          if (location.location.length <= 20) {
            countries.push({
              ...location,
              states: []
            });
          } else {
            continents.push(location);
          }
        }
      });

      setCityData(cities.sort((a, b) => (b.companies + b.people + b.events) - (a.companies + a.people + a.events)));
      setStateData(states.sort((a, b) => (b.companies + b.people + b.events) - (a.companies + a.people + a.events)));
      setCountryData(countries.sort((a, b) => (b.companies + b.people + b.events) - (a.companies + a.people + a.events)));
      setContinentData(continents.sort((a, b) => (b.companies + b.people + b.events) - (a.companies + a.people + a.events)));

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

  const handleShowNotes = (locationId: string, locationName: string) => {
    setSelectedLocation({ id: locationId, name: locationName });
    setNotesDialogOpen(true);
  };

  const LocationCard = ({ location }: { location: LocationData }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="h-5 w-5 text-muted-foreground" />
          {location.location}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">Companies:</span>
          <Badge variant="secondary">{location.companies}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">People:</span>
          <Badge variant="secondary">{location.people}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">Events:</span>
          <Badge variant="secondary">{location.events}</Badge>
        </div>
        <div className="pt-2">
          <Badge variant="outline" className="text-xs">
            Total: {location.companies + location.people + location.events}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );

  const StructuredLocationCard = ({ location }: { location: any }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="h-5 w-5 text-muted-foreground" />
          {[location.city, location.state, location.country].filter(Boolean).join(', ')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1 text-sm">
          {location.city && <div><strong>City:</strong> {location.city}</div>}
          {location.state && <div><strong>State:</strong> {location.state}</div>}
          <div><strong>Country:</strong> {location.country}</div>
          <div><strong>Continent:</strong> {location.continent}</div>
          {location.timezone && <div><strong>Timezone:</strong> {location.timezone}</div>}
        </div>
        
        {location.latitude && location.longitude && (
          <div className="text-xs text-muted-foreground">
            📍 {location.latitude}, {location.longitude}
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleShowNotes(location.id, [location.city, location.state, location.country].filter(Boolean).join(', '))}
          >
            <StickyNote className="h-3 w-3 mr-1" />
            Notes
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading location data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Map Views</h2>
          <p className="text-muted-foreground">Interactive network visualization of leads and connections</p>
        </div>
        <AddLocationDialog onLocationAdded={fetchLocationData} />
      </div>

      <Tabs defaultValue="network" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="network">
            <MapIcon className="h-4 w-4 mr-2" />
            Network Map
          </TabsTrigger>
          <TabsTrigger value="locations">
            <MapPin className="h-4 w-4 mr-2" />
            Locations ({locations.length})
          </TabsTrigger>
          <TabsTrigger value="events">
            <Calendar className="h-4 w-4 mr-2" />
            Events
          </TabsTrigger>
        </TabsList>

        <TabsContent value="network" className="space-y-6">
          <NetworkMap />
        </TabsContent>

        <TabsContent value="locations" className="space-y-6">
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All ({locations.length})</TabsTrigger>
              <TabsTrigger value="cities">Cities ({cityData.length})</TabsTrigger>
              <TabsTrigger value="states">States ({stateData.length})</TabsTrigger>
              <TabsTrigger value="countries">Countries ({countryData.length})</TabsTrigger>
              <TabsTrigger value="continents">Continents ({continentData.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {locations.map((location) => (
                  <StructuredLocationCard key={location.id} location={location} />
                ))}
                {locations.length === 0 && (
                  <div className="col-span-full text-center text-muted-foreground py-8">
                    No locations added yet. Click "Add Location" to get started.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="cities">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cityData.map((city, index) => (
                  <LocationCard key={index} location={city} />
                ))}
                {cityData.length === 0 && (
                  <div className="col-span-full text-center text-muted-foreground py-8">
                    No city data found. Add locations to your companies, people, or events.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="states">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stateData.map((state, index) => (
                  <LocationCard key={index} location={state} />
                ))}
                {stateData.length === 0 && (
                  <div className="col-span-full text-center text-muted-foreground py-8">
                    No state data found. Add locations to your companies, people, or events.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="countries">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {countryData.map((country, index) => (
                  <LocationCard key={index} location={country} />
                ))}
                {countryData.length === 0 && (
                  <div className="col-span-full text-center text-muted-foreground py-8">
                    No country data found. Add locations to your companies, people, or events.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="continents">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {continentData.map((continent, index) => (
                  <LocationCard key={index} location={continent} />
                ))}
                {continentData.length === 0 && (
                  <div className="col-span-full text-center text-muted-foreground py-8">
                    No continent data found. Add locations to your companies, people, or events.
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="events" className="space-y-6">
          <EventsManager />
        </TabsContent>
      </Tabs>

      {selectedLocation && (
        <LocationNotesManager
          locationId={selectedLocation.id}
          locationName={selectedLocation.name}
          open={notesDialogOpen}
          onOpenChange={setNotesDialogOpen}
        />
      )}
    </div>
  );
};