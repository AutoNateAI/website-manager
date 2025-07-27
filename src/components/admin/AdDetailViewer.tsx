import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Edit, ExternalLink, Loader2, Wand2, Upload, Palette } from 'lucide-react';

interface Advertisement {
  id: string;
  title: string;
  image_url?: string;
  link_url?: string;
  link_type: string;
  product_id?: string;
  target_type: string;
  target_value?: string;
  position: string;
  is_active: boolean;
  width?: number;
  height?: number;
  alt_text?: string;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

interface AdDetailViewerProps {
  ad: Advertisement | null;
  isOpen: boolean;
  onClose: () => void;
  onAdUpdated: () => void;
}

const AdDetailViewer = ({ ad, isOpen, onClose, onAdUpdated }: AdDetailViewerProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [generatingEdit, setGeneratingEdit] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [showImageConfirm, setShowImageConfirm] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const { toast } = useToast();

  if (!ad) return null;

  const getPlacementInfo = () => {
    const placements = {
      sidebar: { name: 'Sidebar', description: 'Right sidebar area', dimensions: '300x250px' },
      banner: { name: 'Banner', description: 'Top banner area', dimensions: '1200x90px' },
      featured: { name: 'Featured', description: 'Featured content area', dimensions: '800x300px' },
      inline: { name: 'Inline', description: 'Within content', dimensions: '800x200px' },
      bottom: { name: 'Bottom', description: 'Bottom of page', dimensions: '1200x400px' }
    };
    return placements[ad.position as keyof typeof placements] || { name: 'Unknown', description: 'Unknown position', dimensions: 'Unknown' };
  };

  const placementInfo = getPlacementInfo();

  const handleNaturalLanguageEdit = async () => {
    if (!editPrompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter your editing instructions",
        variant: "destructive",
      });
      return;
    }

    setGeneratingEdit(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-blog-ad', {
        body: {
          blogTitle: `Edit existing ad: ${ad.title}`,
          blogContent: `Current ad description: ${ad.alt_text || ad.title}. User wants to: ${editPrompt}`,
          blogCategory: 'Advertisement Edit',
          position: ad.position,
          imageSize: getImageSizeForPosition(ad.position)
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setNewImageUrl(data.imageUrl);
      setShowImageConfirm(true);

      toast({
        title: "Success",
        description: "New ad version generated! Review and confirm to update.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to generate ad edit: " + error.message,
        variant: "destructive",
      });
    } finally {
      setGeneratingEdit(false);
    }
  };

  const confirmImageUpdate = async () => {
    try {
      const { error } = await supabase
        .from('advertisements')
        .update({ 
          image_url: newImageUrl,
          alt_text: `Updated: ${ad.alt_text || ad.title}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', ad.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Advertisement image updated successfully!",
      });

      setShowImageConfirm(false);
      setNewImageUrl('');
      setEditPrompt('');
      setIsEditing(false);
      onAdUpdated();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update advertisement: " + error.message,
        variant: "destructive",
      });
    }
  };

  const getImageSizeForPosition = (position: string) => {
    switch (position) {
      case 'banner': return '1536x1024';
      case 'featured': return '1024x1024';
      case 'sidebar': return '1024x1024';
      case 'inline': return '1024x1024';
      case 'bottom': return '1536x1024';
      default: return '1024x1024';
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `ad-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('generated-images')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('generated-images')
        .getPublicUrl(fileName);

      setNewImageUrl(urlData.publicUrl);
      setShowImageConfirm(true);

      toast({
        title: "Success",
        description: "Image uploaded successfully! Review and confirm to update.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to upload image: " + error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Advertisement Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Ad Preview */}
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">{ad.title}</h3>
                  {ad.image_url && (
                    <div className="space-y-2">
                      <img 
                        src={ad.image_url} 
                        alt={ad.alt_text || ad.title}
                        className="w-full max-w-md h-auto rounded-lg border"
                      />
                      <p className="text-sm text-muted-foreground">
                        Current advertisement image
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Placement Information</h4>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{placementInfo.name}</Badge>
                        <span className="text-sm">{placementInfo.description}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Recommended dimensions: {placementInfo.dimensions}
                      </p>
                      {ad.width && ad.height && (
                        <p className="text-sm text-muted-foreground">
                          Current size: {ad.width}×{ad.height}px
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Target & Status</h4>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={ad.is_active ? "default" : "secondary"}>
                          {ad.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {ad.target_type}
                        </Badge>
                      </div>
                      {ad.target_value && (
                        <p className="text-sm">Target: {ad.target_value}</p>
                      )}
                      {ad.link_url && (
                        <div className="flex items-center gap-2">
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          <a 
                            href={ad.link_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            View Link
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Dates</h4>
                    <div className="mt-2 space-y-1 text-sm">
                      <p>Created: {new Date(ad.created_at).toLocaleDateString()}</p>
                      <p>Updated: {new Date(ad.updated_at).toLocaleDateString()}</p>
                      {ad.start_date && (
                        <p>Start: {new Date(ad.start_date).toLocaleDateString()}</p>
                      )}
                      {ad.end_date && (
                        <p>End: {new Date(ad.end_date).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Edit Controls */}
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold">Edit Advertisement</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {isEditing ? 'Cancel Edit' : 'Edit Ad'}
                </Button>
              </div>

              {isEditing && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Natural Language Edit Instructions</label>
                    <Textarea
                      placeholder="Describe how you want to modify this ad (e.g., 'Make it more colorful', 'Add a call-to-action button', 'Change the style to be more professional')..."
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      className="glass bg-transparent mt-2"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleNaturalLanguageEdit}
                      disabled={generatingEdit || !editPrompt.trim()}
                      className="glass-button glow-primary"
                    >
                      {generatingEdit ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Wand2 className="h-4 w-4 mr-2" />
                      )}
                      Generate New Version
                    </Button>

                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={uploadingImage}
                      />
                      <Button
                        variant="outline"
                        disabled={uploadingImage}
                        className="glass-button"
                      >
                        {uploadingImage ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        Upload New Image
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Image Confirmation */}
          {showImageConfirm && newImageUrl && (
            <Card className="glass-card border-primary">
              <CardContent className="p-6">
                <h4 className="font-semibold mb-4">Confirm Image Update</h4>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  {ad.image_url && (
                    <div>
                      <p className="text-sm font-medium mb-2">Current Image</p>
                      <img 
                        src={ad.image_url} 
                        alt="Current"
                        className="w-full h-32 object-cover rounded border"
                      />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium mb-2">New Image</p>
                    <img 
                      src={newImageUrl} 
                      alt="New version"
                      className="w-full h-32 object-cover rounded border"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={confirmImageUpdate} className="glass-button glow-primary">
                    Update Advertisement
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowImageConfirm(false);
                      setNewImageUrl('');
                    }}
                    className="glass-button"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdDetailViewer;