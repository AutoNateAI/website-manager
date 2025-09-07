import { useState, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Save, FileText, Clock, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface LocationNote {
  id: string;
  note_text: string;
  note_category: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

interface LocationNotesManagerProps {
  locationId: string;
  locationName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LocationNotesManager = ({ 
  locationId, 
  locationName, 
  open, 
  onOpenChange 
}: LocationNotesManagerProps) => {
  const { toast } = useToast();
  const [notes, setNotes] = useState<LocationNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [newNote, setNewNote] = useState({
    text: '',
    category: 'general',
    priority: 'normal'
  });

  useEffect(() => {
    if (open && locationId) {
      fetchNotes();
    }
  }, [open, locationId]);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('location_notes')
        .select('*')
        .eq('location_id', locationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast({
        title: "Error",
        description: "Failed to fetch location notes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.text.trim()) {
      toast({
        title: "Error",
        description: "Please enter a note",
        variant: "destructive",
      });
      return;
    }

    setAddingNote(true);
    try {
      const { error } = await supabase
        .from('location_notes')
        .insert({
          location_id: locationId,
          note_text: newNote.text,
          note_category: newNote.category,
          priority: newNote.priority,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Note added successfully",
      });

      setNewNote({ text: '', category: 'general', priority: 'normal' });
      fetchNotes();
    } catch (error) {
      console.error('Error adding note:', error);
      toast({
        title: "Error",
        description: "Failed to add note",
        variant: "destructive",
      });
    } finally {
      setAddingNote(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'secondary';
      case 'normal': return 'outline';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'events': return '🎯';
      case 'networking': return '🤝';
      case 'business': return '💼';
      case 'research': return '🔬';
      default: return '📝';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Location Notes: {locationName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Note */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add New Note</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="noteText">Note</Label>
                <Textarea
                  id="noteText"
                  value={newNote.text}
                  onChange={(e) => setNewNote(prev => ({ ...prev, text: e.target.value }))}
                  placeholder="Add your note about this location..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={newNote.category} 
                    onValueChange={(value) => setNewNote(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">📝 General</SelectItem>
                      <SelectItem value="events">🎯 Events</SelectItem>
                      <SelectItem value="networking">🤝 Networking</SelectItem>
                      <SelectItem value="business">💼 Business</SelectItem>
                      <SelectItem value="research">🔬 Research</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select 
                    value={newNote.priority} 
                    onValueChange={(value) => setNewNote(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleAddNote} disabled={addingNote} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {addingNote ? 'Adding...' : 'Add Note'}
              </Button>
            </CardContent>
          </Card>

          {/* Existing Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Existing Notes ({notes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading notes...
                </div>
              ) : notes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No notes yet. Add your first note above.
                </div>
              ) : (
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-4">
                    {notes.map((note) => (
                      <Card key={note.id} className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{getCategoryIcon(note.note_category)}</span>
                              <Badge variant={getPriorityColor(note.priority) as any}>
                                {note.priority}
                              </Badge>
                              <Badge variant="outline" className="capitalize">
                                {note.note_category}
                              </Badge>
                            </div>
                            <p className="text-sm leading-relaxed">{note.note_text}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
