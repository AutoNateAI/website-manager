import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, ImageIcon } from 'lucide-react';

interface PostProgress {
  id: string;
  title: string;
  status: string;
  generation_progress: any;
  created_at: string;
}

interface SocialMediaProgressTrackerProps {
  posts: PostProgress[];
  onUpdate: () => void;
}

export const SocialMediaProgressTracker: React.FC<SocialMediaProgressTrackerProps> = ({ 
  posts, 
  onUpdate 
}) => {
  const [realtimePosts, setRealtimePosts] = useState<PostProgress[]>(posts);

  useEffect(() => {
    setRealtimePosts(posts);
  }, [posts]);

  useEffect(() => {
    // Subscribe to real-time updates for social media posts
    const channel = supabase
      .channel('social-media-progress')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'social_media_posts'
        },
        (payload) => {
          const updatedPost = payload.new as PostProgress;
          setRealtimePosts(prev => 
            prev.map(post => 
              post.id === updatedPost.id ? updatedPost : post
            )
          );
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onUpdate]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'generating_images':
        return <ImageIcon className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'generating_images':
        return 'bg-blue-100 text-blue-800';
      case 'generating_caption':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressPercentage = (post: PostProgress) => {
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

  const getProgressText = (post: PostProgress) => {
    const progress = post.generation_progress || {};
    
    switch (post.status) {
      case 'completed':
        return 'Completed';
      case 'generating_caption':
        return 'Generating caption...';
      case 'generating_images':
        const completed = progress.images_completed || 0;
        const total = progress.images_total || 9;
        return `Generating images (${completed}/${total})`;
      case 'failed':
        return `Failed: ${progress.error || 'Unknown error'}`;
      default:
        return 'Pending...';
    }
  };

  const activePosts = realtimePosts.filter(post => 
    ['pending', 'generating_caption', 'generating_images'].includes(post.status)
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
                  {post.status.replace('_', ' ')}
                </Badge>
              </div>
              <span className="text-sm text-muted-foreground">
                {Math.round(getProgressPercentage(post))}%
              </span>
            </div>
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