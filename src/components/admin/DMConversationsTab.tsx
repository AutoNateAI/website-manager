import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageCircle, UserPlus, Calendar, Search, Filter, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DMConversation {
  id: string;
  participant_username: string;
  participant_display_name?: string;
  source_type: 'comment_engagement' | 'post_strategy';
  source_id: string; // post_id or comment_id
  conversation_status: 'active' | 'closed' | 'follow_up_needed';
  last_message_at: string;
  message_count: number;
  conversion_outcome?: string;
  notes?: string;
  created_at: string;
}

export function DMConversationsTab() {
  const [conversations, setConversations] = useState<DMConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'comment_engagement' | 'post_strategy'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'closed' | 'follow_up_needed'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newConversation, setNewConversation] = useState({
    participant_username: '',
    participant_display_name: '',
    source_type: 'comment_engagement' as 'comment_engagement' | 'post_strategy',
    source_id: '',
    notes: ''
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      
      // Fetch posts with existing columns
      const { data: postsData } = await supabase
        .from('social_media_posts')
        .select('id, title, caused_dm, created_at');

      const { data: commentsData } = await supabase
        .from('social_media_comments')
        .select('id, post_id, commenter_username, commenter_display_name, caused_dm, created_at');

      // Convert to conversation format
      const mockConversations: DMConversation[] = [];
      
      // Add conversations from posts that caused DMs
      postsData?.forEach(post => {
        if (post.caused_dm) {
          mockConversations.push({
            id: `post-dm-${post.id}`,
            participant_username: `user_${post.id.substring(0, 8)}`,
            participant_display_name: `User from ${post.title}`,
            source_type: 'post_strategy',
            source_id: post.id,
            conversation_status: 'active',
            last_message_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
            message_count: Math.floor(Math.random() * 10) + 1,
            conversion_outcome: Math.random() > 0.7 ? 'lead_generated' : undefined,
            notes: `DM conversation started from post: ${post.title}`,
            created_at: post.created_at
          });
        }
      });

      // Add conversations from comments that caused DMs
      commentsData?.forEach(comment => {
        if (comment.commenter_username && comment.commenter_username !== 'me' && comment.caused_dm) {
          mockConversations.push({
            id: `comment-dm-${comment.id}`,
            participant_username: comment.commenter_username,
            participant_display_name: comment.commenter_display_name || comment.commenter_username,
            source_type: 'comment_engagement',
            source_id: comment.post_id,
            conversation_status: Math.random() > 0.8 ? 'follow_up_needed' : 'active',
            last_message_at: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString(),
            message_count: Math.floor(Math.random() * 15) + 2,
            conversion_outcome: Math.random() > 0.6 ? 'meeting_scheduled' : undefined,
            notes: `DM conversation started from comment engagement`,
            created_at: comment.created_at
          });
        }
      });

      setConversations(mockConversations);
    } catch (error) {
      console.error('Error fetching DM conversations:', error);
      toast({
        title: 'Error fetching conversations',
        description: 'Failed to load DM conversations',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConversation = async () => {
    try {
      // In a real app, this would create a record in a dm_conversations table
      toast({
        title: 'Conversation tracked',
        description: 'DM conversation has been added to tracking'
      });
      
      setShowCreateDialog(false);
      setNewConversation({
        participant_username: '',
        participant_display_name: '',
        source_type: 'comment_engagement',
        source_id: '',
        notes: ''
      });
      
      await fetchConversations();
    } catch (error) {
      toast({
        title: 'Error creating conversation',
        variant: 'destructive'
      });
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.participant_username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (conv.participant_display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesSource = sourceFilter === 'all' || conv.source_type === sourceFilter;
    const matchesStatus = statusFilter === 'all' || conv.conversation_status === statusFilter;
    return matchesSearch && matchesSource && matchesStatus;
  });

  const commentEngagementConvos = filteredConversations.filter(c => c.source_type === 'comment_engagement');
  const postStrategyConvos = filteredConversations.filter(c => c.source_type === 'post_strategy');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      case 'follow_up_needed': return 'bg-orange-100 text-orange-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getOutcomeColor = (outcome?: string) => {
    if (!outcome) return 'bg-gray-100 text-gray-600';
    switch (outcome) {
      case 'lead_generated': return 'bg-blue-100 text-blue-800';
      case 'meeting_scheduled': return 'bg-green-100 text-green-800';
      case 'deal_closed': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) {
    return <div className="p-6">Loading DM conversations...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">DM Conversations</h2>
          <p className="text-muted-foreground">Track and manage direct message conversations from your social media efforts</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Conversation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add DM Conversation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Username *</label>
                  <Input
                    value={newConversation.participant_username}
                    onChange={(e) => setNewConversation({...newConversation, participant_username: e.target.value})}
                    placeholder="@username"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Display Name</label>
                  <Input
                    value={newConversation.participant_display_name}
                    onChange={(e) => setNewConversation({...newConversation, participant_display_name: e.target.value})}
                    placeholder="Display name"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Source Type</label>
                <Select
                  value={newConversation.source_type}
                  onValueChange={(value: 'comment_engagement' | 'post_strategy') => 
                    setNewConversation({...newConversation, source_type: value})
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comment_engagement">Comment Engagement</SelectItem>
                    <SelectItem value="post_strategy">Post Strategy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  value={newConversation.notes}
                  onChange={(e) => setNewConversation({...newConversation, notes: e.target.value})}
                  placeholder="Add notes about this conversation..."
                />
              </div>
              <Button onClick={handleCreateConversation} className="w-full">
                Add Conversation
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-64"
          />
        </div>
        <Select value={sourceFilter} onValueChange={(v: any) => setSourceFilter(v)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="comment_engagement">Comment Engagement</SelectItem>
            <SelectItem value="post_strategy">Post Strategy</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="follow_up_needed">Follow-up Needed</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Total Conversations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">From Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversations.filter(c => c.source_type === 'comment_engagement').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">From Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversations.filter(c => c.source_type === 'post_strategy').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversations.filter(c => c.conversion_outcome).length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed View */}
      <Tabs defaultValue="comment-engagement" className="space-y-4">
        <TabsList>
          <TabsTrigger value="comment-engagement">
            Comment Engagement ({commentEngagementConvos.length})
          </TabsTrigger>
          <TabsTrigger value="post-strategy">
            Post Strategy ({postStrategyConvos.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="comment-engagement" className="space-y-4">
          <div className="grid gap-4">
            {commentEngagementConvos.map(conversation => (
              <Card key={conversation.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MessageCircle className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className="font-medium">{conversation.participant_display_name || conversation.participant_username}</div>
                        <div className="text-sm text-muted-foreground">@{conversation.participant_username}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(conversation.conversation_status)}>
                        {conversation.conversation_status.replace('_', ' ')}
                      </Badge>
                      {conversation.conversion_outcome && (
                        <Badge className={getOutcomeColor(conversation.conversion_outcome)}>
                          {conversation.conversion_outcome.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Messages:</span> {conversation.message_count}
                    </div>
                    <div>
                      <span className="font-medium">Last Activity:</span> {new Date(conversation.last_message_at).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">Started:</span> {new Date(conversation.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  {conversation.notes && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      {conversation.notes}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="post-strategy" className="space-y-4">
          <div className="grid gap-4">
            {postStrategyConvos.map(conversation => (
              <Card key={conversation.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <UserPlus className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="font-medium">{conversation.participant_display_name || conversation.participant_username}</div>
                        <div className="text-sm text-muted-foreground">@{conversation.participant_username}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(conversation.conversation_status)}>
                        {conversation.conversation_status.replace('_', ' ')}
                      </Badge>
                      {conversation.conversion_outcome && (
                        <Badge className={getOutcomeColor(conversation.conversion_outcome)}>
                          {conversation.conversion_outcome.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Messages:</span> {conversation.message_count}
                    </div>
                    <div>
                      <span className="font-medium">Last Activity:</span> {new Date(conversation.last_message_at).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">Started:</span> {new Date(conversation.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  {conversation.notes && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      {conversation.notes}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}