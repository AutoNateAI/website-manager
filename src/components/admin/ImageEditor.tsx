import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wand2, Save, X } from 'lucide-react';

interface ImageEditorProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageId: string;
  onImageUpdated: (newImageUrl: string) => void;
}

const ImageEditor = ({ isOpen, onClose, imageUrl, imageId, onImageUpdated }: ImageEditorProps) => {
  const [editPrompt, setEditPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const handleEditImage = async () => {
    if (!editPrompt.trim()) {
      toast({
        title: "Error",
        description: "Please describe what changes you want to make",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      // Generate a new image based on the current one and the edit prompt
      const { data, error } = await supabase.functions.invoke('edit-image', {
        body: { 
          originalImageUrl: imageUrl,
          editPrompt,
          size: "1920x1080"
        }
      });

      if (error) throw error;

      const { newImageUrl } = data;
      
      // Update the image in the database with the new URL (keeping history)
      const { data: newImage, error: updateError } = await supabase
        .from('images')
        .insert({
          title: `Edited version of image ${imageId}`,
          url: newImageUrl,
          alt_text: editPrompt,
          caption: `Edited: ${editPrompt}`,
          parent_image_id: imageId
        })
        .select()
        .single();

      if (updateError) throw updateError;

      onImageUpdated(newImageUrl);
      
      toast({
        title: "Success",
        description: "Image edited successfully!",
      });
      
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to edit image: " + error.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 size={20} />
            Edit Image
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Current Image */}
          <Card className="glass-card">
            <CardContent className="p-4">
              <Label className="text-sm font-medium text-muted-foreground">Current Image</Label>
              <div className="mt-2 rounded-lg overflow-hidden">
                <img 
                  src={imageUrl} 
                  alt="Current image" 
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
            </CardContent>
          </Card>

          {/* Edit Controls */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-prompt">Describe the changes you want to make</Label>
              <Textarea
                id="edit-prompt"
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder="e.g., make the background blue, add mountains in the distance, change the lighting to sunset"
                className="glass bg-transparent min-h-[100px]"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="glass-button"
              >
                <X size={18} className="mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={handleEditImage} 
                disabled={generating || !editPrompt.trim()}
                className="glass-button glow-primary"
              >
                {generating ? (
                  <Loader2 size={18} className="mr-2 animate-spin" />
                ) : (
                  <Wand2 size={18} className="mr-2" />
                )}
                {generating ? 'Generating...' : 'Edit Image'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageEditor;
