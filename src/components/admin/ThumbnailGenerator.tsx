import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Image, Save } from 'lucide-react';

interface ThumbnailGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  blogTitle: string;
  blogExcerpt: string;
  blogCategory: string;
  onThumbnailGenerated: (thumbnailUrl: string) => void;
}

const ThumbnailGenerator = ({ 
  isOpen, 
  onClose, 
  blogTitle, 
  blogExcerpt, 
  blogCategory,
  onThumbnailGenerated 
}: ThumbnailGeneratorProps) => {
  const [generating, setGenerating] = useState(false);
  const [generatedThumbnail, setGeneratedThumbnail] = useState<string | null>(null);
  const { toast } = useToast();

  const generateThumbnail = async () => {
    setGenerating(true);
    try {
      // Create a comprehensive prompt based on blog information
      const thumbnailPrompt = `Create a scroll-stopping, eye-catching blog thumbnail for "${blogTitle}". 
        Category: ${blogCategory}. 
        Context: ${blogExcerpt}. 
        
        CRITICAL REQUIREMENTS:
        - Wide format (1536x1024) - utilize the horizontal space efficiently
        - Include witty, engaging text overlay that's relevant to the topic (NOT the blog title)
        - Text must be large, bold, and highly readable - positioned strategically to avoid being cut off
        - Design should be irresistible to click - use vibrant colors, strong contrast, and compelling visuals
        - Professional yet attention-grabbing style that stops scrolling
        - Ensure all text elements are fully visible within the frame
        - Use modern typography with excellent readability at small sizes
        - Create visual hierarchy with the text as the main focal point
        
        Make this thumbnail impossible to scroll past!`;

      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { 
          prompt: thumbnailPrompt,
          size: "1536x1024"
        }
      });

      if (error) throw error;

      const { imageUrl } = data;
      setGeneratedThumbnail(imageUrl);
      
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
      setGenerating(false);
    }
  };

  const useThumbnail = () => {
    if (generatedThumbnail) {
      onThumbnailGenerated(generatedThumbnail);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image size={20} />
            Generate Blog Thumbnail
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Blog Info Preview */}
          <Card className="glass-card">
            <CardContent className="p-4">
              <h3 className="font-semibold text-lg mb-2">{blogTitle}</h3>
              <p className="text-sm text-muted-foreground mb-2">Category: {blogCategory}</p>
              <p className="text-sm">{blogExcerpt}</p>
            </CardContent>
          </Card>

          {/* Generated Thumbnail */}
          {generatedThumbnail && (
            <Card className="glass-card">
              <CardContent className="p-4">
                <h4 className="font-medium mb-3">Generated Thumbnail</h4>
                <div className="rounded-xl overflow-hidden shadow-lg">
                  <img 
                    src={generatedThumbnail} 
                    alt="Generated thumbnail" 
                    className="w-full h-64 object-cover rounded-xl"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="glass-button"
            >
              Cancel
            </Button>
            {!generatedThumbnail ? (
              <Button 
                onClick={generateThumbnail} 
                disabled={generating}
                className="glass-button glow-primary"
              >
                {generating ? (
                  <Loader2 size={18} className="mr-2 animate-spin" />
                ) : (
                  <Image size={18} className="mr-2" />
                )}
                {generating ? 'Generating...' : 'Generate Thumbnail'}
              </Button>
            ) : (
              <Button 
                onClick={useThumbnail}
                className="glass-button glow-accent"
              >
                <Save size={18} className="mr-2" />
                Use This Thumbnail
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ThumbnailGenerator;