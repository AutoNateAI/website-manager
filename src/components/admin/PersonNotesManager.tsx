import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, StickyNote, Clock, Edit, Trash2, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface PersonNote {
  id: string;
  person_id: string;
  note_text: string;
  note_category: string;
  priority: string;
  created_at: string;
  updated_at: string;
  people: {
    id: string;
    name: string;
    email?: string;
    position?: string;
    company?: {
      name: string;
    };
  };
}

interface Person {
  id: string;
  name: string;
  email?: string;
  position?: string;
  company?: {
    name: string;
  };
}

export default function PersonNotesManager() {
  const [notes, setNotes] = useState<PersonNote[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<PersonNote | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  const [noteForm, setNoteForm] = useState({
    person_id: '',
    note_text: '',
    note_category: 'general',
    priority: 'normal'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [notesResult, peopleResult] = await Promise.all([
        supabase
          .from('person_notes')
          .select(`
            *,
            people (
              id,
              name,
              email,
              position,
              companies (name)
            )
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('people')
          .select(`
            id,
            name,
            email,
            position,
            companies (name)
          `)
          .order('name')
      ]);

      if (notesResult.error) throw notesResult.error;
      if (peopleResult.error) throw peopleResult.error;

      setNotes(notesResult.data || []);
      setPeople(peopleResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Error loading data', variant: 'destructive' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingNote) {
        const { error } = await supabase
          .from('person_notes')
          .update(noteForm)
          .eq('id', editingNote.id);
        
        if (error) throw error;
        toast({ title: 'Note updated successfully!' });
      } else {
        const { error } = await supabase
          .from('person_notes')
          .insert([noteForm]);
        
        if (error) throw error;
        toast({ title: 'Note added successfully!' });
      }
      
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving note:', error);
      toast({ title: 'Error saving note', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setNoteForm({
      person_id: '',
      note_text: '',
      note_category: 'general',
      priority: 'normal'
    });
    setEditingNote(null);
    setIsDialogOpen(false);
  };

  const editNote = (note: PersonNote) => {
    setNoteForm({
      person_id: note.person_id,
      note_text: note.note_text,
      note_category: note.note_category,
      priority: note.priority
    });
    setEditingNote(note);
    setIsDialogOpen(true);
  };

  const deleteNote = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    
    try {
      const { error } = await supabase.from('person_notes').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Note deleted successfully!' });
      fetchData();
    } catch (error) {
      console.error('Error deleting note:', error);
      toast({ title: 'Error deleting note', variant: 'destructive' });
    }
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = 
      note.people.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.note_text.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || note.note_category === filterCategory;
    const matchesPriority = filterPriority === 'all' || note.priority === filterPriority;
    
    return matchesSearch && matchesCategory && matchesPriority;
  });

  const groupedNotes = filteredNotes.reduce((groups, note) => {
    const personId = note.person_id;
    if (!groups[personId]) {
      groups[personId] = {
        person: note.people,
        notes: []
      };
    }
    groups[personId].notes.push(note);
    return groups;
  }, {} as Record<string, { person: Person; notes: PersonNote[] }>);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'normal': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'business': return 'default';
      case 'personal': return 'secondary';
      case 'follow_up': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Person Notes</h1>
          <p className="text-muted-foreground">Keep track of important information about people over time</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Note
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingNote ? 'Edit Note' : 'Add New Note'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="person_id">Person</Label>
                <Select value={noteForm.person_id} onValueChange={(value) => setNoteForm({ ...noteForm, person_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select person" />
                  </SelectTrigger>
                  <SelectContent>
                    {people.map((person) => (
                      <SelectItem key={person.id} value={person.id}>
                        {person.name} {person.position && `- ${person.position}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="note_category">Category</Label>
                  <Select value={noteForm.note_category} onValueChange={(value) => setNoteForm({ ...noteForm, note_category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="follow_up">Follow-up</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={noteForm.priority} onValueChange={(value) => setNoteForm({ ...noteForm, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="note_text">Note</Label>
                <Textarea
                  id="note_text"
                  value={noteForm.note_text}
                  onChange={(e) => setNoteForm({ ...noteForm, note_text: e.target.value })}
                  required
                  rows={4}
                  placeholder="Enter your note about this person..."
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                <Button type="submit">{editingNote ? 'Update' : 'Add'} Note</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 items-center">
        <Input
          placeholder="Search notes or people..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
        
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="business">Business</SelectItem>
            <SelectItem value="personal">Personal</SelectItem>
            <SelectItem value="follow_up">Follow-up</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6">
        {Object.values(groupedNotes).map(({ person, notes: personNotes }) => (
          <Card key={person.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                {person.name}
                {person.position && <span className="text-sm text-muted-foreground">- {person.position}</span>}
                <Badge variant="outline">{personNotes.length} notes</Badge>
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3">
                {personNotes.map((note) => (
                  <div key={note.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <Badge variant={getCategoryColor(note.note_category)}>
                          {note.note_category}
                        </Badge>
                        <Badge variant={getPriorityColor(note.priority)}>
                          {note.priority} priority
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {format(new Date(note.created_at), 'MMM dd, yyyy HH:mm')}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => editNote(note)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteNote(note.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <p className="text-sm leading-relaxed">{note.note_text}</p>
                    
                    {note.updated_at !== note.created_at && (
                      <p className="text-xs text-muted-foreground">
                        Last updated: {format(new Date(note.updated_at), 'MMM dd, yyyy HH:mm')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setNoteForm({ ...noteForm, person_id: person.id });
                    setIsDialogOpen(true);
                  }}
                >
                  <StickyNote className="w-3 h-3 mr-1" />
                  Add Note
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}