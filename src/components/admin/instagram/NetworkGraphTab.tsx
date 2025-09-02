import React, { useState, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Users, Network, TrendingUp, Filter } from 'lucide-react';

interface NetworkData {
  nodes: Node[];
  edges: Edge[];
}

interface AttentionFlow {
  id: string;
  source_user_id: string;
  target_user_id: string;
  attention_type: string;
  attention_strength: number;
  frequency_score: number;
  network_cluster?: string;
}

interface InstagramUser {
  id: string;
  username: string;
  display_name?: string;
  follower_count?: number;
  influence_score: number;
  account_type?: string;
  follows_me: boolean;
  niche_categories?: string[];
  discovered_through?: string;
}

export function NetworkGraphTab() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [users, setUsers] = useState<InstagramUser[]>([]);
  const [attentionFlows, setAttentionFlows] = useState<AttentionFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCluster, setSelectedCluster] = useState<string>('all');
  const [selectedAttentionType, setSelectedAttentionType] = useState<string>('all');
  const [networkStats, setNetworkStats] = useState({
    totalUsers: 0,
    totalConnections: 0,
    clusters: 0,
    followsMe: 0
  });

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  useEffect(() => {
    fetchNetworkData();
  }, []);

  useEffect(() => {
    if (users.length > 0) {
      buildNetworkGraph();
    }
  }, [users, attentionFlows, selectedCluster, selectedAttentionType]);

  const fetchNetworkData = async () => {
    try {
      setLoading(true);

      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('instagram_users')
        .select('*')
        .order('influence_score', { ascending: false });

      if (usersError) throw usersError;

      // Fetch attention network
      const { data: networkData, error: networkError } = await supabase
        .from('attention_network')
        .select('*');

      if (networkError) throw networkError;

      setUsers(usersData || []);
      setAttentionFlows(networkData || []);

      // Calculate network stats
      const stats = {
        totalUsers: usersData?.length || 0,
        totalConnections: networkData?.length || 0,
        clusters: new Set(networkData?.map(n => n.network_cluster).filter(Boolean)).size,
        followsMe: usersData?.filter(u => u.follows_me).length || 0
      };
      setNetworkStats(stats);

    } catch (error: any) {
      toast({
        title: 'Error fetching network data',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const buildNetworkGraph = () => {
    // Filter flows based on selections
    const filteredFlows = attentionFlows.filter(flow => {
      const clusterMatch = selectedCluster === 'all' || flow.network_cluster === selectedCluster;
      const typeMatch = selectedAttentionType === 'all' || flow.attention_type === selectedAttentionType;
      return clusterMatch && typeMatch;
    });

    // Get users involved in filtered flows
    const involvedUserIds = new Set([
      ...filteredFlows.map(f => f.source_user_id),
      ...filteredFlows.map(f => f.target_user_id)
    ]);

    const filteredUsers = users.filter(user => 
      involvedUserIds.has(user.id) || user.follows_me
    );

    // Create nodes
    const newNodes: Node[] = filteredUsers.map((user, index) => {
      const angle = (index / filteredUsers.length) * 2 * Math.PI;
      const radius = Math.min(400, filteredUsers.length * 30);
      
      return {
        id: user.id,
        position: {
          x: 400 + radius * Math.cos(angle),
          y: 300 + radius * Math.sin(angle)
        },
        data: {
          label: `@${user.username}`,
          user: user
        },
        type: 'default',
        className: user.follows_me ? 'follow-me-node' : 'regular-node',
        style: {
          backgroundColor: user.follows_me ? '#10b981' : getNodeColor(user),
          color: 'white',
          border: user.influence_score > 50 ? '3px solid #f59e0b' : '1px solid #6b7280',
          borderRadius: '8px',
          padding: '8px',
          fontSize: '12px',
          width: Math.max(80, user.influence_score * 2),
          height: 60
        }
      };
    });

    // Create edges
    const newEdges: Edge[] = filteredFlows.map((flow, index) => ({
      id: flow.id,
      source: flow.source_user_id,
      target: flow.target_user_id,
      type: 'smoothstep',
      animated: flow.attention_strength > 5,
      style: {
        strokeWidth: Math.max(1, flow.attention_strength),
        stroke: getEdgeColor(flow.attention_type)
      },
      label: `${flow.attention_type} (${flow.frequency_score})`,
      labelStyle: { fontSize: '10px' }
    }));

    setNodes(newNodes);
    setEdges(newEdges);
  };

  const getNodeColor = (user: InstagramUser): string => {
    if (user.account_type === 'business') return '#3b82f6';
    if (user.account_type === 'creator') return '#8b5cf6';
    return '#6b7280';
  };

  const getEdgeColor = (attentionType: string): string => {
    switch (attentionType) {
      case 'follows': return '#10b981';
      case 'frequent_commenter': return '#f59e0b';
      case 'mentions': return '#ef4444';
      case 'tags': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const getUniqueValues = (field: 'network_cluster' | 'attention_type') => {
    const values = attentionFlows
      .map(flow => flow[field])
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index);
    return values;
  };

  if (loading) {
    return <div className="p-6">Loading network graph...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Attention Network</h2>
          <p className="text-muted-foreground">Visualize user relationships and attention flow</p>
        </div>
        <Button onClick={fetchNetworkData}>
          <Network className="h-4 w-4 mr-2" />
          Refresh Network
        </Button>
      </div>

      {/* Network Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{networkStats.totalUsers}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Network className="h-4 w-4" />
              Connections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{networkStats.totalConnections}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Clusters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{networkStats.clusters}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Follows Me
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{networkStats.followsMe}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={selectedCluster} onValueChange={setSelectedCluster}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by cluster" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clusters</SelectItem>
            {getUniqueValues('network_cluster').map(cluster => (
              <SelectItem key={cluster} value={cluster}>{cluster}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedAttentionType} onValueChange={setSelectedAttentionType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by attention type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {getUniqueValues('attention_type').map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Legend</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Follows Me</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Business</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded"></div>
              <span>Creator</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-500 rounded"></div>
              <span>Personal</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-green-500"></div>
              <span>Follows</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-yellow-500"></div>
              <span>Comments</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-red-500"></div>
              <span>Mentions</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-purple-500"></div>
              <span>Tags</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Network Graph */}
      <Card>
        <CardContent className="p-0">
          <div style={{ width: '100%', height: '600px' }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              fitView
              attributionPosition="top-right"
              style={{ backgroundColor: 'hsl(var(--background))' }}
            >
              <Controls />
              <MiniMap />
              <Background />
            </ReactFlow>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}