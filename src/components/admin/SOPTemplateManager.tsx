import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus, Search, Settings, Download, Eye } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SOPTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  sections: any;
  screenshot_placeholders: any;
  is_active: boolean;
  usage_count: number;
  created_at: string;
}

export const SOPTemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<SOPTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<SOPTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Create template form
  const [isCreating, setIsCreating] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    title: '',
    description: '',
    category: 'general',
    sections: [] as any[],
    screenshot_placeholders: [] as any[]
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('sop_templates')
        .select('*')
        .order('usage_count', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Error",
        description: "Failed to fetch SOP templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async () => {
    if (!newTemplate.title.trim()) {
      toast({
        title: "Error",
        description: "Please provide a title",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('sop_templates')
        .insert({
          title: newTemplate.title,
          description: newTemplate.description,
          category: newTemplate.category,
          sections: newTemplate.sections.length > 0 ? newTemplate.sections : [
            { id: 'overview', title: 'Overview', required: true, order: 1 },
            { id: 'steps', title: 'Steps', required: true, order: 2 }
          ],
          screenshot_placeholders: newTemplate.screenshot_placeholders,
          template_structure: { type: newTemplate.category, format: 'structured' },
          formatting_rules: {}
        })
        .select()
        .single();

      if (error) throw error;

      setTemplates([data, ...templates]);
      setNewTemplate({
        title: '',
        description: '',
        category: 'general',
        sections: [],
        screenshot_placeholders: []
      });
      
      toast({
        title: "Success",
        description: "SOP template created successfully",
      });
    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: "Error",
        description: "Failed to create SOP template",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const toggleTemplateStatus = async (template: SOPTemplate) => {
    try {
      const { error } = await supabase
        .from('sop_templates')
        .update({ is_active: !template.is_active })
        .eq('id', template.id);

      if (error) throw error;

      setTemplates(templates.map(t => 
        t.id === template.id ? { ...t, is_active: !t.is_active } : t
      ));

      toast({
        title: "Success",
        description: `Template ${template.is_active ? 'deactivated' : 'activated'}`,
      });
    } catch (error) {
      console.error('Error updating template:', error);
      toast({
        title: "Error",
        description: "Failed to update template",
        variant: "destructive",
      });
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(templates.map(template => template.category))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">SOP Templates</h2>
          <p className="text-muted-foreground">
            Manage template structures for consistent SOP generation
          </p>
        </div>
        
        <Dialog>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(category => (
              <SelectItem key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{template.title}</CardTitle>
                  <CardDescription className="mt-1">
                    {template.description}
                  </CardDescription>
                </div>
                <Badge variant={template.is_active ? 'default' : 'secondary'}>
                  {template.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">{template.category}</Badge>
                <span className="text-xs text-muted-foreground">
                  Used {template.usage_count} times
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  {Array.isArray(template.sections) ? template.sections.length : 0} sections, {Array.isArray(template.screenshot_placeholders) ? template.screenshot_placeholders.length : 0} screenshots
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setShowPreview(true);
                    }}
                    className="flex-1"
                  >
                    <Eye className="mr-1 h-3 w-3" />
                    Preview
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => toggleTemplateStatus(template)}
                  >
                    <Settings className="mr-1 h-3 w-3" />
                    {template.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Template Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.title}</DialogTitle>
            <DialogDescription>
              {selectedTemplate?.description}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge>{selectedTemplate.category}</Badge>
                <Badge variant="outline">
                  {Array.isArray(selectedTemplate.sections) ? selectedTemplate.sections.length : 0} sections
                </Badge>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Sections</h4>
                <div className="space-y-2">
                  {Array.isArray(selectedTemplate.sections) && selectedTemplate.sections.map((section: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <span className="font-medium">{section.title}</span>
                        {section.required && (
                          <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">Order: {section.order}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {Array.isArray(selectedTemplate.screenshot_placeholders) && selectedTemplate.screenshot_placeholders.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Screenshot Placeholders</h4>
                  <div className="space-y-2">
                    {selectedTemplate.screenshot_placeholders.map((placeholder: any, index: number) => (
                      <div key={index} className="p-2 border rounded">
                        <span className="font-medium">{placeholder.section}</span>
                        <p className="text-sm text-muted-foreground">{placeholder.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};