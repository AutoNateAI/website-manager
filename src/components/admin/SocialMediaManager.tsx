import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Search, Edit, Copy, Trash2, Upload, Wand2, Eye, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import SocialImageEditor from './SocialImageEditor';

interface SourceItem {
  type: 'blog' | 'live_build' | 'ad';
  id: string;
  title: string;
}

interface SocialMediaPost {
  id: string;
  title: string;
  platform: string;
  style: string;
  voice: string;
  source_items: any[];
  caption: string;
  hashtags: string[];
  image_seed_url?: string;
  image_seed_instructions?: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

interface SocialMediaImage {
  id: string;
  post_id: string;
  carousel_index: number;
  image_index: number;
  image_url: string;
  image_prompt: string;
  alt_text?: string;
}

interface PostConcept {
  id: string;
  title: string;
  angle: string;
  targetAudience: string;
  keyMessages: string[];
  tone: string;
  callToAction: string;
}

interface GenerationProgress {
  postIndex: number;
  carouselIndex: number;
  imageIndex: number;
  total: number;
  completed: number;
}

const PLATFORM_STYLES = {
  instagram: ['Photo', 'Story', 'Reel', 'Carousel'],
  linkedin: ['Professional', 'Thought Leadership', 'Company Update', 'Industry News']
};

const VOICE_OPTIONS = [
  'Authoritative Expert',
  'Friendly Mentor', 
  'Witty Commentator',
  'Inspiring Leader',
  'Analytical Thinker',
  'Creative Visionary'
];

const MEDIA_TYPES = [
  { value: 'company', label: 'Company-focused', description: 'Teaching companies about AI command centers and automation' },
  { value: 'evergreen', label: 'Evergreen Educational', description: 'Community-focused educational content from a researcher perspective' },
  { value: 'advertisement', label: 'Advertisement', description: 'Sales-focused content showcasing your AI services and expertise' }
];

const SocialMediaManager = () => {
  const [posts, setPosts] = useState<SocialMediaPost[]>([]);
  const [images, setImages] = useState<Record<string, SocialMediaImage[]>>({});
  const [blogs, setBlogs] = useState<any[]>([]);
  const [liveBuilds, setLiveBuilds] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<'instagram' | 'linkedin' | 'all'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialMediaPost | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingImage, setEditingImage] = useState<SocialMediaImage | null>(null);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);
  const [loadingImages, setLoadingImages] = useState<Record<string, { loading: boolean; url?: string }>>({});
  
  const [formData, setFormData] = useState({
    title: '',
    platform: 'instagram' as 'instagram' | 'linkedin',
    style: '',
    voice: VOICE_OPTIONS[0],
    mediaType: 'evergreen' as 'company' | 'evergreen' | 'advertisement',
    sourceItems: [] as SourceItem[],
    imageSeedUrl: '',
    imageSeedInstructions: '',
    contextDirection: ''
  });

  const [postConcepts, setPostConcepts] = useState<PostConcept[]>([]);
  const [conceptsGenerated, setConceptsGenerated] = useState(false);
  const [generatingConcepts, setGeneratingConcepts] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [postsRes, blogsRes, liveBuildsRes, adsRes] = await Promise.all([
        supabase.from('social_media_posts').select('*').order('created_at', { ascending: false }),
        supabase.from('blogs').select('id, title, published').eq('published', true),
        supabase.from('live_builds').select('id, title, is_published').eq('is_published', true),
        supabase.from('advertisements').select('id, title, is_active').eq('is_active', true)
      ]);

      if (postsRes.data) setPosts(postsRes.data as SocialMediaPost[]);
      if (blogsRes.data) setBlogs(blogsRes.data);
      if (liveBuildsRes.data) setLiveBuilds(liveBuildsRes.data);
      if (adsRes.data) setAds(adsRes.data);

      // Fetch images for all posts
      if (postsRes.data?.length) {
        const imagesRes = await supabase
          .from('social_media_images')
          .select('*')
          .in('post_id', postsRes.data.map(p => p.id))
          .order('carousel_index')
          .order('image_index');
        
        if (imagesRes.data) {
          const imagesByPost = imagesRes.data.reduce((acc, img) => {
            if (!acc[img.post_id]) acc[img.post_id] = [];
            acc[img.post_id].push(img);
            return acc;
          }, {} as Record<string, SocialMediaImage[]>);
          setImages(imagesByPost);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Error fetching data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSourceItemToggle = (type: 'blog' | 'live_build' | 'ad', id: string, title: string) => {
    const existingIndex = formData.sourceItems.findIndex(item => item.id === id);
    let newSourceItems = [...formData.sourceItems];
    
    if (existingIndex >= 0) {
      newSourceItems.splice(existingIndex, 1);
    } else if (newSourceItems.length < 3) {
      newSourceItems.push({ type, id, title });
    } else {
      toast({ title: 'Maximum 3 items allowed', variant: 'destructive' });
      return;
    }
    
    setFormData({ ...formData, sourceItems: newSourceItems });
  };

  const generatePostConcepts = async () => {
    if (!formData.title || !formData.platform || !formData.style || !formData.mediaType) {
      toast({ title: 'Please fill in title, platform, style, and content type', variant: 'destructive' });
      return;
    }

    setGeneratingConcepts(true);

    try {
      const { data: conceptsData, error: conceptsError } = await supabase.functions.invoke('generate-post-concepts', {
        body: {
          ...formData
        }
      });

      if (conceptsError) throw conceptsError;

      setPostConcepts(conceptsData.concepts);
      setConceptsGenerated(true);
      
      toast({ title: 'Post concepts generated successfully!' });
    } catch (error) {
      console.error('Error generating concepts:', error);
      toast({ title: 'Error generating concepts', variant: 'destructive' });
    } finally {
      setGeneratingConcepts(false);
    }
  };

  const updatePostConcept = (index: number, field: keyof PostConcept, value: string | string[]) => {
    const updatedConcepts = [...postConcepts];
    updatedConcepts[index] = { ...updatedConcepts[index], [field]: value };
    setPostConcepts(updatedConcepts);
  };

  const generatePostsFromConcepts = async () => {
    if (postConcepts.length !== 3) {
      toast({ title: 'Need exactly 3 post concepts to generate posts', variant: 'destructive' });
      return;
    }

    setGenerating(true);
    setGenerationProgress({ postIndex: 0, carouselIndex: 0, imageIndex: 0, total: 27, completed: 0 });
    
    // Initialize loading state for all 27 images (3 posts × 9 images each)
    const initialLoadingState: Record<string, { loading: boolean; url?: string }> = {};
    for (let postIndex = 0; postIndex < 3; postIndex++) {
      for (let imageIndex = 1; imageIndex <= 9; imageIndex++) {
        const key = `post-${postIndex}-image-${imageIndex}`;
        initialLoadingState[key] = { loading: true };
      }
    }
    setLoadingImages(initialLoadingState);

    try {
      const { data: generatedData, error: generateError } = await supabase.functions.invoke('generate-social-media-content', {
        body: {
          ...formData,
          postConcepts
        }
      });

      if (generateError) throw generateError;

      // Update UI
      await fetchData();
      setShowCreateDialog(false);
      resetForm();
      
      toast({ title: `Successfully generated ${generatedData.postsCreated} social media posts with 27 images!` });
    } catch (error) {
      console.error('Error generating posts:', error);
      toast({ title: 'Error generating posts', variant: 'destructive' });
    } finally {
      setGenerating(false);
      setGenerationProgress(null);
      setLoadingImages({});
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      platform: 'instagram',
      style: '',
      voice: VOICE_OPTIONS[0],
      mediaType: 'evergreen',
      sourceItems: [],
      imageSeedUrl: '',
      imageSeedInstructions: '',
      contextDirection: ''
    });
    setPostConcepts([]);
    setConceptsGenerated(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard!' });
  };

  const deletePost = async (id: string) => {
    try {
      await supabase.from('social_media_posts').delete().eq('id', id);
      await fetchData();
      toast({ title: 'Post deleted successfully' });
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({ title: 'Error deleting post', variant: 'destructive' });
    }
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.caption.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlatform = selectedPlatform === 'all' || post.platform === selectedPlatform;
    return matchesSearch && matchesPlatform;
  });

  const renderCarouselPreview = (postId: string) => {
    const postImages = images[postId] || [];
    
    // If we're generating and this post doesn't have images yet, show loading grid
    if (generating && postImages.length === 0) {
      return (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 9 }, (_, index) => (
            <div 
              key={index}
              className="aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center"
            >
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-3 gap-2">
        {postImages.map((image, imgIndex) => (
          <div 
            key={image.id} 
            className="aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
            onClick={() => {
              setEditingImage(image);
              setShowImageEditor(true);
            }}
          >
            <img
              src={image.image_url}
              alt={image.alt_text || `Image ${imgIndex + 1}`}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
        {/* Fill empty slots with loading if we're still generating */}
        {generating && postImages.length < 9 && Array.from({ length: 9 - postImages.length }, (_, index) => (
          <div 
            key={`loading-${index}`}
            className="aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center"
          >
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold gradient-text">Social Media Content</h2>
            <p className="text-muted-foreground mt-1">
              Create engaging social media carousels from your content
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="glass-button">
                <Plus size={16} className="mr-2" />
                Create Social Media Post
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-modal max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Social Media Post</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Enter post title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="platform">Platform *</Label>
                    <Select
                      value={formData.platform}
                      onValueChange={(value: 'instagram' | 'linkedin') => {
                        setFormData({ ...formData, platform: value, style: '' });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="style">Style *</Label>
                    <Select
                      value={formData.style}
                      onValueChange={(value) => setFormData({ ...formData, style: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select style" />
                      </SelectTrigger>
                      <SelectContent>
                        {PLATFORM_STYLES[formData.platform].map(style => (
                          <SelectItem key={style} value={style}>{style}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="voice">Voice</Label>
                    <Select
                      value={formData.voice}
                      onValueChange={(value) => setFormData({ ...formData, voice: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VOICE_OPTIONS.map(voice => (
                          <SelectItem key={voice} value={voice}>{voice}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Media Type Selection */}
                <div className="space-y-2">
                  <Label htmlFor="mediaType">Content Type *</Label>
                  <Select
                    value={formData.mediaType}
                    onValueChange={(value: 'company' | 'evergreen' | 'advertisement') => 
                      setFormData({ ...formData, mediaType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MEDIA_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{type.label}</span>
                            <span className="text-xs text-muted-foreground">{type.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Source Items Selection */}
                <div className="space-y-4">
                  <Label>Source Content (Optional - up to 3 items)</Label>
                  <Tabs defaultValue="blogs" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="blogs">Blogs</TabsTrigger>
                      <TabsTrigger value="live-builds">Live Builds</TabsTrigger>
                      <TabsTrigger value="ads">Ads</TabsTrigger>
                    </TabsList>
                    <TabsContent value="blogs" className="space-y-2">
                      <ScrollArea className="h-32 border rounded-md p-2">
                        {blogs.map(blog => (
                          <div key={blog.id} className="flex items-center space-x-2 py-1">
                            <Checkbox
                              checked={formData.sourceItems.some(item => item.id === blog.id)}
                              onCheckedChange={() => handleSourceItemToggle('blog', blog.id, blog.title)}
                            />
                            <span className="text-sm">{blog.title}</span>
                          </div>
                        ))}
                      </ScrollArea>
                    </TabsContent>
                    <TabsContent value="live-builds" className="space-y-2">
                      <ScrollArea className="h-32 border rounded-md p-2">
                        {liveBuilds.map(build => (
                          <div key={build.id} className="flex items-center space-x-2 py-1">
                            <Checkbox
                              checked={formData.sourceItems.some(item => item.id === build.id)}
                              onCheckedChange={() => handleSourceItemToggle('live_build', build.id, build.title)}
                            />
                            <span className="text-sm">{build.title}</span>
                          </div>
                        ))}
                      </ScrollArea>
                    </TabsContent>
                    <TabsContent value="ads" className="space-y-2">
                      <ScrollArea className="h-32 border rounded-md p-2">
                        {ads.map(ad => (
                          <div key={ad.id} className="flex items-center space-x-2 py-1">
                            <Checkbox
                              checked={formData.sourceItems.some(item => item.id === ad.id)}
                              onCheckedChange={() => handleSourceItemToggle('ad', ad.id, ad.title)}
                            />
                            <span className="text-sm">{ad.title}</span>
                          </div>
                        ))}
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                  {formData.sourceItems.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.sourceItems.map(item => (
                        <Badge key={item.id} variant="secondary">
                          {item.title}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Context Direction */}
                <div className="space-y-2">
                  <Label htmlFor="contextDirection">Additional Context & Direction</Label>
                  <Textarea
                    id="contextDirection"
                    placeholder="Add any specific context or direction for the AI to follow when generating your content..."
                    value={formData.contextDirection}
                    onChange={(e) => setFormData({ ...formData, contextDirection: e.target.value })}
                    rows={3}
                  />
                </div>

                {/* Image Seed */}
                <div className="space-y-4">
                  <Label>Reference Image (Optional)</Label>
                  <Input
                    placeholder="Image URL"
                    value={formData.imageSeedUrl}
                    onChange={(e) => setFormData({ ...formData, imageSeedUrl: e.target.value })}
                  />
                  {formData.imageSeedUrl && (
                    <Textarea
                      placeholder="Instructions on how to use the reference image..."
                      value={formData.imageSeedInstructions}
                      onChange={(e) => setFormData({ ...formData, imageSeedInstructions: e.target.value })}
                    />
                  )}
                </div>

                {/* Generation Progress */}
                {generating && generationProgress && (
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span>Generating 27 images in parallel...</span>
                      <span>All posts and images loading simultaneously</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      {/* Show 3 loading grids for the 3 posts */}
                      {Array.from({ length: 3 }, (_, postIndex) => (
                        <div key={postIndex} className="space-y-2">
                          <h4 className="text-sm font-medium">Post {postIndex + 1}</h4>
                          <div className="grid grid-cols-3 gap-1">
                            {Array.from({ length: 9 }, (_, imageIndex) => (
                              <div 
                                key={imageIndex}
                                className="aspect-square bg-muted rounded border flex items-center justify-center"
                              >
                                <div className="animate-spin rounded-full h-3 w-3 border border-primary border-t-transparent"></div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      All 27 images are generating simultaneously. This should complete in seconds with your high-speed API!
                    </p>
                  </div>
                )}

                {/* Post Concepts Section */}
                {conceptsGenerated && (
                  <div className="space-y-6">
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-semibold mb-4">Review & Edit Post Concepts</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        AI has generated 3 distinct post concepts. Review and edit them before generating the final posts.
                      </p>
                      
                      {postConcepts.map((concept, index) => (
                        <div key={concept.id} className="border rounded-lg p-4 space-y-4 mb-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Post {index + 1}</h4>
                            <Badge variant="outline">{concept.tone}</Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Title/Hook</Label>
                              <Input
                                value={concept.title}
                                onChange={(e) => updatePostConcept(index, 'title', e.target.value)}
                              />
                            </div>
                            <div>
                              <Label>Target Audience</Label>
                              <Input
                                value={concept.targetAudience}
                                onChange={(e) => updatePostConcept(index, 'targetAudience', e.target.value)}
                              />
                            </div>
                          </div>
                          
                          <div>
                            <Label>Content Angle</Label>
                            <Textarea
                              value={concept.angle}
                              onChange={(e) => updatePostConcept(index, 'angle', e.target.value)}
                              rows={2}
                            />
                          </div>
                          
                          <div>
                            <Label>Key Messages (comma-separated)</Label>
                            <Textarea
                              value={concept.keyMessages.join(', ')}
                              onChange={(e) => updatePostConcept(index, 'keyMessages', e.target.value.split(', '))}
                              rows={2}
                            />
                          </div>
                          
                          <div>
                            <Label>Call to Action</Label>
                            <Input
                              value={concept.callToAction}
                              onChange={(e) => updatePostConcept(index, 'callToAction', e.target.value)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col gap-3">
                  {!conceptsGenerated ? (
                    <Button 
                      onClick={generatePostConcepts}
                      disabled={generatingConcepts}
                      className="w-full"
                    >
                      {generatingConcepts ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Generating Post Concepts...
                        </>
                      ) : (
                        'Generate 3 Post Concepts'
                      )}
                    </Button>
                  ) : (
                    <Button 
                      onClick={generatePostsFromConcepts}
                      disabled={generating || postConcepts.length !== 3}
                      className="w-full"
                    >
                      {generating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Generating All Posts & Images...
                        </>
                      ) : (
                        'Generate 3 Posts (27 Images in Parallel)'
                      )}
                    </Button>
                  )}
                  
                  {conceptsGenerated && (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setConceptsGenerated(false);
                        setPostConcepts([]);
                      }}
                      disabled={generating}
                    >
                      Start Over with New Concepts
                    </Button>
                  )}
                </div>

                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCreateDialog(false)}
                    disabled={generating || generatingConcepts}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search posts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={selectedPlatform} onValueChange={(v: any) => setSelectedPlatform(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="linkedin">LinkedIn</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Posts Grid */}
      <div className="grid gap-6">
        {filteredPosts.map(post => (
          <Card key={post.id} className="glass-card">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{post.title}</CardTitle>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">{post.platform}</Badge>
                    <Badge variant="secondary">{post.style}</Badge>
                    <Badge variant="secondary">{post.voice}</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(post.caption)}>
                    <Copy size={16} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => {
                    setEditingPost(post);
                    setShowEditDialog(true);
                  }}>
                    <Edit size={16} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => deletePost(post.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Caption</h4>
                <p className="text-sm text-muted-foreground">{post.caption}</p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Hashtags</h4>
                <div className="flex flex-wrap gap-1">
                  {post.hashtags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Source Items</h4>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(post.source_items) && post.source_items.map((item: any, index: number) => (
                    <Badge key={index} variant="secondary">
                      {item.type}: {item.title}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Images (9 images per post)</h4>
                <p className="text-xs text-muted-foreground mb-3">Click on any image to edit it</p>
                {renderCarouselPreview(post.id)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPosts.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No social media posts found</p>
        </div>
      )}

      {/* Image Editor Modal */}
      <SocialImageEditor
        isOpen={showImageEditor}
        onClose={() => setShowImageEditor(false)}
        image={editingImage}
        onImageUpdated={fetchData}
      />
    </div>
  );
};

export default SocialMediaManager;