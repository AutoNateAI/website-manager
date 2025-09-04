import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Target, 
  Search, 
  Filter, 
  Plus, 
  ExternalLink,
  Clock,
  Globe,
  MessageSquare,
  Phone,
  DollarSign,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface TargetWithData {
  id: string;
  username: string;
  display_name?: string;
  timezone?: string;
  wave_status?: string;
  current_wave?: number;
  outcome?: string;
  last_blitz_date?: string;
  next_action_date?: string;
  company?: {
    name: string;
  };
  person?: {
    name: string;
  };
}

export function TargetsTab() {
  const [targets, setTargets] = useState<TargetWithData[]>([]);
  const [filteredTargets, setFilteredTargets] = useState<TargetWithData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTimezone, setFilterTimezone] = useState('all');
  const [filterWaveStatus, setFilterWaveStatus] = useState('all');
  const [filterOutcome, setFilterOutcome] = useState('all');

  useEffect(() => {
    loadTargets();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [targets, searchTerm, filterTimezone, filterWaveStatus, filterOutcome]);

  const loadTargets = async () => {
    try {
      setLoading(true);
      
      // Load Instagram users with their campaign target data
      const { data, error } = await supabase
        .from('instagram_users')
        .select(`
          *,
          companies (
            id,
            name
          ),
          people (
            id,
            name
          ),
          campaign_targets!campaign_targets_instagram_user_id_fkey (
            wave_status,
            current_wave,
            outcome,
            last_blitz_date,
            next_action_date,
            target_timezone,
            blitz_campaigns (
              campaign_date,
              status
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process the data to get the latest campaign target info for each user
      const processedTargets = (data || []).map(user => {
        const latestTarget = user.campaign_targets?.[0]; // Most recent campaign target
        return {
          id: user.id,
          username: user.username,
          display_name: user.display_name,
          timezone: latestTarget?.target_timezone,
          wave_status: latestTarget?.wave_status,
          current_wave: latestTarget?.current_wave,
          outcome: latestTarget?.outcome,
          last_blitz_date: latestTarget?.last_blitz_date,
          next_action_date: latestTarget?.next_action_date,
          company: user.companies,
          person: user.people
        };
      });

      setTargets(processedTargets);
    } catch (error: any) {
      console.error('Error loading targets:', error);
      toast({
        title: 'Error loading targets',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = targets;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(target => 
        target.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        target.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        target.company?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Timezone filter
    if (filterTimezone !== 'all') {
      filtered = filtered.filter(target => target.timezone === filterTimezone);
    }

    // Wave status filter
    if (filterWaveStatus !== 'all') {
      filtered = filtered.filter(target => target.wave_status === filterWaveStatus);
    }

    // Outcome filter
    if (filterOutcome !== 'all') {
      filtered = filtered.filter(target => target.outcome === filterOutcome);
    }

    setFilteredTargets(filtered);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'responded': return 'bg-green-100 text-green-800';
      case 'posted': return 'bg-blue-100 text-blue-800';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800';
      case 'no_response': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getOutcomeIcon = (outcome?: string) => {
    switch (outcome) {
      case 'dm_replied': return <MessageSquare className="h-4 w-4 text-green-600" />;
      case 'booked_call': return <Phone className="h-4 w-4 text-blue-600" />;
      case 'won': return <DollarSign className="h-4 w-4 text-green-600" />;
      case 'lost': return <X className="h-4 w-4 text-red-600" />;
      default: return <Target className="h-4 w-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Loading targets...</div>
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
              <Target className="h-5 w-5" />
              Target Management ({filteredTargets.length})
            </CardTitle>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add New Target
            </Button>
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search targets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filterTimezone} onValueChange={setFilterTimezone}>
              <SelectTrigger className="w-32">
                <Globe className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Timezone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Zones</SelectItem>
                <SelectItem value="ET">ET</SelectItem>
                <SelectItem value="CT">CT</SelectItem>
                <SelectItem value="PT">PT</SelectItem>
                <SelectItem value="HST">HST</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterWaveStatus} onValueChange={setFilterWaveStatus}>
              <SelectTrigger className="w-36">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="posted">Posted</SelectItem>
                <SelectItem value="responded">Responded</SelectItem>
                <SelectItem value="no_response">No Response</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterOutcome} onValueChange={setFilterOutcome}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Outcome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Outcomes</SelectItem>
                <SelectItem value="dm_opened">DM Opened</SelectItem>
                <SelectItem value="dm_replied">DM Replied</SelectItem>
                <SelectItem value="booked_call">Booked Call</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Targets Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <div className="divide-y">
              {filteredTargets.map((target) => (
                <div key={target.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Profile Info */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-semibold">
                          {target.username[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">@{target.username}</h3>
                            <Button variant="ghost" size="sm" className="p-0 h-auto">
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {target.display_name || 'No display name'}
                          </p>
                        </div>
                      </div>

                      {/* Company/Person Info */}
                      <div className="flex-1 min-w-0">
                        {target.company && (
                          <Badge variant="outline" className="mr-2">
                            {target.company.name}
                          </Badge>
                        )}
                        {target.person && (
                          <Badge variant="secondary">
                            {target.person.name}
                          </Badge>
                        )}
                      </div>

                      {/* Status & Wave Info */}
                      <div className="flex items-center gap-4">
                        {target.timezone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Globe className="h-3 w-3" />
                            {target.timezone}
                          </div>
                        )}
                        
                        {target.wave_status && (
                          <Badge className={getStatusColor(target.wave_status)}>
                            Wave {target.current_wave} - {target.wave_status}
                          </Badge>
                        )}
                        
                        <div className="flex items-center gap-1">
                          {getOutcomeIcon(target.outcome)}
                          <span className="text-sm text-muted-foreground capitalize">
                            {target.outcome?.replace('_', ' ') || 'Unknown'}
                          </span>
                        </div>
                      </div>

                      {/* Action Dates */}
                      <div className="text-right text-sm text-muted-foreground min-w-32">
                        {target.next_action_date && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Next: {new Date(target.next_action_date).toLocaleDateString()}
                          </div>
                        )}
                        {target.last_blitz_date && (
                          <div className="mt-1">
                            Last: {new Date(target.last_blitz_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredTargets.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="font-medium mb-1">No targets found</h3>
                  <p className="text-sm">Try adjusting your filters or add new targets to get started</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}