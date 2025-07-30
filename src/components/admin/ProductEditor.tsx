import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Sparkles, Save, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import ProductImageManager from './ProductImageManager';

interface Product {
  id: string;
  title: string;
  tagline: string | null;
  description: string;
  price: string;
  slug: string;
  is_active: boolean;
  features: any[];
  benefits: any[];
  testimonials: any[];
  sort_order: number;
}

interface ProductEditorProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  isCreating: boolean;
}

const ProductEditor = ({ product, isOpen, onClose, isCreating }: ProductEditorProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [generatingContent, setGeneratingContent] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    tagline: '',
    description: '',
    price: '',
    slug: '',
    is_active: true,
    features: [] as string[],
    benefits: [] as string[],
    testimonials: [] as { name: string; content: string; rating: number }[],
    sort_order: 0
  });

  // AI prompt state
  const [aiPrompt, setAiPrompt] = useState('');

  useEffect(() => {
    if (product) {
      setFormData({
        title: product.title,
        tagline: product.tagline || '',
        description: product.description,
        price: product.price,
        slug: product.slug,
        is_active: product.is_active,
        features: Array.isArray(product.features) ? product.features : [],
        benefits: Array.isArray(product.benefits) ? product.benefits : [],
        testimonials: Array.isArray(product.testimonials) ? product.testimonials : [],
        sort_order: product.sort_order
      });
    } else {
      setFormData({
        title: '',
        tagline: '',
        description: '',
        price: '',
        slug: '',
        is_active: true,
        features: [],
        benefits: [],
        testimonials: [],
        sort_order: 0
      });
    }
  }, [product]);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-generate slug when title changes
      if (field === 'title') {
        updated.slug = generateSlug(value);
      }
      
      return updated;
    });
  };

  const handleArrayAdd = (field: 'features' | 'benefits', value: string) => {
    if (value.trim()) {
      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], value.trim()]
      }));
    }
  };

  const handleArrayRemove = (field: 'features' | 'benefits', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleTestimonialAdd = (testimonial: { name: string; content: string; rating: number }) => {
    if (testimonial.name.trim() && testimonial.content.trim()) {
      setFormData(prev => ({
        ...prev,
        testimonials: [...prev.testimonials, testimonial]
      }));
    }
  };

  const handleTestimonialRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      testimonials: prev.testimonials.filter((_, i) => i !== index)
    }));
  };

  const generateWithAI = async () => {
    if (!aiPrompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a product description for AI generation",
        variant: "destructive"
      });
      return;
    }

    try {
      setGeneratingContent(true);

      const { data, error } = await supabase.functions.invoke('generate-product-content', {
        body: { prompt: aiPrompt }
      });

      if (error) throw error;

      if (data.content) {
        setFormData(prev => ({
          ...prev,
          title: data.content.title || prev.title,
          tagline: data.content.tagline || prev.tagline,
          description: data.content.description || prev.description,
          price: data.content.price || prev.price,
          features: data.content.features || prev.features,
          benefits: data.content.benefits || prev.benefits,
          slug: generateSlug(data.content.title || prev.title)
        }));

        toast({
          title: "Success",
          description: "Product content generated successfully"
        });

        setAiPrompt('');
      }
    } catch (error) {
      console.error('Error generating content:', error);
      toast({
        title: "Error",
        description: "Failed to generate product content",
        variant: "destructive"
      });
    } finally {
      setGeneratingContent(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Product title is required",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      const productData = {
        title: formData.title,
        tagline: formData.tagline || null,
        description: formData.description,
        price: formData.price,
        slug: formData.slug,
        is_active: formData.is_active,
        features: formData.features,
        benefits: formData.benefits,
        testimonials: formData.testimonials,
        sort_order: formData.sort_order
      };

      if (isCreating) {
        const { error } = await supabase
          .from('products')
          .insert([productData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Product created successfully"
        });
      } else {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', product!.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Product updated successfully"
        });
      }

      onClose();
    } catch (error) {
      console.error('Error saving product:', error);
      toast({
        title: "Error",
        description: "Failed to save product",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto glass-card">
        <DialogHeader>
          <DialogTitle className="gradient-text">
            {isCreating ? 'Create New Product' : 'Edit Product'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            {/* AI Generation Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles size={18} />
                  AI Content Generation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Describe your product for AI generation:</Label>
                  <Textarea
                    placeholder="e.g., A premium project management tool for small teams that helps track tasks, deadlines, and collaboration..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button 
                  onClick={generateWithAI}
                  disabled={generatingContent || !aiPrompt.trim()}
                  className="w-full"
                >
                  {generatingContent ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} className="mr-2" />
                      Generate Product Content
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Product Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter product title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  value={formData.tagline}
                  onChange={(e) => handleInputChange('tagline', e.target.value)}
                  placeholder="Short catchy tagline"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  placeholder="e.g., $99/month, Free, Contact for pricing"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => handleInputChange('slug', e.target.value)}
                  placeholder="url-friendly-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sort_order">Sort Order</Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => handleInputChange('sort_order', parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Detailed product description"
                rows={4}
              />
            </div>
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            {/* Features */}
            <ArrayInput
              title="Features"
              items={formData.features}
              onAdd={(value) => handleArrayAdd('features', value)}
              onRemove={(index) => handleArrayRemove('features', index)}
              placeholder="Add a feature"
            />

            {/* Benefits */}
            <ArrayInput
              title="Benefits"
              items={formData.benefits}
              onAdd={(value) => handleArrayAdd('benefits', value)}
              onRemove={(index) => handleArrayRemove('benefits', index)}
              placeholder="Add a benefit"
            />

            {/* Testimonials */}
            <TestimonialInput
              testimonials={formData.testimonials}
              onAdd={handleTestimonialAdd}
              onRemove={handleTestimonialRemove}
            />
          </TabsContent>

          <TabsContent value="images" className="space-y-4">
            {product && (
              <ProductImageManager 
                productId={product.id}
                productTitle={product.title}
              />
            )}
            {isCreating && (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">
                    Save the product first to manage images
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save size={16} className="mr-2" />
                {isCreating ? 'Create Product' : 'Update Product'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Helper Components
const ArrayInput = ({ title, items, onAdd, onRemove, placeholder }: {
  title: string;
  items: string[];
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
  placeholder: string;
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    onAdd(inputValue);
    setInputValue('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
          />
          <Button onClick={handleAdd} disabled={!inputValue.trim()}>
            <Plus size={16} />
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1">
              {item}
              <X 
                size={14} 
                className="cursor-pointer hover:text-destructive" 
                onClick={() => onRemove(index)}
              />
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const TestimonialInput = ({ testimonials, onAdd, onRemove }: {
  testimonials: { name: string; content: string; rating: number }[];
  onAdd: (testimonial: { name: string; content: string; rating: number }) => void;
  onRemove: (index: number) => void;
}) => {
  const [newTestimonial, setNewTestimonial] = useState({
    name: '',
    content: '',
    rating: 5
  });

  const handleAdd = () => {
    onAdd(newTestimonial);
    setNewTestimonial({ name: '', content: '', rating: 5 });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Testimonials</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            placeholder="Customer name"
            value={newTestimonial.name}
            onChange={(e) => setNewTestimonial(prev => ({ ...prev, name: e.target.value }))}
          />
          <Input
            type="number"
            min="1"
            max="5"
            placeholder="Rating (1-5)"
            value={newTestimonial.rating}
            onChange={(e) => setNewTestimonial(prev => ({ ...prev, rating: parseInt(e.target.value) || 5 }))}
          />
        </div>
        <Textarea
          placeholder="Testimonial content"
          value={newTestimonial.content}
          onChange={(e) => setNewTestimonial(prev => ({ ...prev, content: e.target.value }))}
          rows={3}
        />
        <Button 
          onClick={handleAdd} 
          disabled={!newTestimonial.name.trim() || !newTestimonial.content.trim()}
          className="w-full"
        >
          <Plus size={16} className="mr-2" />
          Add Testimonial
        </Button>
        
        <div className="space-y-2">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold">{testimonial.name}</span>
                    <Badge variant="outline">{testimonial.rating}★</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{testimonial.content}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <X size={16} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductEditor;