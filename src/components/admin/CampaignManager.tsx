import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Search, Target, Users, CheckCircle, Clock, DollarSign, TrendingUp, Award } from 'lucide-react';
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Data structures matching the new database schema
interface Campaign {
  id?: string;
  name: string;
  description: string;
  start_date: Date;
  end_date: Date;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  target_entities: any[];
  financial_target?: number; // in cents
  projected_revenue?: number; // in cents
  actual_revenue?: number; // in cents
  created_at?: Date;
  updated_at?: Date;
}

interface Goal {
  id: string;
  campaign_id: string;
  title: string;
  description: string;
  target_metrics: any;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  due_date?: Date;
  created_at: Date;
  updated_at: Date;
}

interface Task {
  id: string;
  goal_id: string;
  title: string;
  description: string;
  assignee: string;
  status: 'pending' | 'in_progress' | 'completed';
  due_date?: Date;
  created_at: Date;
  updated_at: Date;
}

interface Session {
  id: string;
  campaign_id: string;
  goal_id?: string;
  session_date: Date;
  duration_hours: number;
  activities_completed: any[];
  notes?: string;
  created_at: Date;
}

export const CampaignManager = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [entityDialogOpen, setEntityDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);

  // Goal conversation state
  const [goalConversationOpen, setGoalConversationOpen] = useState(false);
  const [goalConversation, setGoalConversation] = useState<any[]>([]);
  const [goalMessageInput, setGoalMessageInput] = useState('');
  const [isProcessingGoalMessage, setIsProcessingGoalMessage] = useState(false);
  const [availableSOPs, setAvailableSOPs] = useState<any[]>([]);
  const [linkedSOPs, setLinkedSOPs] = useState<any[]>([]);
  const [campaignBreakdown, setCampaignBreakdown] = useState<string>('');

  // Form data for new/edit campaign
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    description: '',
    start_date: new Date(),
    end_date: new Date(),
    status: 'active' as 'active' | 'paused' | 'completed' | 'cancelled',
    target_entities: [] as any[],
    financial_target: 0
  });

  // Form data for new goal
  const [goalForm, setGoalForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    due_date: undefined as Date | undefined,
    target_metrics: {}
  });

  // Form data for new session
  const [sessionForm, setSessionForm] = useState({
    session_date: new Date(),
    duration_hours: 4,
    goal_id: undefined as string | undefined,
    activities_completed: [] as string[],
    notes: ''
  });

  // Fetch available SOPs
  const fetchAvailableSOPs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sop_documents')
        .select('id, title, description, category')
        .in('status', ['published', 'draft']) // Include both published and draft SOPs
        .order('title');

      if (error) throw error;
      setAvailableSOPs(data || []);
    } catch (error) {
      console.error('Error fetching SOPs:', error);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
    fetchCompanies();
    fetchPeople();
    fetchAvailableSOPs();
  }, [fetchAvailableSOPs]);

  useEffect(() => {
    if (selectedCampaign) {
      fetchGoals(selectedCampaign.id!);
      fetchSessions(selectedCampaign.id!);
    }
  }, [selectedCampaign]);

  // Handle goal strategy message
  const handleGoalStrategyMessage = async () => {
    if (!goalMessageInput.trim() || isProcessingGoalMessage) return;

    const userMessage = { role: 'user', content: goalMessageInput.trim() };
    const updatedConversation = [...goalConversation, userMessage];
    setGoalConversation(updatedConversation);
    setGoalMessageInput('');
    setIsProcessingGoalMessage(true);

    try {
      const { data, error } = await supabase.functions.invoke('goal-strategy-chat', {
        body: {
          messages: updatedConversation,
          campaignId: selectedCampaign?.id,
          availableSOPs,
        },
      });

      if (error) throw error;

      const assistantReply = (data as any)?.reply ?? 'I\'m here to help you build effective campaign strategies.';
      const aiResponse = { role: 'assistant', content: assistantReply };
      setGoalConversation([...updatedConversation, aiResponse]);
    } catch (error) {
      console.error('Error processing goal strategy message:', error);
      toast.error('Failed to process message');
    } finally {
      setIsProcessingGoalMessage(false);
    }
  };

  // Generate campaign breakdown from conversation
  const generateCampaignBreakdown = () => {
    const conversationText = goalConversation
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n\n');
    
    const linkedSOPsList = linkedSOPs
      .map(sop => `- ${sop.title} (${sop.category})`)
      .join('\n');

    const breakdown = `Campaign Strategy Overview
Generated from conversation on ${new Date().toLocaleDateString()}

CONVERSATION SUMMARY:
${conversationText}

LINKED STRATEGIES (SOPs):
${linkedSOPsList || 'No strategies linked yet'}

NEXT STEPS:
1. Complete goal form with specific metrics
2. Assign team members to linked SOPs
3. Set up tracking and progress monitoring`;

    setCampaignBreakdown(breakdown);
  };

  // Fetch campaigns from database
  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedCampaigns = data?.map(campaign => ({
        ...campaign,
        start_date: new Date(campaign.start_date),
        end_date: new Date(campaign.end_date),
        status: campaign.status as 'active' | 'paused' | 'completed' | 'cancelled',
        target_entities: Array.isArray(campaign.target_entities) ? campaign.target_entities : [],
        description: campaign.description || '',
        financial_target: campaign.financial_target || 0,
        projected_revenue: campaign.projected_revenue || 0,
        actual_revenue: campaign.actual_revenue || 0,
        created_at: campaign.created_at ? new Date(campaign.created_at) : undefined,
        updated_at: campaign.updated_at ? new Date(campaign.updated_at) : undefined,
      })) || [];
      
      setCampaigns(formattedCampaigns);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to fetch campaigns');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch goals for a campaign
  const fetchGoals = useCallback(async (campaignId: string) => {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formattedGoals = data?.map(goal => ({
        ...goal,
        priority: goal.priority as 'low' | 'medium' | 'high',
        status: goal.status as 'pending' | 'in_progress' | 'completed' | 'cancelled',
        created_at: new Date(goal.created_at),
        updated_at: new Date(goal.updated_at),
        due_date: goal.due_date ? new Date(goal.due_date) : undefined,
      })) || [];
      
      setGoals(formattedGoals);
    } catch (error) {
      console.error('Error fetching goals:', error);
      toast.error('Failed to fetch goals');
    }
  }, []);

  // Fetch sessions for a campaign
  const fetchSessions = useCallback(async (campaignId: string) => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('session_date', { ascending: false });

      if (error) throw error;
      
      const formattedSessions = data?.map(session => ({
        ...session,
        session_date: new Date(session.session_date),
        created_at: new Date(session.created_at),
        activities_completed: Array.isArray(session.activities_completed) ? session.activities_completed : [],
      })) || [];
      
      setSessions(formattedSessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Failed to fetch sessions');
    }
  }, []);

  // Fetch companies
  const fetchCompanies = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast.error('Failed to fetch companies');
    }
  }, []);

  // Fetch people
  const fetchPeople = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('people')
        .select('*, companies(name)')
        .order('name');

      if (error) throw error;
      setPeople(data || []);
    } catch (error) {
      console.error('Error fetching people:', error);
      toast.error('Failed to fetch people');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const campaignData = {
        name: campaignForm.name,
        description: campaignForm.description,
        start_date: campaignForm.start_date.toISOString(),
        end_date: campaignForm.end_date.toISOString(),
        status: campaignForm.status,
        target_entities: campaignForm.target_entities,
        financial_target: campaignForm.financial_target * 100, // Convert to cents
      };

      const { data, error } = await supabase
        .from('campaigns')
        .insert(campaignData)
        .select();

      if (error) throw error;

      toast.success('Campaign created successfully');
      setDialogOpen(false);
      resetForm();
      fetchCampaigns();
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast.error('Failed to save campaign');
    }
  };

  const resetForm = () => {
    setCampaignForm({
      name: '',
      description: '',
      start_date: new Date(),
      end_date: new Date(),
      status: 'active',
      target_entities: [],
      financial_target: 0
    });
  };

  // Handle goal submission
  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign) return;

    try {
      const goalData = {
        campaign_id: selectedCampaign.id,
        title: goalForm.title,
        description: goalForm.description,
        priority: goalForm.priority,
        status: 'pending' as const,
        due_date: goalForm.due_date?.toISOString(),
        target_metrics: goalForm.target_metrics,
      };

      const { data, error } = await supabase
        .from('goals')
        .insert(goalData)
        .select();

      if (error) throw error;

      toast.success('Goal created successfully');
      setGoalDialogOpen(false);
      resetGoalForm();
      fetchGoals(selectedCampaign.id!);
    } catch (error) {
      console.error('Error saving goal:', error);
      toast.error('Failed to save goal');
    }
  };

  const resetGoalForm = () => {
    setGoalForm({
      title: '',
      description: '',
      priority: 'medium',
      due_date: undefined,
      target_metrics: {}
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'paused': return 'secondary';
      case 'completed': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'default';
      default: return 'secondary';
    }
  };

  // Calculate overall progress of a campaign
  const calculateProgress = (campaign: Campaign) => {
    const now = new Date();
    const totalTime = campaign.end_date.getTime() - campaign.start_date.getTime();
    const elapsed = now.getTime() - campaign.start_date.getTime();
    return Math.min(Math.max((elapsed / totalTime) * 100, 0), 100);
  };

  // Format currency
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  // Render goals manager section
  const renderGoalsManager = (campaign: Campaign) => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Campaign Goals</h3>
        <div className="flex gap-2">
          <Dialog open={goalConversationOpen} onOpenChange={setGoalConversationOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Target className="h-4 w-4 mr-2" />
                Strategy Chat
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Goal Strategy Planning</DialogTitle>
                <DialogDescription>
                  Discuss campaign strategies and link SOPs to build your goal framework
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 flex gap-4 min-h-0">
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex-1 overflow-y-auto border rounded-lg p-4 bg-muted/20 min-h-[300px]">
                    {goalConversation.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-sm">Start discussing your campaign goals and strategies...</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {goalConversation.map((message, index) => (
                          <div key={index} className={`p-3 rounded-lg ${
                            message.role === 'user' 
                              ? 'bg-primary text-primary-foreground ml-8' 
                              : 'bg-background border mr-8'
                          }`}>
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Input
                      placeholder="Discuss your campaign goals and strategies..."
                      value={goalMessageInput}
                      onChange={(e) => setGoalMessageInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleGoalStrategyMessage()}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleGoalStrategyMessage}
                      disabled={isProcessingGoalMessage || !goalMessageInput.trim()}
                      size="sm"
                    >
                      Send
                    </Button>
                  </div>
                </div>

                <div className="w-80 border-l pl-4 space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Available SOPs</h4>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {availableSOPs.map((sop) => (
                        <div key={sop.id} className="p-2 border rounded text-xs">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium">{sop.title}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => {
                                if (!linkedSOPs.find(s => s.id === sop.id)) {
                                  setLinkedSOPs([...linkedSOPs, sop]);
                                }
                              }}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <Badge variant="outline" className="text-xs">{sop.category}</Badge>
                          <p className="text-muted-foreground mt-1">{sop.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-2">Linked Strategies</h4>
                    <div className="space-y-2">
                      {linkedSOPs.map((sop) => (
                        <div key={sop.id} className="p-2 bg-primary/10 border rounded text-xs">
                          <div className="flex justify-between items-start">
                            <span className="font-medium">{sop.title}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => setLinkedSOPs(linkedSOPs.filter(s => s.id !== sop.id))}
                            >
                              ×
                            </Button>
                          </div>
                          <Badge variant="secondary" className="text-xs">{sop.category}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {goalConversation.length >= 3 && (
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={() => {
                        generateCampaignBreakdown();
                        setGoalConversationOpen(false);
                        setGoalDialogOpen(true);
                      }}
                    >
                      Complete Goal Form
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => resetGoalForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Goal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Goal</DialogTitle>
                <DialogDescription>
                  Add a new goal to track progress for this campaign
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleGoalSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="goalTitle">Goal Title</Label>
                  <Input
                    id="goalTitle"
                    placeholder="Enter goal title..."
                    value={goalForm.title}
                    onChange={(e) => setGoalForm({...goalForm, title: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goalDescription">Description</Label>
                  <Textarea
                    id="goalDescription"
                    placeholder="Describe the goal..."
                    value={goalForm.description}
                    onChange={(e) => setGoalForm({...goalForm, description: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="goalPriority">Priority</Label>
                    <Select
                      value={goalForm.priority}
                      onValueChange={(value: 'low' | 'medium' | 'high') => setGoalForm({...goalForm, priority: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !goalForm.due_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {goalForm.due_date ? format(goalForm.due_date, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={goalForm.due_date}
                          onSelect={(date) => setGoalForm({...goalForm, due_date: date})}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setGoalDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Goal</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {goals.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-center">No goals created yet. Add your first goal to get started!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {goals.map((goal) => (
            <Card key={goal.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{goal.title}</CardTitle>
                  <Badge variant={getPriorityColor(goal.priority)}>{goal.priority}</Badge>
                </div>
                <CardDescription>{goal.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>Status: {goal.status}</span>
                  {goal.due_date && (
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      Due: {format(new Date(goal.due_date), 'PPP')}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // Filter campaigns based on search and status
  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Campaign Manager</h1>
          <p className="text-muted-foreground">Manage your outreach campaigns and track progress</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Campaign</DialogTitle>
              <DialogDescription>
                Set up a new campaign with financial targets and outreach goals
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter campaign name..."
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm({...campaignForm, name: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your campaign goals..."
                  value={campaignForm.description}
                  onChange={(e) => setCampaignForm({...campaignForm, description: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !campaignForm.start_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {campaignForm.start_date ? format(campaignForm.start_date, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={campaignForm.start_date}
                        onSelect={(date) => setCampaignForm({...campaignForm, start_date: date || new Date()})}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !campaignForm.end_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {campaignForm.end_date ? format(campaignForm.end_date, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={campaignForm.end_date}
                        onSelect={(date) => setCampaignForm({...campaignForm, end_date: date || new Date()})}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={campaignForm.status}
                    onValueChange={(value: 'active' | 'paused' | 'completed' | 'cancelled') => setCampaignForm({...campaignForm, status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="financial_target">Financial Target ($)</Label>
                  <Input
                    id="financial_target"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={campaignForm.financial_target}
                    onChange={(e) => setCampaignForm({...campaignForm, financial_target: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Campaign</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and filter controls */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main content */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : selectedCampaign ? (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl">{selectedCampaign.name}</CardTitle>
                <CardDescription>{selectedCampaign.description}</CardDescription>
              </div>
              <Button variant="outline" onClick={() => setSelectedCampaign(null)}>
                Back to Campaigns
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="goals">
              <TabsList>
                <TabsTrigger value="goals">Goals</TabsTrigger>
                {campaignBreakdown && <TabsTrigger value="breakdown">Strategy Breakdown</TabsTrigger>}
              </TabsList>

              <TabsContent value="goals">
                {renderGoalsManager(selectedCampaign)}
              </TabsContent>

              {campaignBreakdown && (
                <TabsContent value="breakdown">
                  <Card>
                    <CardHeader>
                      <CardTitle>Campaign Strategy Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg overflow-auto">
                        {campaignBreakdown}
                      </pre>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      ) : filteredCampaigns.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No campaigns found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== 'all' 
                  ? "Try adjusting your search or filters"
                  : "Create your first campaign to start tracking your outreach goals"}
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {filteredCampaigns.map((campaign) => (
            <Card key={campaign.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedCampaign(campaign)}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{campaign.name}</CardTitle>
                    <CardDescription>{campaign.description}</CardDescription>
                  </div>
                  <Badge variant={getStatusColor(campaign.status)}>{campaign.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Duration</p>
                    <p className="font-medium">
                      {Math.ceil((campaign.end_date.getTime() - campaign.start_date.getTime()) / (1000 * 60 * 60 * 24))} days
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Target Entities</p>
                    <p className="font-medium">{campaign.target_entities.length}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Financial Target</p>
                    <p className="font-medium">
                      {campaign.financial_target ? formatCurrency(campaign.financial_target) : '$0'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Progress</p>
                    <Progress value={calculateProgress(campaign)} className="mt-1" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};