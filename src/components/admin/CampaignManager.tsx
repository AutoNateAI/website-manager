import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, Edit2, Search, Target, Calendar, Clock, Users, MessageSquare, 
  Mail, Send, CheckCircle, AlertCircle, TrendingUp, BarChart3,
  PlayCircle, PauseCircle, Eye, Settings
} from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Campaign {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: 'planning' | 'active' | 'paused' | 'completed';
  target_entities: string[]; // IDs of companies/people being targeted
  goals: Goal[];
  created_at: string;
  updated_at: string;
}

interface Goal {
  id: string;
  campaign_id: string;
  name: string;
  description: string;
  type: 'outreach' | 'response' | 'conversion';
  target_value: number;
  current_value: number;
  unit: string; // 'messages', 'emails', 'comments', 'replies', 'calls'
  session_duration: number; // in minutes (usually 240 for 4 hours)
  sessions_per_day: number;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'completed' | 'paused';
  tasks: Task[];
  created_at: string;
  due_date?: string;
}

interface Task {
  id: string;
  goal_id: string;
  name: string;
  description: string;
  status: 'todo' | 'in_progress' | 'completed';
  assigned_session?: string;
  estimated_time: number; // in minutes
  actual_time?: number;
  notes?: string;
  created_at: string;
  completed_at?: string;
}

interface Session {
  id: string;
  campaign_id: string;
  date: string;
  session_number: number;
  duration: number;
  status: 'scheduled' | 'active' | 'completed';
  goals_worked_on: string[];
  activities_completed: number;
  notes?: string;
}

export const CampaignManager = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    status: 'planning' as const,
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      // For now, simulate data since we need to create the database structure
      const mockCampaigns: Campaign[] = [
        {
          id: '1',
          name: 'Q1 SaaS Outreach Campaign',
          description: 'Target SaaS companies for our AI solutions',
          start_date: '2024-01-01',
          end_date: '2024-01-14',
          status: 'active',
          target_entities: ['comp1', 'comp2', 'comp3'],
          goals: [
            {
              id: 'g1',
              campaign_id: '1',
              name: 'LinkedIn Outreach',
              description: 'Send personalized LinkedIn messages',
              type: 'outreach',
              target_value: 50,
              current_value: 23,
              unit: 'messages',
              session_duration: 240,
              sessions_per_day: 2,
              priority: 'high',
              status: 'active',
              tasks: [
                {
                  id: 't1',
                  goal_id: 'g1',
                  name: 'Research target companies',
                  description: 'Find key decision makers',
                  status: 'completed',
                  estimated_time: 60,
                  actual_time: 55,
                  created_at: '2024-01-01T10:00:00Z',
                  completed_at: '2024-01-01T11:00:00Z'
                }
              ],
              created_at: '2024-01-01T10:00:00Z',
              due_date: '2024-01-07'
            }
          ],
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:00:00Z'
        }
      ];
      setCampaigns(mockCampaigns);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to fetch campaigns');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // For now, simulate the save since we need to create the database structure
    toast.success('Campaign would be saved (database structure needed)');
    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      start_date: '',
      end_date: '',
      status: 'planning',
    });
    setEditingCampaign(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'active': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'paused': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'completed': return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
      default: return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'low': return 'bg-green-500/20 text-green-300 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const calculateProgress = (goals: Goal[]) => {
    if (goals.length === 0) return 0;
    const totalProgress = goals.reduce((sum, goal) => {
      return sum + (goal.current_value / goal.target_value) * 100;
    }, 0);
    return Math.round(totalProgress / goals.length);
  };

  const renderCampaignOverview = (campaign: Campaign) => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.goals.length}</div>
            <p className="text-xs text-muted-foreground">
              {campaign.goals.filter(g => g.status === 'active').length} active
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{calculateProgress(campaign.goals)}%</div>
            <Progress value={calculateProgress(campaign.goals)} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Target Entities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.target_entities.length}</div>
            <p className="text-xs text-muted-foreground">companies/people</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Goals Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {campaign.goals.map((goal) => (
            <div key={goal.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{goal.name}</h4>
                  <Badge className={getPriorityColor(goal.priority)}>
                    {goal.priority}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {goal.current_value}/{goal.target_value} {goal.unit}
                </div>
              </div>
              <Progress value={(goal.current_value / goal.target_value) * 100} />
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {goal.session_duration / 60}h sessions
                </span>
                <span>{goal.sessions_per_day}x/day</span>
                <span>{goal.tasks.length} tasks</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  const renderGoalsManager = (campaign: Campaign) => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Campaign Goals</h3>
        <Button className="glass-button" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Goal
        </Button>
      </div>

      {campaign.goals.map((goal) => (
        <Card key={goal.id} className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{goal.name}</CardTitle>
                <CardDescription>{goal.description}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getPriorityColor(goal.priority)}>
                  {goal.priority}
                </Badge>
                <Badge className={getStatusColor(goal.status)}>
                  {goal.status}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <Label className="text-xs text-muted-foreground">Target</Label>
                <div className="font-medium">{goal.target_value} {goal.unit}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Progress</Label>
                <div className="font-medium">{goal.current_value}/{goal.target_value}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Session Length</Label>
                <div className="font-medium">{goal.session_duration / 60}h</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Per Day</Label>
                <div className="font-medium">{goal.sessions_per_day} sessions</div>
              </div>
            </div>

            <Progress value={(goal.current_value / goal.target_value) * 100} />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="font-medium text-sm">Tasks ({goal.tasks.length})</h5>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Task
                </Button>
              </div>
              {goal.tasks.map((task) => (
                <div key={task.id} className="flex items-center gap-2 p-2 bg-muted/10 rounded">
                  <CheckCircle className={`h-4 w-4 ${task.status === 'completed' ? 'text-green-400' : 'text-muted-foreground'}`} />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{task.name}</div>
                    <div className="text-xs text-muted-foreground">{task.description}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {task.estimated_time}min
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderSessionTracker = (campaign: Campaign) => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Session Tracker</h3>
        <Button className="glass-button" size="sm">
          <PlayCircle className="h-4 w-4 mr-2" />
          Start Session
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Today's Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded">
                <div>
                  <div className="font-medium">Session 1</div>
                  <div className="text-sm text-muted-foreground">9:00 AM - 1:00 PM</div>
                </div>
                <Badge className="bg-green-500/20 text-green-300">Completed</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded">
                <div>
                  <div className="font-medium">Session 2</div>
                  <div className="text-sm text-muted-foreground">2:00 PM - 6:00 PM</div>
                </div>
                <Badge className="bg-blue-500/20 text-blue-300">Scheduled</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Weekly Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Sessions Completed</span>
                <span>8/14</span>
              </div>
              <Progress value={57} />
              <div className="flex justify-between text-sm">
                <span>Hours Logged</span>
                <span>32/56</span>
              </div>
              <Progress value={57} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || campaign.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold gradient-text">Goals & Campaigns</h2>
          <p className="text-muted-foreground">Manage your outreach campaigns and track progress</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="glass-button" onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingCampaign ? 'Edit' : 'Create'} Campaign</DialogTitle>
              <DialogDescription>
                Set up a new campaign with goals and outreach strategies
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Campaign Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value as any})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="glass-button">
                  {editingCampaign ? 'Update' : 'Create'} Campaign
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search campaigns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Campaign List or Detail View */}
      {selectedCampaign ? (
        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedCampaign(null)}
                      className="p-1 h-auto"
                    >
                      ←
                    </Button>
                    {selectedCampaign.name}
                  </CardTitle>
                  <CardDescription>{selectedCampaign.description}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(selectedCampaign.status)}>
                    {selectedCampaign.status}
                  </Badge>
                  <Button variant="outline" size="sm" className="glass-button">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
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
      ) : (
        <>
          {loading ? (
            <div className="text-center py-8">Loading campaigns...</div>
          ) : filteredCampaigns.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first campaign to start tracking goals and outreach
                  </p>
                  <Button onClick={() => setIsDialogOpen(true)} className="glass-button">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Campaign
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredCampaigns.map((campaign) => (
                <Card key={campaign.id} className="glass-card cursor-pointer hover:border-primary/30 transition-colors"
                      onClick={() => setSelectedCampaign(campaign)}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-primary/20">
                          <Target className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{campaign.name}</h3>
                          <p className="text-sm text-muted-foreground">{campaign.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(campaign.start_date).toLocaleDateString()} - {new Date(campaign.end_date).toLocaleDateString()}
                            </span>
                            <span>{campaign.goals.length} goals</span>
                            <span>{campaign.target_entities.length} targets</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="text-sm font-medium">{calculateProgress(campaign.goals)}%</div>
                          <div className="text-xs text-muted-foreground">complete</div>
                        </div>
                        <Badge className={getStatusColor(campaign.status)}>
                          {campaign.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-4">
                      <Progress value={calculateProgress(campaign.goals)} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};