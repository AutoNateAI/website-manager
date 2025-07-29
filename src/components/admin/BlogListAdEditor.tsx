import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Edit, Plus } from 'lucide-react';

interface Advertisement {
  id: string;
  title: string;
  image_url?: string;
  position: string;
  width?: number;
  height?: number;
  alt_text?: string;
  is_active: boolean;
}

interface BlogListAdEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

const BlogListAdEditor = ({ isOpen, onClose }: BlogListAdEditorProps) => {
  const [bannerAd, setBannerAd] = useState<Advertisement | null>(null);
  const [sidebarAds, setSidebarAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [title, setTitle] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchBlogListAds();
    }
  }, [isOpen]);

  const fetchBlogListAds = async () => {
    try {
      setLoading(true);
      
      const { data: ads, error } = await supabase
        .from('advertisements')
        .select('*')
        .eq('is_active', true)
        .in('position', ['blog-list-banner', 'blog-list-sidebar']);

      if (error) throw error;

      const banner = ads?.find(ad => ad.position === 'blog-list-banner') || null;
      const sidebars = ads?.filter(ad => ad.position === 'blog-list-sidebar') || [];

      setBannerAd(banner);
      setSidebarAds(sidebars);
    } catch (error) {
      console.error('Error fetching blog list ads:', error);
      toast({
        title: "Error",
        description: "Failed to fetch blog list ads",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateAdWithAI = async (position: string, editingAdId?: string) => {
    if (!prompt.trim() || !title.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both a title and prompt",
        variant: "destructive",
      });
      return;
    }

    try {
      setGenerating(true);
      
      const imageSize = position === 'blog-list-banner' ? '1536x1024' : '1024x1024';
      const formatInstruction = position === 'blog-list-banner' 
        ? 'BANNER FORMAT (1536x1024): Use the wide horizontal space effectively for banner-style layout. Place text strategically across the width, use bold headlines, and create visual hierarchy with text and graphical elements.'
        : 'SQUARE FORMAT (1024x1024): Use the square space efficiently. Place text strategically - consider top/bottom placement for headlines, center for main elements. Make graphical elements complement text placement.';
      
      const enhancedPrompt = `Create a professional advertisement for AutoNateAI with these specific requirements:

CONTEXT: AutoNateAI specializes in AI-powered research tools for academics and researchers.

SERVICES TO PROMOTE:
- DIGITAL PRODUCTS: AI Grant Drafting Assistant ($149), Lit Review AI ($129), Cloud Data Pipeline Builder ($129)
- COACHING: AI Research Workflow Optimization ($299), Grant Strategy & Review ($499), Literature Review Acceleration ($349)
- WORKSHOPS: AI Grant Writing Mastery, Literature Review Revolution, Research Data Pipeline Implementation

TARGET AUDIENCE: Graduate students, postdocs, faculty, research teams, academic departments

LAYOUT INSTRUCTIONS: ${formatInstruction}

DESIGN REQUIREMENTS:
- Professional, trustworthy, academic-focused design
- Clear hierarchy with headline, supporting text, and call-to-action
- Use colors that convey professionalism and innovation
- Include space for AutoNateAI branding
- Optimize text placement for readability
- Balance graphical elements with text content

USER PROMPT: ${prompt}

Create an eye-catching advertisement that combines the user's vision with AutoNateAI's professional positioning and optimal space utilization.`;

      const { data, error } = await supabase.functions.invoke('generate-blog-ad', {
        body: {
          blogTitle: title,
          blogContent: enhancedPrompt,
          blogCategory: 'advertisement',
          position: position,
          imageSize: imageSize
        }
      });

      if (error) throw error;

      // Save or update the advertisement
      const adData = {
        title: title,
        image_url: data.imageUrl,
        position: position,
        target_type: 'all',
        link_type: 'external',
        link_url: 'https://autonateai.com',
        width: position === 'blog-list-banner' ? 1536 : 1024,
        height: position === 'blog-list-banner' ? 1024 : 1024,
        alt_text: `AutoNateAI ${position} advertisement`,
        is_active: true
      };

      let result;
      if (editingAdId) {
        result = await supabase
          .from('advertisements')
          .update(adData)
          .eq('id', editingAdId);
      } else {
        result = await supabase
          .from('advertisements')
          .insert([adData]);
      }

      if (result.error) throw result.error;

      toast({
        title: "Success",
        description: `${position === 'blog-list-banner' ? 'Banner' : 'Sidebar'} ad ${editingAdId ? 'updated' : 'created'} successfully`,
      });

      await fetchBlogListAds();
      handleCloseEditDialog();
    } catch (error) {
      console.error('Error generating ad:', error);
      toast({
        title: "Error",
        description: "Failed to generate advertisement",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateNew = (position: string) => {
    setEditingAd(null);
    setPrompt('');
    setTitle('');
    setShowEditDialog(true);
  };

  const handleEdit = (ad: Advertisement) => {
    setEditingAd(ad);
    setPrompt('');
    setTitle(ad.title);
    setShowEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    setShowEditDialog(false);
    setEditingAd(null);
    setPrompt('');
    setTitle('');
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl glass-modal">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl glass-modal max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="gradient-text text-2xl">Blog List Advertisement Editor</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Banner Ad Section */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Banner Advertisement (1536×1024)</span>
                  <div className="flex gap-2">
                    {bannerAd && (
                      <Button
                        onClick={() => handleEdit(bannerAd)}
                        variant="outline"
                        size="sm"
                        className="glass-button"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    )}
                     <Button
                       onClick={() => handleCreateNew('blog-list-banner')}
                       size="sm"
                       className="glass-button glow-primary"
                     >
                       <Plus className="h-4 w-4 mr-1" />
                       {bannerAd ? 'Replace' : 'Create'}
                     </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bannerAd ? (
                  <div className="space-y-4">
                    <div className="border border-border/20 rounded-lg overflow-hidden">
                      <img 
                        src={bannerAd.image_url} 
                        alt={bannerAd.alt_text}
                        className="w-full h-auto"
                      />
                    </div>
                    <div>
                      <p className="font-medium">{bannerAd.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Active banner ad • {bannerAd.width}×{bannerAd.height}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 border-2 border-dashed border-border/20 rounded-lg">
                    <p className="text-muted-foreground">No banner ad created yet</p>
                    <p className="text-sm text-muted-foreground">Create one using AI with a custom prompt</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sidebar Ads Section */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Sidebar Advertisements (1024×1024)</span>
                   <Button
                     onClick={() => handleCreateNew('blog-list-sidebar')}
                     size="sm"
                     className="glass-button glow-primary"
                   >
                     <Plus className="h-4 w-4 mr-1" />
                     Add Sidebar Ad
                   </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sidebarAds.length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    {sidebarAds.map((ad, index) => (
                      <div key={ad.id} className="space-y-4">
                        <div className="border border-border/20 rounded-lg overflow-hidden">
                          <img 
                            src={ad.image_url} 
                            alt={ad.alt_text}
                            className="w-full h-auto"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{ad.title}</p>
                            <p className="text-sm text-muted-foreground">
                              Sidebar {index + 1} • {ad.width}×{ad.height}
                            </p>
                          </div>
                          <Button
                            onClick={() => handleEdit(ad)}
                            variant="outline"
                            size="sm"
                            className="glass-button"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border-2 border-dashed border-border/20 rounded-lg">
                    <p className="text-muted-foreground">No sidebar ads created yet</p>
                    <p className="text-sm text-muted-foreground">Create them using AI with custom prompts</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit/Create Dialog */}
      <Dialog open={showEditDialog} onOpenChange={handleCloseEditDialog}>
        <DialogContent className="max-w-2xl glass-modal">
          <DialogHeader>
            <DialogTitle className="gradient-text">
              {editingAd ? 'Edit' : 'Create'} {editingAd?.position === 'blog-list-banner' ? 'Banner' : 'Sidebar'} Ad with AI
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Advertisement Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a descriptive title for the ad"
                className="glass-input"
              />
            </div>

            <div>
              <Label htmlFor="prompt">AI Generation Prompt</Label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the advertisement you want to create. Be specific about the message, style, colors, and elements you want included. The AI will automatically optimize the layout for the ad dimensions and include AutoNateAI context."
                rows={6}
                className="glass-input"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Dimensions: {editingAd?.position === 'blog-list-banner' ? '1536×1024 (wide banner)' : '1024×1024 (square sidebar)'}
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                onClick={handleCloseEditDialog}
                variant="outline"
                className="glass-button"
                disabled={generating}
              >
                Cancel
              </Button>
              <Button
                onClick={() => generateAdWithAI(editingAd?.position || 'blog-list-banner', editingAd?.id)}
                className="glass-button glow-primary"
                disabled={generating || !prompt.trim() || !title.trim()}
              >
                {generating ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {editingAd ? 'Update' : 'Generate'} Ad
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BlogListAdEditor;