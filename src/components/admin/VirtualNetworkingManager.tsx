import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, MessageSquare, ExternalLink, User, Clock, Reply, Heart, Share } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface SocialPost {
  id: string;
  platform: string;
  post_url: string;
  post_content?: string;
  post_author_name?: string;
  post_author_profile_url?: string;
  media_urls: any; // Changed from string[] to any to handle JSON type from DB
  post_timestamp?: string;
  my_engagement_type?: string;
  my_comment_text?: string;
  created_at: string;
}

interface SocialInteraction {
  id: string;
  post_id: string;
  parent_interaction_id?: string;
  person_id?: string;
  commenter_name: string;
  commenter_profile_url?: string;
  comment_text: string;
  interaction_type: string;
  interaction_timestamp: string;
  created_at: string;
  people?: {
    id: string;
    name: string;
  };
  children?: SocialInteraction[];
}

interface Person {
  id: string;
  name: string;
}

export default function VirtualNetworkingManager() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [interactions, setInteractions] = useState<SocialInteraction[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [selectedPost, setSelectedPost] = useState<SocialPost | null>(null);
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [isInteractionDialogOpen, setIsInteractionDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [postForm, setPostForm] = useState({
    platform: 'linkedin',
    post_url: '',
    post_content: '',
    post_author_name: '',
    post_author_profile_url: '',
    media_urls: '',
    post_timestamp: '',
    my_engagement_type: 'none',
    my_comment_text: ''
  });

  const [interactionForm, setInteractionForm] = useState({
    post_id: '',
    parent_interaction_id: '',
    person_id: 'no-person',
    commenter_name: '',
    commenter_profile_url: '',
    comment_text: '',
    interaction_type: 'my_comment',
    interaction_timestamp: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [postsResult, interactionsResult, peopleResult] = await Promise.all([
        supabase.from('social_posts').select('*').order('created_at', { ascending: false }),
        supabase.from('social_interactions').select(`
          *,
          people (id, name)
        `).order('interaction_timestamp', { ascending: true }),
        supabase.from('people').select('id, name').order('name')
      ]);

      if (postsResult.error) throw postsResult.error;
      if (interactionsResult.error) throw interactionsResult.error;
      if (peopleResult.error) throw peopleResult.error;

      setPosts(postsResult.data || []);
      setInteractions(buildInteractionTree(interactionsResult.data || []));
      setPeople(peopleResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Error loading data', variant: 'destructive' });
    }
  };

  const buildInteractionTree = (flatInteractions: any[]): SocialInteraction[] => {
    const interactionMap = new Map();
    const rootInteractions: SocialInteraction[] = [];

    // First pass: create map of all interactions
    flatInteractions.forEach(interaction => {
      interactionMap.set(interaction.id, { ...interaction, children: [] });
    });

    // Second pass: build tree structure
    flatInteractions.forEach(interaction => {
      const interactionWithChildren = interactionMap.get(interaction.id);
      if (interaction.parent_interaction_id) {
        const parent = interactionMap.get(interaction.parent_interaction_id);
        if (parent) {
          parent.children.push(interactionWithChildren);
        }
      } else {
        rootInteractions.push(interactionWithChildren);
      }
    });

    return rootInteractions;
  };

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const mediaUrls = postForm.media_urls
        .split(',')
        .map(url => url.trim())
        .filter(Boolean);

      const postData = {
        ...postForm,
        media_urls: mediaUrls,
        my_engagement_type: postForm.my_engagement_type === 'none' ? null : postForm.my_engagement_type,
        my_comment_text: postForm.my_comment_text || null,
        post_timestamp: postForm.post_timestamp || null
      };

      const { error } = await supabase
        .from('social_posts')
        .insert([postData]);
      
      if (error) throw error;
      toast({ title: 'Post added successfully!' });
      
      resetPostForm();
      fetchData();
    } catch (error) {
      console.error('Error saving post:', error);
      toast({ title: 'Error saving post', variant: 'destructive' });
    }
  };

  const handleSubmitInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('social_interactions')
        .insert([{
          ...interactionForm,
          parent_interaction_id: interactionForm.parent_interaction_id || null,
          person_id: interactionForm.person_id === 'no-person' ? null : interactionForm.person_id || null
        }]);
      
      if (error) throw error;
      toast({ title: 'Interaction added successfully!' });
      
      resetInteractionForm();
      fetchData();
    } catch (error) {
      console.error('Error adding interaction:', error);
      toast({ title: 'Error adding interaction', variant: 'destructive' });
    }
  };

  const resetPostForm = () => {
    setPostForm({
      platform: 'linkedin',
      post_url: '',
      post_content: '',
      post_author_name: '',
      post_author_profile_url: '',
      media_urls: '',
      post_timestamp: '',
      my_engagement_type: 'none',
      my_comment_text: ''
    });
    setIsPostDialogOpen(false);
  };

  const resetInteractionForm = () => {
    setInteractionForm({
      post_id: '',
      parent_interaction_id: '',
      person_id: 'no-person',
      commenter_name: '',
      commenter_profile_url: '',
      comment_text: '',
      interaction_type: 'my_comment',
      interaction_timestamp: ''
    });
    setIsInteractionDialogOpen(false);
  };

  const getPostInteractions = (postId: string) => {
    return interactions.filter(interaction => interaction.post_id === postId);
  };

  const renderInteractionThread = (interaction: SocialInteraction, depth = 0) => {
    const indentClass = depth > 0 ? `ml-${Math.min(depth * 4, 16)}` : '';
    
    return (
      <div key={interaction.id} className={`border rounded-lg p-3 space-y-2 ${indentClass}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span className="font-medium">{interaction.commenter_name}</span>
            <Badge variant={
              interaction.interaction_type === 'my_comment' ? 'default' : 
              interaction.interaction_type === 'reply_to_me' ? 'secondary' : 'outline'
            }>
              {interaction.interaction_type.replace('_', ' ')}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {format(new Date(interaction.interaction_timestamp), 'MMM dd, HH:mm')}
          </div>
        </div>
        
        <p className="text-sm">{interaction.comment_text}</p>
        
        {interaction.commenter_profile_url && (
          <Button variant="ghost" size="sm" asChild>
            <a href={interaction.commenter_profile_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3 h-3 mr-1" />
              Profile
            </a>
          </Button>
        )}
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => {
            setInteractionForm({
              ...interactionForm,
              post_id: interaction.post_id,
              parent_interaction_id: interaction.id
            });
            setIsInteractionDialogOpen(true);
          }}
        >
          <Reply className="w-3 h-3 mr-1" />
          Reply
        </Button>
        
        {interaction.children && interaction.children.length > 0 && (
          <div className="mt-3 space-y-2">
            {interaction.children.map(child => renderInteractionThread(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const filteredPosts = posts.filter(post =>
    post.post_content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.post_author_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Virtual Networking</h1>
          <p className="text-muted-foreground">Manage LinkedIn and Instagram interactions</p>
        </div>
        <div className="space-x-2">
          <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Post
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Social Media Post</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitPost} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="platform">Platform</Label>
                    <Select value={postForm.platform} onValueChange={(value) => setPostForm({ ...postForm, platform: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="post_url">Post URL</Label>
                    <Input
                      id="post_url"
                      value={postForm.post_url}
                      onChange={(e) => setPostForm({ ...postForm, post_url: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="post_author_name">Author Name</Label>
                    <Input
                      id="post_author_name"
                      value={postForm.post_author_name}
                      onChange={(e) => setPostForm({ ...postForm, post_author_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="post_author_profile_url">Author Profile URL</Label>
                    <Input
                      id="post_author_profile_url"
                      value={postForm.post_author_profile_url}
                      onChange={(e) => setPostForm({ ...postForm, post_author_profile_url: e.target.value })}
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
                  />
                </div>

                <div>
                  <Label htmlFor="media_urls">Media URLs (comma-separated)</Label>
                  <Input
                    id="media_urls"
                    value={postForm.media_urls}
                    onChange={(e) => setPostForm({ ...postForm, media_urls: e.target.value })}
                    placeholder="https://example.com/image1.jpg, https://example.com/video1.mp4"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="post_timestamp">Post Timestamp</Label>
                    <Input
                      id="post_timestamp"
                      type="datetime-local"
                      value={postForm.post_timestamp}
                      onChange={(e) => setPostForm({ ...postForm, post_timestamp: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="my_engagement_type">My Engagement</Label>
                    <Select value={postForm.my_engagement_type} onValueChange={(value) => setPostForm({ ...postForm, my_engagement_type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="commented">Commented</SelectItem>
                        <SelectItem value="liked">Liked</SelectItem>
                        <SelectItem value="shared">Shared</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {postForm.my_engagement_type === 'commented' && (
                  <div>
                    <Label htmlFor="my_comment_text">My Comment</Label>
                    <Textarea
                      id="my_comment_text"
                      value={postForm.my_comment_text}
                      onChange={(e) => setPostForm({ ...postForm, my_comment_text: e.target.value })}
                      rows={2}
                    />
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={resetPostForm}>Cancel</Button>
                  <Button type="submit">Add Post</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isInteractionDialogOpen} onOpenChange={setIsInteractionDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <MessageSquare className="w-4 h-4 mr-2" />
                Add Interaction
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Interaction</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitInteraction} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="post_id">Post</Label>
                    <Select value={interactionForm.post_id} onValueChange={(value) => setInteractionForm({ ...interactionForm, post_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select post" />
                      </SelectTrigger>
                      <SelectContent>
                        {posts.map((post) => (
                          <SelectItem key={post.id} value={post.id}>
                            {post.post_author_name} - {post.post_content?.substring(0, 50)}...
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="interaction_type">Interaction Type</Label>
                    <Select value={interactionForm.interaction_type} onValueChange={(value) => setInteractionForm({ ...interactionForm, interaction_type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="my_comment">My Comment</SelectItem>
                        <SelectItem value="reply_to_me">Reply to Me</SelectItem>
                        <SelectItem value="reply_to_others">Reply to Others</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="commenter_name">Commenter Name</Label>
                    <Input
                      id="commenter_name"
                      value={interactionForm.commenter_name}
                      onChange={(e) => setInteractionForm({ ...interactionForm, commenter_name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="person_id">Link to Person (Optional)</Label>
                    <Select value={interactionForm.person_id} onValueChange={(value) => setInteractionForm({ ...interactionForm, person_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select person" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no-person">No person</SelectItem>
                        {people.map((person) => (
                          <SelectItem key={person.id} value={person.id}>
                            {person.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="commenter_profile_url">Commenter Profile URL</Label>
                  <Input
                    id="commenter_profile_url"
                    value={interactionForm.commenter_profile_url}
                    onChange={(e) => setInteractionForm({ ...interactionForm, commenter_profile_url: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="comment_text">Comment Text</Label>
                  <Textarea
                    id="comment_text"
                    value={interactionForm.comment_text}
                    onChange={(e) => setInteractionForm({ ...interactionForm, comment_text: e.target.value })}
                    required
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="interaction_timestamp">Interaction Timestamp</Label>
                  <Input
                    id="interaction_timestamp"
                    type="datetime-local"
                    value={interactionForm.interaction_timestamp}
                    onChange={(e) => setInteractionForm({ ...interactionForm, interaction_timestamp: e.target.value })}
                    required
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={resetInteractionForm}>Cancel</Button>
                  <Button type="submit">Add Interaction</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div>
        <Input
          placeholder="Search posts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      <Tabs defaultValue="posts" className="w-full">
        <TabsList>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="interactions">All Interactions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="posts" className="space-y-4">
          {filteredPosts.map((post) => {
            const postInteractions = getPostInteractions(post.id);
            
            return (
              <Card key={post.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <CardTitle className="flex items-center gap-2">
                        <Badge>{post.platform}</Badge>
                        {post.post_author_name}
                        {post.my_engagement_type && (
                          <Badge variant="secondary">
                            {post.my_engagement_type === 'commented' && <MessageSquare className="w-3 h-3 mr-1" />}
                            {post.my_engagement_type === 'liked' && <Heart className="w-3 h-3 mr-1" />}
                            {post.my_engagement_type === 'shared' && <Share className="w-3 h-3 mr-1" />}
                            {post.my_engagement_type}
                          </Badge>
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {post.post_timestamp && (
                          <span>{format(new Date(post.post_timestamp), 'MMM dd, yyyy HH:mm')}</span>
                        )}
                        <span>{postInteractions.length} interactions</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={post.post_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {post.post_content && (
                    <p className="text-sm">{post.post_content}</p>
                  )}
                  
                  {post.my_comment_text && (
                    <div className="bg-muted p-3 rounded-lg">
                      <span className="text-xs font-medium text-muted-foreground">My Comment:</span>
                      <p className="text-sm mt-1">{post.my_comment_text}</p>
                    </div>
                  )}
                  
                  {postInteractions.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">Interaction Threads</h4>
                      <div className="space-y-3">
                        {postInteractions.map(interaction => renderInteractionThread(interaction))}
                      </div>
                    </div>
                  )}
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setInteractionForm({
                        ...interactionForm,
                        post_id: post.id
                      });
                      setIsInteractionDialogOpen(true);
                    }}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Interaction
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
        
        <TabsContent value="interactions" className="space-y-4">
          <div className="space-y-3">
            {interactions.map(interaction => renderInteractionThread(interaction))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}