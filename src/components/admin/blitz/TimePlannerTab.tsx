import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Clock, 
  Globe, 
  Users, 
  ChevronLeft, 
  ChevronRight,
  Zap,
  Target,
  Plus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format, addHours } from 'date-fns';

interface TimeWave {
  id: number;
  name: string;
  timeRange: string;
  description: string;
  hstRange: string;
  etRange: string;
  ptRange: string;
  color: string;
  targets: any[];
}

const timeWaves: TimeWave[] = [
  {
    id: 1,
    name: 'Wave 1',
    timeRange: '6-9 AM ET',
    hstRange: '12-3 AM HST',
    etRange: '6-9 AM ET',
    ptRange: '3-6 AM PT',
    description: 'East Coast Morning Prime',
    color: 'bg-blue-500',
    targets: []
  },
  {
    id: 2,
    name: 'Wave 2', 
    timeRange: '9 AM-12 PM ET',
    hstRange: '3-6 AM HST',
    etRange: '9 AM-12 PM ET',
    ptRange: '6-9 AM PT',
    description: 'Cross-Timezone Business Hours',
    color: 'bg-green-500',
    targets: []
  },
  {
    id: 3,
    name: 'Wave 3',
    timeRange: '12-6 PM ET',
    hstRange: '6 AM-12 PM HST',
    etRange: '12-6 PM ET',
    ptRange: '9 AM-3 PM PT',
    description: 'Afternoon Peak Engagement',
    color: 'bg-orange-500',
    targets: []
  },
  {
    id: 4,
    name: 'Wave 4',
    timeRange: '6 PM+ ET',
    hstRange: '12 PM-12 AM HST',
    etRange: '6 PM-12 AM ET',
    ptRange: '3-9 PM PT',
    description: 'Hawaii Prime + Mainland Evening',
    color: 'bg-purple-500',
    targets: []
  }
];

export function TimePlannerTab() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [campaigns, setCampaigns] = useState([]);
  const [availableTargets, setAvailableTargets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCampaignData();
  }, [selectedDate]);

  const loadCampaignData = async () => {
    try {
      setLoading(true);
      
      // Load today's blitz campaign and targets
      const campaignDate = format(selectedDate, 'yyyy-MM-dd');
      
      const { data: campaigns, error: campaignError } = await supabase
        .from('blitz_campaigns')
        .select(`
          *,
          campaign_targets (
            *,
            instagram_users (*)
          )
        `)
        .eq('campaign_date', campaignDate);

      if (campaignError) throw campaignError;

      setCampaigns(campaigns || []);

      // Load available Instagram users that aren't in today's campaign
      const { data: users, error: usersError } = await supabase
        .from('instagram_users')
        .select('*')
        .limit(50);

      if (usersError) throw usersError;

      setAvailableTargets(users || []);

    } catch (error: any) {
      console.error('Error loading campaign data:', error);
      toast({
        title: 'Error loading data',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(newDate);
  };

  const createNewCampaign = async () => {
    try {
      const campaignDate = format(selectedDate, 'yyyy-MM-dd');
      
      // First create a parent campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          name: `Daily Blitz - ${format(selectedDate, 'MMM dd, yyyy')}`,
          description: 'Automated daily blitz campaign',
          start_date: selectedDate.toISOString(),
          end_date: addHours(selectedDate, 24).toISOString(),
          status: 'active'
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Create the blitz campaign
      const { data: blitzCampaign, error: blitzError } = await supabase
        .from('blitz_campaigns')
        .insert({
          campaign_id: campaign.id,
          campaign_date: campaignDate,
          status: 'planning'
        })
        .select()
        .single();

      if (blitzError) throw blitzError;

      toast({
        title: 'Campaign created',
        description: `New blitz campaign created for ${format(selectedDate, 'MMM dd')}`
      });

      loadCampaignData();
    } catch (error: any) {
      toast({
        title: 'Error creating campaign',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Loading time planner...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              4-Wave Time Planner
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 px-3 py-2 border rounded-md">
                <Globe className="h-4 w-4" />
                <span className="font-medium">
                  {format(selectedDate, 'EEE, MMM dd, yyyy')}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Wave Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {timeWaves.map((wave) => (
          <Card key={wave.id} className="border-2 border-dashed border-muted">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${wave.color}`} />
                  <h3 className="font-semibold">{wave.name}</h3>
                </div>
                <Badge variant="outline" className="text-xs">
                  {wave.targets.length}/4
                </Badge>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="font-medium">{wave.timeRange}</div>
                <div>HST: {wave.hstRange}</div>
                <div>PT: {wave.ptRange}</div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {wave.targets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-24 text-muted-foreground">
                      <Target className="h-6 w-6 mb-1" />
                      <p className="text-xs text-center">Drop targets here</p>
                    </div>
                  ) : (
                    wave.targets.map((target, idx) => (
                      <div key={idx} className="p-2 bg-muted rounded-md text-sm">
                        <div className="font-medium">@{target.username}</div>
                        <div className="text-xs text-muted-foreground">
                          {target.timezone} • 3 posts
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Available Targets Sidebar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Available Targets ({availableTargets.length})
            </CardTitle>
            {campaigns.length === 0 && (
              <Button onClick={createNewCampaign} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Today's Campaign
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="h-8 w-8 mx-auto mb-2" />
              <h3 className="font-medium mb-1">No campaign for today</h3>
              <p className="text-sm">Create a new blitz campaign to start planning</p>
            </div>
          ) : (
            <ScrollArea className="h-40">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {availableTargets.slice(0, 16).map((target) => (
                  <div
                    key={target.id}
                    className="p-2 border rounded-md hover:bg-muted cursor-move text-sm"
                    draggable
                  >
                    <div className="font-medium">@{target.username}</div>
                    <div className="text-xs text-muted-foreground">
                      {target.display_name}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}