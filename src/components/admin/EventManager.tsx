import { useState, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Calendar, MapPin, Video, Users, Edit } from "lucide-react";

interface Event {
  id: string;
  title: string;
  description?: string;
  event_type: 'virtual' | 'in_person';
  date_time?: string;
  location?: string;
  virtual_link?: string;
  company_id?: string;
  organizer_person_id?: string;
  max_attendees?: number;
  current_attendees: number;
  status: string;
  tags: string[];
  notes?: string;
  created_at: string;
  company?: { name: string };
  organizer?: { name: string };
}

interface Company {
  id: string;
  name: string;
}

interface Person {
  id: string;
  name: string;
}

export const EventManager = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'virtual' as 'virtual' | 'in_person',
    date_time: '',
    location: '',
    virtual_link: '',
    company_id: 'none',
    organizer_person_id: 'none',
    max_attendees: '',
    status: 'upcoming',
    tags: '',
    notes: ''
  });

  useEffect(() => {
    fetchEvents();
    fetchCompanies();
    fetchPeople();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          company:companies(name),
          organizer:people!events_organizer_person_id_fkey(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const transformedData: Event[] = (data || []).map(event => ({
        ...event,
        event_type: event.event_type as 'virtual' | 'in_person',
        tags: Array.isArray(event.tags) ? event.tags.filter(tag => typeof tag === 'string') as string[] : [],
      }));
      
      setEvents(transformedData);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Error",
        description: "Failed to fetch events",
        variant: "destructive",
      });
    }
  };

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchPeople = async () => {
    try {
      const { data, error } = await supabase
        .from('people')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setPeople(data || []);
    } catch (error) {
      console.error('Error fetching people:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const submissionData = {
        title: formData.title,
        description: formData.description || null,
        event_type: formData.event_type,
        date_time: formData.date_time || null,
        location: formData.event_type === 'in_person' ? formData.location || null : null,
        virtual_link: formData.event_type === 'virtual' ? formData.virtual_link || null : null,
        company_id: formData.company_id === 'none' ? null : formData.company_id,
        organizer_person_id: formData.organizer_person_id === 'none' ? null : formData.organizer_person_id,
        max_attendees: formData.max_attendees ? parseInt(formData.max_attendees) : null,
        status: formData.status,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
        notes: formData.notes || null
      };

      if (editingEvent) {
        const { error } = await supabase
          .from('events')
          .update(submissionData as any)
          .eq('id', editingEvent.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Event updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('events')
          .insert(submissionData as any);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Event created successfully",
        });
      }

      resetForm();
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      toast({
        title: "Error",
        description: "Failed to save event",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      event_type: 'virtual',
      date_time: '',
      location: '',
      virtual_link: '',
      company_id: 'none',
      organizer_person_id: 'none',
      max_attendees: '',
      status: 'upcoming',
      tags: '',
      notes: ''
    });
    setEditingEvent(null);
    setIsFormOpen(false);
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      event_type: event.event_type,
      date_time: event.date_time ? new Date(event.date_time).toISOString().slice(0, 16) : '',
      location: event.location || '',
      virtual_link: event.virtual_link || '',
      company_id: event.company_id || 'none',
      organizer_person_id: event.organizer_person_id || 'none',
      max_attendees: event.max_attendees?.toString() || '',
      status: event.status,
      tags: event.tags.join(', '),
      notes: event.notes || ''
    });
    setIsFormOpen(true);
  };

  const EventCard = ({ event }: { event: Event }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="flex items-center gap-2 text-lg">
            {event.event_type === 'virtual' ? (
              <Video className="h-5 w-5 text-blue-500" />
            ) : (
              <MapPin className="h-5 w-5 text-green-500" />
            )}
            {event.title}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(event)}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={event.event_type === 'virtual' ? 'default' : 'secondary'}>
            {event.event_type === 'virtual' ? 'Virtual' : 'In Person'}
          </Badge>
          <Badge variant="outline">{event.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {event.description && (
          <p className="text-sm text-muted-foreground">{event.description}</p>
        )}
        
        {event.date_time && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {new Date(event.date_time).toLocaleDateString()} at{' '}
              {new Date(event.date_time).toLocaleTimeString()}
            </span>
          </div>
        )}

        {event.location && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{event.location}</span>
          </div>
        )}

        {event.virtual_link && (
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-muted-foreground" />
            <a href={event.virtual_link} className="text-sm text-blue-600 hover:underline">
              Join Virtual Event
            </a>
          </div>
        )}

        {event.company?.name && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Company:</span>
            <span className="text-sm">{event.company.name}</span>
          </div>
        )}

        {event.organizer?.name && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Organizer:</span>
            <span className="text-sm">{event.organizer.name}</span>
          </div>
        )}

        {event.max_attendees && (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {event.current_attendees} / {event.max_attendees} attendees
            </span>
          </div>
        )}

        {event.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-2">
            {event.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold">Events ({events.length})</h3>
          <p className="text-muted-foreground">Manage virtual and in-person events</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsFormOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEvent ? 'Edit Event' : 'Add New Event'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="event-type"
                  checked={formData.event_type === 'in_person'}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, event_type: checked ? 'in_person' : 'virtual' })
                  }
                />
                <Label htmlFor="event-type">
                  {formData.event_type === 'in_person' ? 'In Person Event' : 'Virtual Event'}
                </Label>
              </div>

              <div>
                <Label htmlFor="date_time">Date & Time</Label>
                <Input
                  id="date_time"
                  type="datetime-local"
                  value={formData.date_time}
                  onChange={(e) => setFormData({ ...formData, date_time: e.target.value })}
                />
              </div>

              {formData.event_type === 'in_person' ? (
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Enter event location"
                  />
                </div>
              ) : (
                <div>
                  <Label htmlFor="virtual_link">Virtual Link</Label>
                  <Input
                    id="virtual_link"
                    type="url"
                    value={formData.virtual_link}
                    onChange={(e) => setFormData({ ...formData, virtual_link: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              )}

              <div>
                <Label htmlFor="company">Company</Label>
                <Select value={formData.company_id} onValueChange={(value) => setFormData({ ...formData, company_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No company</SelectItem>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="organizer">Organizer</Label>
                <Select value={formData.organizer_person_id} onValueChange={(value) => setFormData({ ...formData, organizer_person_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select organizer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No organizer</SelectItem>
                    {people.map((person) => (
                      <SelectItem key={person.id} value={person.id}>
                        {person.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="max_attendees">Max Attendees</Label>
                <Input
                  id="max_attendees"
                  type="number"
                  min="1"
                  value={formData.max_attendees}
                  onChange={(e) => setFormData({ ...formData, max_attendees: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="ongoing">Ongoing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="webinar, training, networking"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingEvent ? 'Update' : 'Create'} Event
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
        {events.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground py-8">
            No events found. Create your first event to get started.
          </div>
        )}
      </div>
    </div>
  );
};