import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Copy, RefreshCw } from 'lucide-react';
import TemplateVariablesDocumentation from './TemplateVariablesDocumentation';

interface PromptTemplate {
  id: string;
  type: 'concept' | 'caption' | 'image_prompts';
  platform: string | null;
  style: string | null;
  voice: string | null;
  media_type: string | null;
  template: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

const TEMPLATE_TYPES = [
  { value: 'concept', label: 'Post Concepts' },
  { value: 'caption', label: 'Captions & Hashtags' },
  { value: 'image_prompts', label: 'Image Prompts' },
];

const PLATFORMS = ['linkedin', 'twitter', 'instagram', 'facebook'];
const STYLES = ['professional', 'casual', 'technical', 'creative'];
const VOICES = ['authoritative', 'friendly', 'educational', 'inspiring'];
const MEDIA_TYPES = ['evergreen', 'company_targeting', 'advertisement'];

export default function PromptTemplateManager() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('concept');
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    type: 'concept' as 'concept' | 'caption' | 'image_prompts',
    platform: 'any',
    style: 'any',
    voice: 'any',
    media_type: 'any',
    template: '',
    is_default: false,
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prompt_templates')
        .select('*')
        .order('type', { ascending: true })
        .order('platform', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: 'Error fetching templates',
        description: 'Failed to load prompt templates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const templateData = {
        ...formData,
        platform: formData.platform || null,
        style: formData.style || null,
        voice: formData.voice || null,
        media_type: formData.media_type || null,
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from('prompt_templates')
          .update(templateData)
          .eq('id', editingTemplate.id);
        if (error) throw error;
        toast({ title: 'Template updated successfully' });
      } else {
        const { error } = await supabase
          .from('prompt_templates')
          .insert(templateData);
        if (error) throw error;
        toast({ title: 'Template created successfully' });
      }

      fetchTemplates();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: 'Error saving template',
        description: 'Failed to save prompt template',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      const { error } = await supabase
        .from('prompt_templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      fetchTemplates();
      toast({ title: 'Template deleted successfully' });
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Error deleting template',
        description: 'Failed to delete prompt template',
        variant: 'destructive',
      });
    }
  };

  const handleClone = (template: PromptTemplate) => {
    setFormData({
      type: template.type,
      platform: template.platform || 'any',
      style: template.style || 'any',
      voice: template.voice || 'any',
      media_type: template.media_type || 'any',
      template: template.template,
      is_default: false,
    });
    setEditingTemplate(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (template: PromptTemplate) => {
    setFormData({
      type: template.type,
      platform: template.platform || 'any',
      style: template.style || 'any',
      voice: template.voice || 'any',
      media_type: template.media_type || 'any',
      template: template.template,
      is_default: template.is_default,
    });
    setEditingTemplate(template);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      type: 'concept',
      platform: 'any',
      style: 'any',
      voice: 'any',
      media_type: 'any',
      template: '',
      is_default: false,
    });
    setEditingTemplate(null);
  };

  const filteredTemplates = templates.filter(t => t.type === selectedType);

  const formatMeta = (template: PromptTemplate) => {
    const meta = [];
    if (template.platform) meta.push(`Platform: ${template.platform}`);
    if (template.style) meta.push(`Style: ${template.style}`);
    if (template.voice) meta.push(`Voice: ${template.voice}`);
    if (template.media_type) meta.push(`Media: ${template.media_type}`);
    return meta.join(' • ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Prompt Templates</h1>
          <p className="text-muted-foreground">
            Manage AI prompts for social media content generation
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Edit Template' : 'Create New Template'}
              </DialogTitle>
              <DialogDescription>
                Configure prompt templates for AI content generation
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Template Type</Label>
                  <Select value={formData.type} onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="platform">Platform (optional)</Label>
                  <Select value={formData.platform} onValueChange={(value) => setFormData(prev => ({ ...prev, platform: value === 'any' ? '' : value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any platform</SelectItem>
                      {PLATFORMS.map(platform => (
                        <SelectItem key={platform} value={platform}>
                          {platform}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="style">Style (optional)</Label>
                  <Select value={formData.style} onValueChange={(value) => setFormData(prev => ({ ...prev, style: value === 'any' ? '' : value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any style</SelectItem>
                      {STYLES.map(style => (
                        <SelectItem key={style} value={style}>
                          {style}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="voice">Voice (optional)</Label>
                  <Select value={formData.voice} onValueChange={(value) => setFormData(prev => ({ ...prev, voice: value === 'any' ? '' : value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any voice" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any voice</SelectItem>
                      {VOICES.map(voice => (
                        <SelectItem key={voice} value={voice}>
                          {voice}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="media_type">Media Type (optional)</Label>
                  <Select value={formData.media_type} onValueChange={(value) => setFormData(prev => ({ ...prev, media_type: value === 'any' ? '' : value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any media type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any media type</SelectItem>
                      {MEDIA_TYPES.map(type => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={formData.is_default}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_default: e.target.checked }))}
                />
                <Label htmlFor="is_default">Set as default template</Label>
              </div>

              <div>
                <Label htmlFor="template">Template Content</Label>
                <Textarea
                  id="template"
                  value={formData.template}
                  onChange={(e) => setFormData(prev => ({ ...prev, template: e.target.value }))}
                  rows={12}
                  placeholder="Enter your prompt template using {{variable}} syntax..."
                  className="font-mono text-sm"
                />
                <div className="mt-3">
                  <TemplateVariablesDocumentation templateType={formData.type} />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  {editingTemplate ? 'Update' : 'Create'} Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex space-x-2 mb-6">
        {TEMPLATE_TYPES.map(type => (
          <Button
            key={type.value}
            variant={selectedType === type.value ? 'default' : 'outline'}
            onClick={() => setSelectedType(type.value)}
          >
            {type.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-4">
        {filteredTemplates.map(template => (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CardTitle className="text-lg">
                    {TEMPLATE_TYPES.find(t => t.value === template.type)?.label}
                  </CardTitle>
                  {template.is_default && (
                    <Badge variant="secondary">Default</Badge>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline" onClick={() => handleClone(template)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleEdit(template)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleDelete(template.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardDescription>
                {formatMeta(template) || 'Universal template'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-3 rounded-md">
                <pre className="text-xs whitespace-pre-wrap overflow-x-auto">
                  {template.template.length > 300 
                    ? template.template.substring(0, 300) + '...'
                    : template.template
                  }
                </pre>
              </div>
              <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                <span>Updated: {new Date(template.updated_at).toLocaleDateString()}</span>
                <span>ID: {template.id.substring(0, 8)}...</span>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {filteredTemplates.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">
                No {TEMPLATE_TYPES.find(t => t.value === selectedType)?.label.toLowerCase()} templates found.
              </p>
              <Button className="mt-4" onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Template
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}