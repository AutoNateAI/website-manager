import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, Trash2, Edit, Star, StarOff, Sparkles, Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface ProductImage {
  id: string;
  image_url: string;
  alt_text: string | null;
  caption: string | null;
  is_primary: boolean;
  sort_order: number;
}

interface ProductImageManagerProps {
  productId: string;
  productTitle: string;
}

const ProductImageManager = ({ productId, productTitle }: ProductImageManagerProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingImage, setEditingImage] = useState<ProductImage | null>(null);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  
  // AI Generation state
  const [aiPrompt, setAiPrompt] = useState('');
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [generationType, setGenerationType] = useState<'scratch' | 'reference'>('scratch');

  // Edit form state
  const [editForm, setEditForm] = useState({
    alt_text: '',
    caption: '',
    is_primary: false,
    sort_order: 0
  });

  useEffect(() => {
    fetchImages();
  }, [productId]);

  const fetchImages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', productId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error('Error fetching images:', error);
      toast({
        title: "Error",
        description: "Failed to fetch product images",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    try {
      setUploading(true);

      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast({
            title: "Error",
            description: `${file.name} is not an image file`,
            variant: "destructive"
          });
          continue;
        }

        // Upload to Supabase Storage
        const fileName = `product-${productId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${file.name.split('.').pop()}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('generated-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('generated-images')
          .getPublicUrl(fileName);

        // Save to database
        const { error: dbError } = await supabase
          .from('product_images')
          .insert([{
            product_id: productId,
            image_url: urlData.publicUrl,
            alt_text: `${productTitle} product image`,
            caption: null,
            is_primary: images.length === 0, // First image is primary
            sort_order: images.length
          }]);

        if (dbError) throw dbError;
      }

      toast({
        title: "Success",
        description: `${files.length} image(s) uploaded successfully`
      });

      fetchImages();
    } catch (error) {
      console.error('Error uploading images:', error);
      toast({
        title: "Error",
        description: "Failed to upload images",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const generateImageWithAI = async () => {
    if (!aiPrompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a description for the image",
        variant: "destructive"
      });
      return;
    }

    try {
      setGeneratingImage(true);

      let finalPrompt = `Product image for ${productTitle}: ${aiPrompt}. Professional, high-quality, commercial photography style`;
      let requestBody: any = {
        prompt: finalPrompt,
        size: "1024x1024",
        quality: "high"
      };

      // If using reference image, convert to base64
      if (generationType === 'reference' && referenceImage) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(referenceImage);
        });
        
        const base64Data = await base64Promise;
        requestBody.referenceImage = base64Data;
      }

      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: requestBody
      });

      if (error) throw error;

      if (data.imageUrl) {
        // Save generated image to database
        const { error: dbError } = await supabase
          .from('product_images')
          .insert([{
            product_id: productId,
            image_url: data.imageUrl,
            alt_text: `AI generated image for ${productTitle}`,
            caption: aiPrompt,
            is_primary: images.length === 0,
            sort_order: images.length
          }]);

        if (dbError) throw dbError;

        toast({
          title: "Success",
          description: "AI image generated successfully"
        });

        setShowAIDialog(false);
        setAiPrompt('');
        setReferenceImage(null);
        fetchImages();
      }
    } catch (error) {
      console.error('Error generating image:', error);
      toast({
        title: "Error",
        description: "Failed to generate image with AI",
        variant: "destructive"
      });
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleEdit = (image: ProductImage) => {
    setEditingImage(image);
    setEditForm({
      alt_text: image.alt_text || '',
      caption: image.caption || '',
      is_primary: image.is_primary,
      sort_order: image.sort_order
    });
  };

  const handleUpdate = async () => {
    if (!editingImage) return;

    try {
      // If setting as primary, unset other primary images first
      if (editForm.is_primary && !editingImage.is_primary) {
        await supabase
          .from('product_images')
          .update({ is_primary: false })
          .eq('product_id', productId)
          .eq('is_primary', true);
      }

      const { error } = await supabase
        .from('product_images')
        .update({
          alt_text: editForm.alt_text || null,
          caption: editForm.caption || null,
          is_primary: editForm.is_primary,
          sort_order: editForm.sort_order
        })
        .eq('id', editingImage.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Image updated successfully"
      });

      setEditingImage(null);
      fetchImages();
    } catch (error) {
      console.error('Error updating image:', error);
      toast({
        title: "Error",
        description: "Failed to update image",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (image: ProductImage) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      // Delete from database
      const { error: dbError } = await supabase
        .from('product_images')
        .delete()
        .eq('id', image.id);

      if (dbError) throw dbError;

      // Try to delete from storage (if it's in our bucket)
      if (image.image_url.includes('generated-images')) {
        const fileName = image.image_url.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('generated-images')
            .remove([fileName]);
        }
      }

      toast({
        title: "Success",
        description: "Image deleted successfully"
      });

      fetchImages();
    } catch (error) {
      console.error('Error deleting image:', error);
      toast({
        title: "Error",
        description: "Failed to delete image",
        variant: "destructive"
      });
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    try {
      // Unset all primary images first
      await supabase
        .from('product_images')
        .update({ is_primary: false })
        .eq('product_id', productId);

      // Set the selected image as primary
      const { error } = await supabase
        .from('product_images')
        .update({ is_primary: true })
        .eq('id', imageId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Primary image updated"
      });

      fetchImages();
    } catch (error) {
      console.error('Error setting primary image:', error);
      toast({
        title: "Error",
        description: "Failed to set primary image",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera size={18} />
            Product Images
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex-1"
            >
              {uploading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={16} className="mr-2" />
                  Upload Images
                </>
              )}
            </Button>
            
            <Button
              onClick={() => setShowAIDialog(true)}
              variant="outline"
              className="flex-1"
            >
              <Sparkles size={16} className="mr-2" />
              Generate with AI
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />
        </CardContent>
      </Card>

      {/* Images Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {images.map((image, index) => (
          <Card key={image.id} className="overflow-hidden">
            <div className="aspect-square relative">
              <img
                src={image.image_url}
                alt={image.alt_text || `Product image ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {image.is_primary && (
                <Badge className="absolute top-2 left-2 bg-primary">
                  Primary
                </Badge>
              )}
              <div className="absolute top-2 right-2 flex gap-1">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleSetPrimary(image.id)}
                  disabled={image.is_primary}
                >
                  {image.is_primary ? <Star size={14} /> : <StarOff size={14} />}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleEdit(image)}
                >
                  <Edit size={14} />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(image)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
            <CardContent className="p-3">
              <div className="space-y-1">
                {image.alt_text && (
                  <p className="text-sm font-medium">{image.alt_text}</p>
                )}
                {image.caption && (
                  <p className="text-xs text-muted-foreground">{image.caption}</p>
                )}
                <p className="text-xs text-muted-foreground">Order: {image.sort_order}</p>
              </div>
            </CardContent>
          </Card>
        ))}

        {images.length === 0 && (
          <div className="col-span-full">
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <Camera size={48} className="mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No images yet</h3>
                <p className="text-muted-foreground mb-4">
                  Upload images or generate them with AI
                </p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => fileInputRef.current?.click()}>
                    <Upload size={16} className="mr-2" />
                    Upload Images
                  </Button>
                  <Button variant="outline" onClick={() => setShowAIDialog(true)}>
                    <Sparkles size={16} className="mr-2" />
                    Generate with AI
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Edit Image Dialog */}
      {editingImage && (
        <Dialog open={!!editingImage} onOpenChange={() => setEditingImage(null)}>
          <DialogContent className="glass-card">
            <DialogHeader>
              <DialogTitle>Edit Image</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                <img
                  src={editingImage.image_url}
                  alt={editingImage.alt_text || 'Product image'}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Alt Text</Label>
                  <Input
                    value={editForm.alt_text}
                    onChange={(e) => setEditForm(prev => ({ ...prev, alt_text: e.target.value }))}
                    placeholder="Descriptive alt text for accessibility"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Caption</Label>
                  <Textarea
                    value={editForm.caption}
                    onChange={(e) => setEditForm(prev => ({ ...prev, caption: e.target.value }))}
                    placeholder="Optional caption"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Sort Order</Label>
                    <Input
                      type="number"
                      value={editForm.sort_order}
                      onChange={(e) => setEditForm(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_primary"
                      checked={editForm.is_primary}
                      onChange={(e) => setEditForm(prev => ({ ...prev, is_primary: e.target.checked }))}
                    />
                    <Label htmlFor="is_primary">Primary Image</Label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingImage(null)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdate}>
                  Update Image
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* AI Generation Dialog */}
      {showAIDialog && (
        <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
          <DialogContent className="glass-card max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles size={18} />
                Generate Product Image with AI
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Generation Type</Label>
                <div className="flex gap-2">
                  <Button
                    variant={generationType === 'scratch' ? 'default' : 'outline'}
                    onClick={() => setGenerationType('scratch')}
                    className="flex-1"
                  >
                    From Scratch
                  </Button>
                  <Button
                    variant={generationType === 'reference' ? 'default' : 'outline'}
                    onClick={() => setGenerationType('reference')}
                    className="flex-1"
                  >
                    With Reference
                  </Button>
                </div>
              </div>

              {generationType === 'reference' && (
                <div className="space-y-2">
                  <Label>Reference Image</Label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setReferenceImage(e.target.files?.[0] || null)}
                    className="w-full text-sm"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Image Description</Label>
                <Textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Describe the product image you want to generate..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAIDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={generateImageWithAI}
                  disabled={generatingImage || !aiPrompt.trim()}
                >
                  {generatingImage ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} className="mr-2" />
                      Generate Image
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ProductImageManager;