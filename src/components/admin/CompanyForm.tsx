import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, ExternalLink } from "lucide-react";

interface CompanyData {
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

interface CompanyFormProps {
  company?: CompanyData | null;
  onSubmit: (data: Partial<CompanyData>) => void;
  onCancel: () => void;
}

export const CompanyForm = ({ company, onSubmit, onCancel }: CompanyFormProps) => {
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    linkedin_url: '',
    industry: '',
    location: '',
    company_size: '',
    targeting_notes: '',
    chatgpt_links: [] as string[],
    notebooklm_links: [] as string[],
    tags: [] as string[],
  });

  const [newChatgptLink, setNewChatgptLink] = useState('');
  const [newNotebookLink, setNewNotebookLink] = useState('');
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || '',
        website: company.website || '',
        linkedin_url: company.linkedin_url || '',
        industry: company.industry || '',
        location: company.location || '',
        company_size: company.company_size || '',
        targeting_notes: company.targeting_notes || '',
        chatgpt_links: Array.isArray(company.chatgpt_links) ? company.chatgpt_links : [],
        notebooklm_links: Array.isArray(company.notebooklm_links) ? company.notebooklm_links : [],
        tags: Array.isArray(company.tags) ? company.tags : [],
      });
    }
  }, [company]);

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
          <Label htmlFor="name">Company Name *</Label>
          <Input
            id="name"
            required
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Company name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            type="url"
            value={formData.website}
            onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
            placeholder="https://company.com"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="linkedin">LinkedIn URL</Label>
        <Input
          id="linkedin"
          type="url"
          value={formData.linkedin_url}
          onChange={(e) => setFormData(prev => ({ ...prev, linkedin_url: e.target.value }))}
          placeholder="https://linkedin.com/company/..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="industry">Industry</Label>
          <Select value={formData.industry} onValueChange={(value) => setFormData(prev => ({ ...prev, industry: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select industry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Technology">Technology</SelectItem>
              <SelectItem value="Healthcare">Healthcare</SelectItem>
              <SelectItem value="Finance">Finance</SelectItem>
              <SelectItem value="Education">Education</SelectItem>
              <SelectItem value="Manufacturing">Manufacturing</SelectItem>
              <SelectItem value="Retail">Retail</SelectItem>
              <SelectItem value="Consulting">Consulting</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="company_size">Company Size</Label>
          <Select value={formData.company_size} onValueChange={(value) => setFormData(prev => ({ ...prev, company_size: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1-10">1-10 employees</SelectItem>
              <SelectItem value="11-50">11-50 employees</SelectItem>
              <SelectItem value="51-200">51-200 employees</SelectItem>
              <SelectItem value="201-500">201-500 employees</SelectItem>
              <SelectItem value="501-1000">501-1000 employees</SelectItem>
              <SelectItem value="1000+">1000+ employees</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
          placeholder="Notes about targeting this company..."
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
          {company ? 'Update Company' : 'Create Company'}
        </Button>
      </div>
    </form>
  );
};