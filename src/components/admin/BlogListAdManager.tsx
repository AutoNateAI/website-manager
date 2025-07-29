import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Sparkles, Zap, Loader2, Eye, Settings } from 'lucide-react';

interface Blog {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string;
  published: boolean;
}

interface Advertisement {
  id: string;
  title: string;
  image_url?: string;
  position: string;
  is_active: boolean;
  target_value?: string;
}

interface BlogListAdManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const BlogListAdManager = ({ isOpen, onClose }: BlogListAdManagerProps) => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [selectedBlog, setSelectedBlog] = useState<Blog | null>(null);
  const [availableAds, setAvailableAds] = useState<Advertisement[]>([]);
  const [assignedAds, setAssignedAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingAds, setGeneratingAds] = useState(false);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const { toast } = useToast();

  const AD_LIMITS = {
    sidebar: { max: 2, dimensions: '300x250px' },
    banner: { max: 1, dimensions: '1200x90px' },
    featured: { max: 1, dimensions: '800x300px' },
    inline: { max: 5, dimensions: '800x200px' },
    bottom: { max: 1, dimensions: '1200x400px' }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedBlog) {
      fetchBlogAds();
    }
  }, [selectedBlog]);

  const fetchData = async () => {
    try {
      const [blogsResult, adsResult] = await Promise.all([
        supabase
          .from('blogs')
          .select('id, title, slug, content, category, published')
          .eq('published', true)
          .order('title'),
        supabase
          .from('advertisements')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
      ]);

      if (blogsResult.error) throw blogsResult.error;
      if (adsResult.error) throw adsResult.error;

      setBlogs(blogsResult.data || []);
      setAvailableAds(adsResult.data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch data: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBlogAds = async () => {
    if (!selectedBlog) return;

    try {
      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .eq('target_type', 'specific_post')
        .eq('target_value', selectedBlog.slug)
        .order('position');

      if (error) throw error;
      setAssignedAds(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch blog ads: " + error.message,
        variant: "destructive",
      });
    }
  };

  const assignAdToBlog = async (adId: string) => {
    if (!selectedBlog) return;

    try {
      const { error } = await supabase
        .from('advertisements')
        .update({ 
          target_type: 'specific_post',
          target_value: selectedBlog.slug 
        })
        .eq('id', adId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Advertisement assigned to blog successfully!",
      });

      fetchBlogAds();
      fetchData(); // Refresh available ads
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to assign advertisement: " + error.message,
        variant: "destructive",
      });
    }
  };

  const unassignAdFromBlog = async (adId: string) => {
    try {
      const { error } = await supabase
        .from('advertisements')
        .update({ 
          target_type: 'all',
          target_value: null 
        })
        .eq('id', adId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Advertisement unassigned from blog successfully!",
      });

      fetchBlogAds();
      fetchData(); // Refresh available ads
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to unassign advertisement: " + error.message,
        variant: "destructive",
      });
    }
  };

  const generateAdForPosition = async (position: string) => {
    if (!selectedBlog) return;

    setGeneratingAds(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-blog-ad', {
        body: {
          blogTitle: selectedBlog.title,
          blogContent: selectedBlog.content.slice(0, 500),
          blogCategory: selectedBlog.category,
          position,
          imageSize: getImageSizeForPosition(position)
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Create the ad with the generated content
      const adData = {
        title: data.title,
        image_url: data.imageUrl,
        link_url: '#',
        link_type: 'external',
        target_type: 'specific_post',
        target_value: selectedBlog.slug,
        position,
        is_active: true,
        alt_text: data.imagePrompt,
        ...getDimensionsForPosition(position)
      };

      const { error: insertError } = await supabase
        .from('advertisements')
        .insert([adData]);

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: "AI advertisement generated and assigned successfully!",
      });

      fetchBlogAds();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to generate ad: " + error.message,
        variant: "destructive",
      });
    } finally {
      setGeneratingAds(false);
    }
  };

  const bulkGenerateAdsForBlog = async () => {
    if (!selectedBlog) return;

    setBulkGenerating(true);
    
    // Start background task - don't await it
    const generateAdsBackground = async () => {
      try {
        const positions = Object.keys(AD_LIMITS).filter(pos => pos !== 'inline'); // Exclude inline from main bulk
        const adRequests = [];
        
        // Create requests only for missing ads
        for (const position of positions) {
          const currentCount = getAdCountForPosition(position);
          const maxCount = position === 'sidebar' ? 2 : 1;
          const missingCount = maxCount - currentCount;
          
          // Only generate ads if we're missing some for this position
          for (let i = 0; i < missingCount; i++) {
            adRequests.push({
              position,
              blogTitle: selectedBlog.title,
              blogContent: selectedBlog.content.slice(0, 500),
              blogCategory: selectedBlog.category,
              imageSize: getImageSizeForPosition(position)
            });
          }
        }

        const promises = adRequests.map(request => 
          supabase.functions.invoke('generate-blog-ad', {
            body: request
          })
        );

        const results = await Promise.allSettled(promises);
        const adsToInsert = [];

        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          if (result.status === 'fulfilled') {
            const { data, error } = result.value;
            if (!error && !data.error) {
              adsToInsert.push({
                title: data.title,
                image_url: data.imageUrl,
                link_url: '#',
                link_type: 'external',
                target_type: 'specific_post',
                target_value: selectedBlog.slug,
                position: adRequests[i].position,
                is_active: true,
                alt_text: data.imagePrompt,
                ...getDimensionsForPosition(adRequests[i].position)
              });
            }
          }
        }

        if (adsToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from('advertisements')
            .insert(adsToInsert);

          if (!insertError) {
            toast({
              title: "Success",
              description: `Generated ${adsToInsert.length} advertisements for all positions!`,
            });
            fetchBlogAds();
          }
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to bulk generate ads: " + error.message,
          variant: "destructive",
        });
      }
    };

    // Start background generation
    generateAdsBackground();
    
    // Immediate feedback to user
    toast({
      title: "Started",
      description: "Bulk ad generation started in background. You'll be notified when complete.",
    });
    
    setBulkGenerating(false);
  };

  const bulkGenerateInlineAds = async () => {
    if (!selectedBlog) return;

    setGeneratingAds(true);
    
    // Start background task for inline ads
    const generateInlineAdsBackground = async () => {
      try {
        const currentCount = getAdCountForPosition('inline');
        const missingCount = AD_LIMITS.inline.max - currentCount;
        
        if (missingCount <= 0) return;

        const adRequests = [];
        for (let i = 0; i < missingCount; i++) {
          adRequests.push({
            position: 'inline',
            blogTitle: selectedBlog.title,
            blogContent: selectedBlog.content.slice(0, 500),
            blogCategory: selectedBlog.category,
            imageSize: getImageSizeForPosition('inline')
          });
        }

        const promises = adRequests.map(request => 
          supabase.functions.invoke('generate-blog-ad', {
            body: request
          })
        );

        const results = await Promise.allSettled(promises);
        const adsToInsert = [];

        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          if (result.status === 'fulfilled') {
            const { data, error } = result.value;
            if (!error && !data.error) {
              adsToInsert.push({
                title: data.title,
                image_url: data.imageUrl,
                link_url: '#',
                link_type: 'external',
                target_type: 'specific_post',
                target_value: selectedBlog.slug,
                position: 'inline',
                is_active: true,
                alt_text: data.imagePrompt,
                ...getDimensionsForPosition('inline')
              });
            }
          }
        }

        if (adsToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from('advertisements')
            .insert(adsToInsert);

          if (!insertError) {
            toast({
              title: "Success",
              description: `Generated ${adsToInsert.length} inline advertisements!`,
            });
            fetchBlogAds();
          }
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to bulk generate inline ads: " + error.message,
          variant: "destructive",
        });
      }
    };

    // Start background generation
    generateInlineAdsBackground();
    
    // Immediate feedback to user
    toast({
      title: "Started",
      description: "Bulk inline ad generation started in background.",
    });
    
    setGeneratingAds(false);
  };

  const getImageSizeForPosition = (position: string) => {
    switch (position) {
      case 'banner': return '1536x1024';
      case 'featured': return '1024x1024';
      case 'sidebar': return '1024x1024';
      case 'inline': return '1024x1024';
      case 'bottom': return '1536x1024';
      default: return '1024x1024';
    }
  };

  const getDimensionsForPosition = (position: string) => {
    switch (position) {
      case 'banner': return { width: 1200, height: 90 };
      case 'featured': return { width: 800, height: 300 };
      case 'sidebar': return { width: 300, height: 250 };
      case 'inline': return { width: 800, height: 200 };
      case 'bottom': return { width: 1200, height: 400 };
      default: return { width: 300, height: 250 };
    }
  };

  const getAdCountForPosition = (position: string) => {
    return assignedAds.filter(ad => ad.position === position).length;
  };

  const canAddMoreAds = (position: string) => {
    return getAdCountForPosition(position) < AD_LIMITS[position as keyof typeof AD_LIMITS].max;
  };

  const hasAnyMissingAds = () => {
    return Object.keys(AD_LIMITS).some(position => {
      const currentCount = getAdCountForPosition(position);
      const maxCount = AD_LIMITS[position as keyof typeof AD_LIMITS].max;
      return currentCount < maxCount;
    });
  };

  const hasNonInlineMissingAds = () => {
    return Object.keys(AD_LIMITS).filter(pos => pos !== 'inline').some(position => {
      const currentCount = getAdCountForPosition(position);
      const maxCount = position === 'sidebar' ? 2 : 1;
      return currentCount < maxCount;
    });
  };

  const hasInlineMissingAds = () => {
    const currentCount = getAdCountForPosition('inline');
    return currentCount < AD_LIMITS.inline.max;
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="glass-card max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Blog List Advertisement Manager
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Blog Selection */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Select Blog</CardTitle>
              <CardDescription>
                Choose a published blog to manage its advertisements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedBlog?.id || ''}
                onValueChange={(value) => {
                  const blog = blogs.find(b => b.id === value);
                  setSelectedBlog(blog || null);
                }}
              >
                <SelectTrigger className="glass bg-transparent">
                  <SelectValue placeholder="Choose a blog to manage ads for..." />
                </SelectTrigger>
                <SelectContent>
                  {blogs.map(blog => (
                    <SelectItem key={blog.id} value={blog.id}>
                      {blog.title} ({blog.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Blog Ad Management */}
          {selectedBlog && (
            <div className="space-y-6">
              {/* Blog Info & Bulk Actions */}
              <Card className="glass-card">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">{selectedBlog.title}</h3>
                      <p className="text-muted-foreground text-sm">Category: {selectedBlog.category}</p>
                      <p className="text-muted-foreground text-sm">Total assigned ads: {assignedAds.length}</p>
                     </div>
                     <div className="flex gap-2">
                       {hasNonInlineMissingAds() && (
                         <Button 
                           onClick={bulkGenerateAdsForBlog}
                           disabled={bulkGenerating}
                           className="glass-button glow-primary"
                           size="sm"
                         >
                           {bulkGenerating ? (
                             <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                           ) : (
                             <Zap className="h-4 w-4 mr-2" />
                           )}
                           Generate All Positions
                         </Button>
                       )}
                       {hasInlineMissingAds() && (
                         <Button 
                           onClick={bulkGenerateInlineAds}
                           disabled={generatingAds}
                           className="glass-button glow-secondary"
                           size="sm"
                         >
                           {generatingAds ? (
                             <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                           ) : (
                             <Sparkles className="h-4 w-4 mr-2" />
                           )}
                           Generate All Inline
                         </Button>
                       )}
                     </div>
                  </div>
                </CardContent>
              </Card>

              {/* Ad Positions Management */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Object.entries(AD_LIMITS).map(([position, config]) => {
                  const currentCount = getAdCountForPosition(position);
                  const canAdd = canAddMoreAds(position);
                  const positionAds = assignedAds.filter(ad => ad.position === position);

                  return (
                    <Card key={position} className="glass-card">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base capitalize">{position} Ads</CardTitle>
                            <CardDescription>
                              {config.dimensions} • {currentCount}/{config.max} ads
                            </CardDescription>
                          </div>
                          {canAdd && (
                            <Button
                              onClick={() => generateAdForPosition(position)}
                              disabled={generatingAds}
                              size="sm"
                              variant="outline"
                              className="glass-button"
                            >
                              {generatingAds ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <Sparkles className="h-4 w-4 mr-1" />
                              )}
                              Generate AI Ad
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      {positionAds.length > 0 && (
                        <CardContent>
                          <div className="space-y-3">
                            {positionAds.map(ad => (
                              <div key={ad.id} className="flex items-center gap-3 p-3 border rounded-lg">
                                {ad.image_url && (
                                  <img 
                                    src={ad.image_url} 
                                    alt={ad.title}
                                    className="w-12 h-12 object-cover rounded"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium truncate text-sm">{ad.title}</h4>
                                  <Badge variant="default" className="text-xs">
                                    Assigned
                                  </Badge>
                                </div>
                                <Button
                                  onClick={() => unassignAdFromBlog(ad.id)}
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs"
                                >
                                  Unassign
                                </Button>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>

              {/* Available Ads for Assignment */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg">Available Advertisements</CardTitle>
                  <CardDescription>
                    Click to assign available ads to this blog
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {availableAds.filter(ad => ad.target_value !== selectedBlog.slug).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No available advertisements to assign
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {availableAds
                        .filter(ad => ad.target_value !== selectedBlog.slug)
                        .map(ad => (
                        <Card key={ad.id} className="glass-card hover:glow-soft transition-all cursor-pointer">
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              {ad.image_url && (
                                <img 
                                  src={ad.image_url} 
                                  alt={ad.title}
                                  className="w-full h-24 object-cover rounded"
                                />
                              )}
                              <div>
                                <h4 className="font-medium truncate text-sm">{ad.title}</h4>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {ad.position}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    Available
                                  </Badge>
                                </div>
                              </div>
                              <Button
                                onClick={() => assignAdToBlog(ad.id)}
                                size="sm"
                                className="w-full glass-button"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Assign to Blog
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BlogListAdManager;