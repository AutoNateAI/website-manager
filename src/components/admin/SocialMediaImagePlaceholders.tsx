import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface SocialMediaImage {
  id: string;
  post_id: string;
  carousel_index: number;
  image_index: number;
  image_url: string;
  image_prompt: string;
  alt_text: string;
  created_at: string;
}

interface ImagePlaceholdersProps {
  postId: string;
  totalImages?: number;
}

export const SocialMediaImagePlaceholders: React.FC<ImagePlaceholdersProps> = ({ 
  postId, 
  totalImages = 9 
}) => {
  const [images, setImages] = useState<SocialMediaImage[]>([]);
  const [loadingIndices, setLoadingIndices] = useState<Set<number>>(new Set());

  // Initialize loading state for all images
  useEffect(() => {
    setLoadingIndices(new Set(Array.from({length: totalImages}, (_, i) => i + 1)));
  }, [totalImages]);

  useEffect(() => {
    // Fetch existing images
    const fetchImages = async () => {
      const { data } = await supabase
        .from('social_media_images')
        .select('*')
        .eq('post_id', postId)
        .order('image_index');
      
      if (data) {
        setImages(data);
        // Remove completed images from loading state
        const completedIndices = new Set(data.map(img => img.image_index));
        setLoadingIndices(prev => {
          const newSet = new Set(prev);
          completedIndices.forEach(index => newSet.delete(index));
          return newSet;
        });
      }
    };

    fetchImages();

    // Create unique channel name to avoid conflicts
    const channelName = `social-images-${postId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log('Setting up real-time subscription for images:', channelName, 'postId:', postId);

    // Subscribe to real-time image updates
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'social_media_images',
          filter: `post_id=eq.${postId}`
        },
        (payload) => {
          console.log('Real-time image insert received:', payload.new);
          const newImage = payload.new as SocialMediaImage;
          setImages(prev => {
            // Avoid duplicates
            if (prev.some(img => img.id === newImage.id)) return prev;
            const updated = [...prev, newImage].sort((a, b) => a.image_index - b.image_index);
            console.log('Updated images array:', updated);
            return updated;
          });
          
          // Remove from loading state
          setLoadingIndices(prev => {
            const newSet = new Set(prev);
            newSet.delete(newImage.image_index);
            console.log('Updated loading indices:', Array.from(newSet));
            return newSet;
          });
        }
      )
      .subscribe((status) => {
        console.log('Social media images subscription status:', status, 'for post:', postId);
      });

    // Handle visibility change to re-establish connection if needed
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Tab became visible, checking image subscription status for post:', postId);
        // Re-subscribe if connection was lost
        if (channel.state !== 'joined') {
          console.log('Re-establishing image subscription for post:', postId);
          channel.subscribe();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      console.log('Cleaning up image subscription for post:', postId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, [postId]);

  const renderImageSlot = (index: number) => {
    const existingImage = images.find(img => img.image_index === index);
    const isLoading = loadingIndices.has(index);

    return (
      <div key={index} className="relative group">
        <AspectRatio ratio={1} className="bg-muted/50 rounded-lg overflow-hidden border">
          {existingImage ? (
            <div className="relative h-full animate-fade-in">
              <img
                src={existingImage.image_url}
                alt={existingImage.alt_text}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute top-2 left-2">
                <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                  {index}
                </Badge>
              </div>
            </div>
          ) : isLoading ? (
            <div className="h-full flex flex-col items-center justify-center space-y-2 animate-pulse">
              <Skeleton className="h-8 w-8 rounded-full animate-pulse" />
              <Skeleton className="h-4 w-16 animate-pulse" />
              <div className="absolute top-2 left-2">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 animate-pulse">
                  {index}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <div className="text-2xl">⏳</div>
              <div className="text-xs">Waiting...</div>
              <div className="absolute top-2 left-2">
                <Badge variant="secondary" className="bg-muted text-muted-foreground border-border">
                  {index}
                </Badge>
              </div>
            </div>
          )}
        </AspectRatio>
        
        {existingImage && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
            <p className="text-white text-xs text-center px-2 leading-tight">
              {existingImage.image_prompt.slice(0, 100)}...
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Carousel Images</h4>
        <Badge variant="secondary">
          {images.length}/{totalImages} Generated
        </Badge>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        {Array.from({length: totalImages}, (_, i) => renderImageSlot(i + 1))}
      </div>
      
      {loadingIndices.size > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          Generating {loadingIndices.size} remaining images...
        </div>
      )}
    </div>
  );
};