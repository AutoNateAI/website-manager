import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Plus, Trash2, Upload, X, Image as ImageIcon, Loader2, FileText } from 'lucide-react';

interface ImageRequest {
  id: string;
  prompt: string;
  title: string;
  alt_text: string;
  caption: string;
  section: string;
  position: string;
  referenceImage?: string; // base64 image data
}

interface Blog {
  id: string;
  title: string;
  content: string;
}

const BlogImageCreator = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [selectedBlog, setSelectedBlog] = useState<string>('');
  const [imageRequests, setImageRequests] = useState<ImageRequest[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [sharedReferenceImage, setSharedReferenceImage] = useState<string>('');
  const [useSharedReference, setUseSharedReference] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      const { data, error } = await supabase
        .from('blogs')
        .select('id, title, content')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBlogs(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch blogs: " + error.message,
        variant: "destructive",
      });
    }
  };

  const analyzeBlogForImages = async () => {
    if (!selectedBlog) {
      toast({
        title: "Error",
        description: "Please select a blog first",
        variant: "destructive",
      });
      return;
    }

    const blog = blogs.find(b => b.id === selectedBlog);
    if (!blog) return;

    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-blog-for-images', {
        body: {
          blogContent: blog.content,
          blogTitle: blog.title
        }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      const suggestions = data.suggestions.map((suggestion: any) => ({
        id: crypto.randomUUID(),
        prompt: suggestion.prompt,
        title: suggestion.title,
        alt_text: suggestion.alt_text,
        caption: suggestion.reason,
        section: suggestion.section,
        position: suggestion.position
      }));

      setImageRequests(suggestions);

      toast({
        title: "Success",
        description: `Generated ${suggestions.length} image suggestions for your blog!`,
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to analyze blog: " + error.message,
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const addImageRequest = () => {
    const newRequest: ImageRequest = {
      id: crypto.randomUUID(),
      prompt: '',
      title: '',
      alt_text: '',
      caption: '',
      section: '',
      position: 'after_heading'
    };
    setImageRequests([...imageRequests, newRequest]);
  };

  const updateImageRequest = (id: string, field: keyof ImageRequest, value: string) => {
    setImageRequests(requests => 
      requests.map(req => 
        req.id === id ? { ...req, [field]: value } : req
      )
    );
  };

  const removeImageRequest = (id: string) => {
    setImageRequests(requests => requests.filter(req => req.id !== id));
  };

  const handleImageUpload = async (file: File, requestId?: string) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select a valid image file",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      
      if (requestId) {
        updateImageRequest(requestId, 'referenceImage', base64);
      } else {
        setSharedReferenceImage(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeReferenceImage = (requestId?: string) => {
    if (requestId) {
      updateImageRequest(requestId, 'referenceImage', '');
    } else {
      setSharedReferenceImage('');
    }
  };

  const generateBlogImages = async () => {
    if (!selectedBlog) {
      toast({
        title: "Error",
        description: "Please select a blog first",
        variant: "destructive",
      });
      return;
    }

    if (imageRequests.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one image request",
        variant: "destructive",
      });
      return;
    }

    const incompleteRequests = imageRequests.filter(req => !req.prompt.trim() || !req.title.trim());
    if (incompleteRequests.length > 0) {
      toast({
        title: "Error", 
        description: "Please fill in the prompt and title for all image requests",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      const batchId = crypto.randomUUID();
      
      // Start bulk generation
      const { data: bulkData, error: bulkError } = await supabase.functions.invoke('bulk-generate-images', {
        body: {
          images: imageRequests.map(req => ({
            prompt: req.prompt,
            title: req.title,
            alt_text: req.alt_text || req.prompt,
            caption: req.caption,
            size: "1024x1024",
            quality: "high",
            referenceImage: useSharedReference ? sharedReferenceImage : req.referenceImage,
            blog_id: selectedBlog,
            blog_section: req.section
          })),
          batchId
        }
      });

      if (bulkError) throw bulkError;
      if (bulkData.error) throw new Error(bulkData.error);

      // Update blog content with generated images once complete
      const imageUpdates = imageRequests.map(req => ({
        imageUrl: '', // Will be filled when images are generated
        section: req.section,
        alt_text: req.alt_text || req.prompt,
        caption: req.caption
      }));

      // Store the batch and blog info for later update
      if (bulkData.batchId) {
        // We'll trigger the blog update after images are generated
        // This will be handled by the bulk-generate-images function
        const { error: updateError } = await supabase.functions.invoke('update-blog-with-images', {
          body: {
            blogId: selectedBlog,
            batchId: bulkData.batchId
          }
        });
        if (updateError) {
          console.error('Failed to schedule blog update:', updateError);
        }
      }

      toast({
        title: "Success",
        description: `Started generating ${imageRequests.length} images! Images will be automatically added to your blog content once ready.`,
      });

      // Clear the form and close dialog
      setImageRequests([]);
      setSelectedBlog('');
      setSharedReferenceImage('');
      setUseSharedReference(false);
      setShowDialog(false);

    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to start image generation: " + error.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const selectedBlogData = blogs.find(b => b.id === selectedBlog);

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full sm:w-auto">
          <FileText className="h-4 w-4 mr-2" />
          Create Images for Blog
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card max-w-5xl mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Create Images for Blog
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Blog Selection */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Select Blog</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={selectedBlog} onValueChange={setSelectedBlog}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a blog to create images for..." />
                </SelectTrigger>
                <SelectContent>
                  {blogs.map(blog => (
                    <SelectItem key={blog.id} value={blog.id}>
                      {blog.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedBlog && (
                <div className="flex gap-2">
                  <Button 
                    onClick={analyzeBlogForImages}
                    disabled={analyzing}
                    size="sm"
                    variant="outline"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        AI Suggest Images
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={addImageRequest} 
                    size="sm" 
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Manual
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reference Image Options */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Reference Image Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="useSharedReference"
                  checked={useSharedReference}
                  onChange={(e) => setUseSharedReference(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="useSharedReference" className="text-sm font-medium">
                  Use the same reference image for all generations
                </label>
              </div>
              
              {useSharedReference && (
                <div className="space-y-2">
                  <label className="text-xs font-medium">Shared Reference Image</label>
                  {sharedReferenceImage ? (
                    <div className="relative inline-block">
                      <img 
                        src={sharedReferenceImage} 
                        alt="Shared reference" 
                        className="w-20 h-20 object-cover rounded border"
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                        onClick={() => removeReferenceImage()}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                        className="hidden"
                        id="shared-reference-upload"
                      />
                      <label
                        htmlFor="shared-reference-upload"
                        className="inline-flex items-center px-3 py-2 border border-dashed border-muted rounded-lg cursor-pointer hover:bg-accent transition-colors"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Reference Image
                      </label>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Image Requests */}
          {imageRequests.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-muted rounded-lg">
              <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {selectedBlog 
                  ? "No image requests yet. Use AI suggestions or add manually."
                  : "Select a blog first, then use AI to suggest optimal image placements."
                }
              </p>
              {selectedBlog && (
                <div className="flex gap-2 justify-center">
                  <Button onClick={analyzeBlogForImages} disabled={analyzing}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI Suggest Images
                  </Button>
                  <Button variant="outline" onClick={addImageRequest}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Manually
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {imageRequests.map((request, index) => (
                <Card key={request.id} className="glass-card">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-sm">Image {index + 1}</CardTitle>
                        {request.section && (
                          <Badge variant="secondary" className="text-xs">
                            {request.section}
                          </Badge>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeImageRequest(request.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-xs font-medium">AI Prompt *</label>
                      <Textarea
                        value={request.prompt}
                        onChange={(e) => updateImageRequest(request.id, 'prompt', e.target.value)}
                        placeholder="Describe the image you want to generate..."
                        className="glass bg-transparent text-sm"
                        rows={2}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium">Title *</label>
                        <Input
                          value={request.title}
                          onChange={(e) => updateImageRequest(request.id, 'title', e.target.value)}
                          placeholder="Image title"
                          className="glass bg-transparent text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium">Section</label>
                        <Input
                          value={request.section}
                          onChange={(e) => updateImageRequest(request.id, 'section', e.target.value)}
                          placeholder="Blog section/heading"
                          className="glass bg-transparent text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium">Alt Text</label>
                        <Input
                          value={request.alt_text}
                          onChange={(e) => updateImageRequest(request.id, 'alt_text', e.target.value)}
                          placeholder="Alternative text"
                          className="glass bg-transparent text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium">Caption</label>
                        <Input
                          value={request.caption}
                          onChange={(e) => updateImageRequest(request.id, 'caption', e.target.value)}
                          placeholder="Image caption"
                          className="glass bg-transparent text-sm"
                        />
                      </div>
                    </div>
                    
                    {!useSharedReference && (
                      <div>
                        <label className="text-xs font-medium">Individual Reference Image</label>
                        {request.referenceImage ? (
                          <div className="flex items-center gap-2 mt-1">
                            <img 
                              src={request.referenceImage} 
                              alt="Reference" 
                              className="w-12 h-12 object-cover rounded border"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeReferenceImage(request.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="mt-1">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], request.id)}
                              className="hidden"
                              id={`reference-upload-${request.id}`}
                            />
                            <label
                              htmlFor={`reference-upload-${request.id}`}
                              className="inline-flex items-center px-2 py-1 text-xs border border-dashed border-muted rounded cursor-pointer hover:bg-accent transition-colors"
                            >
                              <Upload className="h-3 w-3 mr-1" />
                              Upload Reference
                            </label>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          {imageRequests.length > 0 && (
            <div className="flex gap-2 pt-4 border-t">
              <Button 
                onClick={generateBlogImages} 
                disabled={generating || !selectedBlog}
                className="flex-1"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating & Adding to Blog...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate & Add to Blog ({imageRequests.length})
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowDialog(false)}
                disabled={generating}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BlogImageCreator;