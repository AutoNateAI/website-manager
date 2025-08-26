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
import { Search, Filter, MapPin, Building2, Users, Calendar, Package, Share2, PenTool } from 'lucide-react';

interface EntityNode {
  id: string;
  type: 'company' | 'person' | 'event' | 'product' | 'service' | 'social_post' | 'blog';
  name: string;
  location?: string;
  coordinates?: [number, number];
  data: any;
  connections: string[];
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
  
  const [nodes, setNodes] = useState<EntityNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedNode, setSelectedNode] = useState<EntityNode | null>(null);
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

  // Fetch and process entity data
  useEffect(() => {
    fetchEntityData();
  }, []);

  const fetchEntityData = async () => {
    try {
      setLoading(true);
      
      // Fetch all entities
      const [companiesRes, peopleRes, eventsRes, servicesRes, postsRes, blogsRes] = await Promise.all([
        supabase.from('companies').select('*'),
        supabase.from('people').select('*'),
        supabase.from('events').select('*'),
        supabase.from('services').select('*'),
        supabase.from('social_media_posts').select('*'),
        supabase.from('blogs').select('*')
      ]);

      const allNodes: EntityNode[] = [];

      // Process companies
      companiesRes.data?.forEach(company => {
        if (company.location) {
          allNodes.push({
            id: `company-${company.id}`,
            type: 'company',
            name: company.name,
            location: company.location,
            data: company,
            connections: []
          });
        }
      });

      // Process people
      peopleRes.data?.forEach(person => {
        if (person.location) {
          allNodes.push({
            id: `person-${person.id}`,
            type: 'person',
            name: person.name,
            location: person.location,
            data: person,
            connections: person.company_id ? [`company-${person.company_id}`] : []
          });
        }
      });

      // Process events
      eventsRes.data?.forEach(event => {
        if (event.location && event.event_type === 'in_person') {
          allNodes.push({
            id: `event-${event.id}`,
            type: 'event',
            name: event.title,
            location: event.location,
            data: event,
            connections: event.company_id ? [`company-${event.company_id}`] : []
          });
        }
      });

      // Process services
      servicesRes.data?.forEach(service => {
        allNodes.push({
          id: `service-${service.id}`,
          type: 'service',
          name: service.name,
          location: '', // Services inherit location from company
          data: service,
          connections: [`company-${service.company_id}`]
        });
      });

      // Process social media posts
      postsRes.data?.forEach(post => {
        allNodes.push({
          id: `post-${post.id}`,
          type: 'social_post',
          name: post.title,
          location: '', // Posts inherit location from company
          data: post,
          connections: []
        });
      });

      // Process blogs
      blogsRes.data?.forEach(blog => {
        allNodes.push({
          id: `blog-${blog.id}`,
          type: 'blog',
          name: blog.title,
          location: '', // Blogs can target multiple locations
          data: blog,
          connections: []
        });
      });

      // Geocode locations and add markers
      await geocodeAndAddMarkers(allNodes);
      setNodes(allNodes);

    } catch (error) {
      console.error('Error fetching entity data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch entity data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const geocodeAndAddMarkers = async (nodes: EntityNode[]) => {
    if (!map.current) return;

    const locationCache = new Map<string, [number, number]>();
    
    for (const node of nodes) {
      if (!node.location) continue;
      
      let coordinates: [number, number];
      
      if (locationCache.has(node.location)) {
        coordinates = locationCache.get(node.location)!;
      } else {
        // Simple geocoding using Mapbox (in a real app, you'd want proper geocoding)
        // For now, we'll use approximate coordinates for common locations
        coordinates = getApproximateCoordinates(node.location);
        locationCache.set(node.location, coordinates);
      }
      
      node.coordinates = coordinates;
      
      // Create marker with different colors for different entity types
      const color = getEntityColor(node.type);
      const marker = new mapboxgl.Marker({ color })
        .setLngLat(coordinates)
        .setPopup(new mapboxgl.Popup().setHTML(`
          <div class="p-2">
            <h3 class="font-semibold">${node.name}</h3>
            <p class="text-sm text-muted-foreground">${node.type}</p>
            <p class="text-xs">${node.location}</p>
          </div>
        `))
        .addTo(map.current);

      // Add click handler
      marker.getElement().addEventListener('click', () => {
        setSelectedNode(node);
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

  const getEntityIcon = (type: string) => {
    const icons = {
      company: Building2,
      person: Users,
      event: Calendar,
      product: Package,
      service: Package,
      social_post: Share2,
      blog: PenTool
    };
    return icons[type as keyof typeof icons] || Building2;
  };

  const filteredNodes = nodes.filter(node => {
    const matchesSearch = node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         node.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || node.type === filterType;
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
                  placeholder="Search entities or locations..."
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
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="company">Companies</SelectItem>
                <SelectItem value="person">People</SelectItem>
                <SelectItem value="event">Events</SelectItem>
                <SelectItem value="product">Products</SelectItem>
                <SelectItem value="service">Services</SelectItem>
                <SelectItem value="social_post">Social Posts</SelectItem>
                <SelectItem value="blog">Blogs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-2 mb-4">
            {['company', 'person', 'event', 'product', 'service', 'social_post', 'blog'].map(type => {
              const Icon = getEntityIcon(type);
              return (
                <Badge 
                  key={type} 
                  variant="outline" 
                  className="flex items-center gap-1"
                  style={{ borderColor: getEntityColor(type) }}
                >
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: getEntityColor(type) }}
                  />
                  <Icon className="h-3 w-3" />
                  {type.replace('_', ' ')}
                </Badge>
              );
            })}
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
                {selectedNode ? 'Entity Details' : 'Entity List'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedNode ? (
                <div className="space-y-4">
                  <div>
                    <Badge variant="outline" className="mb-2">
                      {selectedNode.type.replace('_', ' ')}
                    </Badge>
                    <h3 className="font-semibold">{selectedNode.name}</h3>
                    {selectedNode.location && (
                      <p className="text-sm text-muted-foreground">{selectedNode.location}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Details</h4>
                    <div className="text-sm space-y-1">
                      {Object.entries(selectedNode.data).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-muted-foreground">{key}:</span>
                          <span className="text-right">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedNode(null)}
                  >
                    Back to List
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredNodes.slice(0, 20).map(node => {
                    const Icon = getEntityIcon(node.type);
                    return (
                      <div
                        key={node.id}
                        className="p-2 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedNode(node)}
                      >
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: getEntityColor(node.type) }}
                          />
                          <Icon className="h-4 w-4" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{node.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {node.location || 'No location'}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredNodes.length > 20 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      Showing 20 of {filteredNodes.length} entities
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