import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Sparkles, Zap, Image as ImageIcon, Settings, Eye, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import AdDetailViewer from './AdDetailViewer';
import BlogListAdManager from './BlogListAdManager';
import BlogListAdEditor from './BlogListAdEditor';

interface Advertisement {
  id: string;
  title: string;
  image_url?: string;
  link_url?: string;
  link_type: string;
  product_id?: string;
  target_type: string;
  target_value?: string;
  position: string;
  is_active: boolean;
  width?: number;
  height?: number;
  alt_text?: string;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

interface Blog {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string;
}

// Ad position limits and dimensions
const AD_LIMITS = {
  sidebar: { max: 2, dimensions: '300x250px' },
  banner: { max: 1, dimensions: '1200x90px' },
  featured: { max: 1, dimensions: '800x300px' },
  inline: { max: 5, dimensions: '800x200px' },
  bottom: { max: 1, dimensions: '1200x400px' }
};

const ITEMS_PER_PAGE = 6;

const AdManager = () => {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [filteredAds, setFilteredAds] = useState<Advertisement[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [selectedBlog, setSelectedBlog] = useState<Blog | null>(null);
  const [blogAds, setBlogAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    image_url: '',
    link_url: '',
    link_type: 'external',
    product_id: '',
    target_type: 'specific_post',
    target_value: '',
    position: 'sidebar',
    width: '',
    height: '',
    alt_text: '',
    start_date: '',
    end_date: ''
  });
  const [generatingAd, setGeneratingAd] = useState(false);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [selectedAdForDetail, setSelectedAdForDetail] = useState<Advertisement | null>(null);
  const [showAdDetail, setShowAdDetail] = useState(false);
  const [showBlogListAdManager, setShowBlogListAdManager] = useState(false);
  const [showBlogListAdEditor, setShowBlogListAdEditor] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedBlog) {
      fetchBlogAds();
    }
  }, [selectedBlog]);

  useEffect(() => {
    filterAds();
  }, [ads, searchTerm]);

  useEffect(() => {
    setFilteredAds(ads);
  }, [ads]);

  const filterAds = () => {
    if (!searchTerm) {
      setFilteredAds(ads);
      return;
    }

    const filtered = ads.filter(ad =>
      ad.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ad.alt_text && ad.alt_text.toLowerCase().includes(searchTerm.toLowerCase())) ||
      ad.position.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setFilteredAds(filtered);
    setCurrentPage(1);
  };

  const getPaginatedAds = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredAds.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredAds.length / ITEMS_PER_PAGE);

  const fetchData = async () => {
    try {
      const [adsResult, blogsResult] = await Promise.all([
        supabase
          .from('advertisements')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('blogs')
          .select('id, title, slug, content, category')
          .order('title')
      ]);

      if (adsResult.error) throw adsResult.error;
      if (blogsResult.error) throw blogsResult.error;

      setAds(adsResult.data || []);
      setBlogs(blogsResult.data || []);
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
      setBlogAds(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch blog ads: " + error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      image_url: '',
      link_url: '',
      link_type: 'external',
      product_id: '',
      target_type: 'specific_post',
      target_value: selectedBlog?.slug || '',
      position: 'sidebar',
      width: '',
      height: '',
      alt_text: '',
      start_date: '',
      end_date: ''
    });
    setEditingAd(null);
    setShowForm(false);
  };

  const handleCreate = (position?: string) => {
    resetForm();
    if (position) {
      setFormData(prev => ({ ...prev, position }));
    }
    setShowForm(true);
  };

  const handleEdit = (ad: Advertisement) => {
    setFormData({
      title: ad.title,
      image_url: ad.image_url || '',
      link_url: ad.link_url || '',
      link_type: ad.link_type,
      product_id: ad.product_id || '',
      target_type: ad.target_type,
      target_value: ad.target_value || '',
      position: ad.position,
      width: ad.width?.toString() || '',
      height: ad.height?.toString() || '',
      alt_text: ad.alt_text || '',
      start_date: ad.start_date ? ad.start_date.split('T')[0] : '',
      end_date: ad.end_date ? ad.end_date.split('T')[0] : ''
    });
    setEditingAd(ad);
    setShowForm(true);
  };

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const saveAd = async () => {
    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Title is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const adData = {
        title: formData.title,
        image_url: formData.image_url || null,
        link_url: formData.link_type === 'external' ? formData.link_url : null,
        link_type: formData.link_type,
        product_id: formData.link_type === 'product' ? formData.product_id : null,
        target_type: formData.target_type,
        target_value: formData.target_value,
        position: formData.position,
        width: formData.width ? parseInt(formData.width) : null,
        height: formData.height ? parseInt(formData.height) : null,
        alt_text: formData.alt_text || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        is_active: true
      };

      if (editingAd) {
        const { error } = await supabase
          .from('advertisements')
          .update(adData)
          .eq('id', editingAd.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('advertisements')
          .insert([adData]);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Advertisement ${editingAd ? 'updated' : 'created'} successfully!`,
      });

      resetForm();
      fetchData();
      if (selectedBlog) fetchBlogAds();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteAd = async (id: string) => {
    if (!confirm('Are you sure you want to delete this advertisement?')) return;

    try {
      const { error } = await supabase
        .from('advertisements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Advertisement deleted successfully",
      });

      fetchData();
      if (selectedBlog) fetchBlogAds();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('advertisements')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;

      fetchData();
      if (selectedBlog) fetchBlogAds();

      toast({
        title: "Success",
        description: `Advertisement ${!isActive ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAdClick = (ad: Advertisement) => {
    setSelectedAdForDetail(ad);
    setShowAdDetail(true);
  };

  const handleAdDetailClose = () => {
    setShowAdDetail(false);
    setSelectedAdForDetail(null);
  };

  const handleAdUpdated = () => {
    fetchData();
    if (selectedBlog) fetchBlogAds();
  };

  const generateAdWithAI = async (position: string) => {
    if (!selectedBlog) return;

    setGeneratingAd(true);
    try {
      // Use setTimeout to make this non-blocking
      setTimeout(async () => {
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
            link_url: '#', // Default link
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
            description: "AI advertisement generated successfully!",
          });

          fetchBlogAds();
        } catch (error: any) {
          toast({
            title: "Error",
            description: "Failed to generate ad: " + error.message,
            variant: "destructive",
          });
        } finally {
          setGeneratingAd(false);
        }
      }, 100);
    } catch (error: any) {
      setGeneratingAd(false);
    }
  };

  const bulkGenerateAds = async () => {
    if (!selectedBlog) return;

    setBulkGenerating(true);
    
    // Show immediate feedback
    toast({
      title: "Generating...",
      description: "Bulk generating ads for all positions. This will run in the background.",
    });

    // Use setTimeout to make this non-blocking
    setTimeout(async () => {
      try {
        const positions = Object.keys(AD_LIMITS);
        const promises = positions.map(position => 
          supabase.functions.invoke('generate-blog-ad', {
            body: {
              blogTitle: selectedBlog.title,
              blogContent: selectedBlog.content.slice(0, 500),
              blogCategory: selectedBlog.category,
              position,
              imageSize: getImageSizeForPosition(position)
            }
          })
        );

        const results = await Promise.all(promises);
        const adsToInsert = [];

        for (let i = 0; i < results.length; i++) {
          const { data, error } = results[i];
          if (!error && !data.error) {
            adsToInsert.push({
              title: data.title,
              image_url: data.imageUrl,
              link_url: '#',
              link_type: 'external',
              target_type: 'specific_post',
              target_value: selectedBlog.slug,
              position: positions[i],
              is_active: true,
              alt_text: data.imagePrompt,
              ...getDimensionsForPosition(positions[i])
            });
          }
        }

        if (adsToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from('advertisements')
            .insert(adsToInsert);

          if (insertError) throw insertError;

          toast({
            title: "Success",
            description: `Generated ${adsToInsert.length} advertisements for all positions!`,
          });

          fetchBlogAds();
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to bulk generate ads: " + error.message,
          variant: "destructive",
        });
      } finally {
        setBulkGenerating(false);
      }
    }, 100);
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
    return blogAds.filter(ad => ad.position === position).length;
  };

  const canAddMoreAds = (position: string) => {
    return getAdCountForPosition(position) < AD_LIMITS[position as keyof typeof AD_LIMITS].max;
  };

  if (loading) {
    return (
      <div className="glass-card p-8">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold gradient-text">Blog Advertisement Manager</h2>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                Create and manage targeted advertisements for your blogs
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowBlogListAdEditor(true)}
                className="glass-button glow-secondary"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Banner & Sidebar
              </Button>
              <Button
                onClick={() => setShowBlogListAdManager(true)}
                className="glass-button glow-primary"
              >
                <Settings className="h-4 w-4 mr-2" />
                Manage Blog List Ads
              </Button>
            </div>
          </div>
      </div>

      {/* Blog Selection */}
      <div className="glass-card p-4 sm:p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Select Blog</h3>
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
                  {blog.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Blog-Specific Ad Management */}
      {selectedBlog && (
        <div className="space-y-6">
          {/* Blog Info */}
          <div className="glass-card p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">{selectedBlog.title}</h3>
                <p className="text-muted-foreground text-sm">Category: {selectedBlog.category}</p>
              </div>
              <div className="flex gap-2">
                {blogAds.length === 0 && (
                  <Button 
                    onClick={bulkGenerateAds}
                    disabled={bulkGenerating}
                    variant="default"
                    size="sm"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    {bulkGenerating ? 'Generating...' : 'Bulk Generate All Ads'}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Ad Positions Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Object.entries(AD_LIMITS).map(([position, config]) => {
              const currentCount = getAdCountForPosition(position);
              const canAdd = canAddMoreAds(position);
              const positionAds = blogAds.filter(ad => ad.position === position);

              return (
                <Card key={position} className="glass-card">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base capitalize">{position} Ads</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {config.dimensions} • {currentCount}/{config.max} ads
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {canAdd && (
                          <>
                            <Button
                              onClick={() => generateAdWithAI(position)}
                              disabled={generatingAd}
                              size="sm"
                              variant="outline"
                            >
                              <Sparkles className="h-4 w-4 mr-1" />
                              AI Generate
                            </Button>
                            <Button
                              onClick={() => handleCreate(position)}
                              size="sm"
                              variant="outline"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Manual
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  {positionAds.length > 0 && (
                    <CardContent>
                      <div className="space-y-3">
                        {positionAds.map(ad => (
                          <div 
                            key={ad.id} 
                            className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => handleAdClick(ad)}
                          >
                            {ad.image_url && (
                              <img 
                                src={ad.image_url} 
                                alt={ad.alt_text || ad.title}
                                className="w-16 h-12 object-cover rounded"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">{ad.title}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={ad.is_active ? "default" : "secondary"}>
                                  {ad.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                                {ad.width && ad.height && (
                                  <span className="text-xs text-muted-foreground">
                                    {ad.width}×{ad.height}
                                  </span>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  Click to view
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(ad);
                                }}
                                size="sm"
                                variant="ghost"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Switch
                                checked={ad.is_active}
                                onCheckedChange={(checked) => {
                                  toggleActive(ad.id, checked);
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteAd(ad.id);
                                }}
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Ad Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="glass-card max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAd ? 'Edit Advertisement' : 'Create New Advertisement'}</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={(e) => { e.preventDefault(); saveAd(); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  required
                  className="glass bg-transparent"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Position</label>
                <Select 
                  value={formData.position} 
                  onValueChange={(value) => handleInputChange('position', value)}
                >
                  <SelectTrigger className="glass bg-transparent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sidebar">Sidebar</SelectItem>
                    <SelectItem value="banner">Banner</SelectItem>
                    <SelectItem value="featured">Featured</SelectItem>
                    <SelectItem value="inline">Inline</SelectItem>
                    <SelectItem value="bottom">Bottom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Image URL</label>
              <Input
                value={formData.image_url}
                onChange={(e) => handleInputChange('image_url', e.target.value)}
                className="glass bg-transparent"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Alt Text</label>
              <Input
                value={formData.alt_text}
                onChange={(e) => handleInputChange('alt_text', e.target.value)}
                className="glass bg-transparent"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Link Type</label>
              <Select 
                value={formData.link_type} 
                onValueChange={(value) => handleInputChange('link_type', value)}
              >
                <SelectTrigger className="glass bg-transparent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="external">External URL</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.link_type === 'external' && (
              <div>
                <label className="text-sm font-medium">Link URL</label>
                <Input
                  value={formData.link_url}
                  onChange={(e) => handleInputChange('link_url', e.target.value)}
                  className="glass bg-transparent"
                />
              </div>
            )}

            {formData.link_type === 'product' && (
              <div>
                <label className="text-sm font-medium">Product ID</label>
                <Select 
                  value={formData.product_id} 
                  onValueChange={(value) => handleInputChange('product_id', value)}
                >
                  <SelectTrigger className="glass bg-transparent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ai-grant-assistant">AI Grant Assistant</SelectItem>
                    <SelectItem value="lit-review-ai">Literature Review AI</SelectItem>
                    <SelectItem value="data-pipeline-builder">Data Pipeline Builder</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Target Blog</label>
              <Input
                value={selectedBlog ? selectedBlog.title : 'No blog selected'}
                disabled
                className="glass bg-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Width</label>
                <Input
                  type="number"
                  value={formData.width}
                  onChange={(e) => handleInputChange('width', e.target.value)}
                  className="glass bg-transparent"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Height</label>
                <Input
                  type="number"
                  value={formData.height}
                  onChange={(e) => handleInputChange('height', e.target.value)}
                  className="glass bg-transparent"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                {editingAd ? 'Update' : 'Create'} Advertisement
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Global Ads Overview */}
      <div className="glass-card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold">All Advertisements Overview</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
            <Input
              placeholder="Search advertisements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full sm:w-64 glass-input"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {getPaginatedAds().map(ad => (
            <Card 
              key={ad.id} 
              className="glass-card hover:glow-soft transition-all cursor-pointer"
              onClick={() => handleAdClick(ad)}
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  {ad.image_url && (
                    <img 
                      src={ad.image_url} 
                      alt={ad.alt_text || ad.title}
                      className="w-full h-32 object-cover rounded"
                    />
                  )}
                  <div>
                    <h4 className="font-medium truncate">{ad.title}</h4>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <Badge variant={ad.is_active ? "default" : "secondary"} className="text-xs">
                        {ad.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="outline" className="text-xs capitalize">
                        {ad.position}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {ad.target_type === 'all' ? 'All' : 
                         ad.target_type === 'category' ? 'Category' : 'Specific'}
                      </Badge>
                    </div>
                    {ad.target_value && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        Target: {ad.target_value}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAdClick(ad);
                      }}
                      size="sm"
                      variant="ghost"
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(ad);
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Switch
                      checked={ad.is_active}
                      onCheckedChange={(checked) => toggleActive(ad.id, checked)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteAd(ad.id);
                      }}
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="glass-button"
            >
              <ChevronLeft size={16} />
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className={currentPage === page ? "glass-button glow-primary" : "glass-button"}
                >
                  {page}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="glass-button"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        )}
        
        {filteredAds.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? 'No advertisements found matching your search.' : 'No advertisements found. Select a blog above to start creating targeted ads.'}
          </div>
        )}
      </div>

      {/* Ad Detail Viewer */}
      <AdDetailViewer
        ad={selectedAdForDetail}
        isOpen={showAdDetail}
        onClose={handleAdDetailClose}
        onAdUpdated={handleAdUpdated}
      />

      {/* Blog List Ad Manager */}
      <BlogListAdManager
        isOpen={showBlogListAdManager}
        onClose={() => setShowBlogListAdManager(false)}
      />

      {/* Blog List Ad Editor */}
      <BlogListAdEditor
        isOpen={showBlogListAdEditor}
        onClose={() => setShowBlogListAdEditor(false)}
      />
    </div>
  );
};

export default AdManager;