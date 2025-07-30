import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, Trash2, Edit, Star, StarOff, Sparkles, Camera, GripVertical, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import ImageViewer from './ImageViewer';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import {
  CSS,
} from '@dnd-kit/utilities';

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
  disabled?: boolean;
}

const ProductImageManager = ({ productId, productTitle, disabled = false }: ProductImageManagerProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingImage, setEditingImage] = useState<ProductImage | null>(null);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [viewerImage, setViewerImage] = useState<{
    url: string;
    alt: string;
    caption: string;
  } | null>(null);
  
  // Multi-select state
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  
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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchImages = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
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
      let currentMaxOrder = Math.max(...images.map(img => img.sort_order), -1);

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

        // Increment order for each new image
        currentMaxOrder += 1;

        // Save to database with incremental sort_order
        const { error: dbError } = await (supabase as any)
          .from('product_images')
          .insert([{
            product_id: productId,
            image_url: urlData.publicUrl,
            alt_text: `${productTitle} product image`,
            caption: null,
            is_primary: images.length === 0 && currentMaxOrder === 0, // Only first image of first upload is primary
            sort_order: currentMaxOrder
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
        // Get the next available sort_order
        const maxOrder = Math.max(...images.map(img => img.sort_order), -1);
        
        // Save generated image to database
        const { error: dbError } = await (supabase as any)
          .from('product_images')
          .insert([{
            product_id: productId,
            image_url: data.imageUrl,
            alt_text: `AI generated image for ${productTitle}`,
            caption: aiPrompt,
            is_primary: images.length === 0,
            sort_order: maxOrder + 1
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
        await (supabase as any)
          .from('product_images')
          .update({ is_primary: false })
          .eq('product_id', productId)
          .eq('is_primary', true);
      }

      const { error } = await (supabase as any)
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
      const { error: dbError } = await (supabase as any)
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

      // Reorder remaining images to fill gaps
      await reorderImages();

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
      await (supabase as any)
        .from('product_images')
        .update({ is_primary: false })
        .eq('product_id', productId);

      // Set the selected image as primary
      const { error } = await (supabase as any)
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

  // Helper function to reorder images and remove gaps
  const reorderImages = async () => {
    try {
      const currentImages = await (supabase as any)
        .from('product_images')
        .select('*')
        .eq('product_id', productId)
        .order('sort_order', { ascending: true });

      if (currentImages.data) {
        const updates = currentImages.data.map((image: ProductImage, index: number) => ({
          id: image.id,
          sort_order: index
        }));

        for (const update of updates) {
          await (supabase as any)
            .from('product_images')
            .update({ sort_order: update.sort_order })
            .eq('id', update.id);
        }
      }
    } catch (error) {
      console.error('Error reordering images:', error);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const activeIndex = images.findIndex((img) => img.id === active.id);
      const overIndex = images.findIndex((img) => img.id === over?.id);

      const newImages = arrayMove(images, activeIndex, overIndex);
      
      // Update local state immediately for better UX
      setImages(newImages);

      // Update sort_order in database
      try {
        const updates = newImages.map((image, index) => ({
          id: image.id,
          sort_order: index
        }));

        for (const update of updates) {
          await (supabase as any)
            .from('product_images')
            .update({ sort_order: update.sort_order })
            .eq('id', update.id);
        }

        toast({
          title: "Success",
          description: "Image order updated"
        });
      } catch (error) {
        console.error('Error updating image order:', error);
        toast({
          title: "Error",
          description: "Failed to update image order",
          variant: "destructive"
        });
        // Revert on error
        fetchImages();
      }
    }
  };

  // Multi-select functions
  const toggleImageSelection = (imageId: string) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId);
    } else {
      newSelected.add(imageId);
    }
    setSelectedImages(newSelected);
  };

  const selectAllImages = () => {
    setSelectedImages(new Set(images.map(img => img.id)));
  };

  const clearSelection = () => {
    setSelectedImages(new Set());
    setIsSelectionMode(false);
  };

  const handleBulkDelete = async () => {
    if (selectedImages.size === 0) return;

    const confirmMessage = `Are you sure you want to delete ${selectedImages.size} image${selectedImages.size > 1 ? 's' : ''}?`;
    if (!confirm(confirmMessage)) return;

    try {
      // Delete each selected image
      for (const imageId of selectedImages) {
        const image = images.find(img => img.id === imageId);
        if (!image) continue;

        // Delete from database
        await (supabase as any)
          .from('product_images')
          .delete()
          .eq('id', imageId);

        // Try to delete from storage (if it's in our bucket)
        if (image.image_url.includes('generated-images')) {
          const fileName = image.image_url.split('/').pop();
          if (fileName) {
            await supabase.storage
              .from('generated-images')
              .remove([fileName]);
          }
        }
      }

      // Reorder remaining images
      await reorderImages();

      toast({
        title: "Success",
        description: `${selectedImages.size} image${selectedImages.size > 1 ? 's' : ''} deleted successfully`
      });

      clearSelection();
      fetchImages();
    } catch (error) {
      console.error('Error bulk deleting images:', error);
      toast({
        title: "Error",
        description: "Failed to delete images",
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
          {!disabled && (
            <>
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

              {/* Selection Controls */}
              {images.length > 0 && (
                <div className="flex gap-2 items-center">
                  <Button
                    onClick={() => setIsSelectionMode(!isSelectionMode)}
                    variant="outline"
                    size="sm"
                  >
                    {isSelectionMode ? 'Cancel Selection' : 'Select Images'}
                  </Button>
                  
                  {isSelectionMode && (
                    <>
                      <Button
                        onClick={selectAllImages}
                        variant="outline"
                        size="sm"
                      >
                        Select All
                      </Button>
                      
                      {selectedImages.size > 0 && (
                        <>
                          <Button
                            onClick={clearSelection}
                            variant="outline"
                            size="sm"
                          >
                            Clear ({selectedImages.size})
                          </Button>
                          <Button
                            onClick={handleBulkDelete}
                            variant="destructive"
                            size="sm"
                          >
                            <Trash2 size={14} className="mr-1" />
                            Delete Selected ({selectedImages.size})
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}

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
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={images.map(img => img.id)} 
          strategy={verticalListSortingStrategy}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((image, index) => (
              <SortableImageCard
                key={image.id}
                image={image}
                index={index}
                disabled={disabled}
                isSelectionMode={isSelectionMode}
                isSelected={selectedImages.has(image.id)}
                onToggleSelection={() => toggleImageSelection(image.id)}
                onView={(url, alt, caption) => setViewerImage({ url, alt, caption })}
                onSetPrimary={handleSetPrimary}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
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
                    {!disabled && (
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
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </SortableContext>
      </DndContext>

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

      <ImageViewer
        isOpen={!!viewerImage}
        onClose={() => setViewerImage(null)}
        imageUrl={viewerImage?.url || ''}
        altText={viewerImage?.alt}
        caption={viewerImage?.caption}
      />
    </div>
  );
};

// Sortable Image Card Component
interface SortableImageCardProps {
  image: ProductImage;
  index: number;
  disabled: boolean;
  isSelectionMode: boolean;
  isSelected: boolean;
  onToggleSelection: () => void;
  onView: (url: string, alt: string, caption: string) => void;
  onSetPrimary: (id: string) => void;
  onEdit: (image: ProductImage) => void;
  onDelete: (image: ProductImage) => void;
}

const SortableImageCard = ({ 
  image, 
  index, 
  disabled, 
  isSelectionMode,
  isSelected,
  onToggleSelection,
  onView, 
  onSetPrimary, 
  onEdit, 
  onDelete 
}: SortableImageCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      className={`overflow-hidden ${isDragging ? 'z-50' : ''} ${isSelected ? 'ring-2 ring-primary' : ''}`}
    >
      <div className="aspect-square relative">
        {/* Selection Mode Controls */}
        {isSelectionMode && (
          <div className="absolute top-2 left-2 z-20">
            <Button
              size="sm"
              variant={isSelected ? "default" : "secondary"}
              onClick={onToggleSelection}
              className={`w-8 h-8 p-0 ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-background/80'}`}
            >
              {isSelected ? <Check size={14} /> : <div className="w-4 h-4 border-2 border-current rounded-sm" />}
            </Button>
          </div>
        )}

        {/* Drag Handle */}
        {!disabled && !isSelectionMode && (
          <div 
            className="absolute top-2 left-2 z-10 cursor-grab active:cursor-grabbing bg-background/80 rounded p-1"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={16} className="text-muted-foreground" />
          </div>
        )}
        
        <img
          src={image.image_url}
          alt={image.alt_text || `Product image ${index + 1}`}
          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
          onClick={() => onView(
            image.image_url,
            image.alt_text || `Product image ${index + 1}`,
            image.caption || ''
          )}
        />
        
        {image.is_primary && (
          <Badge className="absolute bottom-2 left-2 bg-primary">
            Primary
          </Badge>
        )}
        
        {!disabled && !isSelectionMode && (
          <div className="absolute top-2 right-2 flex gap-1">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onSetPrimary(image.id)}
              disabled={image.is_primary}
              title={image.is_primary ? "Primary image" : "Set as primary"}
            >
              {image.is_primary ? <Star size={14} /> : <StarOff size={14} />}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onEdit(image)}
              title="Edit image details"
            >
              <Edit size={14} />
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onDelete(image)}
              title="Delete image"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        )}
      </div>
      
      <CardContent className="p-3">
        <div className="space-y-1">
          {image.alt_text && (
            <p className="text-sm font-medium">{image.alt_text}</p>
          )}
          {image.caption && (
            <p className="text-xs text-muted-foreground">{image.caption}</p>
          )}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Order: {image.sort_order + 1}</p>
            {!disabled && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEdit(image)}
                className="text-xs h-6 px-2"
                title="Change order"
              >
                Change
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductImageManager;