import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Wand2, Eye } from "lucide-react";

interface Blog {
  id: string;
  title: string;
  content: string;
  category: string;
  slug: string;
}

interface GeneratedAd {
  copy: string;
  imageUrl: string;
  title: string;
}

const AD_POSITIONS = [
  { value: 'sidebar', label: 'Sidebar (300x250)', size: '300x250' },
  { value: 'banner', label: 'Banner (1200x90)', size: '1200x90' },
  { value: 'featured', label: 'Featured (800x300)', size: '800x300' },
  { value: 'inline', label: 'Inline (800x200)', size: '800x200' },
  { value: 'bottom', label: 'Bottom (1200x400)', size: '1200x400' }
];

export const BlogAdCreator: React.FC = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [selectedBlog, setSelectedBlog] = useState<string>('');
  const [position, setPosition] = useState<string>('');
  const [linkUrl, setLinkUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAd, setGeneratedAd] = useState<GeneratedAd | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      const { data, error } = await supabase
        .from('blogs')
        .select('id, title, content, category, slug')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBlogs(data || []);
    } catch (error) {
      console.error('Error fetching blogs:', error);
      toast.error('Failed to fetch blogs');
    } finally {
      setLoading(false);
    }
  };

  const generateAd = async () => {
    if (!selectedBlog || !position) {
      toast.error('Please select a blog and position');
      return;
    }

    const blog = blogs.find(b => b.id === selectedBlog);
    if (!blog) return;

    setIsGenerating(true);
    try {
      const positionData = AD_POSITIONS.find(p => p.value === position);
      
      const { data, error } = await supabase.functions.invoke('generate-blog-ad', {
        body: {
          blogTitle: blog.title,
          blogContent: blog.content.substring(0, 2000), // Limit content for API
          blogCategory: blog.category,
          position: position,
          imageSize: positionData?.size || '800x200'
        }
      });

      if (error) throw error;

      setGeneratedAd(data);
      toast.success('Ad generated successfully!');
    } catch (error) {
      console.error('Error generating ad:', error);
      toast.error('Failed to generate ad');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveAd = async () => {
    if (!generatedAd || !selectedBlog || !position || !linkUrl) {
      toast.error('Please complete all fields before saving');
      return;
    }

    try {
      const blog = blogs.find(b => b.id === selectedBlog);
      
      const { data: adData, error: adError } = await supabase
        .from('advertisements')
        .insert({
          title: generatedAd.title,
          image_url: generatedAd.imageUrl,
          link_url: linkUrl,
          position: position,
          target_type: 'specific_post',
          target_value: blog?.slug,
          alt_text: `Advertisement for ${blog?.title}`,
          is_active: true
        })
        .select()
        .single();

      if (adError) throw adError;

      // Create blog-ad relationship
      const { error: relationError } = await supabase
        .from('blog_ads')
        .insert({
          blog_id: selectedBlog,
          advertisement_id: adData.id,
          position_after_heading: 1
        });

      if (relationError) throw relationError;

      toast.success('Ad saved successfully!');
      
      // Reset form
      setGeneratedAd(null);
      setSelectedBlog('');
      setPosition('');
      setLinkUrl('');
    } catch (error) {
      console.error('Error saving ad:', error);
      toast.error('Failed to save ad');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Create AI-Generated Ads for Blogs
          </CardTitle>
          <CardDescription>
            Generate funny ads with optical illusions based on blog content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="blog-select">Select Blog</Label>
              <Select value={selectedBlog} onValueChange={setSelectedBlog}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a blog..." />
                </SelectTrigger>
                <SelectContent>
                  {blogs.map((blog) => (
                    <SelectItem key={blog.id} value={blog.id}>
                      {blog.title} ({blog.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="position-select">Ad Position</Label>
              <Select value={position} onValueChange={setPosition}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose position..." />
                </SelectTrigger>
                <SelectContent>
                  {AD_POSITIONS.map((pos) => (
                    <SelectItem key={pos.value} value={pos.value}>
                      {pos.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="link-url">Link URL</Label>
            <Input
              id="link-url"
              type="url"
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />
          </div>

          <Button 
            onClick={generateAd} 
            disabled={!selectedBlog || !position || isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating Ad...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                Generate AI Ad
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {generatedAd && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Generated Ad Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border border-border rounded-lg p-4 bg-muted/50">
              <h3 className="font-semibold mb-2">{generatedAd.title}</h3>
              <div className="mb-4">
                <img 
                  src={generatedAd.imageUrl} 
                  alt={generatedAd.title}
                  className="max-w-full h-auto rounded-lg border"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                <p><strong>Copy:</strong> {generatedAd.copy}</p>
              </div>
            </div>
            
            <Button onClick={saveAd} className="w-full">
              Save Advertisement
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};