import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { useToast } from '@/hooks/use-toast';
import { Upload, Edit, Trash2, Plus, Sparkles } from 'lucide-react';
import BlogImageCreator from './BlogImageCreator';
import GenerationProgress from './GenerationProgress';
import ImageViewer from './ImageViewer';
import BlogAssignmentSelector from './BlogAssignmentSelector';

interface Image {
  id: string;
  title: string;
  alt_text?: string;
  caption?: string;
  url: string;
  width?: number;
  height?: number;
  created_at: string;
  blog_id?: string;
  blog_section?: string;
  generation_batch_id?: string;
}

interface Blog {
  id: string;
  title: string;
  content: string;
}

const ImageManager = () => {
  const [images, setImages] = useState<Image[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingImage, setEditingImage] = useState<Image | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    alt_text: '',
    caption: '',
    url: '',
    width: '',
    height: ''
  });
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingImage, setGeneratingImage] = useState(false);
  const [viewingImage, setViewingImage] = useState<Image | null>(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredImages, setFilteredImages] = useState<Image[]>([]);
  const imagesPerPage = 6;
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterImages();
  }, [images, searchTerm]);

  const filterImages = () => {
    if (!searchTerm) {
      setFilteredImages(images);
      return;
    }

    const filtered = images.filter(image =>
      image.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (image.alt_text && image.alt_text.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (image.caption && image.caption.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    setFilteredImages(filtered);
    setCurrentPage(1);
  };

  const fetchData = async () => {
    try {
      const [imagesResult, blogsResult] = await Promise.all([
        supabase.from('images').select(`
          *, 
          blogs!blog_id(title)
        `).order('created_at', { ascending: false }),
        supabase.from('blogs').select('id, title, content').order('title')
      ]);

      if (imagesResult.error) throw imagesResult.error;
      if (blogsResult.error) throw blogsResult.error;

      setImages(imagesResult.data || []);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const imageData = {
        title: formData.title,
        alt_text: formData.alt_text || null,
        caption: formData.caption || null,
        url: formData.url,
        width: formData.width ? parseInt(formData.width) : null,
        height: formData.height ? parseInt(formData.height) : null,
      };

      if (editingImage) {
        const { error } = await supabase
          .from('images')
          .update(imageData)
          .eq('id', editingImage.id);
        
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Image updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('images')
          .insert([imageData]);
        
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Image added successfully",
        });
      }

      resetForm();
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteImage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      const { error } = await supabase
        .from('images')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Image deleted successfully",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const assignImageToBlog = async (imageId: string, blogId: string, position: string) => {
    try {
      const { error } = await supabase
        .from('blog_images')
        .insert([{
          blog_id: blogId,
          image_id: imageId,
          position,
          display_order: 1
        }]);

      if (error) throw error;

      // Rebuild the content_images array for the blog
      const { error: rebuildError } = await supabase.rpc('rebuild_blog_content_images', {
        blog_id_param: blogId
      });

      if (rebuildError) throw rebuildError;

      toast({
        title: "Success",
        description: "Image assigned to blog successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const generateImageWithAI = async () => {
    if (!aiPrompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt for AI image generation",
        variant: "destructive",
      });
      return;
    }

    setGeneratingImage(true);
    try {
      const fullPrompt = `${aiPrompt}. 
        Style: Professional illustration, modern design, high quality, detailed, 
        wide format (1536x1024), suitable for blog content, engaging visual.
        CRITICAL: Always include a vibrant, colorful background - NO transparent backgrounds.
        Use rich colors, gradients, or textured backgrounds that complement the subject.`;

      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: {
          prompt: fullPrompt,
          size: "1536x1024",
          quality: "high"
        }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      // Set the generated image URL and title in the form
      setFormData({
        ...formData,
        url: data.imageUrl,
        title: aiPrompt.slice(0, 100), // Use first 100 chars of prompt as title
        alt_text: aiPrompt,
        width: '1024',
        height: '1024'
      });

      toast({
        title: "Success",
        description: "Image generated successfully! You can now save it.",
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

  const resetForm = () => {
    setFormData({
      title: '',
      alt_text: '',
      caption: '',
      url: '',
      width: '',
      height: ''
    });
    setAiPrompt('');
    setEditingImage(null);
    setShowAddDialog(false);
  };

  const openEditDialog = (image: Image) => {
    setEditingImage(image);
    setFormData({
      title: image.title,
      alt_text: image.alt_text || '',
      caption: image.caption || '',
      url: image.url,
      width: image.width?.toString() || '',
      height: image.height?.toString() || ''
    });
    setShowAddDialog(true);
  };

  const openImageViewer = (image: Image) => {
    setViewingImage(image);
    setShowImageViewer(true);
  };

  const closeImageViewer = () => {
    setViewingImage(null);
    setShowImageViewer(false);
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredImages.length / imagesPerPage);
  const startIndex = (currentPage - 1) * imagesPerPage;
  const endIndex = startIndex + imagesPerPage;
  const currentImages = filteredImages.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
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
            <h2 className="text-2xl font-bold gradient-text">Image Library</h2>
            <p className="text-muted-foreground mt-1">
              Manage your blog images and AI-generated content
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                placeholder="Search images..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-64 glass-input"
              />
            </div>
            <BlogImageCreator />
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto glass-button" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="sm:inline">Add Image</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-card max-w-lg mx-4">
                <DialogHeader>
                  <DialogTitle>{editingImage ? 'Edit Image' : 'Add New Image'}</DialogTitle>
                </DialogHeader>
                
                {editingImage ? (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Title</label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                        className="glass bg-transparent"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Image URL</label>
                      <Input
                        value={formData.url}
                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                        required
                        className="glass bg-transparent"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Alt Text</label>
                      <Input
                        value={formData.alt_text}
                        onChange={(e) => setFormData({ ...formData, alt_text: e.target.value })}
                        className="glass bg-transparent"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Caption</label>
                      <Textarea
                        value={formData.caption}
                        onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                        className="glass bg-transparent"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Width</label>
                        <Input
                          type="number"
                          value={formData.width}
                          onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                          className="glass bg-transparent"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Height</label>
                        <Input
                          type="number"
                          value={formData.height}
                          onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                          className="glass bg-transparent"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button type="submit" className="flex-1">
                        Update Image
                      </Button>
                      <Button type="button" variant="outline" onClick={resetForm}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <Tabs defaultValue="manual" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="manual" className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        Manual Entry
                      </TabsTrigger>
                      <TabsTrigger value="ai" className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        AI Generate
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="manual">
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Title</label>
                          <Input
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                            className="glass bg-transparent"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Image URL</label>
                          <Input
                            value={formData.url}
                            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                            required
                            className="glass bg-transparent"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Alt Text</label>
                          <Input
                            value={formData.alt_text}
                            onChange={(e) => setFormData({ ...formData, alt_text: e.target.value })}
                            className="glass bg-transparent"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Caption</label>
                          <Textarea
                            value={formData.caption}
                            onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                            className="glass bg-transparent"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium">Width</label>
                            <Input
                              type="number"
                              value={formData.width}
                              onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                              className="glass bg-transparent"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Height</label>
                            <Input
                              type="number"
                              value={formData.height}
                              onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                              className="glass bg-transparent"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 pt-4">
                          <Button type="submit" className="flex-1">
                            Add Image
                          </Button>
                          <Button type="button" variant="outline" onClick={resetForm}>
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </TabsContent>
                    
                    <TabsContent value="ai" className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">AI Prompt</label>
                        <Textarea
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          placeholder="Describe the image you want to generate (e.g., 'A futuristic city skyline at sunset with flying cars')"
                          className="glass bg-transparent"
                          rows={3}
                        />
                      </div>
                      
                      <Button 
                        onClick={generateImageWithAI} 
                        disabled={generatingImage || !aiPrompt.trim()}
                        className="w-full"
                      >
                        {generatingImage ? (
                          <>
                            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Generate with AI
                          </>
                        )}
                      </Button>
                      
                      {formData.url && (
                        <>
                          <div className="border rounded-lg p-4 glass">
                            <div className="aspect-video bg-muted rounded-lg mb-4 overflow-hidden">
                              <img 
                                src={formData.url} 
                                alt="Generated preview"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Preview of generated image. You can edit the details below before saving.
                            </p>
                          </div>
                          
                          <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                              <label className="text-sm font-medium">Title</label>
                              <Input
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                                className="glass bg-transparent"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Alt Text</label>
                              <Input
                                value={formData.alt_text}
                                onChange={(e) => setFormData({ ...formData, alt_text: e.target.value })}
                                className="glass bg-transparent"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Caption</label>
                              <Textarea
                                value={formData.caption}
                                onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                                className="glass bg-transparent"
                              />
                            </div>
                            <div className="flex gap-2 pt-4">
                              <Button type="submit" className="flex-1">
                                Save Generated Image
                              </Button>
                              <Button type="button" variant="outline" onClick={resetForm}>
                                Cancel
                              </Button>
                            </div>
                          </form>
                        </>
                      )}
                    </TabsContent>
                  </Tabs>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <GenerationProgress />

      {/* Images Grid */}
      {filteredImages.length === 0 ? (
        <div className="text-center py-12">
          {searchTerm ? (
            <>
              <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No images found</h3>
              <p className="text-muted-foreground mb-4">Try adjusting your search terms</p>
              <Button variant="outline" onClick={() => setSearchTerm('')}>
                Clear Search
              </Button>
            </>
          ) : (
            <>
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No images yet</h3>
              <p className="text-muted-foreground mb-4">Start by adding your first image</p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Image
              </Button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {currentImages.map((image) => (
              <Card key={image.id} className="glass-card">
                <CardContent className="p-4">
                  <div 
                    className="aspect-video bg-muted rounded-lg mb-4 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => openImageViewer(image)}
                  >
                    <img 
                      src={image.url} 
                      alt={image.alt_text || image.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder.svg';
                      }}
                    />
                  </div>
                  
                  <h3 className="font-semibold mb-2 truncate">{image.title}</h3>
                  
                  {/* Blog and Section Tags */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {image.blog_id && (image as any).blogs && (
                      <Badge variant="outline" className="text-xs">
                        📖 {(image as any).blogs.title}
                      </Badge>
                    )}
                    {image.blog_section && (
                      <Badge variant="secondary" className="text-xs">
                        📍 {image.blog_section}
                      </Badge>
                    )}
                    {image.generation_batch_id && (
                      <Badge variant="outline" className="text-xs">
                        🤖 AI Generated
                      </Badge>
                    )}
                  </div>
                  
                  {image.caption && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {image.caption}
                    </p>
                  )}
                  
                  <div className="flex gap-2 mb-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(image)}
                      className="flex-1 sm:flex-none"
                    >
                      <Edit className="h-3 w-3 sm:mr-1" />
                      <span className="hidden sm:inline">Edit</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteImage(image.id)}
                      className="flex-1 sm:flex-none"
                    >
                      <Trash2 className="h-3 w-3 sm:mr-1" />
                      <span className="hidden sm:inline">Delete</span>
                    </Button>
                  </div>

                  <BlogAssignmentSelector 
                    imageId={image.id}
                    blogs={blogs}
                    onAssign={assignImageToBlog}
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) goToPage(currentPage - 1);
                      }}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          goToPage(page);
                        }}
                        isActive={currentPage === page}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages) goToPage(currentPage + 1);
                      }}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}

      <ImageViewer 
        isOpen={showImageViewer}
        onClose={closeImageViewer}
        imageUrl={viewingImage?.url || ''}
        altText={viewingImage?.alt_text}
        caption={viewingImage?.caption}
      />
    </div>
  );
};

export default ImageManager;