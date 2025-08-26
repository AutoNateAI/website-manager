import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, ExternalLink } from "lucide-react";

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

interface PersonData {
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

interface PersonFormProps {
  person?: PersonData | null;
  companies: Company[];
  onSubmit: (data: Partial<PersonData>) => void;
  onCancel: () => void;
}

export const PersonForm = ({ person, companies, onSubmit, onCancel }: PersonFormProps) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    linkedin_url: '',
    profile_image_url: '',
    position: '',
    company_id: 'none',
    location: '',
    targeting_notes: '',
    lead_status: 'prospect',
    chatgpt_links: [] as string[],
    notebooklm_links: [] as string[],
    tags: [] as string[],
  });

  const [newChatgptLink, setNewChatgptLink] = useState('');
  const [newNotebookLink, setNewNotebookLink] = useState('');
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (person) {
      setFormData({
        name: person.name || '',
        email: person.email || '',
        linkedin_url: person.linkedin_url || '',
        profile_image_url: person.profile_image_url || '',
        position: person.position || '',
        company_id: person.company_id || 'none',
        location: person.location || '',
        targeting_notes: person.targeting_notes || '',
        lead_status: person.lead_status || 'prospect',
        chatgpt_links: Array.isArray(person.chatgpt_links) ? person.chatgpt_links : [],
        notebooklm_links: Array.isArray(person.notebooklm_links) ? person.notebooklm_links : [],
        tags: Array.isArray(person.tags) ? person.tags : [],
      });
    }
  }, [person]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const addChatgptLink = () => {
    if (newChatgptLink.trim()) {
      setFormData(prev => ({
        ...prev,
        chatgpt_links: [...prev.chatgpt_links, newChatgptLink.trim()]
      }));
      setNewChatgptLink('');
    }
  };

  const removeChatgptLink = (index: number) => {
    setFormData(prev => ({
      ...prev,
      chatgpt_links: prev.chatgpt_links.filter((_, i) => i !== index)
    }));
  };

  const addNotebookLink = () => {
    if (newNotebookLink.trim()) {
      setFormData(prev => ({
        ...prev,
        notebooklm_links: [...prev.notebooklm_links, newNotebookLink.trim()]
      }));
      setNewNotebookLink('');
    }
  };

  const removeNotebookLink = (index: number) => {
    setFormData(prev => ({
      ...prev,
      notebooklm_links: prev.notebooklm_links.filter((_, i) => i !== index)
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            required
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Full name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="email@example.com"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="position">Position</Label>
          <Input
            id="position"
            value={formData.position}
            onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
            placeholder="Job title"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lead_status">Lead Status</Label>
          <Select value={formData.lead_status} onValueChange={(value) => setFormData(prev => ({ ...prev, lead_status: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="prospect">Prospect</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="opportunity">Opportunity</SelectItem>
              <SelectItem value="client">Client</SelectItem>
              <SelectItem value="not_interested">Not Interested</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="company">Company</Label>
        <Select value={formData.company_id} onValueChange={(value) => setFormData(prev => ({ ...prev, company_id: value }))}>
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

      <div className="space-y-2">
        <Label htmlFor="linkedin">LinkedIn Profile URL</Label>
        <Input
          id="linkedin"
          type="url"
          value={formData.linkedin_url}
          onChange={(e) => setFormData(prev => ({ ...prev, linkedin_url: e.target.value }))}
          placeholder="https://linkedin.com/in/..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="profile_image">LinkedIn Profile Image URL</Label>
        <Input
          id="profile_image"
          type="url"
          value={formData.profile_image_url}
          onChange={(e) => setFormData(prev => ({ ...prev, profile_image_url: e.target.value }))}
          placeholder="https://media.licdn.com/..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
          placeholder="City, Country"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="targeting_notes">Targeting Notes</Label>
        <Textarea
          id="targeting_notes"
          value={formData.targeting_notes}
          onChange={(e) => setFormData(prev => ({ ...prev, targeting_notes: e.target.value }))}
          placeholder="Notes about this person and targeting approach..."
          rows={3}
        />
      </div>

      {/* ChatGPT Links */}
      <div className="space-y-2">
        <Label>ChatGPT Conversation Links</Label>
        <div className="flex gap-2">
          <Input
            value={newChatgptLink}
            onChange={(e) => setNewChatgptLink(e.target.value)}
            placeholder="https://chat.openai.com/..."
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addChatgptLink())}
          />
          <Button type="button" size="sm" onClick={addChatgptLink}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.chatgpt_links.map((link, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-2">
              <ExternalLink className="w-3 h-3" />
              <span className="max-w-[200px] truncate">ChatGPT #{index + 1}</span>
              <X
                className="w-3 h-3 cursor-pointer hover:text-destructive"
                onClick={() => removeChatgptLink(index)}
              />
            </Badge>
          ))}
        </div>
      </div>

      {/* NotebookLM Links */}
      <div className="space-y-2">
        <Label>NotebookLM Links</Label>
        <div className="flex gap-2">
          <Input
            value={newNotebookLink}
            onChange={(e) => setNewNotebookLink(e.target.value)}
            placeholder="https://notebooklm.google.com/..."
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addNotebookLink())}
          />
          <Button type="button" size="sm" onClick={addNotebookLink}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.notebooklm_links.map((link, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-2">
              <ExternalLink className="w-3 h-3" />
              <span className="max-w-[200px] truncate">NotebookLM #{index + 1}</span>
              <X
                className="w-3 h-3 cursor-pointer hover:text-destructive"
                onClick={() => removeNotebookLink(index)}
              />
            </Badge>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Add tag..."
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
          />
          <Button type="button" size="sm" onClick={addTag}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.tags.map((tag, index) => (
            <Badge key={index} variant="outline" className="flex items-center gap-2">
              {tag}
              <X
                className="w-3 h-3 cursor-pointer hover:text-destructive"
                onClick={() => removeTag(index)}
              />
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {person ? 'Update Person' : 'Create Person'}
        </Button>
      </div>
    </form>
  );
};