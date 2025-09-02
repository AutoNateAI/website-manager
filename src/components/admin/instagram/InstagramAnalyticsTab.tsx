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
import { toast } from '@/hooks/use-toast';
import { Plus, ExternalLink, User, MessageSquare, Heart, Eye } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);
  const [newPostUrl, setNewPostUrl] = useState('');
  const [selectedPost, setSelectedPost] = useState<TargetPost | null>(null);
  const [selectedUser, setSelectedUser] = useState<InstagramUser | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch target posts
      const { data: posts, error: postsError } = await supabase
        .from('instagram_target_posts')
        .select('*')
        .order('created_at', { ascending: false });

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
          <h2 className="text-2xl font-bold">Instagram Analytics</h2>
          <p className="text-muted-foreground">Track posts, users, and engagement activities</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Target Post
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Target Post</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Enter Instagram post URL..."
                value={newPostUrl}
                onChange={(e) => setNewPostUrl(e.target.value)}
              />
              <Button onClick={addTargetPost} className="w-full">
                Add Post
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="posts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="posts">Target Posts</TabsTrigger>
          <TabsTrigger value="users">Discovered Users</TabsTrigger>
          <TabsTrigger value="activities">Engagement Activities</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {targetPosts.map((post) => (
              <Card key={post.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">
                      {post.poster_username ? `@${post.poster_username}` : 'Unknown User'}
                    </CardTitle>
                    <Badge variant={post.analysis_status === 'completed' ? 'default' : 'secondary'}>
                      {post.analysis_status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {post.post_content && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {post.post_content}
                    </p>
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
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => window.open(post.post_url, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => setSelectedPost(post)}
                    >
                      Engage
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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