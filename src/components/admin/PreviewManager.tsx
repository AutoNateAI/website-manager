import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Eye, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const PreviewManager = () => {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [selectedBlogId, setSelectedBlogId] = useState('');
  const [selectedBlog, setSelectedBlog] = useState<any>(null);
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  const insertAdsInContent = (content: string) => {
    if (!content || ads.length === 0) return content;

    const lines = content.split('\n');
    const result: string[] = [];
    let headingCount = 0;

    for (const line of lines) {
      result.push(line);
      
      // Check if line is a heading (# or ##)
      if (line.match(/^#{1,2}\s+/)) {
        headingCount++;
        
        // Insert ad after every 2 headings
        if (headingCount % 2 === 0 && ads.length > 0) {
          const randomAd = ads[Math.floor(Math.random() * ads.length)];
          result.push('');
          result.push(`<div class="ad-container my-6 p-4 border border-primary/20 rounded-lg bg-primary/5">`);
          result.push(`  <div class="text-xs text-muted-foreground mb-2">Advertisement</div>`);
          if (randomAd.image_url) {
            result.push(`  <img src="${randomAd.image_url}" alt="${randomAd.alt_text || randomAd.title}" class="w-full max-w-sm mx-auto rounded" />`);
          }
          result.push(`  <div class="text-center mt-2">`);
          result.push(`    <h4 class="font-semibold">${randomAd.title}</h4>`);
          result.push(`  </div>`);
          result.push(`</div>`);
          result.push('');
        }
      }
    }

    return result.join('\n');
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
      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold gradient-text">Preview</h2>
            <p className="text-muted-foreground mt-1">
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
          <CardContent className="p-8">
            <article className="prose prose-invert max-w-none">
              {selectedBlog.hero_image && (
                <img 
                  src={selectedBlog.hero_image} 
                  alt={selectedBlog.hero_image_alt || selectedBlog.title}
                  className="w-full h-64 object-cover rounded-lg mb-6"
                />
              )}
              
              <div className="mb-6">
                <h1 className="text-3xl font-bold gradient-text mb-2">{selectedBlog.title}</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>By {selectedBlog.author}</span>
                  <span>{selectedBlog.category}</span>
                  <span>{selectedBlog.read_time}</span>
                </div>
              </div>

              <div className="text-lg text-muted-foreground mb-8">
                {selectedBlog.excerpt}
              </div>

              <ReactMarkdown 
                components={{
                  h1: ({ children }) => <h1 className="text-2xl font-bold mt-8 mb-4 gradient-text">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-xl font-semibold mt-6 mb-3 text-primary">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-lg font-medium mt-4 mb-2">{children}</h3>,
                  p: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-2">{children}</ol>,
                }}
              >
                {insertAdsInContent(selectedBlog.content)}
              </ReactMarkdown>
            </article>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PreviewManager;