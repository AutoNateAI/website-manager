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

  // Form data for new/edit campaign
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    description: '',
    start_date: new Date(),
    end_date: new Date(),
    status: 'active' as const,
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

  useEffect(() => {
    fetchCampaigns();
    fetchCompanies();
    fetchPeople();
  }, []);

  useEffect(() => {
    if (selectedCampaign) {
      fetchGoals(selectedCampaign.id!);
      fetchSessions(selectedCampaign.id!);
    }
  }, [selectedCampaign]);

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
      fetchCampaigns(); // Refresh the list
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

  // Handle session submission
  const handleSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign) return;

    try {
      const sessionData = {
        campaign_id: selectedCampaign.id,
        goal_id: sessionForm.goal_id,
        session_date: sessionForm.session_date.toISOString(),
        duration_hours: sessionForm.duration_hours,
        activities_completed: sessionForm.activities_completed,
        notes: sessionForm.notes,
      };

      const { data, error } = await supabase
        .from('sessions')
        .insert(sessionData)
        .select();

      if (error) throw error;

      toast.success('Session created successfully');
      setSessionDialogOpen(false);
      resetSessionForm();
      fetchSessions(selectedCampaign.id!);
    } catch (error) {
      console.error('Error saving session:', error);
      toast.error('Failed to save session');
    }
  };

  // Handle adding entities to campaign
  const handleAddEntitiesToCampaign = async (entities: any[]) => {
    if (!selectedCampaign) return;

    try {
      const updatedEntities = [...selectedCampaign.target_entities, ...entities];
      
      const { error } = await supabase
        .from('campaigns')
        .update({ target_entities: updatedEntities })
        .eq('id', selectedCampaign.id);

      if (error) throw error;

      setSelectedCampaign({
        ...selectedCampaign,
        target_entities: updatedEntities
      });

      toast.success(`Added ${entities.length} entities to campaign`);
      setEntityDialogOpen(false);
      fetchCampaigns();
    } catch (error) {
      console.error('Error adding entities:', error);
      toast.error('Failed to add entities');
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

  const resetSessionForm = () => {
    setSessionForm({
      session_date: new Date(),
      duration_hours: 4,
      goal_id: undefined,
      activities_completed: [],
      notes: ''
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
    // For now, just return a mock progress based on dates
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

  // Render campaign overview section
  const renderCampaignOverview = (campaign: Campaign) => {
    const progress = calculateProgress(campaign);
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Goals</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{goals.length}</div>
              <p className="text-xs text-muted-foreground">Goals created</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(progress)}%</div>
              <Progress value={progress} className="mt-2" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Target Entities</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{campaign.target_entities.length}</div>
              <p className="text-xs text-muted-foreground">Companies & People</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Financial Target</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {campaign.financial_target ? formatCurrency(campaign.financial_target) : '$0'}
              </div>
              <p className="text-xs text-muted-foreground">Revenue goal</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Badge variant={getStatusColor(campaign.status)}>{campaign.status}</Badge>
            </CardContent>
          </Card>
        </div>

        {/* Financial Performance Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Financial Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Target Revenue</p>
                <p className="text-2xl font-bold">
                  {campaign.financial_target ? formatCurrency(campaign.financial_target) : '$0'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Projected Revenue</p>
                <p className="text-2xl font-bold text-blue-600">
                  {campaign.projected_revenue ? formatCurrency(campaign.projected_revenue) : '$0'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Actual Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  {campaign.actual_revenue ? formatCurrency(campaign.actual_revenue) : '$0'}
                </p>
              </div>
            </div>
            {campaign.financial_target && (
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span>Revenue Progress</span>
                  <span>{campaign.actual_revenue && campaign.financial_target ? 
                    Math.round((campaign.actual_revenue / campaign.financial_target) * 100) : 0}%</span>
                </div>
                <Progress 
                  value={campaign.actual_revenue && campaign.financial_target ? 
                    (campaign.actual_revenue / campaign.financial_target) * 100 : 0} 
                  className="h-2" 
                />
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Description:</strong> {campaign.description}</p>
              <p><strong>Start Date:</strong> {format(campaign.start_date, 'PPP')}</p>
              <p><strong>End Date:</strong> {format(campaign.end_date, 'PPP')}</p>
              <p><strong>Duration:</strong> {Math.ceil((campaign.end_date.getTime() - campaign.start_date.getTime()) / (1000 * 60 * 60 * 24))} days</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Render goals manager section
  const renderGoalsManager = (campaign: Campaign) => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Campaign Goals</h3>
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
                <Label htmlFor="goal-title">Goal Title *</Label>
                <Input
                  id="goal-title"
                  placeholder="Enter goal title..."
                  value={goalForm.title}
                  onChange={(e) => setGoalForm({...goalForm, title: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal-description">Description</Label>
                <Textarea
                  id="goal-description"
                  placeholder="Describe this goal..."
                  value={goalForm.description}
                  onChange={(e) => setGoalForm({...goalForm, description: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="goal-priority">Priority</Label>
                  <Select value={goalForm.priority} onValueChange={(value: any) => setGoalForm({...goalForm, priority: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goal-due-date">Due Date (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !goalForm.due_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {goalForm.due_date ? format(goalForm.due_date, "PPP") : <span>Pick a date</span>}
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
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    Status: <Badge variant="secondary">{goal.status}</Badge>
                  </div>
                  {goal.due_date && (
                    <div className="text-sm text-muted-foreground">
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

  // Render session tracker section
  const renderSessionTracker = (campaign: Campaign) => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Session Tracker</h3>
        <Dialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => resetSessionForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Start Session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start New Session</DialogTitle>
              <DialogDescription>
                Log work session for this campaign
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSessionSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="session-date">Session Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(sessionForm.session_date, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={sessionForm.session_date}
                        onSelect={(date) => date && setSessionForm({...sessionForm, session_date: date})}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="session-duration">Duration (hours)</Label>
                  <Input
                    id="session-duration"
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={sessionForm.duration_hours}
                    onChange={(e) => setSessionForm({...sessionForm, duration_hours: parseFloat(e.target.value)})}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="session-goal">Related Goal (Optional)</Label>
                <Select value={sessionForm.goal_id || ''} onValueChange={(value) => setSessionForm({...sessionForm, goal_id: value || undefined})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a goal" />
                  </SelectTrigger>
                  <SelectContent>
                    {goals.map((goal) => (
                      <SelectItem key={goal.id} value={goal.id}>{goal.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="session-notes">Notes</Label>
                <Textarea
                  id="session-notes"
                  placeholder="What did you accomplish in this session?"
                  value={sessionForm.notes}
                  onChange={(e) => setSessionForm({...sessionForm, notes: e.target.value})}
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setSessionDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Log Session</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      {sessions.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-center">No sessions tracked yet. Start your first session!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => (
            <Card key={session.id}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">
                    Session - {format(new Date(session.session_date), 'PPP')}
                  </CardTitle>
                  <Badge variant="secondary">{session.duration_hours}h</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {session.goal_id && (
                    <p className="text-sm text-muted-foreground">
                      Related Goal: {goals.find(g => g.id === session.goal_id)?.title || 'Unknown'}
                    </p>
                  )}
                  {session.notes && (
                    <p className="text-sm">{session.notes}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // Render entity targeting section
  const renderEntityTargeting = (campaign: Campaign) => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Target Entities</h3>
        <Dialog open={entityDialogOpen} onOpenChange={setEntityDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Entities
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Add Target Entities</DialogTitle>
              <DialogDescription>
                Select companies and people from your Lead Management system
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="companies" className="w-full">
              <TabsList>
                <TabsTrigger value="companies">Companies</TabsTrigger>
                <TabsTrigger value="people">People</TabsTrigger>
              </TabsList>

              <TabsContent value="companies" className="space-y-4">
                <div className="grid gap-2 max-h-96 overflow-y-auto">
                  {companies.map((company) => (
                    <Card key={company.id} className="cursor-pointer hover:bg-muted/50" 
                          onClick={() => handleAddEntitiesToCampaign([{type: 'company', ...company}])}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium">{company.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {company.industry} • {company.location}
                            </p>
                          </div>
                          <Badge variant="outline">Company</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="people" className="space-y-4">
                <div className="grid gap-2 max-h-96 overflow-y-auto">
                  {people.map((person) => (
                    <Card key={person.id} className="cursor-pointer hover:bg-muted/50" 
                          onClick={() => handleAddEntitiesToCampaign([{type: 'person', ...person}])}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium">{person.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {person.position} • {person.companies?.name || 'No company'}
                            </p>
                          </div>
                          <Badge variant="outline">Person</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
      
      {campaign.target_entities.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-center">No entities targeted yet. Add companies and people from your Lead Management system!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {campaign.target_entities.map((entity, index) => (
            <Card key={`${entity.type}-${entity.id}-${index}`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">{entity.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {entity.type === 'company' ? `${entity.industry} • ${entity.location}` : 
                       `${entity.position} • ${entity.companies?.name || 'No company'}`}
                    </p>
                  </div>
                  <Badge variant="outline">{entity.type}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (selectedCampaign) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" onClick={() => setSelectedCampaign(null)} className="mb-2">
              ← Back to Campaigns
            </Button>
            <h2 className="text-2xl font-bold">{selectedCampaign.name}</h2>
            <p className="text-muted-foreground">{selectedCampaign.description}</p>
          </div>
          <Badge variant={getStatusColor(selectedCampaign.status)}>{selectedCampaign.status}</Badge>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="goals">Goals & Tasks</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="entities">Target Entities</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            {renderCampaignOverview(selectedCampaign)}
          </TabsContent>

          <TabsContent value="goals">
            {renderGoalsManager(selectedCampaign)}
          </TabsContent>

          <TabsContent value="sessions">
            {renderSessionTracker(selectedCampaign)}
          </TabsContent>

          <TabsContent value="entities">
            {renderEntityTargeting(selectedCampaign)}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Goals & Campaigns</h2>
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
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !campaignForm.start_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {campaignForm.start_date ? format(campaignForm.start_date, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={campaignForm.start_date}
                        onSelect={(date) => date && setCampaignForm({...campaignForm, start_date: date})}
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
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !campaignForm.end_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {campaignForm.end_date ? format(campaignForm.end_date, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={campaignForm.end_date}
                        onSelect={(date) => date && setCampaignForm({...campaignForm, end_date: date})}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="financial_target">Financial Target ($)</Label>
                <Input
                  id="financial_target"
                  type="number"
                  placeholder="Enter revenue target..."
                  value={campaignForm.financial_target}
                  onChange={(e) => setCampaignForm({...campaignForm, financial_target: parseFloat(e.target.value) || 0})}
                  min="0"
                  step="100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={campaignForm.status} onValueChange={(value: any) => setCampaignForm({...campaignForm, status: value})}>
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

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Campaign List */}
      {loading ? (
        <div className="text-center py-8">
          <p>Loading campaigns...</p>
        </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCampaigns.map((campaign) => (
            <Card key={campaign.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedCampaign(campaign)}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    <CardDescription>{campaign.description}</CardDescription>
                  </div>
                  <Badge variant={getStatusColor(campaign.status)}>{campaign.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Duration:</span>
                    <span>{Math.ceil((campaign.end_date.getTime() - campaign.start_date.getTime()) / (1000 * 60 * 60 * 24))} days</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Target Revenue:</span>
                    <span>{campaign.financial_target ? formatCurrency(campaign.financial_target) : '$0'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Progress:</span>
                    <span>{Math.round(calculateProgress(campaign))}%</span>
                  </div>
                  <Progress value={calculateProgress(campaign)} className="h-2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};