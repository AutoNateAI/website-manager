import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Calendar, 
  Target, 
  TrendingUp,
  Clock,
  MessageSquare,
  Phone,
  DollarSign,
  Eye,
  Plus,
  ArrowRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface BlitzCampaign {
  id: string;
  campaign_date: string;
  target_count: number;
  posts_per_target: number;
  status: string;
  metadata: any;
  campaign_targets: any[];
  campaigns: {
    name: string;
    description: string;
  };
}

interface CampaignStats {
  totalTargets: number;
  wave1Complete: number;
  wave2Complete: number;
  wave3Complete: number;
  responded: number;
  dmOpened: number;
  callsBooked: number;
  won: number;
}

export function CampaignsTab() {
  const [campaigns, setCampaigns] = useState<BlitzCampaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<BlitzCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CampaignStats>({
    totalTargets: 0,
    wave1Complete: 0,
    wave2Complete: 0,
    wave3Complete: 0,
    responded: 0,
    dmOpened: 0,
    callsBooked: 0,
    won: 0
  });

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('blitz_campaigns')
        .select(`
          *,
          campaigns (
            name,
            description
          ),
          campaign_targets (
            id,
            target_timezone,
            wave_assignment,
            current_wave,
            wave_status,
            outcome,
            instagram_users (
              username,
              display_name
            )
          )
        `)
        .order('campaign_date', { ascending: false })
        .limit(20);

      if (error) throw error;

      setCampaigns(data || []);
      
      // Calculate overall stats
      const allTargets = (data || []).flatMap(c => c.campaign_targets);
      const newStats: CampaignStats = {
        totalTargets: allTargets.length,
        wave1Complete: allTargets.filter(t => t.current_wave >= 1 && t.wave_status === 'posted').length,
        wave2Complete: allTargets.filter(t => t.current_wave >= 2 && t.wave_status === 'posted').length,
        wave3Complete: allTargets.filter(t => t.current_wave >= 3 && t.wave_status === 'posted').length,
        responded: allTargets.filter(t => t.outcome && !['unknown', 'no_response'].includes(t.outcome)).length,
        dmOpened: allTargets.filter(t => ['dm_opened', 'dm_replied', 'booked_call', 'won'].includes(t.outcome)).length,
        callsBooked: allTargets.filter(t => ['booked_call', 'won'].includes(t.outcome)).length,
        won: allTargets.filter(t => t.outcome === 'won').length
      };
      
      setStats(newStats);
    } catch (error: any) {
      console.error('Error loading campaigns:', error);
      toast({
        title: 'Error loading campaigns',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getCampaignStats = (campaign: BlitzCampaign) => {
    const targets = campaign.campaign_targets || [];
    return {
      total: targets.length,
      wave1: targets.filter(t => t.current_wave >= 1).length,
      wave2: targets.filter(t => t.current_wave >= 2).length,
      wave3: targets.filter(t => t.current_wave >= 3).length,
      responded: targets.filter(t => t.outcome && !['unknown', 'no_response'].includes(t.outcome)).length,
      responseRate: targets.length > 0 ? 
        Math.round((targets.filter(t => t.outcome && !['unknown', 'no_response'].includes(t.outcome)).length / targets.length) * 100) : 0
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'planning': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Loading campaigns...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{stats.totalTargets}</p>
                <p className="text-xs text-muted-foreground">Total Targets</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
              <div>
                <p className="text-2xl font-bold">{stats.wave1Complete}</p>
                <p className="text-xs text-muted-foreground">Wave 1</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <div>
                <p className="text-2xl font-bold">{stats.wave2Complete}</p>
                <p className="text-xs text-muted-foreground">Wave 2</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full" />
              <div>
                <p className="text-2xl font-bold">{stats.wave3Complete}</p>
                <p className="text-xs text-muted-foreground">Wave 3</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{stats.dmOpened}</p>
                <p className="text-xs text-muted-foreground">DMs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{stats.callsBooked}</p>
                <p className="text-xs text-muted-foreground">Calls</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{stats.won}</p>
                <p className="text-xs text-muted-foreground">Won</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Blitz Campaigns ({campaigns.length})
            </CardTitle>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-4">
              {campaigns.map((campaign) => {
                const campaignStats = getCampaignStats(campaign);
                return (
                  <Card 
                    key={campaign.id} 
                    className="border hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedCampaign(campaign)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">{campaign.campaigns?.name || 'Unnamed Campaign'}</h3>
                            <Badge className={getStatusColor(campaign.status)}>
                              {campaign.status}
                            </Badge>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(campaign.campaign_date), 'MMM dd, yyyy')}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Targets</p>
                              <p className="font-medium">{campaignStats.total}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Wave Progress</p>
                              <p className="font-medium">
                                {campaignStats.wave1}/{campaignStats.wave2}/{campaignStats.wave3}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Responded</p>
                              <p className="font-medium">{campaignStats.responded}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Response Rate</p>
                              <p className="font-medium">{campaignStats.responseRate}%</p>
                            </div>
                            <div className="flex items-center justify-end">
                              <Button variant="ghost" size="sm" className="gap-1">
                                <Eye className="h-3 w-3" />
                                View Details
                                <ArrowRight className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                              <span>Campaign Progress</span>
                              <span>{campaignStats.responseRate}% response rate</span>
                            </div>
                            <Progress 
                              value={campaignStats.responseRate} 
                              className="h-2"
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              
              {campaigns.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="font-medium mb-1">No campaigns found</h3>
                  <p className="text-sm">Create your first blitz campaign to get started</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}