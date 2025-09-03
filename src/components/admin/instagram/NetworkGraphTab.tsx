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
  follows_me?: boolean;
  niche_categories?: string[];
  discovered_through?: string;
  type?: string;
  caused_dm?: boolean;
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

  // Save node positions when they change
  const onNodesChangeWithPersistence = useCallback(
    (changes: any[]) => {
      onNodesChange(changes);
      
      // Save positions after a short delay
      setTimeout(() => {
        const positions = nodes.reduce((acc, node) => {
          acc[node.id] = node.position;
          return acc;
        }, {} as Record<string, { x: number; y: number }>);
        localStorage.setItem('networkGraphPositions', JSON.stringify(positions));
      }, 100);
    },
    [onNodesChange, nodes]
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

      // Fetch our social media posts
      const { data: ourPostsData, error: postsError } = await supabase
        .from('social_media_posts')
        .select('id, title, caption, platform, caused_dm, created_at');

      // Fetch comments on posts
      const { data: commentsData, error: commentsError } = await supabase
        .from('social_media_comments')
        .select('commenter_username, commenter_display_name, caused_dm, post_id');

      if (postsError || commentsError) {
        throw postsError || commentsError;
      }

      const allUsers = new Map<string, any>();
      const relationships: AttentionFlow[] = [];
      let relationshipId = 1;

      // 1. Add Our Posts nodes (individual posts)
      ourPostsData?.forEach(post => {
        const ourPostId = `our_post_${post.id}`;
        allUsers.set(ourPostId, {
          id: ourPostId,
          username: post.title.length > 25 ? post.title.substring(0, 25) + '...' : post.title,
          display_name: post.title,
          type: 'our_post',
          influence_score: 35,
          caused_dm: post.caused_dm,
          data: post
        });
      });

      // 2. Add Commenters
      const commenterMap = new Map<string, any>();
      commentsData?.forEach(comment => {
        if (comment.commenter_username && 
            comment.commenter_username !== 'me' && 
            comment.commenter_username !== 'you') {
          
          const commenterId = comment.commenter_username.toLowerCase();
          if (!commenterMap.has(commenterId)) {
            commenterMap.set(commenterId, {
              id: commenterId,
              username: comment.commenter_username,
              display_name: comment.commenter_display_name || comment.commenter_username,
              type: 'commenter',
              caused_dm: comment.caused_dm || false,
              influence_score: 20,
              post_ids: new Set([comment.post_id])
            });
          } else {
            const existing = commenterMap.get(commenterId);
            existing.post_ids.add(comment.post_id);
            if (comment.caused_dm) {
              existing.caused_dm = true;
            }
          }
        }
      });

      // Add commenters to main users map
      commenterMap.forEach(commenter => {
        allUsers.set(commenter.id, commenter);
      });

      // 3. Add Search Queries node (simplified)
      allUsers.set('search_queries', {
        id: 'search_queries',
        username: 'Search Queries',
        display_name: 'Search Queries',
        type: 'search_query',
        influence_score: 50
      });

      // 4. Add DM Conversations node
      allUsers.set('dm_conversations', {
        id: 'dm_conversations',
        username: 'DM Conversations',
        display_name: 'DM Conversations',
        type: 'dm_node',
        influence_score: 40
      });

      // 5. Create relationships: Search → Our Posts (conceptual)
      ourPostsData?.forEach(post => {
        relationships.push({
          id: `search-our-post-${relationshipId++}`,
          source_user_id: 'search_queries',
          target_user_id: `our_post_${post.id}`,
          attention_type: 'search_discovery',
          attention_strength: 4,
          frequency_score: 1,
          network_cluster: 'discovery'
        });
      });

      // 6. Create relationships: Commenters → Our Posts
      commentsData?.forEach(comment => {
        if (comment.commenter_username && 
            comment.commenter_username !== 'me' && 
            comment.commenter_username !== 'you') {
          
          const commenterId = comment.commenter_username.toLowerCase();
          const ourPostId = `our_post_${comment.post_id}`;
          
          if (allUsers.has(ourPostId)) {
            if (comment.caused_dm) {
              // Commenter → DM
              relationships.push({
                id: `commenter-dm-${relationshipId++}`,
                source_user_id: commenterId,
                target_user_id: 'dm_conversations',
                attention_type: 'comment_to_dm',
                attention_strength: 8,
                frequency_score: 1,
                network_cluster: 'dm_conversion'
              });
            } else {
              // Commenter → Our Post
              relationships.push({
                id: `commenter-post-${relationshipId++}`,
                source_user_id: commenterId,
                target_user_id: ourPostId,
                attention_type: 'comment_engagement',
                attention_strength: 5,
                frequency_score: 1,
                network_cluster: 'engagement'
              });
            }
          }
        }
      });

      // 7. Our Posts → DM relationships
      ourPostsData?.forEach(post => {
        if (post.caused_dm) {
          relationships.push({
            id: `our-post-dm-${relationshipId++}`,
            source_user_id: `our_post_${post.id}`,
            target_user_id: 'dm_conversations',
            attention_type: 'post_to_dm',
            attention_strength: 10,
            frequency_score: 1,
            network_cluster: 'dm_conversion'
          });
        }
      });

      const usersArray = Array.from(allUsers.values());
      setUsers(usersArray);
      setAttentionFlows(relationships);

      // Calculate network stats - count commenters correctly
      const actualCommenters = usersArray.filter(u => u.type === 'commenter');
      const stats = {
        totalUsers: actualCommenters.length,
        totalConnections: relationships.length,
        clusters: new Set(relationships.map(r => r.network_cluster).filter(Boolean)).size,
        followsMe: 0
      };
      setNetworkStats(stats);

    } catch (error: any) {
      console.error('Network fetch error:', error);
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
      involvedUserIds.has(user.id)
    );

    // Load saved positions from localStorage
    const savedPositions = JSON.parse(localStorage.getItem('networkGraphPositions') || '{}');

    // Create nodes with saved positions or default circular layout
    const newNodes: Node[] = filteredUsers.map((user, index) => {
      const savedPos = savedPositions[user.id];
      let position;
      
      if (savedPos) {
        position = savedPos;
      } else {
        const angle = (index / filteredUsers.length) * 2 * Math.PI;
        const radius = Math.min(400, filteredUsers.length * 30);
        position = {
          x: 400 + radius * Math.cos(angle),
          y: 300 + radius * Math.sin(angle)
        };
      }
      
      return {
        id: user.id,
        position,
        data: {
          label: user.display_name || user.username,
          user: user
        },
        type: 'default',
        className: user.caused_dm ? 'dm-conversion-node' : 'regular-node',
        style: {
          backgroundColor: getNodeColor(user),
          color: 'white',
          border: user.caused_dm ? '3px solid #ef4444' : user.influence_score > 40 ? '2px solid #f59e0b' : '1px solid #6b7280',
          borderRadius: '8px',
          padding: '8px',
          fontSize: '12px',
          width: Math.max(100, Math.min(200, user.username.length * 8 + 40)),
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center'
        }
      };
    });

    // Create edges
    const newEdges: Edge[] = filteredFlows.map((flow) => ({
      id: flow.id,
      source: flow.source_user_id,
      target: flow.target_user_id,
      type: 'smoothstep',
      animated: flow.attention_strength > 7,
      style: {
        strokeWidth: Math.max(2, flow.attention_strength / 2),
        stroke: getEdgeColor(flow.attention_type)
      },
      label: `${flow.attention_type.replace('_', ' ')}`,
      labelStyle: { fontSize: '10px', fill: '#666' },
      markerEnd: {
        type: 'arrowclosed',
        color: getEdgeColor(flow.attention_type)
      }
    }));

    setNodes(newNodes);
    setEdges(newEdges);
  };

  const getNodeColor = (user: any): string => {
    if (user.type === 'search_query') return '#8b5cf6';
    if (user.type === 'target_post') return '#06b6d4';
    if (user.type === 'our_post') return '#3b82f6';
    if (user.type === 'dm_node') return '#ef4444';
    if (user.type === 'commenter') return '#f59e0b';
    if (user.caused_dm) return '#dc2626';
    return '#6b7280';
  };

  const getEdgeColor = (attentionType: string): string => {
    switch (attentionType) {
      case 'search_discovery': return '#10b981';
      case 'comment_engagement': return '#f59e0b';
      case 'comment_to_dm': return '#ef4444';
      case 'post_to_dm': return '#dc2626';
      case 'thread_reply': return '#8b5cf6';
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
              <div className="w-3 h-3 bg-purple-500 rounded"></div>
              <span>Search Queries</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Our Posts</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span>Commenters</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>DM Conversations</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-green-500"></div>
              <span>Search Discovery</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-yellow-500"></div>
              <span>Comment Engagement</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-red-500"></div>
              <span>Comment to DM</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-red-700"></div>
              <span>Post to DM</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-purple-500"></div>
              <span>Thread Reply</span>
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
              onNodesChange={onNodesChangeWithPersistence}
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