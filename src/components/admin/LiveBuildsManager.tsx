import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Sparkles, 
  Copy, 
  Calendar,
  Image as ImageIcon,
  Users,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface LiveBuild {
  id: string;
  title: string;
  description: string;
  short_description?: string;
  scheduled_date: string;
  duration_minutes?: number;
  max_attendees?: number;
  current_attendees?: number;
  status: string;
  is_published: boolean;
  tags?: any;
  calendly_url?: string;
  replay_url?: string;
  image_url?: string;
  content?: string;
  created_at: string;
  updated_at: string;
}

const ITEMS_PER_PAGE = 6;

const LiveBuildsManager = () => {
  const [liveBuilds, setLiveBuilds] = useState<LiveBuild[]>([]);
  const [filteredBuilds, setFilteredBuilds] = useState<LiveBuild[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBuild, setEditingBuild] = useState<LiveBuild | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [generatingContent, setGeneratingContent] = useState(false);
  const [generatingThumbnail, setGeneratingThumbnail] = useState(false);
  const [userContext, setUserContext] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    short_description: '',
    scheduled_date: '',
    duration_minutes: 60,
    max_attendees: 50,
    status: 'upcoming',
    is_published: true,
    calendly_url: '',
    replay_url: '',
    image_url: '',
    content: '',
    tags: [] as string[]
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchLiveBuilds();
  }, []);

  useEffect(() => {
    filterBuilds();
  }, [liveBuilds, searchTerm]);

  const fetchLiveBuilds = async () => {
    try {
      const { data, error } = await supabase
        .from('live_builds')
        .select('*')
        .order('scheduled_date', { ascending: false });

      if (error) throw error;
      setLiveBuilds(data.map(build => ({
        ...build,
        tags: Array.isArray(build.tags) ? build.tags : []
      })) || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch live builds: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterBuilds = () => {
    if (!searchTerm) {
      setFilteredBuilds(liveBuilds);
      return;
    }

    const filtered = liveBuilds.filter(build =>
      build.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      build.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (build.short_description && build.short_description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    setFilteredBuilds(filtered);
    setCurrentPage(1);
  };

  const getPaginatedBuilds = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredBuilds.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredBuilds.length / ITEMS_PER_PAGE);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      short_description: '',
      scheduled_date: '',
      duration_minutes: 60,
      max_attendees: 50,
      status: 'upcoming',
      is_published: true,
      calendly_url: '',
      replay_url: '',
      image_url: '',
      content: '',
      tags: []
    });
    setEditingBuild(null);
    setUserContext('');
    setShowForm(false);
  };

  const handleCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (build: LiveBuild) => {
    setFormData({
      title: build.title,
      description: build.description,
      short_description: build.short_description || '',
      scheduled_date: build.scheduled_date ? new Date(build.scheduled_date).toISOString().slice(0, 16) : '',
      duration_minutes: build.duration_minutes || 60,
      max_attendees: build.max_attendees || 50,
      status: build.status,
      is_published: build.is_published,
      calendly_url: build.calendly_url || '',
      replay_url: build.replay_url || '',
      image_url: build.image_url || '',
      content: build.content || '',
      tags: Array.isArray(build.tags) ? build.tags : []
    });
    setEditingBuild(build);
    setShowForm(true);
  };

  const handleDuplicate = (build: LiveBuild) => {
    setFormData({
      title: `${build.title} (Copy)`,
      description: build.description,
      short_description: build.short_description || '',
      scheduled_date: '',
      duration_minutes: build.duration_minutes || 60,
      max_attendees: build.max_attendees || 50,
      status: 'upcoming',
      is_published: false,
      calendly_url: '',
      replay_url: '',
      image_url: build.image_url || '',
      content: build.content || '',
      tags: Array.isArray(build.tags) ? build.tags : []
    });
    setEditingBuild(null);
    setShowForm(true);
  };

  const generateContent = async () => {
    if (!userContext.trim()) {
      toast({
        title: "Error",
        description: "Please provide context for content generation",
        variant: "destructive",
      });
      return;
    }

    setGeneratingContent(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-blog-content', {
        body: {
          prompt: `Generate compelling live build content for AutoNateAI's business consultancy. 

Context: ${userContext}

Create content for a live build session where we demonstrate building AI-integrated business solutions. Generate:

1. A powerful, action-oriented title that creates urgency for business leaders
2. A comprehensive description that explains the business value and what attendees will learn
3. A short description (1-2 sentences) for previews and social media
4. Full content/agenda that outlines what will be built and demonstrated

Focus on:
- Business transformation and competitive advantage
- Real-world applicability for SMBs, startups, and organizations
- Transparent demonstration using Lovable.dev
- Strategic insights and frameworks
- Actionable outcomes

Target audience: Business executives, startup founders, organizational leaders who need AI-integrated solutions.

Return in JSON format:
{
  "title": "Compelling live build title",
  "description": "Full description of the session and value proposition",
  "short_description": "Brief preview description", 
  "content": "Detailed agenda and learning outcomes"
}`
        }
      });

      if (error) throw error;

      const generatedContent = typeof data.generatedText === 'string' 
        ? JSON.parse(data.generatedText) 
        : data.generatedText;

      setFormData(prev => ({
        ...prev,
        title: generatedContent.title || prev.title,
        description: generatedContent.description || prev.description,
        short_description: generatedContent.short_description || prev.short_description,
        content: generatedContent.content || prev.content
      }));

      toast({
        title: "Success",
        description: "Content generated successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to generate content: " + error.message,
        variant: "destructive",
      });
    } finally {
      setGeneratingContent(false);
    }
  };

  const generateThumbnail = async () => {
    if (!formData.title || !formData.description) {
      toast({
        title: "Error",
        description: "Please generate content first (title and description required)",
        variant: "destructive",
      });
      return;
    }

    setGeneratingThumbnail(true);
    try {
      const thumbnailPrompt = `Create a scroll-stopping, premium live build thumbnail for "${formData.title}". 
        Description: ${formData.description}. 
        Context: ${userContext}
        
        CRITICAL REQUIREMENTS:
        - Wide format (1536x1024) designed for business executives and decision-makers
        - Include bold, authoritative text overlay that creates urgency and FOMO
        - Text should emphasize "LIVE BUILD", "FREE", or compelling value proposition
        - Use premium business aesthetics: deep blues, strategic golds, professional gradients
        - Include subtle tech/AI graphics: code snippets, dashboards, network nodes, or architectural elements
        - Typography should scream "strategic advantage" and "don't miss this"
        - Professional yet magnetic design that stops busy executives from scrolling
        - Add visual elements that suggest real-time building and transparency
        - Make it irresistible for business leaders who need competitive edge
        
        Make this thumbnail impossible for business decision-makers to ignore!`;

      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { 
          prompt: thumbnailPrompt,
          size: "1536x1024"
        }
      });

      if (error) throw error;

      setFormData(prev => ({
        ...prev,
        image_url: data.imageUrl
      }));

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
      setGeneratingThumbnail(false);
    }
  };

  const saveLiveBuild = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      toast({
        title: "Error",
        description: "Title and description are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const buildData = {
        title: formData.title,
        description: formData.description,
        short_description: formData.short_description || null,
        scheduled_date: formData.scheduled_date ? new Date(formData.scheduled_date).toISOString() : null,
        duration_minutes: formData.duration_minutes,
        max_attendees: formData.max_attendees,
        status: formData.status,
        is_published: formData.is_published,
        calendly_url: formData.calendly_url || null,
        replay_url: formData.replay_url || null,
        image_url: formData.image_url || null,
        content: formData.content || null,
        tags: formData.tags
      };

      if (editingBuild) {
        const { error } = await supabase
          .from('live_builds')
          .update(buildData)
          .eq('id', editingBuild.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('live_builds')
          .insert([buildData]);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Live build ${editingBuild ? 'updated' : 'created'} successfully!`,
      });

      resetForm();
      fetchLiveBuilds();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteLiveBuild = async (id: string) => {
    if (!confirm('Are you sure you want to delete this live build?')) return;

    try {
      const { error } = await supabase
        .from('live_builds')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Live build deleted successfully",
      });

      fetchLiveBuilds();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const togglePublished = async (id: string, isPublished: boolean) => {
    try {
      const { error } = await supabase
        .from('live_builds')
        .update({ is_published: !isPublished })
        .eq('id', id);

      if (error) throw error;

      fetchLiveBuilds();
      
      toast({
        title: "Success",
        description: `Live build ${!isPublished ? 'published' : 'unpublished'} successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
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
      {/* Header with Search and Create */}
      <div className="glass-card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold gradient-text">Live Builds Management</h2>
            <p className="text-muted-foreground mt-1">
              Manage live build sessions and demonstrations
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                placeholder="Search live builds..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-64 glass-input"
              />
            </div>
            <Button 
              onClick={handleCreate}
              className="glass-button glow-primary"
            >
              <Plus size={18} className="mr-2" />
              Create Live Build
            </Button>
          </div>
        </div>
      </div>

      {/* Live Builds Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {getPaginatedBuilds().map((build) => (
          <Card key={build.id} className="glass-card hover:glow-primary transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">{build.title}</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={build.status === 'upcoming' ? 'default' : build.status === 'live' ? 'destructive' : 'secondary'}>
                      {build.status}
                    </Badge>
                    <Switch
                      checked={build.is_published}
                      onCheckedChange={() => togglePublished(build.id, build.is_published)}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {build.image_url && (
                <div className="w-full h-32 rounded-lg overflow-hidden bg-muted">
                  <img 
                    src={build.image_url} 
                    alt={build.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('Image failed to load:', build.image_url);
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center text-muted-foreground"><span>Image unavailable</span></div>';
                    }}
                  />
                </div>
              )}
              <p className="text-sm text-muted-foreground line-clamp-2">
                {build.short_description || build.description}
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {build.scheduled_date && (
                  <div className="flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(build.scheduled_date).toLocaleDateString()}
                  </div>
                )}
                {build.duration_minutes && (
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    {build.duration_minutes}m
                  </div>
                )}
                {build.max_attendees && (
                  <div className="flex items-center gap-1">
                    <Users size={12} />
                    {build.current_attendees || 0}/{build.max_attendees}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(build)}
                  className="flex-1 glass-button"
                >
                  <Edit size={14} className="mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDuplicate(build)}
                  className="flex-1 glass-button"
                >
                  <Copy size={14} className="mr-1" />
                  Duplicate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => deleteLiveBuild(build.id)}
                  className="glass-button hover:bg-destructive/20"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="glass-button"
          >
            <ChevronLeft size={16} />
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(page)}
                className={currentPage === page ? "glass-button glow-primary" : "glass-button"}
              >
                {page}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="glass-button"
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="glass-card max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingBuild ? 'Edit Live Build' : 'Create Live Build'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* AI Content Generation */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles size={18} />
                  AI Content Generation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Context for AI Generation</label>
                  <Textarea
                    placeholder="Provide context about the live build topic, target audience, specific problems to solve, or business value to demonstrate..."
                    value={userContext}
                    onChange={(e) => setUserContext(e.target.value)}
                    className="glass-input h-24"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={generateContent}
                    disabled={generatingContent}
                    className="glass-button glow-primary"
                  >
                    {generatingContent ? "Generating..." : "Generate Content"}
                  </Button>
                  <Button
                    onClick={generateThumbnail}
                    disabled={generatingThumbnail || !formData.title}
                    className="glass-button glow-accent"
                  >
                    <ImageIcon size={16} className="mr-2" />
                    {generatingThumbnail ? "Generating..." : "Generate Thumbnail"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  placeholder="Live build title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="glass-input"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className="glass-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Short Description</label>
              <Input
                placeholder="Brief description for previews"
                value={formData.short_description}
                onChange={(e) => setFormData(prev => ({ ...prev, short_description: e.target.value }))}
                className="glass-input"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Full description of the live build session"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="glass-input h-32"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Content/Agenda</label>
              <Textarea
                placeholder="Detailed agenda and learning outcomes"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                className="glass-input h-32"
              />
            </div>

            {/* Schedule and Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Scheduled Date & Time</label>
                <Input
                  type="datetime-local"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduled_date: e.target.value }))}
                  className="glass-input"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Duration (minutes)</label>
                <Input
                  type="number"
                  min="15"
                  max="240"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 60 }))}
                  className="glass-input"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Max Attendees</label>
                <Input
                  type="number"
                  min="1"
                  value={formData.max_attendees}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_attendees: parseInt(e.target.value) || 50 }))}
                  className="glass-input"
                />
              </div>
            </div>

            {/* URLs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Calendly URL</label>
                <Input
                  placeholder="https://calendly.com/..."
                  value={formData.calendly_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, calendly_url: e.target.value }))}
                  className="glass-input"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Replay URL</label>
                <Input
                  placeholder="https://..."
                  value={formData.replay_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, replay_url: e.target.value }))}
                  className="glass-input"
                />
              </div>
            </div>

            {/* Thumbnail */}
            <div>
              <label className="text-sm font-medium">Thumbnail URL</label>
              <Input
                placeholder="https://..."
                value={formData.image_url}
                onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                className="glass-input"
              />
              {formData.image_url && (
                <div className="mt-2 w-full h-32 rounded-lg overflow-hidden bg-muted">
                  <img 
                    src={formData.image_url} 
                    alt="Thumbnail preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('Preview image failed to load:', formData.image_url);
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center text-muted-foreground"><span>Preview unavailable</span></div>';
                    }}
                  />
                </div>
              )}
            </div>

            {/* Published Toggle */}
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_published}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_published: checked }))}
              />
              <label className="text-sm font-medium">Published</label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={resetForm}
                className="glass-button"
              >
                Cancel
              </Button>
              <Button
                onClick={saveLiveBuild}
                className="glass-button glow-primary"
              >
                {editingBuild ? 'Update' : 'Create'} Live Build
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LiveBuildsManager;