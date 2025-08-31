import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ExternalLink, Edit, Building, MapPin, Mail, User, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useState } from "react";

interface Company {
  id: string;
  name: string;
  website?: string;
  linkedin_url?: string;
  industry?: string;
  location?: string;
  company_size?: string;
  targeting_notes?: string;
  chatgpt_links: string[];
  notebooklm_links: string[];
  tags: string[];
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

interface PersonCardProps {
  person: Person;
  onEdit: () => void;
  onDelete: () => void;
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

export const PersonCard = ({ person, onEdit, onDelete }: PersonCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
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

  const handleDelete = () => {
    setShowDeleteDialog(false);
    onDelete();
  };

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <Avatar className="w-12 h-12 flex-shrink-0">
              <AvatarImage src={person.profile_image_url} alt={person.name} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(person.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{person.name}</CardTitle>
              {person.position && (
                <p className="text-sm text-muted-foreground truncate">{person.position}</p>
              )}
              <Badge className={`text-xs mt-1 ${getStatusColor(person.lead_status)}`}>
                {person.lead_status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button variant="ghost" size="sm" onClick={onEdit} aria-label="Edit person">
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              aria-label="Delete person"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Contact Details */}
        <div className="space-y-2">
          {person.email && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-4 h-4" />
              <span className="truncate">{person.email}</span>
            </div>
          )}
          
          {person.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{person.location}</span>
            </div>
          )}

          {person.company && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building className="w-4 h-4" />
              <span className="truncate">{person.company.name}</span>
            </div>
          )}
        </div>

        {/* Links */}
        <div className="flex gap-2">
          {person.linkedin_url && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openLink(person.linkedin_url!)}
              className="flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              LinkedIn
            </Button>
          )}
          
          {person.email && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`mailto:${person.email}`, '_blank')}
              className="flex items-center gap-1"
            >
              <Mail className="w-3 h-3" />
              Email
            </Button>
          )}
        </div>

        {/* Research Links */}
        {(person.chatgpt_links.length > 0 || person.notebooklm_links.length > 0) && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Research:</p>
            <div className="flex flex-wrap gap-1">
              {person.chatgpt_links.map((link, index) => (
                <Badge
                  key={`chatgpt-${index}`}
                  variant="secondary"
                  className="cursor-pointer text-xs"
                  onClick={() => openLink(link)}
                >
                  ChatGPT #{index + 1}
                </Badge>
              ))}
              {person.notebooklm_links.map((link, index) => (
                <Badge
                  key={`notebook-${index}`}
                  variant="outline"
                  className="cursor-pointer text-xs"
                  onClick={() => openLink(link)}
                >
                  NotebookLM #{index + 1}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {person.tags.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Tags:</p>
            <div className="flex flex-wrap gap-1">
              {person.tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Targeting Notes */}
        {person.targeting_notes && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Targeting Notes:</p>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {person.targeting_notes}
            </p>
          </div>
        )}

        {/* Created Date */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Added {new Date(person.created_at).toLocaleDateString()}
          </p>
        </div>
      </CardContent>
    </Card>

    <ConfirmDialog
      open={showDeleteDialog}
      onOpenChange={setShowDeleteDialog}
      title="Delete Person"
      description="Are you sure you want to delete this person? This action cannot be undone."
      confirmText="Delete"
      cancelText="Cancel"
      onConfirm={handleDelete}
      variant="destructive"
    />
  </>
);
};