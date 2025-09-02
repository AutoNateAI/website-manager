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

interface SOPConversation {
  id: string;
  sop_document_id: string;
  conversation_data: any;
  extraction_status: string;
  extracted_data: any;
  created_at: string;
}

export const SOPManager: React.FC = () => {
  const [sops, setSops] = useState<SOPDocument[]>([]);
  const [conversations, setConversations] = useState<SOPConversation[]>([]);
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

  const { toast } = useToast();

  useEffect(() => {
    fetchSOPs();
    fetchConversations();
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

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('sop_conversations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
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
      // First save the conversation
      const { data: conversation, error: convError } = await supabase
        .from('sop_conversations')
        .insert({
          sop_document_id: selectedSop.id,
          conversation_data: currentConversation,
          extraction_status: 'processing'
        })
        .select()
        .single();

      if (convError) throw convError;

      // Then extract structured data
      const { data, error } = await supabase.functions.invoke('extract-sop-data', {
        body: { 
          conversationId: conversation.id,
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
      fetchConversations();
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

          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => setConversationDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={extractSOPData} 
              disabled={isExtracting || currentConversation.length < 3}
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
        </DialogContent>
      </Dialog>
    </div>
  );
};