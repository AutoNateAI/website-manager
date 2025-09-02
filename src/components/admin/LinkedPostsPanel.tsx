import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, ExternalLink, Heart, MessageSquare, Unlink, Search, Target } from 'lucide-react';

interface LinkedPost {
  id: string;
  post_url: string;
  poster_username?: string;
  post_content?: string;
  like_count: number;
  comment_count: number;
  overall_attention_score?: number;
  created_at: string;
  post_search_queries?: Array<{
    relevance_score?: number;
    discovery_date?: string;
  }>;
}

interface AvailablePost {
  id: string;
  post_url: string;
  poster_username?: string;
  post_content?: string;
  like_count: number;
  comment_count: number;
  overall_attention_score?: number;
}

interface LinkedPostsPanelProps {
  queryId?: string;
}

export const LinkedPostsPanel: React.FC<LinkedPostsPanelProps> = ({ queryId }) => {
  const [linkedPosts, setLinkedPosts] = useState<LinkedPost[]>([]);
  const [availablePosts, setAvailablePosts] = useState<AvailablePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (queryId) {
      fetchLinkedPosts();
      fetchAvailablePosts();
    }
  }, [queryId]);

  const fetchLinkedPosts = async () => {
    if (!queryId) return;
    
    try {
      const { data, error } = await supabase
        .from('instagram_target_posts')
        .select(`
          *,
          post_search_queries!inner(relevance_score, discovery_date)
        `)
        .eq('post_search_queries.search_query_id', queryId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLinkedPosts(data || []);
    } catch (error) {
      console.error('Error fetching linked posts:', error);
      toast({ title: 'Error fetching linked posts', variant: 'destructive' });
    }
  };

  const fetchAvailablePosts = async () => {
    if (!queryId) return;
    
    try {
      // Get posts that are NOT already linked to this query
      const { data, error } = await supabase
        .from('instagram_target_posts')
        .select(`
          *,
          post_search_queries(search_query_id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter out posts already linked to this query
      const unlinkedPosts = (data || []).filter(post => 
        !post.post_search_queries.some((pq: any) => pq.search_query_id === queryId)
      );
      
      setAvailablePosts(unlinkedPosts);
    } catch (error) {
      console.error('Error fetching available posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const linkPostToQuery = async (postId: string) => {
    if (!queryId) return;
    
    try {
      const { error } = await supabase
        .from('post_search_queries')
        .insert({
          post_id: postId,
          search_query_id: queryId,
          relevance_score: 1.0,
          discovery_date: new Date().toISOString()
        });

      if (error) throw error;
      
      toast({ title: 'Post linked to search query successfully!' });
      fetchLinkedPosts();
      fetchAvailablePosts();
    } catch (error) {
      console.error('Error linking post:', error);
      toast({ title: 'Error linking post', variant: 'destructive' });
    }
  };

  const unlinkPostFromQuery = async (postId: string) => {
    if (!queryId) return;
    
    try {
      const { error } = await supabase
        .from('post_search_queries')
        .delete()
        .eq('post_id', postId)
        .eq('search_query_id', queryId);

      if (error) throw error;
      
      toast({ title: 'Post unlinked from search query successfully!' });
      fetchLinkedPosts();
      fetchAvailablePosts();
    } catch (error) {
      console.error('Error unlinking post:', error);
      toast({ title: 'Error unlinking post', variant: 'destructive' });
    }
  };

  const filteredAvailablePosts = availablePosts.filter(post =>
    !searchTerm || 
    post.poster_username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.post_content?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (!queryId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Select a search query to view linked posts</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Linked Posts ({linkedPosts.length})</h3>
          <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus size={14} className="mr-1" />
                Link Post
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Link Posts to Search Query</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input
                    placeholder="Search available posts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {filteredAvailablePosts.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No available posts to link</p>
                      </div>
                    ) : (
                      filteredAvailablePosts.map((post) => (
                        <Card key={post.id} className="p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium text-sm">
                                  {post.poster_username ? `@${post.poster_username}` : 'Unknown User'}
                                </span>
                                {post.overall_attention_score && (
                                  <Badge variant="outline" className="text-xs">
                                    {post.overall_attention_score.toFixed(1)}
                                  </Badge>
                                )}
                              </div>
                              {post.post_content && (
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
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
                            </div>
                            <Button
                              size="sm"
                              onClick={() => linkPostToQuery(post.id)}
                            >
                              Link
                            </Button>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : linkedPosts.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="font-medium mb-2">No Linked Posts</h4>
              <p className="text-muted-foreground text-sm mb-4">
                Link Instagram posts to this search query to track their performance and relevance.
              </p>
              <Button onClick={() => setShowLinkDialog(true)}>
                <Plus size={16} className="mr-2" />
                Link Your First Post
              </Button>
            </div>
          ) : (
            linkedPosts.map((post) => (
              <Card key={post.id} className="hover:bg-muted/5 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-sm">
                        {post.poster_username ? `@${post.poster_username}` : 'Unknown User'}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        Linked {post.post_search_queries?.[0]?.discovery_date && 
                          formatDate(post.post_search_queries[0].discovery_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {post.overall_attention_score && (
                        <Badge variant="outline" className="text-xs">
                          {post.overall_attention_score.toFixed(1)}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(post.post_url, '_blank')}
                      >
                        <ExternalLink size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => unlinkPostFromQuery(post.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Unlink size={14} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {post.post_content && (
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
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
                    {post.post_search_queries?.[0]?.relevance_score && (
                      <div className="flex items-center gap-1">
                        <span>Relevance: {Math.round(post.post_search_queries[0].relevance_score * 100)}%</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};