import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Instagram, User, MapPin, Hash } from 'lucide-react';

interface InstagramPostData {
  postUrl: string;
  username?: string;
  postContent?: string;
  locationTag?: string;
  hashtags?: string[];
  likeCount?: number;
  commentCount?: number;
}

interface EnhancedAddPostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostAdded: (post: any) => void;
}

export function EnhancedAddPostModal({ open, onOpenChange, onPostAdded }: EnhancedAddPostModalProps) {
  const [postData, setPostData] = useState<InstagramPostData>({
    postUrl: ''
  });
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  
  const { toast } = useToast();

  const extractPostInfo = async (url: string) => {
    if (!url.includes('instagram.com')) {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid Instagram post URL',
        variant: 'destructive'
      });
      return null;
    }

    try {
      setIsExtracting(true);
      
      // Extract basic info from URL
      const urlParts = url.match(/instagram\.com\/(?:p|reel)\/([^\/\?]+)/);
      const usernameMatch = url.match(/instagram\.com\/([^\/]+)/);
      
      if (!urlParts) {
        throw new Error('Could not extract post ID from URL');
      }

      const postId = urlParts[1];
      let username = '';
      
      if (usernameMatch) {
        username = usernameMatch[1];
        if (username === 'p' || username === 'reel') {
          username = '';
        }
      }

      // Here you would typically call Instagram's API or a web scraping service
      // For now, we'll simulate some extraction
      const mockData = {
        postId,
        username: username || 'extracted_user',
        postContent: '',
        locationTag: '',
        hashtags: [],
        likeCount: 0,
        commentCount: 0
      };

      setExtractedData(mockData);
      setPostData(prev => ({
        ...prev,
        ...mockData
      }));

      return mockData;
    } catch (error: any) {
      console.error('Error extracting post info:', error);
      toast({
        title: 'Extraction Failed',
        description: 'Could not extract post information. Please fill manually.',
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsExtracting(false);
    }
  };

  const findOrCreateUser = async (username: string) => {
    if (!username) return null;

    try {
      // First, try to find existing user
      const { data: existingUser, error: findError } = await supabase
        .from('instagram_users')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      if (findError && findError.code !== 'PGRST116') {
        throw findError;
      }

      if (existingUser) {
        console.log('Found existing user:', existingUser);
        return existingUser;
      }

      // Create new user if not found
      const { data: newUser, error: createError } = await supabase
        .from('instagram_users')
        .insert([{
          username: username,
          display_name: username,
          discovered_through: 'manual_post_addition',
          influence_score: 0,
          follows_me: false
        }])
        .select()
        .single();

      if (createError) throw createError;

      console.log('Created new user:', newUser);
      toast({
        title: 'User Created',
        description: `Created new Instagram user profile for @${username}`,
      });

      return newUser;
    } catch (error: any) {
      console.error('Error finding/creating user:', error);
      toast({
        title: 'User Error',
        description: `Could not find or create user @${username}: ${error.message}`,
        variant: 'destructive'
      });
      return null;
    }
  };

  const handleUrlExtraction = async (url: string) => {
    setPostData(prev => ({ ...prev, postUrl: url }));
    
    if (url && url.includes('instagram.com')) {
      await extractPostInfo(url);
    }
  };

  const handleSubmit = async () => {
    if (!postData.postUrl.trim()) {
      toast({
        title: 'URL Required',
        description: 'Please enter an Instagram post URL',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      let userId = null;
      
      // Find or create user if username is provided
      if (postData.username) {
        const user = await findOrCreateUser(postData.username);
        if (user) {
          userId = user.id;
        }
      }

      // Extract post ID from URL
      const urlParts = postData.postUrl.match(/instagram\.com\/(?:p|reel)\/([^\/\?]+)/);
      if (!urlParts) {
        throw new Error('Invalid Instagram URL format');
      }

      const postId = urlParts[1];

      // Create the target post
      const { data: newPost, error: postError } = await supabase
        .from('instagram_target_posts')
        .insert([{
          post_url: postData.postUrl,
          post_id: postId,
          poster_user_id: userId,
          poster_username: postData.username || null,
          post_content: postData.postContent || null,
          location_tag: postData.locationTag || null,
          hashtags: postData.hashtags && postData.hashtags.length > 0 ? postData.hashtags : null,
          like_count: postData.likeCount || 0,
          comment_count: postData.commentCount || 0,
          analysis_status: 'pending'
        }])
        .select(`
          *,
          instagram_users!poster_user_id(*),
          post_search_queries(search_queries(*))
        `)
        .single();

      if (postError) throw postError;

      onPostAdded(newPost);
      onOpenChange(false);
      
      // Reset form
      setPostData({ postUrl: '' });
      setExtractedData(null);
      
      toast({
        title: 'Success',
        description: 'Target post added successfully'
      });

    } catch (error: any) {
      console.error('Error adding post:', error);
      toast({
        title: 'Error adding post',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const parseHashtags = (text: string) => {
    const hashtags = text.match(/#[\w]+/g) || [];
    return hashtags.map(tag => tag.substring(1)); // Remove # symbol
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Instagram className="h-5 w-5 text-pink-500" />
            Add Instagram Target Post
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* URL Input with Auto-Extraction */}
          <div className="space-y-2">
            <Label htmlFor="postUrl">Instagram Post URL *</Label>
            <div className="relative">
              <Input
                id="postUrl"
                placeholder="https://www.instagram.com/p/ABC123..."
                value={postData.postUrl}
                onChange={(e) => handleUrlExtraction(e.target.value)}
                className="pr-10"
              />
              {isExtracting && (
                <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Enter the Instagram post URL and we'll try to extract information automatically
            </p>
          </div>

          {extractedData && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <User className="h-4 w-4" />
                Extracted Information
              </h4>
              <div className="text-xs space-y-1">
                <p><strong>Post ID:</strong> {extractedData.postId}</p>
                {extractedData.username && (
                  <p><strong>Username:</strong> @{extractedData.username}</p>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Manual Input Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  placeholder="username (without @)"
                  value={postData.username || ''}
                  onChange={(e) => setPostData(prev => ({ ...prev, username: e.target.value }))}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="locationTag">Location Tag</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="locationTag"
                  placeholder="New York, NY"
                  value={postData.locationTag || ''}
                  onChange={(e) => setPostData(prev => ({ ...prev, locationTag: e.target.value }))}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="postContent">Post Content</Label>
            <Textarea
              id="postContent"
              placeholder="Caption or post content..."
              value={postData.postContent || ''}
              onChange={(e) => {
                const content = e.target.value;
                setPostData(prev => ({ 
                  ...prev, 
                  postContent: content,
                  hashtags: parseHashtags(content)
                }));
              }}
              rows={3}
            />
          </div>

          {postData.hashtags && postData.hashtags.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Detected Hashtags
              </Label>
              <div className="flex flex-wrap gap-1">
                {postData.hashtags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="likeCount">Like Count</Label>
              <Input
                id="likeCount"
                type="number"
                placeholder="0"
                value={postData.likeCount || ''}
                onChange={(e) => setPostData(prev => ({ ...prev, likeCount: parseInt(e.target.value) || 0 }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="commentCount">Comment Count</Label>
              <Input
                id="commentCount"
                type="number"
                placeholder="0"
                value={postData.commentCount || ''}
                onChange={(e) => setPostData(prev => ({ ...prev, commentCount: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !postData.postUrl.trim()}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding Post...
                </>
              ) : (
                'Add Target Post'
              )}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}