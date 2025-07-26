import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Link2, Trash2 } from "lucide-react";

interface Blog {
  id: string;
  title: string;
  category: string;
  slug: string;
}

interface Advertisement {
  id: string;
  title: string;
  position: string;
  target_type: string;
  target_value: string | null;
  is_active: boolean;
  image_url: string | null;
}

interface BlogAdAssignment {
  id: string;
  blog_id: string;
  advertisement_id: string;
  position_after_heading: number;
  advertisement: Advertisement;
}

export const BlogAdAssignmentSelector: React.FC = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [assignments, setAssignments] = useState<BlogAdAssignment[]>([]);
  const [selectedBlog, setSelectedBlog] = useState<string>('');
  const [selectedAd, setSelectedAd] = useState<string>('');
  const [positionAfterHeading, setPositionAfterHeading] = useState<string>('1');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedBlog) {
      fetchAssignments();
    }
  }, [selectedBlog]);

  const fetchData = async () => {
    try {
      const [blogsResponse, adsResponse] = await Promise.all([
        supabase
          .from('blogs')
          .select('id, title, category, slug')
          .order('created_at', { ascending: false }),
        supabase
          .from('advertisements')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
      ]);

      if (blogsResponse.error) throw blogsResponse.error;
      if (adsResponse.error) throw adsResponse.error;

      setBlogs(blogsResponse.data || []);
      setAdvertisements(adsResponse.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    if (!selectedBlog) return;

    try {
      const { data, error } = await supabase
        .from('blog_ads')
        .select(`
          *,
          advertisement:advertisements(*)
        `)
        .eq('blog_id', selectedBlog);

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast.error('Failed to fetch ad assignments');
    }
  };

  const assignAd = async () => {
    if (!selectedBlog || !selectedAd) {
      toast.error('Please select both a blog and an advertisement');
      return;
    }

    try {
      const { error } = await supabase
        .from('blog_ads')
        .insert({
          blog_id: selectedBlog,
          advertisement_id: selectedAd,
          position_after_heading: parseInt(positionAfterHeading)
        });

      if (error) throw error;

      toast.success('Advertisement assigned successfully!');
      fetchAssignments();
      setSelectedAd('');
      setPositionAfterHeading('1');
    } catch (error) {
      console.error('Error assigning ad:', error);
      toast.error('Failed to assign advertisement');
    }
  };

  const removeAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('blog_ads')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      toast.success('Ad assignment removed');
      fetchAssignments();
    } catch (error) {
      console.error('Error removing assignment:', error);
      toast.error('Failed to remove assignment');
    }
  };

  const getPositionLabel = (position: string) => {
    const positions: Record<string, string> = {
      sidebar: 'Sidebar',
      banner: 'Banner',
      featured: 'Featured',
      inline: 'Inline',
      bottom: 'Bottom'
    };
    return positions[position] || position;
  };

  const getTargetTypeLabel = (targetType: string, targetValue: string | null) => {
    switch (targetType) {
      case 'all':
        return 'All Pages';
      case 'category':
        return `Category: ${targetValue}`;
      case 'specific_post':
        return `Post: ${targetValue}`;
      default:
        return targetType;
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

  const selectedBlogData = blogs.find(b => b.id === selectedBlog);
  const availableAds = advertisements.filter(ad => 
    !assignments.some(assignment => assignment.advertisement_id === ad.id)
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Assign Ads to Blogs
          </CardTitle>
          <CardDescription>
            Connect existing advertisements to specific blog posts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

          {selectedBlog && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ad-select">Select Advertisement</Label>
                  <Select value={selectedAd} onValueChange={setSelectedAd}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an ad..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAds.map((ad) => (
                        <SelectItem key={ad.id} value={ad.id}>
                          {ad.title} ({getPositionLabel(ad.position)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position-heading">Position After Heading</Label>
                  <Select value={positionAfterHeading} onValueChange={setPositionAfterHeading}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          After heading {num}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={assignAd} 
                disabled={!selectedAd}
                className="w-full"
              >
                <Link2 className="h-4 w-4 mr-2" />
                Assign Advertisement
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {selectedBlog && assignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Current Ad Assignments</CardTitle>
            <CardDescription>
              Advertisements assigned to "{selectedBlogData?.title}"
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {assignments.map((assignment) => (
                <div 
                  key={assignment.id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {assignment.advertisement.image_url && (
                      <img 
                        src={assignment.advertisement.image_url} 
                        alt={assignment.advertisement.title}
                        className="w-16 h-12 object-cover rounded border"
                      />
                    )}
                    <div>
                      <h4 className="font-medium">{assignment.advertisement.title}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">
                          {getPositionLabel(assignment.advertisement.position)}
                        </Badge>
                        <span>After heading {assignment.position_after_heading}</span>
                        <Badge variant="secondary">
                          {getTargetTypeLabel(assignment.advertisement.target_type, assignment.advertisement.target_value)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeAssignment(assignment.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedBlog && assignments.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center p-8 text-center">
            <div className="text-muted-foreground">
              <Link2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No ads assigned to this blog yet.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};