import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Wand2, Image, Save, Loader2, Plus, Trash2, ImageIcon } from 'lucide-react';
import BlogContentImages from './BlogContentImages';
import ThumbnailGenerator from './ThumbnailGenerator';

interface Blog {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  read_time: string;
  slug: string;
  published: boolean;
  featured: boolean;
  hero_image?: string;
  hero_image_alt?: string;
  content_images?: any[];
  created_at: string;
  updated_at: string;
}

interface ImageItem {
  id: string;
  title: string;
  url: string;
  alt_text: string;
  caption: string;
  created_at: string;
}

interface BlogImage {
  id: string;
  blog_id: string;
  image_id: string;
  position: string;
  display_order: number;
  image: ImageItem;
}

interface BlogEditorProps {
  blog?: Blog | null;
  onClose: () => void;
}

const BlogEditor = ({ blog, onClose }: BlogEditorProps) => {
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    category: '',
    author: 'Admin',
    slug: '',
    published: false,
    featured: false,
    hero_image: '',
    hero_image_alt: '',
  });
  const [aiTopic, setAiTopic] = useState('');
  const [aiCategory, setAiCategory] = useState('');
  const [targetLength, setTargetLength] = useState('800');
  const [generating, setGenerating] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageSuggestions, setImageSuggestions] = useState<any[]>([]);
  const [availableImages, setAvailableImages] = useState<ImageItem[]>([]);
  const [attachedImages, setAttachedImages] = useState<BlogImage[]>([]);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [showThumbnailGenerator, setShowThumbnailGenerator] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (blog) {
      setFormData({
        title: blog.title,
        excerpt: blog.excerpt,
        content: blog.content,
        category: blog.category,
        author: blog.author,
        slug: blog.slug,
        published: blog.published,
        featured: blog.featured,
        hero_image: blog.hero_image || '',
        hero_image_alt: blog.hero_image_alt || '',
      });
      fetchAttachedImages(blog.id);
    }
    fetchAvailableImages();
  }, [blog]);

  const fetchAvailableImages = async () => {
    try {
      const { data, error } = await supabase
        .from('images')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAvailableImages(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch images: " + error.message,
        variant: "destructive",
      });
    }
  };

  const fetchAttachedImages = async (blogId: string) => {
    try {
      const { data, error } = await supabase
        .from('blog_images')
        .select(`
          *,
          image:images(*)
        `)
        .eq('blog_id', blogId)
        .order('display_order');

      if (error) throw error;
      setAttachedImages(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch attached images: " + error.message,
        variant: "destructive",
      });
    }
  };

  const generateSlug = (title: string) => {
    return title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-generate slug when title changes
      if (field === 'title' && typeof value === 'string') {
        updated.slug = generateSlug(value);
      }
      
      return updated;
    });
  };

  const generateContent = async () => {
    if (!aiTopic.trim()) {
      toast({
        title: "Error",
        description: "Please enter a topic for content generation",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-blog-content', {
        body: {
          topic: aiTopic,
          category: aiCategory || 'General',
          targetLength: parseInt(targetLength)
        }
      });

      if (error) throw error;

      const { title, content, excerpt, slug, category, readTime, imageSuggestions: suggestions } = data;

      setFormData(prev => ({
        ...prev,
        title,
        content,
        excerpt,
        slug,
        category,
        read_time: readTime,
      }));

      setImageSuggestions(suggestions || []);

      toast({
        title: "Success",
        description: "Blog content generated successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to generate content: " + error.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const generateImage = async (prompt: string) => {
    setGeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { 
          prompt,
          size: "1920x1080"
        }
      });

      if (error) throw error;

      const { imageUrl } = data;
      
      setFormData(prev => ({
        ...prev,
        hero_image: imageUrl,
        hero_image_alt: prompt
      }));

      toast({
        title: "Success",
        description: "Hero image generated successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error", 
        description: "Failed to generate image: " + error.message,
        variant: "destructive",
      });
    } finally {
      setGeneratingImage(false);
    }
  };

  const saveBlog = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: "Error",
        description: "Title and content are required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const blogData = {
        ...formData,
        read_time: formData.content ? `${Math.ceil(formData.content.split(' ').length / 200)} min read` : '1 min read',
        content_images: imageSuggestions
      };

      let blogId = blog?.id;

      if (blog) {
        // Update existing blog
        const { error } = await supabase
          .from('blogs')
          .update(blogData)
          .eq('id', blog.id);

        if (error) throw error;
      } else {
        // Create new blog
        const { data, error } = await supabase
          .from('blogs')
          .insert([blogData])
          .select()
          .single();

        if (error) throw error;
        blogId = data.id;
      }

      // Rebuild content_images if blog exists
      if (blogId && attachedImages.length > 0) {
        await supabase.rpc('rebuild_blog_content_images', { blog_id_param: blogId });
      }

      toast({
        title: "Success",
        description: `Blog ${blog ? 'updated' : 'created'} successfully!`,
      });

      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to ${blog ? 'update' : 'create'} blog: ` + error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const attachImageToBlog = async (imageId: string, position: string) => {
    if (!blog?.id) {
      toast({
        title: "Error",
        description: "Please save the blog first before attaching images",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('blog_images')
        .insert({
          blog_id: blog.id,
          image_id: imageId,
          position,
          display_order: attachedImages.length + 1
        });

      if (error) throw error;

      // Rebuild content_images
      await supabase.rpc('rebuild_blog_content_images', { blog_id_param: blog.id });
      
      // Refresh attached images
      await fetchAttachedImages(blog.id);

      toast({
        title: "Success",
        description: "Image attached to blog successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to attach image: " + error.message,
        variant: "destructive",
      });
    }
  };

  const detachImageFromBlog = async (blogImageId: string) => {
    if (!blog?.id) return;

    try {
      const { error } = await supabase
        .from('blog_images')
        .delete()
        .eq('id', blogImageId);

      if (error) throw error;

      // Rebuild content_images
      await supabase.rpc('rebuild_blog_content_images', { blog_id_param: blog.id });
      
      // Refresh attached images
      await fetchAttachedImages(blog.id);

      toast({
        title: "Success",
        description: "Image detached from blog successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to detach image: " + error.message,
        variant: "destructive",
      });
    }
  };

  const extractHeadings = (content: string) => {
    const headingRegex = /^#{1,6}\s+(.+)$/gm;
    const headings = [];
    let match;
    let headingIndex = 1;

    while ((match = headingRegex.exec(content)) !== null) {
      headings.push({
        position: `after_heading_${headingIndex}`,
        text: match[1].trim()
      });
      headingIndex++;
    }

    return headings;
  };

  const handleImageUpdated = (oldUrl: string, newUrl: string) => {
    // Update the content by replacing the old image URL with the new one
    const updatedContent = formData.content.replace(oldUrl, newUrl);
    setFormData(prev => ({ ...prev, content: updatedContent }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="glass-button"
            >
              <ArrowLeft size={18} className="mr-2" />
              Back
            </Button>
            <div>
              <h2 className="text-2xl font-bold gradient-text">
                {blog ? 'Edit Blog' : 'Create New Blog'}
              </h2>
              <p className="text-muted-foreground mt-1">
                {blog ? 'Update your blog post' : 'Create a new blog post with AI assistance'}
              </p>
            </div>
          </div>
          <Button 
            onClick={saveBlog} 
            disabled={saving}
            className="glass-button glow-primary"
          >
            {saving ? (
              <Loader2 size={18} className="mr-2 animate-spin" />
            ) : (
              <Save size={18} className="mr-2" />
            )}
            {saving ? 'Saving...' : 'Save Blog'}
          </Button>
        </div>
      </div>

      {/* AI Content Generation */}
      {!blog && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 size={20} />
              AI Content Generation
            </CardTitle>
            <CardDescription>
              Generate blog content using AI to get started quickly
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ai-topic">Topic</Label>
                <Input
                  id="ai-topic"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="e.g., Modern web development trends"
                  className="glass bg-transparent"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-category">Category</Label>
                <Select value={aiCategory} onValueChange={setAiCategory}>
                  <SelectTrigger className="glass bg-transparent">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Technology">Technology</SelectItem>
                    <SelectItem value="Business">Business</SelectItem>
                    <SelectItem value="Lifestyle">Lifestyle</SelectItem>
                    <SelectItem value="Health">Health</SelectItem>
                    <SelectItem value="Education">Education</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="target-length">Target Length (words)</Label>
                <Select value={targetLength} onValueChange={setTargetLength}>
                  <SelectTrigger className="glass bg-transparent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="500">500 words</SelectItem>
                    <SelectItem value="800">800 words</SelectItem>
                    <SelectItem value="1200">1200 words</SelectItem>
                    <SelectItem value="1500">1500 words</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button 
              onClick={generateContent} 
              disabled={generating}
              className="glass-button glow-accent"
            >
              {generating ? (
                <Loader2 size={18} className="mr-2 animate-spin" />
              ) : (
                <Wand2 size={18} className="mr-2" />
              )}
              {generating ? 'Generating...' : 'Generate Content'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Blog Form */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Blog Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="glass bg-transparent"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="glass bg-transparent"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => handleInputChange('slug', e.target.value)}
              className="glass bg-transparent"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="excerpt">Excerpt</Label>
            <Textarea
              id="excerpt"
              value={formData.excerpt}
              onChange={(e) => handleInputChange('excerpt', e.target.value)}
              className="glass bg-transparent min-h-[100px]"
              placeholder="Brief description of the blog post..."
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="hero-image">Hero Image URL</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => generateImage(formData.title || aiTopic || 'Blog hero image')}
                disabled={generatingImage}
                className="glass-button"
              >
                {generatingImage ? (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                ) : (
                  <Image size={16} className="mr-2" />
                )}
                {generatingImage ? 'Generating...' : 'Generate AI Image'}
              </Button>
            </div>
            <Input
              id="hero-image"
              value={formData.hero_image}
              onChange={(e) => handleInputChange('hero_image', e.target.value)}
              className="glass bg-transparent"
              placeholder="https://example.com/image.jpg"
            />
          </div>

          {formData.hero_image && (
            <div className="space-y-2">
              <Label htmlFor="hero-image-alt">Hero Image Alt Text</Label>
              <Input
                id="hero-image-alt"
                value={formData.hero_image_alt}
                onChange={(e) => handleInputChange('hero_image_alt', e.target.value)}
                className="glass bg-transparent"
                placeholder="Describe the image for accessibility"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="content">Content (Markdown)</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              className="glass bg-transparent min-h-[400px] font-mono"
              placeholder="Write your blog content in markdown format..."
            />
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="published"
                checked={formData.published}
                onCheckedChange={(checked) => handleInputChange('published', checked)}
              />
              <Label htmlFor="published">Published</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="featured"
                checked={formData.featured}
                onCheckedChange={(checked) => handleInputChange('featured', checked)}
              />
              <Label htmlFor="featured">Featured</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Images Display */}
      {formData.content && (
        <BlogContentImages 
          content={formData.content}
          onImageUpdated={handleImageUpdated}
        />
      )}

      {/* Thumbnail Generator */}
      {(formData.title || formData.excerpt) && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image size={20} />
              Thumbnail Generator
            </CardTitle>
            <CardDescription>
              Generate a professional thumbnail for your blog post
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setShowThumbnailGenerator(true)}
              className="glass-button glow-accent"
            >
              <Image size={18} className="mr-2" />
              Generate Thumbnail
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Image Management Section */}
      {formData.content && (
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon size={20} />
                  Image Management
                </CardTitle>
                <CardDescription>
                  Attach images to specific positions in your blog content
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowImageGallery(!showImageGallery)}
                className="glass-button"
              >
                {showImageGallery ? 'Hide Gallery' : 'Show Gallery'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Attached Images */}
            {attachedImages.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-semibold">Attached Images ({attachedImages.length})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {attachedImages.map((blogImage) => (
                    <div key={blogImage.id} className="glass-card p-4 space-y-3">
                      <img
                        src={blogImage.image.url}
                        alt={blogImage.image.alt_text}
                        className="w-full h-32 object-cover rounded-xl shadow-lg"
                      />
                      <div className="space-y-2">
                        <p className="font-medium text-sm">{blogImage.image.title}</p>
                        <Badge variant="secondary" className="text-xs">
                          Position: {blogImage.position.replace('after_heading_', 'After Heading ')}
                        </Badge>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => detachImageFromBlog(blogImage.id)}
                          className="w-full"
                        >
                          <Trash2 size={14} className="mr-2" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Image Gallery */}
            {showImageGallery && (
              <div className="space-y-4">
                <h4 className="font-semibold">Available Images ({availableImages.length})</h4>
                {availableImages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ImageIcon size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No images available. Go to the Image Library to add some.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availableImages.map((image) => {
                      const isAttached = attachedImages.some(bi => bi.image_id === image.id);
                      return (
                        <div key={image.id} className="glass-card p-4 space-y-3">
                          <img
                            src={image.url}
                            alt={image.alt_text}
                            className="w-full h-32 object-cover rounded-xl shadow-lg"
                          />
                          <div className="space-y-2">
                            <p className="font-medium text-sm">{image.title}</p>
                            {isAttached ? (
                              <Badge variant="default" className="w-full justify-center">
                                Already Attached
                              </Badge>
                            ) : (
                              <Select onValueChange={(position) => attachImageToBlog(image.id, position)}>
                                <SelectTrigger className="glass bg-transparent">
                                  <SelectValue placeholder="Attach to position..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {extractHeadings(formData.content).map((heading) => (
                                    <SelectItem key={heading.position} value={heading.position}>
                                      After: {heading.text}
                                    </SelectItem>
                                  ))}
                                  <SelectItem value="end_of_content">End of Content</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {!blog && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <p className="text-amber-800 dark:text-amber-200 text-sm">
                  💡 <strong>Tip:</strong> Save your blog first to attach images to specific positions in the content.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Thumbnail Generator Dialog */}
      <ThumbnailGenerator
        isOpen={showThumbnailGenerator}
        onClose={() => setShowThumbnailGenerator(false)}
        blogTitle={formData.title}
        blogExcerpt={formData.excerpt}
        blogCategory={formData.category}
        onThumbnailGenerated={(thumbnailUrl) => {
          setFormData(prev => ({ ...prev, hero_image: thumbnailUrl }));
        }}
      />
    </div>
  );
};

export default BlogEditor;