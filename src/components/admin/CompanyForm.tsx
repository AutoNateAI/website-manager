import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, ExternalLink } from "lucide-react";

interface CompanyData {
  id?: string;
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
  created_at?: string;
}

interface CompanyFormProps {
  company?: CompanyData | null;
  onSubmit: (data: Partial<CompanyData>) => void;
  onCancel: () => void;
}

const TARGET_TYPES = [
  'Foundations',
  'Grant Recipients',
  'Venture Capital',
  'Startups'
];

export const CompanyForm = ({ company, onSubmit, onCancel }: CompanyFormProps) => {
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    linkedin_url: '',
    target_type: '',
    location: '',
    company_size: '',
    targeting_notes: '',
    propublic_link: '',
    endowment_balance: '',
    total_grants_paid: '',
    program_expenses: '',
    top_vendors: '',
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
        target_type: company.target_type || '',
        location: company.location || '',
        company_size: company.company_size || '',
        targeting_notes: company.targeting_notes || '',
        propublic_link: company.propublic_link || '',
        endowment_balance: company.endowment_balance?.toString() || '',
        total_grants_paid: company.total_grants_paid?.toString() || '',
        program_expenses: company.program_expenses?.toString() || '',
        top_vendors: company.top_vendors || '',
        chatgpt_links: Array.isArray(company.chatgpt_links) ? company.chatgpt_links : [],
        notebooklm_links: Array.isArray(company.notebooklm_links) ? company.notebooklm_links : [],
        tags: Array.isArray(company.tags) ? company.tags : [],
      });
    }
  }, [company]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData: Partial<CompanyData> = {
      name: formData.name,
      website: formData.website || undefined,
      linkedin_url: formData.linkedin_url || undefined,
      target_type: formData.target_type || undefined,
      location: formData.location || undefined,
      company_size: formData.company_size || undefined,
      targeting_notes: formData.targeting_notes || undefined,
      chatgpt_links: formData.chatgpt_links,
      notebooklm_links: formData.notebooklm_links,
      tags: formData.tags,
      propublic_link: formData.propublic_link || undefined,
      endowment_balance: formData.endowment_balance ? parseInt(formData.endowment_balance) : undefined,
      total_grants_paid: formData.total_grants_paid ? parseInt(formData.total_grants_paid) : undefined,
      program_expenses: formData.program_expenses ? parseInt(formData.program_expenses) : undefined,
      top_vendors: formData.top_vendors || undefined,
    };
    
    onSubmit(submitData);
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

  const isFoundation = formData.target_type === 'Foundations';

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
          <Label htmlFor="target_type">Target Type</Label>
          <Select value={formData.target_type} onValueChange={(value) => setFormData(prev => ({ ...prev, target_type: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select target type" />
            </SelectTrigger>
            <SelectContent>
              {TARGET_TYPES.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
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

      {/* Foundation-specific fields */}
      {isFoundation && (
        <div className="space-y-4 p-4 border rounded-lg bg-muted/10">
          <h3 className="text-lg font-semibold">Foundation Information</h3>
          
          <div className="space-y-2">
            <Label htmlFor="propublic_link">ProPublica Link</Label>
            <Input
              id="propublic_link"
              type="url"
              value={formData.propublic_link}
              onChange={(e) => setFormData(prev => ({ ...prev, propublic_link: e.target.value }))}
              placeholder="https://projects.propublica.org/nonprofits/..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="endowment_balance">Endowment Balance ($)</Label>
              <Input
                id="endowment_balance"
                type="number"
                value={formData.endowment_balance}
                onChange={(e) => setFormData(prev => ({ ...prev, endowment_balance: e.target.value }))}
                placeholder="5000000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="total_grants_paid">Total Grants Paid ($)</Label>
              <Input
                id="total_grants_paid"
                type="number"
                value={formData.total_grants_paid}
                onChange={(e) => setFormData(prev => ({ ...prev, total_grants_paid: e.target.value }))}
                placeholder="250000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="program_expenses">Program Expenses ($)</Label>
              <Input
                id="program_expenses"
                type="number"
                value={formData.program_expenses}
                onChange={(e) => setFormData(prev => ({ ...prev, program_expenses: e.target.value }))}
                placeholder="300000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="top_vendors">Top Vendors</Label>
            <Textarea
              id="top_vendors"
              value={formData.top_vendors}
              onChange={(e) => setFormData(prev => ({ ...prev, top_vendors: e.target.value }))}
              placeholder="List of key vendors and contractors..."
              rows={2}
            />
          </div>
        </div>
      )}

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