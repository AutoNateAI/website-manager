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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchCampaigns();
  }, []);

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
              <div className="text-2xl font-bold">0</div>
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
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Goal
        </Button>
      </div>
      
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">No goals created yet. Add your first goal to get started!</p>
        </CardContent>
      </Card>
    </div>
  );

  // Render session tracker section
  const renderSessionTracker = (campaign: Campaign) => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Session Tracker</h3>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Start Session
        </Button>
      </div>
      
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">No sessions tracked yet. Start your first session!</p>
        </CardContent>
      </Card>
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