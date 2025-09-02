import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, MessageSquare, FileText, Brain, Search } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

interface SOPDocument {
  id: string;
  title: string;
  description: string;
  category: string;
  structured_data: any;
  content: string;
  version: number;
  status: string;
  created_at: string;
  updated_at: string;
}

// Conversation data will be stored directly in the component state

export const SOPManager: React.FC = () => {
  const [sops, setSops] = useState<SOPDocument[]>([]);
  // Conversations are handled in component state
  const [loading, setLoading] = useState(true);
  const [selectedSop, setSelectedSop] = useState<SOPDocument | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // New SOP Form
  const [isCreating, setIsCreating] = useState(false);
  const [newSopForm, setNewSopForm] = useState({
    title: '',
    description: '',
    category: 'general',
    content: ''
  });

  // Conversation Interface
  const [conversationDialog, setConversationDialog] = useState(false);
  const [currentConversation, setCurrentConversation] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isProcessingMessage, setIsProcessingMessage] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  // Templates & generation
  const [templates, setTemplates] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isGeneratingSOP, setIsGeneratingSOP] = useState(false);

  // Template generator
  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState('general');
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    fetchSOPs();
  }, []);

  const fetchSOPs = async () => {
    try {
      const { data, error } = await supabase
        .from('sop_documents')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setSops(data || []);
    } catch (error) {
      console.error('Error fetching SOPs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch SOP documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Conversations are handled in component state, no need to fetch from DB

  const fetchTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const { data, error } = await supabase
        .from('sop_templates')
        .select('id, title, category')
        .eq('is_active', true)
        .order('usage_count', { ascending: false });
      if (error) throw error;
      setTemplates(data || []);
    } catch (e) {
      console.error('Error fetching templates:', e);
    } finally {
      setTemplatesLoading(false);
    }
  };

  useEffect(() => {
    if (conversationDialog) {
      fetchTemplates();
    }
  }, [conversationDialog]);

  const minTurnsReached = () => {
    const nonSystem = currentConversation.filter((m) => m.role !== 'system');
    const turns = Math.floor(nonSystem.length / 2);
    return turns >= 2; // at least 2 full turns
  };

  const handleGenerateSOP = async () => {
    if (!selectedSop || !selectedTemplateId || !minTurnsReached()) return;
    setIsGeneratingSOP(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-sop', {
        body: {
          sopDocumentId: selectedSop.id,
          templateId: selectedTemplateId,
          messages: currentConversation,
        },
      });
      if (error) throw error;
      toast({ title: 'SOP created', description: 'Your SOP was generated using the selected template.' });
      setConversationDialog(false);
      setCurrentConversation([]);
      setSelectedTemplateId('');
      fetchSOPs();
    } catch (e) {
      console.error('Generate SOP error:', e);
      toast({ title: 'Generation failed', description: 'Could not generate SOP', variant: 'destructive' });
    } finally {
      setIsGeneratingSOP(false);
    }
  };

  const handleGenerateTemplate = async () => {
    if (!newTemplateTitle.trim()) {
      toast({ title: 'Template title required', variant: 'destructive' });
      return;
    }
    setIsGeneratingTemplate(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-sop-template', {
        body: {
          title: newTemplateTitle.trim(),
          category: newTemplateCategory,
          messages: currentConversation,
        },
      });
      if (error) throw error;
      toast({ title: 'Template created', description: 'Your template is now available.' });
      setNewTemplateTitle('');
      fetchTemplates();
      // Preselect the created template if id returned
      if ((data as any)?.templateId) setSelectedTemplateId((data as any).templateId);
    } catch (e) {
      console.error('Generate template error:', e);
      toast({ title: 'Template generation failed', variant: 'destructive' });
    } finally {
      setIsGeneratingTemplate(false);
    }
  };
  const createSOP = async () => {
    if (!newSopForm.title.trim()) {
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
        .from('sop_documents')
        .insert(newSopForm)
        .select()
        .single();

      if (error) throw error;

      setSops([data, ...sops]);
      setNewSopForm({ title: '', description: '', category: 'general', content: '' });
      toast({
        title: "Success",
        description: "SOP document created successfully",
      });
    } catch (error) {
      console.error('Error creating SOP:', error);
      toast({
        title: "Error",
        description: "Failed to create SOP document",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const startConversation = (sop: SOPDocument) => {
    setSelectedSop(sop);
    setCurrentConversation([
      {
        role: 'system',
        content: `Starting conversation about SOP: ${sop.title}. This conversation will be analyzed to extract structured operational data.`
      }
    ]);
    setConversationDialog(true);
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedSop) return;

    const userMessage = { role: 'user', content: messageInput };
    const updatedConversation = [...currentConversation, userMessage];
    setCurrentConversation(updatedConversation);
    setMessageInput('');
    setIsProcessingMessage(true);

    try {
      // Here you could add AI response generation
      const aiResponse = {
        role: 'assistant',
        content: `I understand your input about "${messageInput}". Please continue sharing details about this process or procedure for the SOP documentation.`
      };
      
      setCurrentConversation([...updatedConversation, aiResponse]);
    } catch (error) {
      console.error('Error processing message:', error);
    } finally {
      setIsProcessingMessage(false);
    }
  };

  const extractSOPData = async () => {
    if (!selectedSop || currentConversation.length < 3) {
      toast({
        title: "Error",
        description: "Need more conversation content to extract data",
        variant: "destructive",
      });
      return;
    }

    setIsExtracting(true);
    try {
      // Extract structured data directly from conversation
      const { data, error } = await supabase.functions.invoke('extract-sop-data', {
        body: { 
          conversation: currentConversation,
          sopDocumentId: selectedSop.id 
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "SOP data extracted successfully",
      });

      // Refresh data
      fetchSOPs();
      setConversationDialog(false);
      setCurrentConversation([]);
    } catch (error) {
      console.error('Error extracting SOP data:', error);
      toast({
        title: "Error",
        description: "Failed to extract SOP data",
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const filteredSOPs = sops.filter(sop => {
    const matchesSearch = sop.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sop.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || sop.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(sops.map(sop => sop.category))];

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
          <h2 className="text-3xl font-bold tracking-tight">SOPs & Documentation</h2>
          <p className="text-muted-foreground">
            Document processes and extract structured data through AI conversations
          </p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New SOP
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New SOP Document</DialogTitle>
              <DialogDescription>
                Start documenting a new standard operating procedure
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Title</label>
                <Input
                  placeholder="SOP title..."
                  value={newSopForm.title}
                  onChange={(e) => setNewSopForm({ ...newSopForm, title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Description</label>
                <Textarea
                  placeholder="Brief description of this SOP..."
                  value={newSopForm.description}
                  onChange={(e) => setNewSopForm({ ...newSopForm, description: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <Select value={newSopForm.category} onValueChange={(value) => setNewSopForm({ ...newSopForm, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="instagram">Instagram Strategy</SelectItem>
                    <SelectItem value="content">Content Creation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Initial Content (Optional)</label>
                <Textarea
                  placeholder="Any initial content or notes..."
                  value={newSopForm.content}
                  onChange={(e) => setNewSopForm({ ...newSopForm, content: e.target.value })}
                />
              </div>
              <Button onClick={createSOP} disabled={isCreating} className="w-full">
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create SOP'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search SOPs..."
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

      {/* SOPs Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSOPs.map((sop) => (
          <Card key={sop.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{sop.title}</CardTitle>
                  <CardDescription className="mt-1">
                    {sop.description}
                  </CardDescription>
                </div>
                <Badge variant={sop.status === 'extracted' ? 'default' : 'secondary'}>
                  {sop.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">{sop.category}</Badge>
                <span className="text-xs text-muted-foreground">v{sop.version}</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sop.structured_data && Object.keys(sop.structured_data).length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    <FileText className="inline mr-1 h-3 w-3" />
                    Structured data available
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startConversation(sop)}
                    className="flex-1"
                  >
                    <MessageSquare className="mr-1 h-3 w-3" />
                    Discuss
                  </Button>
                  {sop.structured_data && Object.keys(sop.structured_data).length > 0 && (
                    <Button variant="secondary" size="sm">
                      <Brain className="mr-1 h-3 w-3" />
                      View Data
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Conversation Dialog */}
      <Dialog open={conversationDialog} onOpenChange={setConversationDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>SOP Conversation: {selectedSop?.title}</DialogTitle>
            <DialogDescription>
              Discuss the processes and procedures. The conversation will be analyzed to extract structured data.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-muted/30 rounded">
            {currentConversation.map((message, index) => (
              <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-lg ${
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-background border'
                }`}>
                  <div className="text-xs mb-1 opacity-70 capitalize">{message.role}</div>
                  <div className="text-sm">{message.content}</div>
                </div>
              </div>
            ))}
            {isProcessingMessage && (
              <div className="flex justify-start">
                <div className="bg-background border p-3 rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <Input
              placeholder="Type your message about this SOP..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              className="flex-1"
            />
            <Button onClick={sendMessage} disabled={isProcessingMessage || !messageInput.trim()}>
              Send
            </Button>
          </div>

          <div className="flex flex-col gap-4 pt-4 border-t">
            <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setConversationDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={extractSOPData} 
                  disabled={isExtracting || currentConversation.length < 3}
                  variant="secondary"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Extracting Data...
                    </>
                  ) : (
                    <>
                      <Brain className="mr-2 h-4 w-4" />
                      Extract Structured Data
                    </>
                  )}
                </Button>
              </div>

              <div className="flex-1 grid md:grid-cols-3 gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Turns: {Math.floor(currentConversation.filter(m=>m.role!== 'system').length/2)}/2</Badge>
                </div>

                <div>
                  <Label className="text-xs">Select Template</Label>
                  <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                    <SelectTrigger>
                      <SelectValue placeholder={templatesLoading ? 'Loading...' : 'Choose a template'} />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.title} ({t.category})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end gap-2">
                  <Button 
                    onClick={handleGenerateSOP}
                    disabled={!minTurnsReached() || !selectedTemplateId || isGeneratingSOP}
                  >
                    {isGeneratingSOP ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating SOP...
                      </>
                    ) : (
                      'Create SOP'
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">New Template Title</Label>
                <Input value={newTemplateTitle} onChange={(e)=>setNewTemplateTitle(e.target.value)} placeholder="e.g., Onboarding Process Template" />
              </div>
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={newTemplateCategory} onValueChange={setNewTemplateCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="process">Process</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="policy">Policy</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleGenerateTemplate} disabled={isGeneratingTemplate || !minTurnsReached()} variant="outline" className="w-full">
                  {isGeneratingTemplate ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Template...
                    </>
                  ) : (
                    'Generate Template from Conversation'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};