import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Eye, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import BlogPreviewDialog from './BlogPreviewDialog';

const PreviewManager = () => {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [selectedBlogId, setSelectedBlogId] = useState('');
  const [selectedBlog, setSelectedBlog] = useState<any>(null);
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewBlog, setPreviewBlog] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [blogsResult, adsResult] = await Promise.all([
        supabase.from('blogs').select('*').eq('published', true),
        supabase.from('advertisements').select('*').eq('is_active', true)
      ]);

      if (blogsResult.error) throw blogsResult.error;
      if (adsResult.error) throw adsResult.error;

      setBlogs(blogsResult.data || []);
      setAds(adsResult.data || []);
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

  const handleBlogSelect = async (blogId: string) => {
    setSelectedBlogId(blogId);
    const blog = blogs.find(b => b.id === blogId);
    setSelectedBlog(blog);
  };

  const handleBlogPreview = (blog: any) => {
    setPreviewBlog(blog);
    setPreviewDialogOpen(true);
  };

  const renderContentWithInserts = (content: string, contentImages: any[], ads: any[]): (string | JSX.Element)[] => {
    if (!content) return [];

    const lines = content.split('\n');
    const result: (string | JSX.Element)[] = [];
    let headingCount = 0;
    let insertKey = 0;

    for (const line of lines) {
      result.push(line);
      
      // Check if line is a heading (# or ##)
      if (line.match(/^#{1,2}\s+/)) {
        headingCount++;
        
        // Insert images based on position
        const imagesForThisPosition = contentImages.filter(
          img => img.position === `after_heading_${headingCount}`
        );
        
        imagesForThisPosition.forEach(image => {
          result.push('');
          result.push(
            <div key={`image-${insertKey++}`} className="content-image my-6">
              <img src={image.url} alt={image.alt || ''} className="w-full rounded-lg" />
              {image.caption && (
                <p className="text-sm text-muted-foreground mt-2 text-center italic">{image.caption}</p>
              )}
            </div>
          );
          result.push('');
        });
        
        // Insert ad after every 2 headings (but not if we just inserted an image)
        if (headingCount % 2 === 0 && ads.length > 0 && imagesForThisPosition.length === 0) {
          const randomAd = ads[Math.floor(Math.random() * ads.length)];
          result.push('');
          result.push(
            <div key={`ad-${insertKey++}`} className="ad-container my-6 p-4 border border-primary/20 rounded-lg bg-primary/5">
              <div className="text-xs text-muted-foreground mb-2">Advertisement</div>
              {randomAd.image_url && (
                <img src={randomAd.image_url} alt={randomAd.alt_text || randomAd.title} className="w-full max-w-sm mx-auto rounded" />
              )}
              <div className="text-center mt-2">
                <h4 className="font-semibold">{randomAd.title}</h4>
              </div>
            </div>
          );
          result.push('');
        }
      }
    }

    return result;
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold gradient-text">Preview</h2>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Preview how your blogs will look with advertisements
            </p>
          </div>
        </div>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Select Blog to Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedBlogId} onValueChange={handleBlogSelect}>
            <SelectTrigger className="glass bg-transparent">
              <SelectValue placeholder="Choose a blog to preview" />
            </SelectTrigger>
            <SelectContent>
              {blogs.map(blog => (
                <SelectItem key={blog.id} value={blog.id}>
                  {blog.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedBlog && (
        <Card className="glass-card">
          <CardContent className="p-4 sm:p-8">
            <article className="prose prose-invert max-w-none prose-sm sm:prose-base">
              {selectedBlog.hero_image && (
                <img 
                  src={selectedBlog.hero_image} 
                  alt={selectedBlog.hero_image_alt || selectedBlog.title}
                  className="w-full h-64 object-cover rounded-lg mb-6"
                />
              )}
              
              <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-2">{selectedBlog.title}</h1>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                  <span>By {selectedBlog.author}</span>
                  <span>{selectedBlog.category}</span>
                  <span>{selectedBlog.read_time}</span>
                </div>
              </div>

              <div className="text-lg text-muted-foreground mb-8">
                {selectedBlog.excerpt}
              </div>

              <div>
                {renderContentWithInserts(selectedBlog.content, selectedBlog.content_images || [], ads).map((element, index) => {
                  if (typeof element === 'string') {
                    return (
                      <ReactMarkdown 
                        key={index}
                        components={{
                          h1: ({ children }) => <h1 className="text-2xl font-bold mt-8 mb-4 gradient-text">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-xl font-semibold mt-6 mb-3 text-primary">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-lg font-medium mt-4 mb-2">{children}</h3>,
                          p: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-2">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-2">{children}</ol>,
                        }}
                      >
                        {element}
                      </ReactMarkdown>
                    );
                  }
                  return element;
                })}
              </div>
            </article>
          </CardContent>
        </Card>
      )}

      {/* Blog List for Quick Preview */}
      {blogs.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Quick Blog Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {blogs.map(blog => (
                <div
                  key={blog.id}
                  className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleBlogPreview(blog)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-sm truncate flex-1">{blog.title}</h3>
                    <Eye className="h-4 w-4 text-muted-foreground ml-2" />
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {blog.excerpt}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">{blog.category}</Badge>
                    {blog.published && <Badge className="text-xs bg-green-500/20 text-green-400">Published</Badge>}
                    {blog.featured && <Badge className="text-xs bg-yellow-500/20 text-yellow-400">Featured</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <BlogPreviewDialog
        blog={previewBlog}
        open={previewDialogOpen}
        onOpenChange={setPreviewDialogOpen}
        contentImages={previewBlog?.content_images || []}
        ads={ads}
      />
    </div>
  );
};

export default PreviewManager;