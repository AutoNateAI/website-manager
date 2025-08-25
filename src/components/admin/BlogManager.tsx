import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { useToast } from '@/hooks/use-toast';
import { Plus, Wand2, Image, Save, Trash2, Edit, Eye } from 'lucide-react';
import EnhancedBlogEditor from './EnhancedBlogEditor';
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
  content_images?: any;
  created_at: string;
  updated_at: string;
}

const BlogManager = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [filteredBlogs, setFilteredBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBlog, setSelectedBlog] = useState<Blog | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [previewBlog, setPreviewBlog] = useState<Blog | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const blogsPerPage = 6;
  const { toast } = useToast();

  useEffect(() => {
    fetchBlogs();
  }, []);

  useEffect(() => {
    filterBlogs();
  }, [blogs, searchTerm]);

  const filterBlogs = () => {
    if (!searchTerm) {
      setFilteredBlogs(blogs);
      return;
    }

    const filtered = blogs.filter(blog =>
      blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blog.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blog.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blog.author.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setFilteredBlogs(filtered);
    setCurrentPage(1);
  };

  const fetchBlogs = async () => {
    try {
      const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBlogs(data || []);
      setFilteredBlogs(data || []);
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
      setFilteredBlogs(filteredBlogs.filter(blog => blog.id !== id));
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
      setFilteredBlogs(filteredBlogs.map(blog => 
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

  const handlePreview = (blog: Blog) => {
    setPreviewBlog(blog);
    setShowPreview(true);
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredBlogs.length / blogsPerPage);
  const startIndex = (currentPage - 1) * blogsPerPage;
  const endIndex = startIndex + blogsPerPage;
  const currentBlogs = filteredBlogs.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  if (showEditor) {
    return (
      <EnhancedBlogEditor
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold gradient-text">Blog Management</h2>
            <p className="text-muted-foreground mt-1">
              Create, edit, and manage your blog posts
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                placeholder="Search blogs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-64 glass-input"
              />
            </div>
            <Button onClick={handleCreateNew} className="glass-button glow-primary">
              <Plus size={18} className="mr-2" />
              Create New Blog
            </Button>
          </div>
        </div>
      </div>

      {/* Blog List */}
      <div className="grid gap-6">
        {filteredBlogs.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-16 text-center">
              {searchTerm ? (
                <>
                  <Search className="mx-auto w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No blogs found</h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your search terms
                  </p>
                  <Button variant="outline" onClick={() => setSearchTerm('')}>
                    Clear Search
                  </Button>
                </>
              ) : (
                <>
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
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {currentBlogs.map((blog) => (
              <Card key={blog.id} className="glass-card cursor-pointer hover:glow-soft transition-all" onClick={() => handlePreview(blog)}>
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
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePublished(blog.id, blog.published);
                        }}
                        className="glass-button"
                      >
                        <Eye size={16} className="mr-1" />
                        {blog.published ? 'Unpublish' : 'Publish'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(blog);
                        }}
                        className="glass-button"
                      >
                        <Edit size={16} className="mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteBlog(blog.id);
                        }}
                        className="glass-button hover:border-destructive hover:text-destructive"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

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
      </div>

      {/* Blog Preview Dialog */}
      {previewBlog && (
        <BlogPreviewDialog
          blog={previewBlog}
          open={showPreview}
          onOpenChange={setShowPreview}
        />
      )}
    </div>
  );
};

export default BlogManager;