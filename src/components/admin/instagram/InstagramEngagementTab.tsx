import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Plus, MessageSquare, Clock, CheckCircle, AlertCircle, User, ExternalLink, Reply, Search } from 'lucide-react';

interface Account {
  id: string;
  username: string;
}

interface EngagementLog {
  id: string;
  user_id?: string | null;
  activity_type: string;
  target_post_id?: string | null;
  target_user_id?: string | null;
  content?: string | null;
  notes?: string | null;
  engagement_score?: number | null;
  led_to_follow?: boolean | null;
  parent_comment_id?: string | null;
  response_content?: string | null;
  created_at: string;
  updated_at: string;
}

interface InstagramPost {
  id: string;
  post_url: string;
  post_id?: string;
  poster_username?: string;
  post_content?: string;
  post_timestamp?: string;
  hashtags?: string[];
  location_tag?: string;
  like_count?: number;
  comment_count?: number;
  mention_count?: number;
  notes?: string;
  created_at: string;
}

interface InstagramUser {
  id: string;
  username: string;
  display_name?: string;
  bio?: string;
  profile_image_url?: string;
  follower_count?: number;
  following_count?: number;
  is_business_account?: boolean;
  is_verified?: boolean;
  engagement_rate?: number;
  niche_categories?: string[];
  location?: string;
  notes?: string;
  created_at: string;
}

export function InstagramEngagementTab() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [engagementLogs, setEngagementLogs] = useState<EngagementLog[]>([]);
  const [instagramPosts, setInstagramPosts] = useState<InstagramPost[]>([]);
  const [instagramUsers, setInstagramUsers] = useState<InstagramUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [actionType, setActionType] = useState<string>('comment');
  const [targetPostUrl, setTargetPostUrl] = useState('');
  const [targetUser, setTargetUser] = useState('');
  const [commentText, setCommentText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog states
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  
  // Form states
  const [postForm, setPostForm] = useState({
    post_url: '',
    poster_username: '',
    post_content: '',
    hashtags: '',
    location_tag: '',
    like_count: '',
    comment_count: '',
    mention_count: '',
    notes: ''
  });

  const [userForm, setUserForm] = useState({
    username: '',
    display_name: '',
    bio: '',
    profile_image_url: '',
    follower_count: '',
    following_count: '',
    is_business_account: false,
    is_verified: false,
    engagement_rate: '',
    niche_categories: '',
    location: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [logsData, postsData, usersData] = await Promise.all([
        supabase
          .from('engagement_activities')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('instagram_target_posts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('instagram_users')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100)
      ]);

      if (logsData.error && logsData.error.code !== 'PGRST116') {
        throw logsData.error;
      }
      if (postsData.error && postsData.error.code !== 'PGRST116') {
        throw postsData.error;
      }
      if (usersData.error && usersData.error.code !== 'PGRST116') {
        throw usersData.error;
      }

      setEngagementLogs(logsData.data || []);
      setInstagramPosts(postsData.data || []);
      setInstagramUsers(usersData.data || []);
      // For now, create some mock accounts for the UI
      setAccounts([
        { id: '1', username: 'main_account' },
        { id: '2', username: 'backup_account' }
      ]);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error loading data',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const logEngagementActivity = async () => {
    if (!selectedAccount || !actionType) {
      toast({
        title: 'Missing required fields',
        description: 'Please select an account and action type',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Insert directly into our engagement_activities table
      const { data, error } = await supabase
        .from('engagement_activities')
        .insert({
          user_id: selectedAccount,
          activity_type: actionType,
          target_post_id: targetPostUrl || null,
          target_user_id: targetUser || null,
          content: commentText || null,
          notes: `Manual entry via admin panel`
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Engagement activity logged successfully'
      });

      // Clear form
      setTargetPostUrl('');
      setTargetUser('');
      setCommentText('');

      // Reload logs
      loadData();
    } catch (error: any) {
      console.error('Error logging activity:', error);
      toast({
        title: 'Error logging activity',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const hashtags = postForm.hashtags
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean);

      const postData = {
        post_url: postForm.post_url,
        poster_username: postForm.poster_username || null,
        post_content: postForm.post_content || null,
        hashtags: hashtags.length > 0 ? hashtags : null,
        location_tag: postForm.location_tag || null,
        like_count: postForm.like_count ? parseInt(postForm.like_count) : null,
        comment_count: postForm.comment_count ? parseInt(postForm.comment_count) : null,
        mention_count: postForm.mention_count ? parseInt(postForm.mention_count) : null,
        notes: postForm.notes || null
      };

      const { error } = await supabase
        .from('instagram_target_posts')
        .insert([postData]);
      
      if (error) throw error;
      toast({ title: 'Post added successfully!' });
      
      resetPostForm();
      loadData();
    } catch (error: any) {
      console.error('Error saving post:', error);
      toast({ title: 'Error saving post', variant: 'destructive' });
    }
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const niches = userForm.niche_categories
        .split(',')
        .map(cat => cat.trim())
        .filter(Boolean);

      const userData = {
        username: userForm.username,
        display_name: userForm.display_name || null,
        bio: userForm.bio || null,
        profile_image_url: userForm.profile_image_url || null,
        follower_count: userForm.follower_count ? parseInt(userForm.follower_count) : null,
        following_count: userForm.following_count ? parseInt(userForm.following_count) : null,
        is_business_account: userForm.is_business_account,
        is_verified: userForm.is_verified,
        engagement_rate: userForm.engagement_rate ? parseFloat(userForm.engagement_rate) : null,
        niche_categories: niches.length > 0 ? niches : null,
        location: userForm.location || null,
        notes: userForm.notes || null
      };

      const { error } = await supabase
        .from('instagram_users')
        .insert([userData]);
      
      if (error) throw error;
      toast({ title: 'User profile added successfully!' });
      
      resetUserForm();
      loadData();
    } catch (error: any) {
      console.error('Error saving user:', error);
      toast({ title: 'Error saving user', variant: 'destructive' });
    }
  };

  const resetPostForm = () => {
    setPostForm({
      post_url: '',
      poster_username: '',
      post_content: '',
      hashtags: '',
      location_tag: '',
      like_count: '',
      comment_count: '',
      mention_count: '',
      notes: ''
    });
    setIsPostDialogOpen(false);
  };

  const resetUserForm = () => {
    setUserForm({
      username: '',
      display_name: '',
      bio: '',
      profile_image_url: '',
      follower_count: '',
      following_count: '',
      is_business_account: false,
      is_verified: false,
      engagement_rate: '',
      niche_categories: '',
      location: '',
      notes: ''
    });
    setIsUserDialogOpen(false);
  };

  const getStatusIcon = (status: string) => {
    // For now, all manually logged activities are considered completed
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getStatusBadge = (status: string) => {
    return <Badge variant="default">completed</Badge>;
  };

  const filteredPosts = instagramPosts.filter(post =>
    post.post_content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.poster_username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = instagramUsers.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="p-6">Loading engagement management...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Instagram Engagement</h2>
          <p className="text-muted-foreground">Manage posts, users, and engagement activities</p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Post
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Instagram Post</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitPost} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="post_url">Post URL *</Label>
                    <Input
                      id="post_url"
                      value={postForm.post_url}
                      onChange={(e) => setPostForm({ ...postForm, post_url: e.target.value })}
                      required
                      placeholder="https://instagram.com/p/..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="poster_username">Username</Label>
                    <Input
                      id="poster_username"
                      value={postForm.poster_username}
                      onChange={(e) => setPostForm({ ...postForm, poster_username: e.target.value })}
                      placeholder="@username"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="post_content">Post Content</Label>
                  <Textarea
                    id="post_content"
                    value={postForm.post_content}
                    onChange={(e) => setPostForm({ ...postForm, post_content: e.target.value })}
                    rows={3}
                    placeholder="Post caption/content..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hashtags">Hashtags (comma-separated)</Label>
                    <Input
                      id="hashtags"
                      value={postForm.hashtags}
                      onChange={(e) => setPostForm({ ...postForm, hashtags: e.target.value })}
                      placeholder="tech, startup, innovation"
                    />
                  </div>
                  <div>
                    <Label htmlFor="location_tag">Location Tag</Label>
                    <Input
                      id="location_tag"
                      value={postForm.location_tag}
                      onChange={(e) => setPostForm({ ...postForm, location_tag: e.target.value })}
                      placeholder="New York, NY"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="like_count">Likes</Label>
                    <Input
                      id="like_count"
                      type="number"
                      value={postForm.like_count}
                      onChange={(e) => setPostForm({ ...postForm, like_count: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="comment_count">Comments</Label>
                    <Input
                      id="comment_count"
                      type="number"
                      value={postForm.comment_count}
                      onChange={(e) => setPostForm({ ...postForm, comment_count: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="mention_count">Mentions</Label>
                    <Input
                      id="mention_count"
                      type="number"
                      value={postForm.mention_count}
                      onChange={(e) => setPostForm({ ...postForm, mention_count: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="post_notes">Notes</Label>
                  <Textarea
                    id="post_notes"
                    value={postForm.notes}
                    onChange={(e) => setPostForm({ ...postForm, notes: e.target.value })}
                    rows={2}
                    placeholder="Additional notes about this post..."
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={resetPostForm}>Cancel</Button>
                  <Button type="submit">Add Post</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <User className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Instagram User</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="username">Username *</Label>
                    <Input
                      id="username"
                      value={userForm.username}
                      onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                      required
                      placeholder="username"
                    />
                  </div>
                  <div>
                    <Label htmlFor="display_name">Display Name</Label>
                    <Input
                      id="display_name"
                      value={userForm.display_name}
                      onChange={(e) => setUserForm({ ...userForm, display_name: e.target.value })}
                      placeholder="Full Name"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={userForm.bio}
                    onChange={(e) => setUserForm({ ...userForm, bio: e.target.value })}
                    rows={2}
                    placeholder="User bio..."
                  />
                </div>

                <div>
                  <Label htmlFor="profile_image_url">Profile Image URL</Label>
                  <Input
                    id="profile_image_url"
                    value={userForm.profile_image_url}
                    onChange={(e) => setUserForm({ ...userForm, profile_image_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="follower_count">Followers</Label>
                    <Input
                      id="follower_count"
                      type="number"
                      value={userForm.follower_count}
                      onChange={(e) => setUserForm({ ...userForm, follower_count: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="following_count">Following</Label>
                    <Input
                      id="following_count"
                      type="number"
                      value={userForm.following_count}
                      onChange={(e) => setUserForm({ ...userForm, following_count: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="engagement_rate">Engagement Rate (%)</Label>
                    <Input
                      id="engagement_rate"
                      type="number"
                      step="0.01"
                      value={userForm.engagement_rate}
                      onChange={(e) => setUserForm({ ...userForm, engagement_rate: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={userForm.location}
                      onChange={(e) => setUserForm({ ...userForm, location: e.target.value })}
                      placeholder="City, Country"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="niche_categories">Niche Categories (comma-separated)</Label>
                  <Input
                    id="niche_categories"
                    value={userForm.niche_categories}
                    onChange={(e) => setUserForm({ ...userForm, niche_categories: e.target.value })}
                    placeholder="tech, lifestyle, business"
                  />
                </div>

                <div className="flex items-center space-x-6">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={userForm.is_business_account}
                      onChange={(e) => setUserForm({ ...userForm, is_business_account: e.target.checked })}
                    />
                    <span>Business Account</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={userForm.is_verified}
                      onChange={(e) => setUserForm({ ...userForm, is_verified: e.target.checked })}
                    />
                    <span>Verified Account</span>
                  </label>
                </div>

                <div>
                  <Label htmlFor="user_notes">Notes</Label>
                  <Textarea
                    id="user_notes"
                    value={userForm.notes}
                    onChange={(e) => setUserForm({ ...userForm, notes: e.target.value })}
                    rows={2}
                    placeholder="Additional notes about this user..."
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={resetUserForm}>Cancel</Button>
                  <Button type="submit">Add User</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search posts and users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>


      {/* Engagement Logging */}
      <Card>
        <CardHeader>
          <CardTitle>Log Engagement Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Account</label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      @{account.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Action Type</label>
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comment">Comment</SelectItem>
                  <SelectItem value="like">Like</SelectItem>
                  <SelectItem value="follow">Follow</SelectItem>
                  <SelectItem value="unfollow">Unfollow</SelectItem>
                  <SelectItem value="story_view">Story View</SelectItem>
                  <SelectItem value="dm">Direct Message</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Target Post URL (optional)</label>
              <Input
                placeholder="https://instagram.com/p/..."
                value={targetPostUrl}
                onChange={(e) => setTargetPostUrl(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Target User (optional)</label>
              <Input
                placeholder="@username"
                value={targetUser}
                onChange={(e) => setTargetUser(e.target.value)}
              />
            </div>
          </div>

          {(actionType === 'comment' || actionType === 'dm') && (
            <div>
              <label className="text-sm font-medium">Comment/Message Text</label>
              <Textarea
                placeholder="Enter your comment or message..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={3}
              />
            </div>
          )}

          <Button onClick={logEngagementActivity} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Log Engagement Activity
          </Button>
        </CardContent>
      </Card>

      {/* Posts & Users Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Posts */}
        <Card>
          <CardHeader>
            <CardTitle>Instagram Posts ({filteredPosts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredPosts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No posts found
                </p>
              ) : (
                filteredPosts.map((post) => (
                  <div key={post.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {post.poster_username && (
                          <div className="flex items-center gap-2 mb-2">
                            <User className="h-4 w-4" />
                            <span className="font-medium">@{post.poster_username}</span>
                          </div>
                        )}
                        {post.post_content && (
                          <p className="text-sm mb-2">{post.post_content}</p>
                        )}
                        {post.hashtags && post.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {post.hashtags.map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {post.like_count && <span>❤️ {post.like_count}</span>}
                          {post.comment_count && <span>💬 {post.comment_count}</span>}
                          {post.mention_count && <span>📢 {post.mention_count}</span>}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={post.post_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Users */}
        <Card>
          <CardHeader>
            <CardTitle>Instagram Users ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No users found
                </p>
              ) : (
                filteredUsers.map((user) => (
                  <div key={user.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-4 w-4" />
                          <span className="font-medium">@{user.username}</span>
                          {user.is_verified && <span className="text-blue-500">✓</span>}
                          {user.is_business_account && (
                            <Badge variant="outline" className="text-xs">Business</Badge>
                          )}
                        </div>
                        {user.display_name && (
                          <p className="text-sm text-muted-foreground mb-1">{user.display_name}</p>
                        )}
                        {user.bio && (
                          <p className="text-xs text-muted-foreground mb-2">{user.bio}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {user.follower_count && <span>👥 {user.follower_count.toLocaleString()}</span>}
                          {user.engagement_rate && <span>📊 {user.engagement_rate}%</span>}
                        </div>
                        {user.niche_categories && user.niche_categories.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {user.niche_categories.map((cat, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {cat}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Engagement History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Engagement Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {engagementLogs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No engagement activities logged yet
              </p>
            ) : (
              engagementLogs.map((log) => (
                <div key={log.id} className="flex items-start justify-between p-3 border rounded-lg">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      {getStatusIcon('completed')}
                      <span className="font-medium capitalize">{log.activity_type}</span>
                      {getStatusBadge('completed')}
                    </div>
                    
                    {log.target_post_id && (
                      <p className="text-sm text-muted-foreground">
                        Post: {log.target_post_id}
                      </p>
                    )}
                    
                    {log.target_user_id && (
                      <p className="text-sm text-muted-foreground">
                        User: {log.target_user_id}
                      </p>
                    )}
                    
                    {log.content && (
                      <p className="text-sm bg-muted p-2 rounded">
                        "{log.content}"
                      </p>
                    )}
                    
                    {log.notes && (
                      <p className="text-sm text-muted-foreground">
                        Notes: {log.notes}
                      </p>
                    )}
                    
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}