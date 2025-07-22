import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Image, Save, Trash2, Edit, Eye, Megaphone } from 'lucide-react';

interface Advertisement {
  id: string;
  title: string;
  image_url?: string;
  alt_text?: string;
  link_type: string;
  link_url?: string;
  product_id?: string;
  width?: number;
  height?: number;
  position: string;
  target_type: string;
  target_value?: string;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

const AdManager = () => {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    image_url: '',
    alt_text: '',
    link_type: 'external',
    link_url: '',
    product_id: '',
    width: 300,
    height: 250,
    position: 'sidebar',
    target_type: 'all',
    target_value: '',
    is_active: true,
    start_date: '',
    end_date: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    try {
      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAds(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch advertisements: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      image_url: '',
      alt_text: '',
      link_type: 'external',
      link_url: '',
      product_id: '',
      width: 300,
      height: 250,
      position: 'sidebar',
      target_type: 'all',
      target_value: '',
      is_active: true,
      start_date: '',
      end_date: '',
    });
    setEditingAd(null);
  };

  const handleCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (ad: Advertisement) => {
    setFormData({
      title: ad.title,
      image_url: ad.image_url || '',
      alt_text: ad.alt_text || '',
      link_type: ad.link_type,
      link_url: ad.link_url || '',
      product_id: ad.product_id || '',
      width: ad.width || 300,
      height: ad.height || 250,
      position: ad.position,
      target_type: ad.target_type,
      target_value: ad.target_value || '',
      is_active: ad.is_active,
      start_date: ad.start_date ? ad.start_date.split('T')[0] : '',
      end_date: ad.end_date ? ad.end_date.split('T')[0] : '',
    });
    setEditingAd(ad);
    setShowForm(true);
  };

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const saveAd = async () => {
    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Title is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const adData = {
        ...formData,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        link_url: formData.link_type === 'external' ? formData.link_url : null,
        product_id: formData.link_type === 'product' ? formData.product_id : null,
      };

      if (editingAd) {
        const { error } = await supabase
          .from('advertisements')
          .update(adData)
          .eq('id', editingAd.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('advertisements')
          .insert([adData]);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Advertisement ${editingAd ? 'updated' : 'created'} successfully!`,
      });

      setShowForm(false);
      resetForm();
      fetchAds();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to ${editingAd ? 'update' : 'create'} advertisement: ` + error.message,
        variant: "destructive",
      });
    }
  };

  const deleteAd = async (id: string) => {
    if (!confirm('Are you sure you want to delete this advertisement?')) return;

    try {
      const { error } = await supabase
        .from('advertisements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAds(ads.filter(ad => ad.id !== id));
      toast({
        title: "Success",
        description: "Advertisement deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete advertisement: " + error.message,
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('advertisements')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;

      setAds(ads.map(ad => 
        ad.id === id ? { ...ad, is_active: !isActive } : ad
      ));

      toast({
        title: "Success",
        description: `Advertisement ${!isActive ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update advertisement status: " + error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-8">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold gradient-text">
                {editingAd ? 'Edit Advertisement' : 'Create New Advertisement'}
              </h2>
              <p className="text-muted-foreground mt-1">
                {editingAd ? 'Update advertisement details' : 'Create a new advertisement'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="glass-button"
              >
                Cancel
              </Button>
              <Button onClick={saveAd} className="glass-button glow-primary">
                <Save size={18} className="mr-2" />
                Save Advertisement
              </Button>
            </div>
          </div>
        </div>

        <Card className="glass-card">
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="glass bg-transparent"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Select value={formData.position} onValueChange={(value) => handleInputChange('position', value)}>
                  <SelectTrigger className="glass bg-transparent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="header">Header</SelectItem>
                    <SelectItem value="sidebar">Sidebar</SelectItem>
                    <SelectItem value="content">In-Content</SelectItem>
                    <SelectItem value="footer">Footer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image-url">Image URL</Label>
              <Input
                id="image-url"
                value={formData.image_url}
                onChange={(e) => handleInputChange('image_url', e.target.value)}
                className="glass bg-transparent"
                placeholder="https://example.com/ad-image.jpg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alt-text">Alt Text</Label>
              <Input
                id="alt-text"
                value={formData.alt_text}
                onChange={(e) => handleInputChange('alt_text', e.target.value)}
                className="glass bg-transparent"
                placeholder="Description of the image"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="link-type">Link Type</Label>
                <Select value={formData.link_type} onValueChange={(value) => handleInputChange('link_type', value)}>
                  <SelectTrigger className="glass bg-transparent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="external">External URL</SelectItem>
                    <SelectItem value="product">Product</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {formData.link_type === 'external' && (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="link-url">Link URL</Label>
                  <Input
                    id="link-url"
                    value={formData.link_url}
                    onChange={(e) => handleInputChange('link_url', e.target.value)}
                    className="glass bg-transparent"
                    placeholder="https://example.com"
                  />
                </div>
              )}

              {formData.link_type === 'product' && (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="product-id">Product ID</Label>
                  <Select value={formData.product_id} onValueChange={(value) => handleInputChange('product_id', value)}>
                    <SelectTrigger className="glass bg-transparent">
                      <SelectValue placeholder="Select a product" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ai-grant-assistant">AI Grant Assistant</SelectItem>
                      <SelectItem value="lit-review-ai">Literature Review AI</SelectItem>
                      <SelectItem value="data-pipeline-builder">Data Pipeline Builder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="width">Width (px)</Label>
                <Input
                  id="width"
                  type="number"
                  value={formData.width}
                  onChange={(e) => handleInputChange('width', parseInt(e.target.value) || 0)}
                  className="glass bg-transparent"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Height (px)</Label>
                <Input
                  id="height"
                  type="number"
                  value={formData.height}
                  onChange={(e) => handleInputChange('height', parseInt(e.target.value) || 0)}
                  className="glass bg-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date (optional)</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleInputChange('start_date', e.target.value)}
                  className="glass bg-transparent"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date (optional)</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => handleInputChange('end_date', e.target.value)}
                  className="glass bg-transparent"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is-active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleInputChange('is_active', checked)}
              />
              <Label htmlFor="is-active">Active</Label>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold gradient-text">Advertisement Management</h2>
            <p className="text-muted-foreground mt-1">
              Create and manage advertisements for your blog
            </p>
          </div>
          <Button onClick={handleCreate} className="glass-button glow-primary">
            <Plus size={18} className="mr-2" />
            Create New Ad
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {ads.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-16 text-center">
              <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                <Megaphone className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No advertisements yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first advertisement to start monetizing your blog
              </p>
              <Button onClick={handleCreate} className="glass-button">
                <Plus size={16} className="mr-2" />
                Create Your First Ad
              </Button>
            </CardContent>
          </Card>
        ) : (
          ads.map((ad) => (
            <Card key={ad.id} className="glass-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold">{ad.title}</h3>
                      <Badge variant={ad.is_active ? "default" : "secondary"}>
                        {ad.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <span>Position: {ad.position}</span>
                      <span>Size: {ad.width}x{ad.height}px</span>
                      <span>Type: {ad.link_type}</span>
                      {ad.start_date && <span>Starts: {new Date(ad.start_date).toLocaleDateString()}</span>}
                      {ad.end_date && <span>Ends: {new Date(ad.end_date).toLocaleDateString()}</span>}
                    </div>
                    {ad.image_url && (
                      <div className="mb-3">
                        <img 
                          src={ad.image_url} 
                          alt={ad.alt_text || ad.title}
                          className="w-32 h-20 object-cover rounded border border-border"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(ad.id, ad.is_active)}
                      className="glass-button"
                    >
                      <Eye size={16} className="mr-1" />
                      {ad.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(ad)}
                      className="glass-button"
                    >
                      <Edit size={16} className="mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteAd(ad.id)}
                      className="glass-button hover:border-destructive hover:text-destructive"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AdManager;