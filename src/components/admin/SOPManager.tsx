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

  // SOP Content Viewer
  const [sopContentDialog, setSopContentDialog] = useState(false);
  const [viewingSop, setViewingSop] = useState<SOPDocument | null>(null);

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
    console.log('Fetching SOPs...');
    try {
      const { data, error } = await supabase
        .from('sop_documents')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      console.log('SOPs fetched:', data);
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

  const startNewSOPConversation = () => {
    setSelectedSop(null);
    setCurrentConversation([
      {
        role: 'system',
        content: 'Starting conversation to create a new SOP. Please describe the process or procedure you want to document.'
      }
    ]);
    setConversationDialog(true);
  };

  const viewSOPConversation = (sop: SOPDocument) => {
    setSelectedSop(sop);
    setCurrentConversation([
      {
        role: 'system',
        content: `Continuing conversation about SOP: ${sop.title}. You can continue the discussion or regenerate the SOP.`
      }
    ]);
    setConversationDialog(true);
  };

  const viewSOPContent = (sop: SOPDocument) => {
    setViewingSop(sop);
    setSopContentDialog(true);
  };

  const sendMessage = async () => {
    if (!messageInput.trim()) return;

    const userMessage = { role: 'user', content: messageInput };
    const updatedConversation = [...currentConversation, userMessage];
    setCurrentConversation(updatedConversation);
    setMessageInput('');
    setIsProcessingMessage(true);

    try {
      const { data, error } = await supabase.functions.invoke('sop-conversation-chat', {
        body: {
          messages: updatedConversation,
        },
      });

      if (error) throw error;

      const assistantReply = (data as any)?.reply ?? 'I\'m here. What process would you like to document?';
      const aiResponse = { role: 'assistant', content: assistantReply };
      setCurrentConversation([...updatedConversation, aiResponse]);
    } catch (error) {
      console.error('Error processing message:', error);
    } finally {
      setIsProcessingMessage(false);
    }
  };

  const extractSOPData = async () => {
    // Check if we have enough conversation content (at least 2 user messages)
    const userMessages = currentConversation.filter(msg => msg.role === 'user');
    if (userMessages.length < 2) {
      toast({
        title: "Error", 
        description: "Need more conversation content to extract data (at least 2 exchanges)",
        variant: "destructive",
      });
      return;
    }

    setIsExtracting(true);
    try {
      let sopDocId = selectedSop?.id;
      
      // If no existing SOP, create one first
      if (!sopDocId) {
        const { data: newSop, error: createError } = await supabase
          .from('sop_documents')
          .insert({
            title: 'New SOP from Conversation',
            description: 'Generated from AI conversation',
            category: 'general',
            status: 'draft'
          })
          .select()
          .single();
          
        if (createError) throw createError;
        sopDocId = newSop.id;
      }

      // Save conversation first
      const { data: conversation, error: convError } = await supabase
        .from('sop_conversations')
        .insert({
          sop_document_id: sopDocId,
          conversation_data: currentConversation,
          status: 'active'
        })
        .select()
        .single();

      if (convError) throw convError;

      // Now extract structured data
      console.log('Calling extract-sop-data with:', { conversationId: conversation.id, sopDocumentId: sopDocId });
      const { data, error } = await supabase.functions.invoke('extract-sop-data', {
        body: { 
          conversationId: conversation.id,
          sopDocumentId: sopDocId
        }
      });

      console.log('Extract response:', { data, error });
      if (error) {
        const errMsg = (error as any)?.message || (error as any)?.error?.message || 'Failed to extract SOP data';
        console.error('extract-sop-data error:', error);
        toast({
          title: "Extraction failed",
          description: errMsg,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "SOP data extracted successfully",
      });

      // Refresh data
      fetchSOPs();
      setConversationDialog(false);
      setCurrentConversation([]);
    } catch (error: any) {
      console.error('Error extracting SOP data:', error);
      toast({
        title: "Error",
        description: error?.message || 'Failed to extract SOP data',
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
        
        <Button onClick={() => startNewSOPConversation()}>
          <Plus className="mr-2 h-4 w-4" />
          New SOP
        </Button>
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
                    onClick={() => viewSOPConversation(sop)}
                    className="flex-1"
                  >
                    <MessageSquare className="mr-1 h-3 w-3" />
                    View Chat
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => viewSOPContent(sop)}
                    className="flex-1"
                  >
                    <FileText className="mr-1 h-3 w-3" />
                    View SOP
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Conversation Dialog */}
      <Dialog open={conversationDialog} onOpenChange={setConversationDialog}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
            <DialogTitle>
              {selectedSop ? `SOP Chat: ${selectedSop.title}` : 'Create New SOP'}
            </DialogTitle>
            <DialogDescription>
              {selectedSop 
                ? 'Continue the conversation about this SOP or regenerate content.'
                : 'Describe the process or procedure you want to document. The AI will help create a comprehensive SOP.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 bg-muted/30 min-h-0">
            <div className="space-y-4 pb-4">
              {currentConversation.map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-background border'
                  }`}>
                    <div className="text-xs mb-1 opacity-70 capitalize">{message.role}</div>
                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
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
          </div>

          <div className="border-t bg-background p-4 flex-shrink-0 space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder={selectedSop ? "Continue the conversation..." : "Describe the process you want to document..."}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                className="flex-1"
              />
              <Button onClick={sendMessage} disabled={isProcessingMessage || !messageInput.trim()}>
                Send
              </Button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
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

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
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

                  <div className="flex items-end">
                    <Button 
                      onClick={handleGenerateSOP}
                      disabled={!minTurnsReached() || !selectedTemplateId || isGeneratingSOP}
                      className="w-full"
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
          </div>
        </DialogContent>
      </Dialog>

      {/* SOP Content Viewer Dialog */}
      <Dialog open={sopContentDialog} onOpenChange={setSopContentDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingSop?.title}</DialogTitle>
            <DialogDescription>
              {viewingSop?.description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {viewingSop?.content && (
              <div>
                <h3 className="font-semibold mb-2">SOP Content</h3>
                <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap">
                  {viewingSop.content}
                </div>
              </div>
            )}
            
            {viewingSop?.structured_data && Object.keys(viewingSop.structured_data).length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Structured Data</h3>
                <div className="space-y-4">
                  {viewingSop.structured_data.processes && (
                    <div>
                      <h4 className="font-medium mb-2">Processes</h4>
                      {viewingSop.structured_data.processes.map((process: any, idx: number) => (
                        <Card key={idx} className="mb-2">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">{process.name}</CardTitle>
                            <CardDescription className="text-xs">{process.description}</CardDescription>
                          </CardHeader>
                          <CardContent className="pt-0">
                            {process.steps && (
                              <div className="mb-2">
                                <span className="text-xs font-medium">Steps:</span>
                                <ul className="text-xs list-disc ml-4 mt-1">
                                  {process.steps.map((step: string, i: number) => (
                                    <li key={i}>{step}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {process.tools && (
                              <div>
                                <span className="text-xs font-medium">Tools:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {process.tools.map((tool: string, i: number) => (
                                    <Badge key={i} variant="outline" className="text-xs">{tool}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                  
                  {viewingSop.structured_data.best_practices && (
                    <div>
                      <h4 className="font-medium mb-2">Best Practices</h4>
                      {viewingSop.structured_data.best_practices.map((practice: any, idx: number) => (
                        <Card key={idx} className="mb-2">
                          <CardContent className="pt-3">
                            <div className="text-sm font-medium">{practice.category}</div>
                            <div className="text-xs text-muted-foreground mt-1">{practice.practice}</div>
                            {practice.rationale && (
                              <div className="text-xs text-muted-foreground mt-1 italic">{practice.rationale}</div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                  
                  <div>
                    <h4 className="font-medium mb-2">Raw Data</h4>
                    <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                      {JSON.stringify(viewingSop.structured_data, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};