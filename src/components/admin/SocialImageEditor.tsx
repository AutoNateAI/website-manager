import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Wand2, Save, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SocialImageEditorProps {
  isOpen: boolean;
  onClose: () => void;
  image: {
    id: string;
    post_id: string;
    carousel_index: number;
    image_index: number;
    image_url: string;
    image_prompt: string;
    alt_text?: string;
  } | null;
  onImageUpdated: () => void;
}

const SocialImageEditor = ({ isOpen, onClose, image, onImageUpdated }: SocialImageEditorProps) => {
  const [editInstructions, setEditInstructions] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const { toast } = useToast();

  const generatePreview = async () => {
    if (!image || !editInstructions.trim()) return;

    setPreviewing(true);
    try {
      const { data, error } = await supabase.functions.invoke('edit-image', {
        body: {
          originalImageUrl: image.image_url,
          editInstructions: editInstructions,
          originalPrompt: image.image_prompt
        }
      });

      if (error) throw error;
      setPreviewUrl(data.imageUrl);
    } catch (error) {
      console.error('Error generating preview:', error);
      toast({ title: 'Error generating preview', variant: 'destructive' });
    } finally {
      setPreviewing(false);
    }
  };

  const saveImage = async () => {
    if (!image || !previewUrl) return;

    setGenerating(true);
    try {
      // Update the image in the database
      const { error } = await supabase
        .from('social_media_images')
        .update({
          image_url: previewUrl,
          image_prompt: `${image.image_prompt} (Edited: ${editInstructions})`,
          updated_at: new Date().toISOString()
        })
        .eq('id', image.id);

      if (error) throw error;

      toast({ title: 'Image updated successfully!' });
      onImageUpdated();
      handleClose();
    } catch (error) {
      console.error('Error saving image:', error);
      toast({ title: 'Error saving image', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleClose = () => {
    setEditInstructions('');
    setPreviewUrl(null);
    onClose();
  };

  if (!image) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="glass-modal max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit Image - Carousel {image.carousel_index}, Position {image.image_index}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Current Image */}
          <div className="space-y-2">
            <Label>Current Image</Label>
            <Card>
              <CardContent className="p-4">
                <div className="aspect-square bg-muted rounded-lg overflow-hidden mb-2">
                  <img
                    src={image.image_url}
                    alt={`Carousel ${image.carousel_index} Image ${image.image_index}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Original prompt: {image.image_prompt}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Edit Instructions */}
          <div className="space-y-2">
            <Label htmlFor="editInstructions">
              Editing Instructions *
            </Label>
            <Textarea
              id="editInstructions"
              placeholder="Describe how you want to modify this image (e.g., 'Make the background more vibrant', 'Add more text overlay', 'Change the color scheme to blue')"
              value={editInstructions}
              onChange={(e) => setEditInstructions(e.target.value)}
              rows={3}
            />
          </div>

          {/* Preview */}
          {previewUrl && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <Card>
                <CardContent className="p-4">
                  <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={generatePreview}
              disabled={!editInstructions.trim() || previewing}
            >
              {previewing ? (
                <>
                  <Wand2 size={16} className="mr-2 animate-spin" />
                  Generating Preview...
                </>
              ) : (
                <>
                  <Wand2 size={16} className="mr-2" />
                  Generate Preview
                </>
              )}
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>
                <X size={16} className="mr-2" />
                Cancel
              </Button>
              <Button
                onClick={saveImage}
                disabled={!previewUrl || generating}
              >
                {generating ? (
                  <>
                    <Save size={16} className="mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} className="mr-2" />
                    Save Image
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SocialImageEditor;