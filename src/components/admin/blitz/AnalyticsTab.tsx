import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  TrendingUp, 
  Target,
  MessageSquare,
  Phone,
  DollarSign,
  Clock,
  Globe,
  Users,
  Eye,
  Calendar,
  Filter
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AnalyticsData {
  totalTargets: number;
  totalPosts: number;
  totalEngagement: number;
  conversionRates: {
    postsToDMs: number;
    dmsToReplies: number;
    repliesToCalls: number;
    callsToWins: number;
  };
  wavePerformance: {
    wave1: { targets: number; responses: number; rate: number };
    wave2: { targets: number; responses: number; rate: number };
    wave3: { targets: number; responses: number; rate: number };
  };
  timezonePerformance: {
    ET: { targets: number; responses: number; rate: number };
    CT: { targets: number; responses: number; rate: number };
    PT: { targets: number; responses: number; rate: number };
    HST: { targets: number; responses: number; rate: number };
  };
  topPerformingSlots: Array<{
    hour: number;
    timezone: string;
    responses: number;
    rate: number;
  }>;
}

export function AnalyticsTab() {
  const [data, setData] = useState<AnalyticsData>({
    totalTargets: 0,
    totalPosts: 0,
    totalEngagement: 0,
    conversionRates: {
      postsToDMs: 0,
      dmsToReplies: 0,
      repliesToCalls: 0,
      callsToWins: 0
    },
    wavePerformance: {
      wave1: { targets: 0, responses: 0, rate: 0 },
      wave2: { targets: 0, responses: 0, rate: 0 },
      wave3: { targets: 0, responses: 0, rate: 0 }
    },
    timezonePerformance: {
      ET: { targets: 0, responses: 0, rate: 0 },
      CT: { targets: 0, responses: 0, rate: 0 },
      PT: { targets: 0, responses: 0, rate: 0 },
      HST: { targets: 0, responses: 0, rate: 0 }
    },
    topPerformingSlots: []
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [selectedTimezone, setSelectedTimezone] = useState('all');

  useEffect(() => {
    loadAnalytics();
  }, [dateRange, selectedTimezone]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      // Load campaign targets and outcomes
      const { data: targets, error: targetsError } = await supabase
        .from('campaign_targets')
        .select(`
          *,
          blitz_campaigns (
            campaign_date,
            status
          ),
          target_outcomes (
            outcome_type,
            outcome_date
          ),
          blitz_posts (
            wave_number,
            scheduled_for,
            posted_at,
            engagement_metrics
          )
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (targetsError) throw targetsError;

      // Process analytics data
      const processedData = processAnalyticsData(targets || []);
      setData(processedData);

    } catch (error: any) {
      console.error('Error loading analytics:', error);
      toast({
        title: 'Error loading analytics',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const processAnalyticsData = (targets: any[]): AnalyticsData => {
    const totalTargets = targets.length;
    const totalPosts = targets.reduce((sum, t) => sum + (t.blitz_posts?.length || 0), 0);
    
    // Calculate conversion funnel
    const dmOpened = targets.filter(t => t.target_outcomes?.some((o: any) => 
      ['dm_opened', 'dm_replied', 'booked_call', 'won_deal'].includes(o.outcome_type)
    )).length;
    
    const dmReplied = targets.filter(t => t.target_outcomes?.some((o: any) => 
      ['dm_replied', 'booked_call', 'won_deal'].includes(o.outcome_type)
    )).length;
    
    const callsBooked = targets.filter(t => t.target_outcomes?.some((o: any) => 
      ['booked_call', 'won_deal'].includes(o.outcome_type)
    )).length;
    
    const won = targets.filter(t => t.target_outcomes?.some((o: any) => 
      o.outcome_type === 'won_deal'
    )).length;

    // Calculate wave performance
    const waveData = {
      wave1: targets.filter(t => t.current_wave >= 1),
      wave2: targets.filter(t => t.current_wave >= 2),
      wave3: targets.filter(t => t.current_wave >= 3)
    };

    // Calculate timezone performance
    const timezones = ['ET', 'CT', 'PT', 'HST'];
    const timezoneData = timezones.reduce((acc, tz) => {
      const tzTargets = targets.filter(t => t.target_timezone === tz);
      const tzResponses = tzTargets.filter(t => 
        t.target_outcomes?.some((o: any) => !['unknown'].includes(o.outcome_type))
      );
      
      acc[tz] = {
        targets: tzTargets.length,
        responses: tzResponses.length,
        rate: tzTargets.length > 0 ? Math.round((tzResponses.length / tzTargets.length) * 100) : 0
      };
      return acc;
    }, {} as any);

    return {
      totalTargets,
      totalPosts,
      totalEngagement: 0, // Would need to sum up engagement metrics
      conversionRates: {
        postsToDMs: totalPosts > 0 ? Math.round((dmOpened / totalPosts) * 100) : 0,
        dmsToReplies: dmOpened > 0 ? Math.round((dmReplied / dmOpened) * 100) : 0,
        repliesToCalls: dmReplied > 0 ? Math.round((callsBooked / dmReplied) * 100) : 0,
        callsToWins: callsBooked > 0 ? Math.round((won / callsBooked) * 100) : 0
      },
      wavePerformance: {
        wave1: {
          targets: waveData.wave1.length,
          responses: waveData.wave1.filter(t => 
            t.target_outcomes?.some((o: any) => !['unknown'].includes(o.outcome_type))
          ).length,
          rate: waveData.wave1.length > 0 ? Math.round((waveData.wave1.filter(t => 
            t.target_outcomes?.some((o: any) => !['unknown'].includes(o.outcome_type))
          ).length / waveData.wave1.length) * 100) : 0
        },
        wave2: {
          targets: waveData.wave2.length,
          responses: waveData.wave2.filter(t => 
            t.target_outcomes?.some((o: any) => !['unknown'].includes(o.outcome_type))
          ).length,
          rate: waveData.wave2.length > 0 ? Math.round((waveData.wave2.filter(t => 
            t.target_outcomes?.some((o: any) => !['unknown'].includes(o.outcome_type))
          ).length / waveData.wave2.length) * 100) : 0
        },
        wave3: {
          targets: waveData.wave3.length,
          responses: waveData.wave3.filter(t => 
            t.target_outcomes?.some((o: any) => !['unknown'].includes(o.outcome_type))
          ).length,
          rate: waveData.wave3.length > 0 ? Math.round((waveData.wave3.filter(t => 
            t.target_outcomes?.some((o: any) => !['unknown'].includes(o.outcome_type))
          ).length / waveData.wave3.length) * 100) : 0
        }
      },
      timezonePerformance: timezoneData,
      topPerformingSlots: [] // Would need more complex calculation based on scheduled times
    };
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Loading analytics...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Campaign Analytics
            </CardTitle>
            <div className="flex gap-2">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-32">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
                <SelectTrigger className="w-32">
                  <Globe className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Zones</SelectItem>
                  <SelectItem value="ET">ET</SelectItem>
                  <SelectItem value="CT">CT</SelectItem>
                  <SelectItem value="PT">PT</SelectItem>
                  <SelectItem value="HST">HST</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.totalTargets}</p>
                <p className="text-sm text-muted-foreground">Total Targets</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.totalPosts}</p>
                <p className="text-sm text-muted-foreground">Posts Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <MessageSquare className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.conversionRates.postsToDMs}%</p>
                <p className="text-sm text-muted-foreground">Post → DM Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <Phone className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.conversionRates.repliesToCalls}%</p>
                <p className="text-sm text-muted-foreground">Reply → Call Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Conversion Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg mb-2">
                {data.totalPosts}
              </div>
              <p className="font-medium">Posts Sent</p>
              <p className="text-xs text-muted-foreground">Starting point</p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-lg mb-2">
                {Math.round(data.totalPosts * (data.conversionRates.postsToDMs / 100))}
              </div>
              <p className="font-medium">DMs Opened</p>
              <p className="text-xs text-muted-foreground">{data.conversionRates.postsToDMs}% conversion</p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg mb-2">
                {Math.round(data.totalPosts * (data.conversionRates.postsToDMs / 100) * (data.conversionRates.dmsToReplies / 100))}
              </div>
              <p className="font-medium">DMs Replied</p>
              <p className="text-xs text-muted-foreground">{data.conversionRates.dmsToReplies}% conversion</p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg mb-2">
                {Math.round(data.totalPosts * (data.conversionRates.postsToDMs / 100) * (data.conversionRates.dmsToReplies / 100) * (data.conversionRates.repliesToCalls / 100))}
              </div>
              <p className="font-medium">Calls Booked</p>
              <p className="text-xs text-muted-foreground">{data.conversionRates.repliesToCalls}% conversion</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Wave Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Wave Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(data.wavePerformance).map(([wave, perf]) => (
                <div key={wave} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      wave === 'wave1' ? 'bg-blue-500' : 
                      wave === 'wave2' ? 'bg-green-500' : 'bg-orange-500'
                    }`} />
                    <div>
                      <p className="font-medium capitalize">{wave.replace('wave', 'Wave ')}</p>
                      <p className="text-sm text-muted-foreground">
                        {perf.responses}/{perf.targets} responded
                      </p>
                    </div>
                  </div>
                  <Badge variant={perf.rate > 20 ? 'default' : 'secondary'}>
                    {perf.rate}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Timezone Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Timezone Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(data.timezonePerformance).map(([tz, perf]) => (
                <div key={tz} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{tz}</p>
                      <p className="text-sm text-muted-foreground">
                        {perf.responses}/{perf.targets} responded
                      </p>
                    </div>
                  </div>
                  <Badge variant={perf.rate > 15 ? 'default' : 'secondary'}>
                    {perf.rate}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Key Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="font-medium text-blue-900 dark:text-blue-100">
                Best performing wave: Wave {
                  Object.entries(data.wavePerformance)
                    .sort(([,a], [,b]) => b.rate - a.rate)[0][0].replace('wave', '')
                }
              </p>
              <p className="text-blue-700 dark:text-blue-300 text-xs mt-1">
                Consider allocating more targets to this time window
              </p>
            </div>
            
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="font-medium text-green-900 dark:text-green-100">
                Overall funnel health: {data.conversionRates.postsToDMs}% post-to-DM rate
              </p>
              <p className="text-green-700 dark:text-green-300 text-xs mt-1">
                Industry benchmark is typically 5-15% for cold outreach
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}