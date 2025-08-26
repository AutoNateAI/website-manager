import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, MapPin, Users, MessageSquare, Phone, Mail, Linkedin, Instagram, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface NetworkingEvent {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  location?: string;
  event_type: string;
  notes?: string;
  created_at: string;
}

interface Person {
  id: string;
  name: string;
  email?: string;
  linkedin_url?: string;
  position?: string;
  location?: string;
}

interface EventConnection {
  id: string;
  event_id: string;
  person_id: string;
  discussion_topics?: string;
  follow_up_needed: boolean;
  follow_up_notes?: string;
  connection_quality: string;
  created_at: string;
  people: Person;
  networking_events: NetworkingEvent;
}

export default function InPersonNetworkingManager() {
  const [events, setEvents] = useState<NetworkingEvent[]>([]);
  const [connections, setConnections] = useState<EventConnection[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isConnectionDialogOpen, setIsConnectionDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<NetworkingEvent | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    event_date: '',
    location: '',
    event_type: 'conference',
    notes: ''
  });

  const [connectionForm, setConnectionForm] = useState({
    event_id: '',
    person_id: '',
    discussion_topics: '',
    follow_up_needed: false,
    follow_up_notes: '',
    connection_quality: 'good'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [eventsResult, connectionsResult, peopleResult] = await Promise.all([
        supabase.from('networking_events').select('*').order('event_date', { ascending: false }),
        supabase.from('event_connections').select(`
          *,
          people (*),
          networking_events (*)
        `).order('created_at', { ascending: false }),
        supabase.from('people').select('*').order('name')
      ]);

      if (eventsResult.error) throw eventsResult.error;
      if (connectionsResult.error) throw connectionsResult.error;
      if (peopleResult.error) throw peopleResult.error;

      setEvents(eventsResult.data || []);
      setConnections(connectionsResult.data || []);
      setPeople(peopleResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Error loading data', variant: 'destructive' });
    }
  };

  const handleSubmitEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedEvent) {
        const { error } = await supabase
          .from('networking_events')
          .update(eventForm)
          .eq('id', selectedEvent.id);
        
        if (error) throw error;
        toast({ title: 'Event updated successfully!' });
      } else {
        const { error } = await supabase
          .from('networking_events')
          .insert([eventForm]);
        
        if (error) throw error;
        toast({ title: 'Event created successfully!' });
      }
      
      resetEventForm();
      fetchData();
    } catch (error) {
      console.error('Error saving event:', error);
      toast({ title: 'Error saving event', variant: 'destructive' });
    }
  };

  const handleSubmitConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('event_connections')
        .insert([connectionForm]);
      
      if (error) throw error;
      toast({ title: 'Connection added successfully!' });
      
      resetConnectionForm();
      fetchData();
    } catch (error) {
      console.error('Error adding connection:', error);
      toast({ title: 'Error adding connection', variant: 'destructive' });
    }
  };

  const resetEventForm = () => {
    setEventForm({
      title: '',
      description: '',
      event_date: '',
      location: '',
      event_type: 'conference',
      notes: ''
    });
    setSelectedEvent(null);
    setIsEventDialogOpen(false);
  };

  const resetConnectionForm = () => {
    setConnectionForm({
      event_id: '',
      person_id: '',
      discussion_topics: '',
      follow_up_needed: false,
      follow_up_notes: '',
      connection_quality: 'good'
    });
    setIsConnectionDialogOpen(false);
  };

  const editEvent = (event: NetworkingEvent) => {
    setEventForm({
      title: event.title,
      description: event.description || '',
      event_date: event.event_date,
      location: event.location || '',
      event_type: event.event_type,
      notes: event.notes || ''
    });
    setSelectedEvent(event);
    setIsEventDialogOpen(true);
  };

  const deleteEvent = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    
    try {
      const { error } = await supabase.from('networking_events').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Event deleted successfully!' });
      fetchData();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({ title: 'Error deleting event', variant: 'destructive' });
    }
  };

  const filteredEvents = events.filter(event =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">In-Person Networking</h1>
          <p className="text-muted-foreground">Manage events and connections from networking activities</p>
        </div>
        <div className="space-x-2">
          <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{selectedEvent ? 'Edit Event' : 'Add New Event'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitEvent} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Event Title</Label>
                    <Input
                      id="title"
                      value={eventForm.title}
                      onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="event_type">Event Type</Label>
                    <Select value={eventForm.event_type} onValueChange={(value) => setEventForm({ ...eventForm, event_type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conference">Conference</SelectItem>
                        <SelectItem value="meetup">Meetup</SelectItem>
                        <SelectItem value="workshop">Workshop</SelectItem>
                        <SelectItem value="networking">Networking Event</SelectItem>
                        <SelectItem value="trade_show">Trade Show</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="event_date">Event Date</Label>
                    <Input
                      id="event_date"
                      type="datetime-local"
                      value={eventForm.event_date}
                      onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={eventForm.location}
                      onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={eventForm.description}
                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={eventForm.notes}
                    onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={resetEventForm}>Cancel</Button>
                  <Button type="submit">{selectedEvent ? 'Update' : 'Create'} Event</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isConnectionDialogOpen} onOpenChange={setIsConnectionDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Users className="w-4 h-4 mr-2" />
                Add Connection
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Event Connection</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitConnection} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="event_id">Event</Label>
                    <Select value={connectionForm.event_id} onValueChange={(value) => setConnectionForm({ ...connectionForm, event_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select event" />
                      </SelectTrigger>
                      <SelectContent>
                        {events.map((event) => (
                          <SelectItem key={event.id} value={event.id}>
                            {event.title} - {format(new Date(event.event_date), 'MMM dd, yyyy')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="person_id">Person</Label>
                    <Select value={connectionForm.person_id} onValueChange={(value) => setConnectionForm({ ...connectionForm, person_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select person" />
                      </SelectTrigger>
                      <SelectContent>
                        {people.map((person) => (
                          <SelectItem key={person.id} value={person.id}>
                            {person.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="discussion_topics">Discussion Topics</Label>
                  <Textarea
                    id="discussion_topics"
                    value={connectionForm.discussion_topics}
                    onChange={(e) => setConnectionForm({ ...connectionForm, discussion_topics: e.target.value })}
                    placeholder="What did you discuss?"
                  />
                </div>

                <div>
                  <Label htmlFor="connection_quality">Connection Quality</Label>
                  <Select value={connectionForm.connection_quality} onValueChange={(value) => setConnectionForm({ ...connectionForm, connection_quality: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="average">Average</SelectItem>
                      <SelectItem value="poor">Poor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="follow_up_needed"
                    checked={connectionForm.follow_up_needed}
                    onCheckedChange={(checked) => setConnectionForm({ ...connectionForm, follow_up_needed: checked })}
                  />
                  <Label htmlFor="follow_up_needed">Follow-up needed</Label>
                </div>

                {connectionForm.follow_up_needed && (
                  <div>
                    <Label htmlFor="follow_up_notes">Follow-up Notes</Label>
                    <Textarea
                      id="follow_up_notes"
                      value={connectionForm.follow_up_notes}
                      onChange={(e) => setConnectionForm({ ...connectionForm, follow_up_notes: e.target.value })}
                      placeholder="Notes about follow-up actions needed"
                    />
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={resetConnectionForm}>Cancel</Button>
                  <Button type="submit">Add Connection</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div>
        <Input
          placeholder="Search events..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      <div className="grid gap-6">
        {filteredEvents.map((event) => {
          const eventConnections = connections.filter(conn => conn.event_id === event.id);
          
          return (
            <Card key={event.id} className="relative">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      {event.title}
                      <Badge variant="secondary">{event.event_type}</Badge>
                    </CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                      <span>{format(new Date(event.event_date), 'MMM dd, yyyy HH:mm')}</span>
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {event.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {eventConnections.length} connections
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => editEvent(event)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteEvent(event.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {event.description && <p className="text-sm text-muted-foreground mb-4">{event.description}</p>}
                
                {eventConnections.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold">Connections Made</h4>
                    <div className="space-y-2">
                      {eventConnections.map((connection) => (
                        <div key={connection.id} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{connection.people.name}</span>
                              <Badge variant={connection.connection_quality === 'excellent' ? 'default' : 
                                           connection.connection_quality === 'good' ? 'secondary' :
                                           connection.connection_quality === 'average' ? 'outline' : 'destructive'}>
                                {connection.connection_quality}
                              </Badge>
                              {connection.follow_up_needed && <Badge variant="destructive">Follow-up needed</Badge>}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(connection.created_at), 'MMM dd, HH:mm')}
                            </span>
                          </div>
                          
                          {connection.discussion_topics && (
                            <div className="text-sm">
                              <span className="font-medium">Discussion: </span>
                              {connection.discussion_topics}
                            </div>
                          )}
                          
                          {connection.follow_up_notes && (
                            <div className="text-sm">
                              <span className="font-medium">Follow-up: </span>
                              {connection.follow_up_notes}
                            </div>
                          )}
                          
                          <div className="flex gap-2">
                            {connection.people.email && (
                              <Button variant="ghost" size="sm">
                                <Mail className="w-4 h-4" />
                              </Button>
                            )}
                            {connection.people.linkedin_url && (
                              <Button variant="ghost" size="sm">
                                <Linkedin className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}