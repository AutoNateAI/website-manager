import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, ExternalLink, User, MessageSquare, Heart, Eye, Search, Sparkles, TrendingUp, Target, Brain, Trash2 } from 'lucide-react';
import { SearchQueryGenerator } from "../SearchQueryGenerator";
import { AttentionScoreCard } from "../AttentionScoreCard";
import { EnhancedAddPostModal } from "../EnhancedAddPostModal";
import { PostDetailModal } from "../PostDetailModal";

interface TargetPost {
  id: string;
  post_url: string;
  poster_username?: string;
  post_content?: string;
  location_tag?: string;
  hashtags?: string[];
  like_count: number;
  comment_count: number;
  analysis_status: string;
  notes?: string;
  created_at: string;
  // New attention scoring fields
  attention_score?: number;
  authenticity_score?: number;
  market_fit_score?: number;
  network_value_score?: number;
  overall_attention_score?: number;
  scoring_metadata?: any;
  last_scored_at?: string;
  // Relationship fields
  post_search_queries?: Array<{
    search_queries?: {
      id: string;
      title: string;
    };
  }>;
  instagram_users?: InstagramUser;
}

interface InstagramUser {
  id: string;
  username: string;
  display_name?: string;
  bio?: string;
  follower_count?: number;
  account_type?: string;
  follows_me: boolean;
  discovered_through?: string;
  influence_score: number;
  sentiment_score?: number;
  notes?: string;
}

interface EngagementActivity {
  id: string;
  activity_type: string;
  content?: string;
  response_received: boolean;
  response_content?: string;
  sentiment_analysis?: string;
  topics?: string[];
  led_to_follow: boolean;
  created_at: string;
  target_post?: TargetPost;
  target_user?: InstagramUser;
}

export function InstagramAnalyticsTab() {
  const [targetPosts, setTargetPosts] = useState<TargetPost[]>([]);
  const [users, setUsers] = useState<InstagramUser[]>([]);
  const [activities, setActivities] = useState<EngagementActivity[]>([]);
  const [searchQueries, setSearchQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPostUrl, setNewPostUrl] = useState('');
  const [selectedPost, setSelectedPost] = useState<TargetPost | null>(null);
  const [selectedUser, setSelectedUser] = useState<InstagramUser | null>(null);
  const [postDetailModal, setPostDetailModal] = useState<TargetPost | null>(null);
  
  // Search and filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<string>('attention_score');
  const [filterByQuery, setFilterByQuery] = useState<string>('all');
  
  // AI features
  const [searchQueryDialog, setSearchQueryDialog] = useState(false);
  const [isCalculatingScores, setIsCalculatingScores] = useState(false);
  const [showAddPostModal, setShowAddPostModal] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
    fetchSearchQueries();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch target posts with enhanced data
      const { data: posts, error: postsError } = await supabase
        .from('instagram_target_posts')
        .select(`
          *,
          instagram_users!poster_user_id(*),
          post_search_queries(search_queries(*))
        `)
        .order('overall_attention_score', { ascending: false, nullsFirst: false });

      if (postsError) throw postsError;

      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('instagram_users')
        .select('*')
        .order('influence_score', { ascending: false });

      if (usersError) throw usersError;

      // Fetch activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('engagement_activities')
        .select(`
          *,
          target_post:instagram_target_posts(*),
          target_user:instagram_users(*)
        `)
        .order('created_at', { ascending: false });

      if (activitiesError) throw activitiesError;

      setTargetPosts(posts || []);
      setUsers(usersData || []);
      setActivities(activitiesData || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching data',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSearchQueries = async () => {
    try {
      const { data, error } = await supabase
        .from('search_queries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSearchQueries(data || []);
    } catch (error: any) {
      console.error('Error fetching search queries:', error);
    }
  };

  const addTargetPost = async () => {
    if (!newPostUrl.trim()) return;

    try {
      // Extract username from URL
      const urlParts = newPostUrl.match(/instagram\.com\/(?:p|reel)\/([^\/]+)/);
      if (!urlParts) {
        toast({
          title: 'Invalid URL',
          description: 'Please enter a valid Instagram post URL',
          variant: 'destructive'
        });
        return;
      }

      const { data, error } = await supabase
        .from('instagram_target_posts')
        .insert([{
          post_url: newPostUrl,
          post_id: urlParts[1],
          analysis_status: 'pending'
        }])
        .select()
        .single();

      if (error) throw error;

      setTargetPosts([data, ...targetPosts]);
      setNewPostUrl('');
      toast({
        title: 'Success',
        description: 'Target post added successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Error adding post',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const calculateAttentionScore = async (postId: string) => {
    try {
      setIsCalculatingScores(true);
      const { data, error } = await supabase.functions.invoke('calculate-attention-score', {
        body: { postId }
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Attention score calculated successfully'
      });

      // Refresh the posts data to show updated scores
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error calculating scores',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsCalculatingScores(false);
    }
  };

  const filteredAndSortedPosts = targetPosts
    .filter(post => {
      const matchesSearch = !searchTerm || 
        post.poster_username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.post_content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.hashtags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesQuery = filterByQuery === 'all' || 
        post.post_search_queries?.some((pq: any) => pq.search_queries?.id === filterByQuery);
      
      return matchesSearch && matchesQuery;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'attention_score':
          return (b.overall_attention_score || 0) - (a.overall_attention_score || 0);
        case 'authenticity_score':
          return (b.authenticity_score || 0) - (a.authenticity_score || 0);
        case 'engagement':
          return (b.like_count + b.comment_count) - (a.like_count + a.comment_count);
        case 'created_at':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  const deleteTargetPost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('instagram_target_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      setTargetPosts(targetPosts.filter(post => post.id !== postId));
      toast({
        title: 'Success',
        description: 'Post deleted successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Error deleting post',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const addEngagementActivity = async (postId: string, activityType: string, content: string) => {
    try {
      const { data, error } = await supabase
        .from('engagement_activities')
        .insert([{
          target_post_id: postId,
          activity_type: activityType,
          content: content
        }])
        .select(`
          *,
          target_post:instagram_target_posts(*),
          target_user:instagram_users(*)
        `)
        .single();

      if (error) throw error;

      setActivities([data, ...activities]);
      toast({
        title: 'Success',
        description: 'Engagement activity logged successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Error logging activity',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return <div className="p-6">Loading Instagram analytics...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Instagram Intelligence Platform
          </h2>
          <p className="text-muted-foreground">
            AI-powered attention sensing and market intelligence for Instagram
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setSearchQueryDialog(true)}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            AI Search Generator
          </Button>
          <Button onClick={() => setShowAddPostModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Target Post
          </Button>
        </div>
      </div>

      {/* Enhanced Search and Filters */}
      <div className="flex gap-4 items-center flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search posts, users, hashtags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="attention_score">
              <TrendingUp className="h-4 w-4 mr-2 inline" />
              Attention Score
            </SelectItem>
            <SelectItem value="authenticity_score">Authenticity Score</SelectItem>
            <SelectItem value="engagement">Engagement Count</SelectItem>
            <SelectItem value="created_at">Date Added</SelectItem>
          </SelectContent>
        </Select>
        {searchQueries.length > 0 && (
          <Select value={filterByQuery} onValueChange={setFilterByQuery}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by query" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Queries</SelectItem>
              {searchQueries.map((query: any) => (
                <SelectItem key={query.id} value={query.id}>
                  {query.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Tabs defaultValue="posts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="posts">Target Posts</TabsTrigger>
          <TabsTrigger value="users">Discovered Users</TabsTrigger>
          <TabsTrigger value="activities">Engagement Activities</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredAndSortedPosts.map((post) => (
              <Card 
                key={post.id} 
                className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] relative group"
                onClick={() => setPostDetailModal(post)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm truncate pr-2">
                      {post.poster_username ? `@${post.poster_username}` : 'Unknown User'}
                    </CardTitle>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant={post.analysis_status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                        {post.analysis_status}
                      </Badge>
                      {post.overall_attention_score && (
                        <Badge variant="outline" className="text-xs">
                          {post.overall_attention_score.toFixed(1)}
                        </Badge>
                      )}
                      {/* Delete button - visible on hover */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTargetPost(post.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Attention Score Display */}
                  {(post.attention_score || post.authenticity_score || post.market_fit_score || post.network_value_score) && (
                    <AttentionScoreCard
                      scores={{
                        attention_score: post.attention_score || 0,
                        authenticity_score: post.authenticity_score || 0,
                        market_fit_score: post.market_fit_score || 0,
                        network_value_score: post.network_value_score || 0,
                        overall_attention_score: post.overall_attention_score || 0
                      }}
                      metadata={post.scoring_metadata}
                      onRecalculate={() => calculateAttentionScore(post.id)}
                      isCalculating={isCalculatingScores}
                      compact={true}
                    />
                  )}

                  {post.post_content && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {post.post_content}
                    </p>
                  )}
                  
                  {/* Hashtags */}
                  {post.hashtags && post.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {post.hashtags.slice(0, 2).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {post.hashtags.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{post.hashtags.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      {post.like_count}
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {post.comment_count}
                    </div>
                    {post.location_tag && (
                      <div className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        <span className="truncate max-w-16">Location</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1 flex-wrap">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1 min-w-0 text-xs h-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(post.post_url, '_blank');
                      }}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button 
                      size="sm"
                      className="flex-1 min-w-0 text-xs h-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPost(post);
                      }}
                    >
                      Engage
                    </Button>
                    {!post.overall_attention_score && (
                      <Button 
                        size="sm"
                        variant="secondary"
                        className="flex-1 min-w-0 text-xs h-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          calculateAttentionScore(post.id);
                        }}
                        disabled={isCalculatingScores}
                      >
                        <Brain className="h-3 w-3 mr-1" />
                        Score
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {filteredAndSortedPosts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No posts match your current filters.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {users.map((user) => (
              <Card key={user.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="h-4 w-4" />
                      @{user.username}
                    </CardTitle>
                    {user.follows_me && (
                      <Badge variant="default">Follows Me</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {user.bio && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {user.bio}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <span>Influence: {user.influence_score}</span>
                    <span>Type: {user.account_type || 'Unknown'}</span>
                  </div>
                  {user.follower_count && (
                    <div className="text-xs text-muted-foreground">
                      {user.follower_count.toLocaleString()} followers
                    </div>
                  )}
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedUser(user)}
                  >
                    View Profile
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="activities" className="space-y-4">
          <div className="space-y-3">
            {activities.map((activity) => (
              <Card key={activity.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{activity.activity_type}</Badge>
                        {activity.led_to_follow && (
                          <Badge variant="default">Led to Follow</Badge>
                        )}
                        {activity.response_received && (
                          <Badge variant="secondary">Got Response</Badge>
                        )}
                      </div>
                      {activity.content && (
                        <p className="text-sm">{activity.content}</p>
                      )}
                      {activity.response_content && (
                        <div className="bg-muted p-2 rounded text-sm">
                          <strong>Response:</strong> {activity.response_content}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {new Date(activity.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Search Query Generator Dialog */}
      <SearchQueryGenerator
        open={searchQueryDialog}
        onOpenChange={setSearchQueryDialog}
        onQueryGenerated={(query) => {
          fetchSearchQueries();
          toast({
            title: "Success",
            description: `Search query "${query.title}" saved successfully`,
          });
        }}
      />

      {/* Post Detail Modal */}
      <PostDetailModal
        post={postDetailModal}
        open={!!postDetailModal}
        onOpenChange={(open) => !open && setPostDetailModal(null)}
        onDelete={deleteTargetPost}
        onCalculateScore={calculateAttentionScore}
        isCalculatingScores={isCalculatingScores}
      />

      {/* Enhanced Add Post Modal */}
      <EnhancedAddPostModal
        open={showAddPostModal}
        onOpenChange={setShowAddPostModal}
        onPostAdded={(post) => {
          setTargetPosts([post, ...targetPosts]);
        }}
      />

      {/* Quick Engagement Dialog */}
      {selectedPost && (
        <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Engagement Activity</DialogTitle>
            </DialogHeader>
            <EngagementForm 
              post={selectedPost}
              onSubmit={(type, content) => {
                addEngagementActivity(selectedPost.id, type, content);
                setSelectedPost(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function EngagementForm({ post, onSubmit }: { 
  post: TargetPost; 
  onSubmit: (type: string, content: string) => void;
}) {
  const [activityType, setActivityType] = useState('comment');
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onSubmit(activityType, content.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select value={activityType} onValueChange={setActivityType}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="comment">Comment</SelectItem>
          <SelectItem value="like">Like</SelectItem>
          <SelectItem value="follow">Follow</SelectItem>
          <SelectItem value="story_view">Story View</SelectItem>
          <SelectItem value="dm">Direct Message</SelectItem>
        </SelectContent>
      </Select>
      
      <Textarea
        placeholder="Enter your comment or activity details..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
      />
      
      <Button type="submit" className="w-full">
        Log Activity
      </Button>
    </form>
  );
}