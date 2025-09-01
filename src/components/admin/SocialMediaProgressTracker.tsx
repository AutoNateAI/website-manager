import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, AlertCircle, ImageIcon, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SocialMediaPost {
  id: string;
  title: string;
  status?: string;
  generation_progress?: any;
  created_at: string;
}

interface SocialMediaProgressTrackerProps {
  posts: SocialMediaPost[];
  onUpdate: () => void;
}

export const SocialMediaProgressTracker: React.FC<SocialMediaProgressTrackerProps> = ({ 
  posts, 
  onUpdate 
}) => {
  const [realtimePosts, setRealtimePosts] = useState<SocialMediaPost[]>(posts);
  const { toast } = useToast();

  useEffect(() => {
    setRealtimePosts(posts);
  }, [posts]);

  useEffect(() => {
    console.log('Setting up real-time subscription for social media progress updates');
    
    // Subscribe to real-time updates for social media posts
    const channel = supabase
      .channel('social-media-progress-tracker')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'social_media_posts'
        },
        (payload) => {
          console.log('✅ Real-time UPDATE received for social media post:', payload.new.id, payload.new.status);
          const updatedPost = payload.new as SocialMediaPost;
          setRealtimePosts(prev => {
            const updated = prev.map(post => 
              post.id === updatedPost.id ? updatedPost : post
            );
            console.log('Updated realtime posts array with new data');
            return updated;
          });
          onUpdate();
        }
      )
      .subscribe((status) => {
        console.log('📡 Social media progress subscription status:', status);
      });

    return () => {
      console.log('🧹 Cleaning up social media progress subscription');
      supabase.removeChannel(channel);
    };
  }, [onUpdate]);

  // Handle error toast notifications
  useEffect(() => {
    const failedPosts = realtimePosts.filter(post => 
      post.status === 'failed' && post.generation_progress?.error
    );
    
    failedPosts.forEach(post => {
      const error = post.generation_progress.error;
      let errorTitle = 'Post Generation Failed';
      let errorMessage = error;
      
      if (error.includes('PROMPT_TEMPLATE_NOT_FOUND')) {
        errorTitle = 'Missing Prompt Template';
        errorMessage = `Database connection issue: ${error.split(':')[1]?.trim() || error}`;
      } else if (error.includes('INCOMPLETE_IMAGE_PROMPTS')) {
        errorTitle = 'Template Configuration Error';
        errorMessage = `Template problem: ${error.split(':')[1]?.trim() || error}`;
      }
      
      toast({ 
        title: errorTitle, 
        description: errorMessage,
        variant: 'destructive',
        duration: 12000 
      });
    });
  }, [realtimePosts, toast]);

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'cancelled':
        return <X className="h-4 w-4 text-muted-foreground" />;
      case 'generating_images':
        return <ImageIcon className="h-4 w-4 text-primary animate-pulse" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground animate-pulse" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success/10 text-success border-success/20';
      case 'failed':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'cancelled':
        return 'bg-muted text-muted-foreground border-border';
      case 'generating_images':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'generating_caption':
        return 'bg-secondary/10 text-secondary-foreground border-secondary/20';
      default:
        return 'bg-muted/50 text-muted-foreground border-border';
    }
  };

  const getProgressPercentage = (post: SocialMediaPost) => {
    const progress = post.generation_progress || {};
    
    switch (post.status) {
      case 'completed':
        return 100;
      case 'generating_caption':
        return 25;
      case 'generating_images':
        const imagesCompleted = progress.images_completed || 0;
        const imagesTotal = progress.images_total || 9;
        return 25 + (imagesCompleted / imagesTotal) * 75;
      case 'failed':
        return 0;
      default:
        return 10;
    }
  };

  const getProgressText = (post: SocialMediaPost) => {
    const progress = post.generation_progress || {};
    
    switch (post.status) {
      case 'completed':
        const completed = progress.images_completed || 0;
        const total = progress.images_total || 9;
        return completed === total ? 'Completed' : `Completed (${completed}/${total} images)`;
      case 'generating_caption':
        return 'Generating caption...';
      case 'generating_images':
        const completedImages = progress.images_completed || 0;
        const totalImages = progress.images_total || 9;
        const failedImages = progress.failed_images || [];
        return `Generating images (${completedImages}/${totalImages}${failedImages.length > 0 ? `, ${failedImages.length} failed` : ''})`;
      case 'failed':
        return `Failed: ${progress.error || 'Unknown error'}`;
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Pending...';
    }
  };

  const handleCancelGeneration = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('social_media_posts')
        .update({ 
          status: 'cancelled',
          generation_progress: {
            ...realtimePosts.find(p => p.id === postId)?.generation_progress,
            step: 'cancelled',
            cancelled_at: new Date().toISOString()
          }
        })
        .eq('id', postId);

      if (error) throw error;
      
      toast({ title: 'Generation cancelled' });
      onUpdate();
    } catch (error) {
      console.error('Error cancelling generation:', error);
      toast({ 
        title: 'Error cancelling generation', 
        variant: 'destructive' 
      });
    }
  };

  const activePosts = realtimePosts.filter(post => 
    ['pending', 'generating_caption', 'generating_images'].includes(post.status || '')
  );

  if (activePosts.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Generation Progress ({activePosts.length} active)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activePosts.map((post) => (
          <div key={post.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(post.status)}
                <span className="font-medium truncate max-w-xs">
                  {post.title}
                </span>
                <Badge variant="secondary" className={getStatusColor(post.status)}>
                  {(post.status || 'pending').replace('_', ' ')}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {Math.round(getProgressPercentage(post))}%
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCancelGeneration(post.id)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Show error details for failed posts */}
            {post.status === 'failed' && post.generation_progress?.error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-destructive">Database Connection Error</p>
                    <p className="text-xs text-destructive/80">
                      {post.generation_progress.error.includes('PROMPT_TEMPLATE_NOT_FOUND') 
                        ? `Missing template in database: ${post.generation_progress.error.split(':')[1]?.trim()}`
                        : post.generation_progress.error.includes('INCOMPLETE_IMAGE_PROMPTS')
                        ? `Template configuration error: ${post.generation_progress.error.split(':')[1]?.trim()}`
                        : post.generation_progress.error
                      }
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Check your prompt_templates table or database connection.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <Progress value={getProgressPercentage(post)} className="h-2" />
            <p className="text-sm text-muted-foreground">
              {getProgressText(post)}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};