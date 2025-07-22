import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Wand2, Image, Save, Trash2, Edit, Eye } from 'lucide-react';
import BlogEditor from './BlogEditor';

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
  content_images?: any;
  created_at: string;
  updated_at: string;
}

const BlogManager = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBlog, setSelectedBlog] = useState<Blog | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBlogs(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch blogs: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteBlog = async (id: string) => {
    if (!confirm('Are you sure you want to delete this blog?')) return;

    try {
      const { error } = await supabase
        .from('blogs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setBlogs(blogs.filter(blog => blog.id !== id));
      toast({
        title: "Success",
        description: "Blog deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete blog: " + error.message,
        variant: "destructive",
      });
    }
  };

  const togglePublished = async (id: string, published: boolean) => {
    try {
      const { error } = await supabase
        .from('blogs')
        .update({ published: !published })
        .eq('id', id);

      if (error) throw error;

      setBlogs(blogs.map(blog => 
        blog.id === id ? { ...blog, published: !published } : blog
      ));

      toast({
        title: "Success",
        description: `Blog ${!published ? 'published' : 'unpublished'} successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update blog status: " + error.message,
        variant: "destructive",
      });
    }
  };

  const handleCreateNew = () => {
    setSelectedBlog(null);
    setShowEditor(true);
  };

  const handleEdit = (blog: Blog) => {
    setSelectedBlog(blog);
    setShowEditor(true);
  };

  const handleEditorClose = () => {
    setShowEditor(false);
    setSelectedBlog(null);
    fetchBlogs(); // Refresh the list
  };

  if (showEditor) {
    return (
      <BlogEditor
        blog={selectedBlog}
        onClose={handleEditorClose}
      />
    );
  }

  if (loading) {
    return (
      <div className="glass-card p-8">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold gradient-text">Blog Management</h2>
            <p className="text-muted-foreground mt-1">
              Create, edit, and manage your blog posts
            </p>
          </div>
          <Button onClick={handleCreateNew} className="glass-button glow-primary">
            <Plus size={18} className="mr-2" />
            Create New Blog
          </Button>
        </div>
      </div>

      {/* Blog List */}
      <div className="grid gap-6">
        {blogs.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-16 text-center">
              <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                <Wand2 className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No blogs yet</h3>
              <p className="text-muted-foreground mb-4">
                Get started by creating your first blog post with AI assistance
              </p>
              <Button onClick={handleCreateNew} className="glass-button">
                <Plus size={16} className="mr-2" />
                Create Your First Blog
              </Button>
            </CardContent>
          </Card>
        ) : (
          blogs.map((blog) => (
            <Card key={blog.id} className="glass-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold">{blog.title}</h3>
                      <Badge variant={blog.published ? "default" : "secondary"}>
                        {blog.published ? "Published" : "Draft"}
                      </Badge>
                      {blog.featured && (
                        <Badge variant="outline" className="border-accent text-accent">
                          Featured
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground mb-3">{blog.excerpt}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Category: {blog.category}</span>
                      <span>Author: {blog.author}</span>
                      <span>Read time: {blog.read_time}</span>
                      <span>Created: {new Date(blog.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => togglePublished(blog.id, blog.published)}
                      className="glass-button"
                    >
                      <Eye size={16} className="mr-1" />
                      {blog.published ? 'Unpublish' : 'Publish'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(blog)}
                      className="glass-button"
                    >
                      <Edit size={16} className="mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteBlog(blog.id)}
                      className="glass-button hover:border-destructive hover:text-destructive"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default BlogManager;