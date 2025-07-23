import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Plus, Trash2, Wand2 } from 'lucide-react';

interface ImageRequest {
  id: string;
  prompt: string;
  title: string;
  alt_text: string;
  caption: string;
}

const BulkImageGenerator = () => {
  const [imageRequests, setImageRequests] = useState<ImageRequest[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const addImageRequest = () => {
    const newRequest: ImageRequest = {
      id: crypto.randomUUID(),
      prompt: '',
      title: '',
      alt_text: '',
      caption: ''
    };
    setImageRequests([...imageRequests, newRequest]);
  };

  const updateImageRequest = (id: string, field: keyof ImageRequest, value: string) => {
    setImageRequests(requests => 
      requests.map(req => 
        req.id === id ? { ...req, [field]: value } : req
      )
    );
  };

  const removeImageRequest = (id: string) => {
    setImageRequests(requests => requests.filter(req => req.id !== id));
  };

  const generateBulkImages = async () => {
    if (imageRequests.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one image request",
        variant: "destructive",
      });
      return;
    }

    const incompleteRequests = imageRequests.filter(req => !req.prompt.trim() || !req.title.trim());
    if (incompleteRequests.length > 0) {
      toast({
        title: "Error", 
        description: "Please fill in the prompt and title for all image requests",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      const batchId = crypto.randomUUID();
      
      const { data, error } = await supabase.functions.invoke('bulk-generate-images', {
        body: {
          images: imageRequests.map(req => ({
            prompt: req.prompt,
            title: req.title,
            alt_text: req.alt_text || req.prompt,
            caption: req.caption,
            size: "1024x1024",
            quality: "high"
          })),
          batchId
        }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Success",
        description: `Started generating ${imageRequests.length} images! They will appear in your image library as they complete.`,
      });

      // Clear the form and close dialog
      setImageRequests([]);
      setShowDialog(false);

    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to start bulk generation: " + error.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full sm:w-auto">
          <Wand2 className="h-4 w-4 mr-2" />
          Bulk AI Generate
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Bulk AI Image Generator
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Create multiple AI-generated images at once. All images will be generated in parallel.
            </p>
            <Button 
              onClick={addImageRequest} 
              size="sm" 
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Image
            </Button>
          </div>

          {imageRequests.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-muted rounded-lg">
              <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                No image requests yet. Add your first image to get started.
              </p>
              <Button onClick={addImageRequest}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Image
              </Button>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {imageRequests.map((request, index) => (
                <Card key={request.id} className="glass-card">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Image {index + 1}</CardTitle>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeImageRequest(request.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-xs font-medium">AI Prompt *</label>
                      <Textarea
                        value={request.prompt}
                        onChange={(e) => updateImageRequest(request.id, 'prompt', e.target.value)}
                        placeholder="Describe the image you want to generate..."
                        className="glass bg-transparent text-sm"
                        rows={2}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium">Title *</label>
                        <Input
                          value={request.title}
                          onChange={(e) => updateImageRequest(request.id, 'title', e.target.value)}
                          placeholder="Image title"
                          className="glass bg-transparent text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium">Alt Text</label>
                        <Input
                          value={request.alt_text}
                          onChange={(e) => updateImageRequest(request.id, 'alt_text', e.target.value)}
                          placeholder="Alternative text"
                          className="glass bg-transparent text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium">Caption</label>
                      <Input
                        value={request.caption}
                        onChange={(e) => updateImageRequest(request.id, 'caption', e.target.value)}
                        placeholder="Image caption"
                        className="glass bg-transparent text-sm"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {imageRequests.length > 0 && (
            <div className="flex gap-2 pt-4 border-t">
              <Button 
                onClick={generateBulkImages} 
                disabled={generating}
                className="flex-1"
              >
                {generating ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Generating {imageRequests.length} Images...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate All Images ({imageRequests.length})
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowDialog(false)}
                disabled={generating}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkImageGenerator;