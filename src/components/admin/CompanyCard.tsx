import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Edit, Building, MapPin, Users, Globe, Trash2 } from "lucide-react";
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

interface CompanyCardProps {
  company: Company;
  onEdit: () => void;
  onDelete: () => void;
}

export const CompanyCard = ({ company, onEdit, onDelete }: CompanyCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const openLink = (url: string) => {
    if (url) {
      window.open(url, '_blank');
    }
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
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Building className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{company.name}</CardTitle>
              {company.industry && (
                <p className="text-sm text-muted-foreground">{company.industry}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button variant="ghost" size="sm" onClick={onEdit} aria-label="Edit company">
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              aria-label="Delete company"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Company Details */}
        <div className="space-y-2">
          {company.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{company.location}</span>
            </div>
          )}
          
          {company.company_size && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{company.company_size}</span>
            </div>
          )}
        </div>

        {/* Links */}
        <div className="flex gap-2">
          {company.website && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openLink(company.website!)}
              className="flex items-center gap-1"
            >
              <Globe className="w-3 h-3" />
              Website
            </Button>
          )}
          
          {company.linkedin_url && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openLink(company.linkedin_url!)}
              className="flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              LinkedIn
            </Button>
          )}
        </div>

        {/* Research Links */}
        {(company.chatgpt_links.length > 0 || company.notebooklm_links.length > 0) && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Research:</p>
            <div className="flex flex-wrap gap-1">
              {company.chatgpt_links.map((link, index) => (
                <Badge
                  key={`chatgpt-${index}`}
                  variant="secondary"
                  className="cursor-pointer text-xs"
                  onClick={() => openLink(link)}
                >
                  ChatGPT #{index + 1}
                </Badge>
              ))}
              {company.notebooklm_links.map((link, index) => (
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
        {company.tags.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Tags:</p>
            <div className="flex flex-wrap gap-1">
              {company.tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Targeting Notes */}
        {company.targeting_notes && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Targeting Notes:</p>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {company.targeting_notes}
            </p>
          </div>
        )}

        {/* Created Date */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Added {new Date(company.created_at).toLocaleDateString()}
          </p>
        </div>
      </CardContent>
    </Card>

    <ConfirmDialog
      open={showDeleteDialog}
      onOpenChange={setShowDeleteDialog}
      title="Delete Company"
      description="Are you sure you want to delete this company? This action cannot be undone."
      confirmText="Delete"
      cancelText="Cancel"
      onConfirm={handleDelete}
      variant="destructive"
    />
  </>
);
};