import { useState, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Building2, Plus, Clock } from "lucide-react";
import { format } from "date-fns";

interface Event {
  id: string;
  title: string;
  description?: string;
  date_time?: string;
  location?: string;
  event_type: string;
  status: string;
  virtual_link?: string;
  max_attendees?: number;
  current_attendees: number;
  company_id?: string;
  organizer_person_id?: string;
  companies?: { name: string };
  people?: { name: string };
}

interface EventsManagerProps {
  selectedLocationId?: string;
}

export const EventsManager = ({ selectedLocationId }: EventsManagerProps) => {
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [selectedLocationId]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('events')
        .select(`
          *,
          companies!events_company_id_fkey(name),
          people!events_organizer_person_id_fkey(name)
        `)
        .order('date_time', { ascending: true });

      // If a specific location is selected, filter events for that location
      if (selectedLocationId) {
        // This would require joining with location_events table
        // For now, we'll show all events and add location filtering later
      }

      const { data, error } = await query;

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Error",
        description: "Failed to fetch events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'in_person':
        return 'bg-blue-100 text-blue-800';
      case 'virtual':
        return 'bg-green-100 text-green-800';
      case 'hybrid':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading events...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold">Events Calendar</h3>
          <p className="text-muted-foreground">
            {selectedLocationId ? 'Events for selected location' : 'All events in your network'}
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Event
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => (
          <Card key={event.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                {event.title}
              </CardTitle>
              <div className="flex gap-2">
                <Badge className={getEventTypeColor(event.event_type)}>
                  {event.event_type.replace('_', ' ')}
                </Badge>
                <Badge className={getStatusColor(event.status)}>
                  {event.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {event.date_time && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {format(new Date(event.date_time), 'PPP p')}
                </div>
              )}
              
              {event.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {event.location}
                </div>
              )}

              {event.companies?.name && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  {event.companies.name}
                </div>
              )}

              {event.people?.name && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Organizer: {event.people.name}
                </div>
              )}

              {event.max_attendees && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Attendees: {event.current_attendees}/{event.max_attendees}
                </div>
              )}

              {event.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {event.description}
                </p>
              )}

              {event.virtual_link && (
                <Button variant="outline" size="sm" className="w-full">
                  Join Virtual Event
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        
        {events.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground py-8">
            No events found. Add events to start mapping your network activities.
          </div>
        )}
      </div>
    </div>
  );
};