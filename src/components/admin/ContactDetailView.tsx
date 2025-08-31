import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ExternalLink, Edit, Building, MapPin, Mail, User, X, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Company {
  id: string;
  name: string;
  website?: string;
  linkedin_url?: string;
  target_type?: string;
  location?: string;
  company_size?: string;
  targeting_notes?: string;
  chatgpt_links: string[];
  notebooklm_links: string[];
  tags: string[];
  propublic_link?: string;
  endowment_balance?: number;
  total_grants_paid?: number;
  program_expenses?: number;
  top_vendors?: string;
  leadership_compensation?: any[];
  form_990_years?: any[];
  created_at: string;
}

interface Person {
  id: string;
  name: string;
  email?: string;
  linkedin_url?: string;
  profile_image_url?: string;
  position?: string;
  company_id?: string;
  location?: string;
  targeting_notes?: string;
  chatgpt_links: string[];
  notebooklm_links: string[];
  tags: string[];
  lead_status: string;
  created_at: string;
  company?: Company;
}

interface ContactDetailViewProps {
  contact: Person | Company;
  type: 'person' | 'company';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onUpdate: () => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'prospect':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'contacted':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'qualified':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'opportunity':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    case 'client':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'not_interested':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
};

export const ContactDetailView = ({ contact, type, open, onOpenChange, onEdit, onUpdate }: ContactDetailViewProps) => {
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const { toast } = useToast();

  const openLink = (url: string) => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      const currentNotes = contact.targeting_notes || '';
      const timestamp = new Date().toLocaleString();
      const updatedNotes = currentNotes 
        ? `${currentNotes}\n\n[${timestamp}] ${newNote}`
        : `[${timestamp}] ${newNote}`;

      const table = type === 'person' ? 'people' : 'companies';
      const { error } = await supabase
        .from(table)
        .update({ targeting_notes: updatedNotes })
        .eq('id', contact.id);

      if (error) throw error;

      toast({
        title: "Note added",
        description: "Your note has been added successfully.",
      });

      setNewNote('');
      setIsAddingNote(false);
      onUpdate();
    } catch (error) {
      console.error('Error adding note:', error);
      toast({
        title: "Error",
        description: "Failed to add note. Please try again.",
        variant: "destructive",
      });
    }
  };

  const renderFoundationFields = () => {
    if (type !== 'company' || (contact as Company).target_type !== 'Foundation') return null;
    
    const company = contact as Company;
    
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Foundation Data</h3>
        
        {company.propublic_link && (
          <div className="space-y-2">
            <p className="text-sm font-medium">ProPublica Link:</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openLink(company.propublic_link!)}
              className="flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              View on ProPublica
            </Button>
          </div>
        )}

        {(company.endowment_balance || company.total_grants_paid || company.program_expenses) && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Financial Overview:</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {company.endowment_balance && (
                <div className="bg-muted p-3 rounded">
                  <p className="font-medium">Endowment Balance</p>
                  <p className="text-lg">${company.endowment_balance.toLocaleString()}</p>
                </div>
              )}
              {company.total_grants_paid && (
                <div className="bg-muted p-3 rounded">
                  <p className="font-medium">Total Grants Paid</p>
                  <p className="text-lg">${company.total_grants_paid.toLocaleString()}</p>
                </div>
              )}
              {company.program_expenses && (
                <div className="bg-muted p-3 rounded">
                  <p className="font-medium">Program Expenses</p>
                  <p className="text-lg">${company.program_expenses.toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {company.top_vendors && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Top Vendors:</p>
            <p className="text-sm text-muted-foreground">{company.top_vendors}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{contact.name}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsAddingNote(!isAddingNote)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Note
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Section */}
          <div className="flex items-start gap-4">
            {type === 'person' ? (
              <Avatar className="w-16 h-16">
                <AvatarImage src={(contact as Person).profile_image_url} alt={contact.name} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                  {getInitials(contact.name)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                <Building className="w-8 h-8 text-primary" />
              </div>
            )}
            
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{contact.name}</h2>
              {type === 'person' && (contact as Person).position && (
                <p className="text-lg text-muted-foreground">{(contact as Person).position}</p>
              )}
              {type === 'company' && (contact as Company).target_type && (
                <p className="text-lg text-muted-foreground">{(contact as Company).target_type}</p>
              )}
              {type === 'person' && (contact as Person).lead_status && (
                <Badge className={`mt-2 ${getStatusColor((contact as Person).lead_status)}`}>
                  {(contact as Person).lead_status.replace('_', ' ').toUpperCase()}
                </Badge>
              )}
            </div>
          </div>

          {/* Add Note Section */}
          {isAddingNote && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add New Note</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Enter your note here..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button onClick={handleAddNote} disabled={!newNote.trim()}>
                    Save Note
                  </Button>
                  <Button variant="outline" onClick={() => setIsAddingNote(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contact Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {type === 'person' && (contact as Person).email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span>{(contact as Person).email}</span>
                  </div>
                )}
                
                {contact.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{contact.location}</span>
                  </div>
                )}

                {type === 'person' && (contact as Person).company && (
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    <span>{(contact as Person).company.name}</span>
                  </div>
                )}

                {type === 'company' && (contact as Company).website && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openLink((contact as Company).website!)}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Website
                  </Button>
                )}

                {contact.linkedin_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openLink(contact.linkedin_url!)}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    LinkedIn
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Research Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {contact.chatgpt_links.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">ChatGPT Links:</p>
                    <div className="flex flex-wrap gap-1">
                      {contact.chatgpt_links.map((link, index) => (
                        <Badge
                          key={`chatgpt-${index}`}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => openLink(link)}
                        >
                          ChatGPT #{index + 1}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {contact.notebooklm_links.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">NotebookLM Links:</p>
                    <div className="flex flex-wrap gap-1">
                      {contact.notebooklm_links.map((link, index) => (
                        <Badge
                          key={`notebook-${index}`}
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() => openLink(link)}
                        >
                          NotebookLM #{index + 1}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Foundation-specific fields */}
          {renderFoundationFields()}

          {/* Tags */}
          {contact.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {contact.tags.map((tag, index) => (
                    <Badge key={index} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {contact.targeting_notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {contact.targeting_notes}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};