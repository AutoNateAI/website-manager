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
import { ArrowLeft, Wand2, Image, Save, Loader2, Plus, Trash2, ImageIcon, Eye } from 'lucide-react';
import BlogContentImages from './BlogContentImages';
import ThumbnailGenerator from './ThumbnailGenerator';
import BlogPreviewDialog from './BlogPreviewDialog';

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

interface GeneratedBlog {
  id?: string;
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
  imageSuggestions?: any[];
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

const EnhancedBlogEditor = ({ blog, onClose }: BlogEditorProps) => {
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    category: '',
    author: 'AutoNate',
    slug: '',
    published: false,
    featured: false,
    hero_image: '',
    hero_image_alt: '',
    read_time: '5 min read',
  });

  // Company profile research functionality
  const [companyBrief, setCompanyBrief] = useState('');
  const [notebookUrl, setNotebookUrl] = useState('');
  const [chatgptUrl, setChatgptUrl] = useState('');
  const [savedBriefing, setSavedBriefing] = useState('');
  const [generatedBlogs, setGeneratedBlogs] = useState<GeneratedBlog[]>([]);
  const [activeEditingBlog, setActiveEditingBlog] = useState<number | null>(null);
  const [generatingBlogs, setGeneratingBlogs] = useState(false);

  // Existing states
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
  
  // New thumbnail generation states
  const [generatingThumbnails, setGeneratingThumbnails] = useState<boolean[]>([]);
  const [generatingAllThumbnails, setGeneratingAllThumbnails] = useState(false);
  
  // Preview states
  const [previewBlog, setPreviewBlog] = useState<GeneratedBlog | null>(null);
  const [showPreview, setShowPreview] = useState(false);

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
        read_time: blog.read_time,
      });
      fetchAttachedImages(blog.id);
    }
    fetchAvailableImages();
  }, [blog]);

  const fetchAvailableImages = async () => {
    try {
      const { data, error } = await supabase
        .from('images')
        .select('id, title, url, alt_text, caption, created_at')
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
          id,
          blog_id,
          image_id,
          position,
          display_order,
          image:images(id, title, url, alt_text, caption, created_at)
        `)
        .eq('blog_id', blogId)
        .order('position')
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
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    if (activeEditingBlog !== null) {
      const updatedBlogs = [...generatedBlogs];
      updatedBlogs[activeEditingBlog] = {
        ...updatedBlogs[activeEditingBlog],
        [field]: value
      };
      if (field === 'title') {
        updatedBlogs[activeEditingBlog].slug = generateSlug(value as string);
      }
      setGeneratedBlogs(updatedBlogs);
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
      if (field === 'title') {
        setFormData(prev => ({
          ...prev,
          slug: generateSlug(value as string)
        }));
      }
    }
  };

  // Generate 3 blogs with company profile research brief
  const generateBlogsWithCompanyBrief = async () => {
    if (!companyBrief.trim()) {
      toast({
        title: "Error",
        description: "Please provide the company profile research brief",
        variant: "destructive",
      });
      return;
    }

    setGeneratingBlogs(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-targeted-blogs', {
        body: {
          companyBrief,
          category: aiCategory || 'Business Strategy',
          targetLength: parseInt(targetLength),
          notebookUrl,
          chatgptUrl
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setGeneratedBlogs(data.blogs);
      setSavedBriefing(companyBrief);
      
      // Initialize thumbnail generation states
      setGeneratingThumbnails(new Array(data.blogs.length).fill(false));

      toast({
        title: "Success",
        description: "Generated 3 unique targeted blog posts successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to generate blogs: " + error.message,
        variant: "destructive",
      });
    } finally {
      setGeneratingBlogs(false);
    }
  };

  const generateContent = async () => {
    if (!aiTopic.trim()) {
      toast({
        title: "Error",
        description: "Please enter a topic for AI generation",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-blog-content', {
        body: {
          topic: aiTopic,
          category: aiCategory,
          targetLength: parseInt(targetLength)
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setFormData(prev => ({
        ...prev,
        title: data.title,
        excerpt: data.excerpt,
        content: data.content,
        category: data.category,
        slug: data.slug,
        author: data.author || 'AutoNate'
      }));

      setImageSuggestions(data.imageSuggestions || []);

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

  const generateImage = async (suggestion: any) => {
    setGeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: {
          prompt: suggestion.prompt,
          alt_text: suggestion.alt_text,
          title: suggestion.title
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: "Success",
        description: "Image generated successfully!",
      });

      fetchAvailableImages();
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

  const generateThumbnailForBlog = async (blogIndex: number) => {
    const blog = generatedBlogs[blogIndex];
    if (!blog) return;

    const newGeneratingStates = [...generatingThumbnails];
    newGeneratingStates[blogIndex] = true;
    setGeneratingThumbnails(newGeneratingStates);

    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: {
          prompt: `Blog thumbnail for: ${blog.title}. ${blog.excerpt}. Professional, engaging, high-quality blog header image. CRITICAL: Always include a vibrant, colorful background - NO transparent backgrounds. Use rich colors, gradients, or textured backgrounds.`,
          alt_text: `Thumbnail for ${blog.title}`,
          title: `${blog.title} - Thumbnail`
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Update the blog with the new thumbnail
      const updatedBlogs = [...generatedBlogs];
      updatedBlogs[blogIndex] = {
        ...updatedBlogs[blogIndex],
        hero_image: data.imageUrl,
        hero_image_alt: `Thumbnail for ${blog.title}`
      };
      setGeneratedBlogs(updatedBlogs);

      toast({
        title: "Success",
        description: "Thumbnail generated successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to generate thumbnail: " + error.message,
        variant: "destructive",
      });
    } finally {
      const newGeneratingStates = [...generatingThumbnails];
      newGeneratingStates[blogIndex] = false;
      setGeneratingThumbnails(newGeneratingStates);
    }
  };

  const generateAllThumbnails = async () => {
    setGeneratingAllThumbnails(true);
    
    try {
      const promises = generatedBlogs.map(async (blog, index) => {
        const { data, error } = await supabase.functions.invoke('generate-image', {
          body: {
            prompt: `Blog thumbnail for: ${blog.title}. ${blog.excerpt}. Professional, engaging, high-quality blog header image. CRITICAL: Always include a vibrant, colorful background - NO transparent backgrounds. Use rich colors, gradients, or textured backgrounds.`,
            alt_text: `Thumbnail for ${blog.title}`,
            title: `${blog.title} - Thumbnail`
          }
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        return {
          index,
          imageUrl: data.imageUrl,
          alt: `Thumbnail for ${blog.title}`
        };
      });

      const results = await Promise.all(promises);
      
      const updatedBlogs = [...generatedBlogs];
      results.forEach(result => {
        updatedBlogs[result.index] = {
          ...updatedBlogs[result.index],
          hero_image: result.imageUrl,
          hero_image_alt: result.alt
        };
      });
      
      setGeneratedBlogs(updatedBlogs);

      toast({
        title: "Success",
        description: "All thumbnails generated successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to generate thumbnails: " + error.message,
        variant: "destructive",
      });
    } finally {
      setGeneratingAllThumbnails(false);
    }
  };

  const saveBlog = async (blogData?: GeneratedBlog, blogIndex?: number) => {
    const dataToSave = blogData || formData;
    
    if (!dataToSave.title || !dataToSave.content) {
      toast({
        title: "Error",
        description: "Title and content are required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const saveData = {
        title: dataToSave.title,
        excerpt: dataToSave.excerpt,
        content: dataToSave.content,
        category: dataToSave.category,
        author: dataToSave.author,
        slug: dataToSave.slug,
        published: dataToSave.published,
        featured: dataToSave.featured,
        hero_image: dataToSave.hero_image || null,
        hero_image_alt: dataToSave.hero_image_alt || null,
        read_time: dataToSave.read_time || '5 min read'
      };

      let result;
      if (blog?.id && !blogData) {
        // Update existing blog
        result = await supabase
          .from('blogs')
          .update(saveData)
          .eq('id', blog.id)
          .select()
          .single();
      } else {
        // Create new blog
        result = await supabase
          .from('blogs')
          .insert([saveData])
          .select()
          .single();
      }

      if (result.error) throw result.error;

      // If we're saving a generated blog, mark it as saved
      if (blogData && blogIndex !== undefined) {
        const updatedBlogs = [...generatedBlogs];
        updatedBlogs[blogIndex] = { ...updatedBlogs[blogIndex], id: result.data.id };
        setGeneratedBlogs(updatedBlogs);
      }

      toast({
        title: "Success",
        description: `Blog ${blog?.id && !blogData ? 'updated' : 'created'} successfully!`,
      });

      if (!blogData) {
        onClose();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveAllBlogs = async () => {
    setSaving(true);
    try {
      for (let i = 0; i < generatedBlogs.length; i++) {
        await saveBlog(generatedBlogs[i], i);
      }
      toast({
        title: "Success",
        description: "All blogs saved successfully!",
      });
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to save all blogs: " + error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getCurrentFormData = () => {
    if (activeEditingBlog !== null) {
      return generatedBlogs[activeEditingBlog];
    }
    return formData;
  };

  const currentData = getCurrentFormData();

  return (
    <div className="min-h-screen p-3 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="glass-card p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={onClose}
                className="glass-button"
                size="sm"
              >
                <ArrowLeft size={16} className="mr-2" />
                Back to Blogs
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold gradient-text">
                  {blog ? 'Edit Blog' : 'Create New Blog'}
                </h1>
                <p className="text-muted-foreground text-sm sm:text-base">
                  {blog ? 'Update your blog content' : 'Create engaging content with AI assistance'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {generatedBlogs.length > 0 && (
                <Button
                  onClick={saveAllBlogs}
                  disabled={saving}
                  className="glass-button glow-primary"
                >
                  {saving ? (
                    <Loader2 size={16} className="mr-2 animate-spin" />
                  ) : (
                    <Save size={16} className="mr-2" />
                  )}
                  Save All Blogs
                </Button>
              )}
              <Button
                onClick={() => saveBlog()}
                disabled={saving}
                className="glass-button glow-primary"
              >
                {saving ? (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                ) : (
                  <Save size={16} className="mr-2" />
                )}
                {blog ? 'Update Blog' : 'Save Blog'}
              </Button>
            </div>
          </div>
        </div>

        {/* Company Profile Research Brief Section (only for new blogs) */}
        {!blog && (
          <div className="glass-card p-4 sm:p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Generate From Company Profile Research Brief</h3>
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="companyBrief">Company Profile Research Brief</Label>
                    <Textarea
                      id="companyBrief"
                      placeholder="Enter the detailed company research brief from your NotebookLM and ChatGPT analysis..."
                      value={companyBrief}
                      onChange={(e) => setCompanyBrief(e.target.value)}
                      className="glass bg-transparent min-h-[120px]"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="notebookUrl">NotebookLM URL (Optional)</Label>
                      <Input
                        id="notebookUrl"
                        placeholder="https://notebooklm.google.com/..."
                        value={notebookUrl}
                        onChange={(e) => setNotebookUrl(e.target.value)}
                        className="glass bg-transparent"
                      />
                    </div>
                    <div>
                      <Label htmlFor="chatgptUrl">ChatGPT Conversation URL (Optional)</Label>
                      <Input
                        id="chatgptUrl"
                        placeholder="https://chat.openai.com/..."
                        value={chatgptUrl}
                        onChange={(e) => setChatgptUrl(e.target.value)}
                        className="glass bg-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="aiCategory">Category</Label>
                      <Select value={aiCategory} onValueChange={setAiCategory}>
                        <SelectTrigger className="glass bg-transparent">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Business Strategy">Business Strategy</SelectItem>
                          <SelectItem value="AI & Technology">AI & Technology</SelectItem>
                          <SelectItem value="Workflow Automation">Workflow Automation</SelectItem>
                          <SelectItem value="Leadership">Leadership</SelectItem>
                          <SelectItem value="Digital Transformation">Digital Transformation</SelectItem>
                          <SelectItem value="Operational Efficiency">Operational Efficiency</SelectItem>
                          <SelectItem value="Innovation">Innovation</SelectItem>
                          <SelectItem value="Data Intelligence">Data Intelligence</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="targetLength">Target Length (words)</Label>
                      <Select value={targetLength} onValueChange={setTargetLength}>
                        <SelectTrigger className="glass bg-transparent">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="800">800 words</SelectItem>
                          <SelectItem value="1200">1200 words</SelectItem>
                          <SelectItem value="1500">1500 words</SelectItem>
                          <SelectItem value="2000">2000 words</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <Button
                    onClick={generateBlogsWithCompanyBrief}
                    disabled={generatingBlogs || !companyBrief.trim()}
                    className="glass-button glow-primary w-full"
                  >
                    {generatingBlogs ? (
                      <Loader2 size={16} className="mr-2 animate-spin" />
                    ) : (
                      <Wand2 size={16} className="mr-2" />
                    )}
                    Generate 3 Targeted Strategic Blogs
                  </Button>
                </div>

                {savedBriefing && (
                  <div className="mt-4 p-3 bg-muted/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Last used briefing: {savedBriefing.substring(0, 100)}...
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Generated Blogs Display */}
        {generatedBlogs.length > 0 && (
          <div className="space-y-6">
            <div className="glass-card p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <h3 className="text-lg font-semibold">Generated Blogs</h3>
                <Button
                  onClick={generateAllThumbnails}
                  disabled={generatingAllThumbnails}
                  className="glass-button"
                >
                  {generatingAllThumbnails ? (
                    <Loader2 size={16} className="mr-2 animate-spin" />
                  ) : (
                    <ImageIcon size={16} className="mr-2" />
                  )}
                  Generate All Thumbnails
                </Button>
              </div>
              
              <div className="grid gap-6">
                {generatedBlogs.map((blog, index) => (
                  <Card key={index} className="glass-card">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg">{blog.title}</h4>
                          <p className="text-sm text-muted-foreground">{blog.excerpt}</p>
                        </div>
                       <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPreviewBlog(blog);
                              setShowPreview(true);
                            }}
                            className="glass-button"
                          >
                            <Eye size={16} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateThumbnailForBlog(index)}
                            disabled={generatingThumbnails[index]}
                            className="glass-button"
                          >
                            {generatingThumbnails[index] ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <ImageIcon size={16} />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActiveEditingBlog(activeEditingBlog === index ? null : index)}
                            className="glass-button"
                          >
                            {activeEditingBlog === index ? 'Close' : 'Edit'}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => saveBlog(blog, index)}
                            disabled={saving}
                            className="glass-button glow-primary"
                          >
                            {saving ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Save size={16} />
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      {blog.hero_image && (
                        <div className="mb-4">
                          <img 
                            src={blog.hero_image} 
                            alt={blog.hero_image_alt || 'Blog thumbnail'} 
                            className="w-full h-48 object-cover rounded-lg"
                          />
                        </div>
                      )}
                      
                      {activeEditingBlog === index && (
                        <div className="mt-4 pt-4 border-t space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor={`title-${index}`}>Title</Label>
                              <Input
                                id={`title-${index}`}
                                value={blog.title}
                                onChange={(e) => handleInputChange('title', e.target.value)}
                                className="glass bg-transparent"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`category-${index}`}>Category</Label>
                              <Input
                                id={`category-${index}`}
                                value={blog.category}
                                onChange={(e) => handleInputChange('category', e.target.value)}
                                className="glass bg-transparent"
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor={`excerpt-${index}`}>Excerpt</Label>
                            <Textarea
                              id={`excerpt-${index}`}
                              value={blog.excerpt}
                              onChange={(e) => handleInputChange('excerpt', e.target.value)}
                              className="glass bg-transparent"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`content-${index}`}>Content</Label>
                            <Textarea
                              id={`content-${index}`}
                              value={blog.content}
                              onChange={(e) => handleInputChange('content', e.target.value)}
                              className="glass bg-transparent min-h-[300px]"
                            />
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="flex items-center space-x-2">
                              <Switch
                                id={`published-${index}`}
                                checked={blog.published}
                                onCheckedChange={(checked) => handleInputChange('published', checked)}
                              />
                              <Label htmlFor={`published-${index}`}>Published</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                id={`featured-${index}`}
                                checked={blog.featured}
                                onCheckedChange={(checked) => handleInputChange('featured', checked)}
                              />
                              <Label htmlFor={`featured-${index}`}>Featured</Label>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Original Single Blog Editor (shown when not using multi-blog generation or when editing existing blog) */}
        {(blog || generatedBlogs.length === 0) && (
          <>
            {/* AI Content Generation (only for new blogs) */}
            {!blog && (
              <div className="glass-card p-4 sm:p-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Generate Content with AI</h3>
                    <div className="grid gap-4">
                      <div>
                        <Label htmlFor="aiTopic">Topic</Label>
                        <Input
                          id="aiTopic"
                          placeholder="Enter the topic you want to write about..."
                          value={aiTopic}
                          onChange={(e) => setAiTopic(e.target.value)}
                          className="glass bg-transparent"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="aiCategory">Category</Label>
                          <Select value={aiCategory} onValueChange={setAiCategory}>
                            <SelectTrigger className="glass bg-transparent">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Business Strategy">Business Strategy</SelectItem>
                          <SelectItem value="AI & Technology">AI & Technology</SelectItem>
                          <SelectItem value="Workflow Automation">Workflow Automation</SelectItem>
                          <SelectItem value="Leadership">Leadership</SelectItem>
                          <SelectItem value="Digital Transformation">Digital Transformation</SelectItem>
                          <SelectItem value="Operational Efficiency">Operational Efficiency</SelectItem>
                          <SelectItem value="Innovation">Innovation</SelectItem>
                          <SelectItem value="Data Intelligence">Data Intelligence</SelectItem>
                        </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="targetLength">Target Length</Label>
                          <Select value={targetLength} onValueChange={setTargetLength}>
                            <SelectTrigger className="glass bg-transparent">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="500">500 words</SelectItem>
                              <SelectItem value="800">800 words</SelectItem>
                              <SelectItem value="1200">1200 words</SelectItem>
                              <SelectItem value="1500">1500 words</SelectItem>
                              <SelectItem value="2000">2000 words</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button
                        onClick={generateContent}
                        disabled={generating || !aiTopic}
                        className="glass-button glow-primary w-full"
                      >
                        {generating ? (
                          <Loader2 size={16} className="mr-2 animate-spin" />
                        ) : (
                          <Wand2 size={16} className="mr-2" />
                        )}
                        Generate Content
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Blog Form */}
            <div className="glass-card p-4 sm:p-6">
              <div className="space-y-6">
                <div className="grid gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={currentData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        placeholder="Enter blog title..."
                        className="glass bg-transparent"
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select value={currentData.category} onValueChange={(value) => handleInputChange('category', value)}>
                        <SelectTrigger className="glass bg-transparent">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Business Strategy">Business Strategy</SelectItem>
                          <SelectItem value="AI & Technology">AI & Technology</SelectItem>
                          <SelectItem value="Workflow Automation">Workflow Automation</SelectItem>
                          <SelectItem value="Leadership">Leadership</SelectItem>
                          <SelectItem value="Digital Transformation">Digital Transformation</SelectItem>
                          <SelectItem value="Operational Efficiency">Operational Efficiency</SelectItem>
                          <SelectItem value="Innovation">Innovation</SelectItem>
                          <SelectItem value="Data Intelligence">Data Intelligence</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="slug">Slug</Label>
                      <Input
                        id="slug"
                        value={currentData.slug}
                        onChange={(e) => handleInputChange('slug', e.target.value)}
                        placeholder="blog-post-slug"
                        className="glass bg-transparent"
                      />
                    </div>
                    <div>
                      <Label htmlFor="author">Author</Label>
                      <Input
                        id="author"
                        value={currentData.author}
                        onChange={(e) => handleInputChange('author', e.target.value)}
                        placeholder="Author name"
                        className="glass bg-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="excerpt">Excerpt</Label>
                    <Textarea
                      id="excerpt"
                      value={currentData.excerpt}
                      onChange={(e) => handleInputChange('excerpt', e.target.value)}
                      placeholder="Brief description of the blog post..."
                      className="glass bg-transparent"
                    />
                  </div>

                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="hero_image">Hero Image URL</Label>
                      <div className="flex gap-2">
                        <Input
                          id="hero_image"
                          value={currentData.hero_image || ''}
                          onChange={(e) => handleInputChange('hero_image', e.target.value)}
                          placeholder="https://example.com/image.jpg"
                          className="glass bg-transparent"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowThumbnailGenerator(true)}
                          className="glass-button shrink-0"
                          size="sm"
                        >
                          <ImageIcon size={16} />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="hero_image_alt">Hero Image Alt Text</Label>
                      <Input
                        id="hero_image_alt"
                        value={currentData.hero_image_alt || ''}
                        onChange={(e) => handleInputChange('hero_image_alt', e.target.value)}
                        placeholder="Alt text for hero image"
                        className="glass bg-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="content">Content (Markdown)</Label>
                    <Textarea
                      id="content"
                      value={currentData.content}
                      onChange={(e) => handleInputChange('content', e.target.value)}
                      placeholder="Write your blog content in markdown..."
                      className="glass bg-transparent min-h-[400px]"
                    />
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="published"
                        checked={currentData.published}
                        onCheckedChange={(checked) => handleInputChange('published', checked)}
                      />
                      <Label htmlFor="published">Published</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="featured"
                        checked={currentData.featured}
                        onCheckedChange={(checked) => handleInputChange('featured', checked)}
                      />
                      <Label htmlFor="featured">Featured</Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Image Management */}
            {blog && (
              <>
                <BlogContentImages
                  content={currentData.content}
                  onImageUpdated={(oldUrl, newUrl) => {
                    const updatedContent = currentData.content.replace(oldUrl, newUrl);
                    handleInputChange('content', updatedContent);
                  }}
                />
              </>
            )}
          </>
        )}
      </div>

      {/* Preview Dialog */}
      <BlogPreviewDialog
        blog={previewBlog}
        open={showPreview}
        onOpenChange={setShowPreview}
      />

      {/* Thumbnail Generator */}
      <ThumbnailGenerator
        isOpen={showThumbnailGenerator}
        onClose={() => setShowThumbnailGenerator(false)}
        blogTitle={currentData.title}
        blogExcerpt={currentData.excerpt}
        blogCategory={currentData.category}
        onThumbnailGenerated={(thumbnailUrl) => {
          handleInputChange('hero_image', thumbnailUrl);
          handleInputChange('hero_image_alt', `Thumbnail for ${currentData.title}`);
        }}
      />
    </div>
  );
};

export default EnhancedBlogEditor;
