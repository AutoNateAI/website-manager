import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Eye, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import ProductEditor from './ProductEditor';

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
  created_at: string;
  updated_at: string;
}

interface ProductImage {
  id: string;
  image_url: string;
  alt_text: string | null;
  caption: string | null;
  is_primary: boolean;
  sort_order: number;
}

const ProductManager = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [productImages, setProductImages] = useState<Record<string, ProductImage[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [creatingNew, setCreatingNew] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('sort_order', { ascending: true });

      if (productsError) throw productsError;

      setProducts(productsData || []);

      // Fetch product images
      const { data: imagesData, error: imagesError } = await supabase
        .from('product_images')
        .select('*')
        .order('sort_order', { ascending: true });

      if (imagesError) throw imagesError;

      // Group images by product_id
      const imagesByProduct: Record<string, ProductImage[]> = {};
      imagesData?.forEach(image => {
        if (!imagesByProduct[image.product_id]) {
          imagesByProduct[image.product_id] = [];
        }
        imagesByProduct[image.product_id].push(image);
      });

      setProductImages(imagesByProduct);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to fetch products",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setSelectedProduct(null);
    setCreatingNew(true);
    setShowEditor(true);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setCreatingNew(false);
    setShowEditor(true);
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete "${product.title}"?`)) return;

    try {
      // Delete product images first
      const { error: imagesError } = await supabase
        .from('product_images')
        .delete()
        .eq('product_id', product.id);

      if (imagesError) throw imagesError;

      // Delete product
      const { error: productError } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);

      if (productError) throw productError;

      toast({
        title: "Success",
        description: "Product deleted successfully"
      });

      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive"
      });
    }
  };

  const handleEditorClose = () => {
    setShowEditor(false);
    setSelectedProduct(null);
    setCreatingNew(false);
    fetchProducts();
  };

  const getPrimaryImage = (productId: string) => {
    const images = productImages[productId] || [];
    return images.find(img => img.is_primary) || images[0];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold gradient-text">Product Management</h2>
            <p className="text-muted-foreground mt-1">
              Manage your products, images, and content
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleCreateNew}
              className="glass-button"
              size="sm"
            >
              <Plus size={16} className="mr-2" />
              New Product
            </Button>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => {
          const primaryImage = getPrimaryImage(product.id);
          const imageCount = productImages[product.id]?.length || 0;

          return (
            <Card key={product.id} className="glass-card hover:glow-primary transition-all duration-300">
              <CardHeader className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{product.title}</CardTitle>
                    {product.tagline && (
                      <p className="text-sm text-muted-foreground mt-1">{product.tagline}</p>
                    )}
                  </div>
                  <Badge variant={product.is_active ? "default" : "secondary"}>
                    {product.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="p-4 pt-0">
                {/* Product Image */}
                {primaryImage ? (
                  <div className="aspect-video bg-muted rounded-lg mb-4 overflow-hidden">
                    <img
                      src={primaryImage.image_url}
                      alt={primaryImage.alt_text || product.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-muted rounded-lg mb-4 flex items-center justify-center">
                    <span className="text-muted-foreground text-sm">No image</span>
                  </div>
                )}

                {/* Product Info */}
                <div className="space-y-2 mb-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-primary">{product.price}</span>
                    {imageCount > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {imageCount} image{imageCount !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(product)}
                    className="flex-1"
                  >
                    <Edit size={14} className="mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(product)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Empty State */}
        {products.length === 0 && (
          <div className="col-span-full">
            <Card className="glass-card">
              <CardContent className="p-12 text-center">
                <Package size={48} className="mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No products yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first product to get started
                </p>
                <Button onClick={handleCreateNew} className="glass-button">
                  <Plus size={16} className="mr-2" />
                  Create First Product
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Product Editor Modal */}
      {showEditor && (
        <ProductEditor
          product={selectedProduct}
          isOpen={showEditor}
          onClose={handleEditorClose}
          isCreating={creatingNew}
        />
      )}
    </div>
  );
};

export default ProductManager;