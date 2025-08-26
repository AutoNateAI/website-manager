import { useState, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Package, Settings, Edit, Users, Link } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface Product {
  id: string;
  slug: string;
  title: string;
  tagline?: string;
  description: string;
  price: string;
  features: string[];
  benefits: string[];
  testimonials: any[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  company?: { name: string };
}

interface Service {
  id: string;
  name: string;
  description?: string;
  company_id: string;
  service_type?: string;
  pricing_model?: string;
  price_range?: string;
  tags: string[];
  notes?: string;
  is_active: boolean;
  created_at: string;
  company: { name: string };
}

interface Company {
  id: string;
  name: string;
}

interface Person {
  id: string;
  name: string;
  company?: { name: string };
}

interface ProductPerson {
  id: string;
  product_id: string;
  person_id: string;
  relationship_type: string;
  notes?: string;
  person: Person;
}

interface ServicePerson {
  id: string;
  service_id: string;
  person_id: string;
  relationship_type: string;
  notes?: string;
  person: Person;
}

export const ProductServiceManager = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [productPeople, setProductPeople] = useState<ProductPerson[]>([]);
  const [servicePeople, setServicePeople] = useState<ServicePerson[]>([]);
  
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [isServiceFormOpen, setIsServiceFormOpen] = useState(false);
  const [isPeopleDialogOpen, setIsPeopleDialogOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [selectedItemType, setSelectedItemType] = useState<'product' | 'service'>('product');
  
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const [productFormData, setProductFormData] = useState({
    title: '',
    tagline: '',
    description: '',
    price: '',
    slug: '',
    features: '',
    benefits: '',
    is_active: true
  });

  const [serviceFormData, setServiceFormData] = useState({
    name: '',
    description: '',
    company_id: 'none',
    service_type: '',
    pricing_model: '',
    price_range: '',
    tags: '',
    notes: '',
    is_active: true
  });

  const [peopleFormData, setPeopleFormData] = useState({
    person_id: 'none',
    relationship_type: 'user',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await Promise.all([
      fetchProducts(),
      fetchServices(),
      fetchCompanies(),
      fetchPeople(),
      fetchProductPeople(),
      fetchServicePeople()
    ]);
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      
      const transformedData: Product[] = (data || []).map(product => ({
        ...product,
        features: Array.isArray(product.features) ? product.features.filter(f => typeof f === 'string') as string[] : [],
        benefits: Array.isArray(product.benefits) ? product.benefits.filter(b => typeof b === 'string') as string[] : [],
        testimonials: Array.isArray(product.testimonials) ? product.testimonials : []
      }));
      
      setProducts(transformedData);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          company:companies(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const transformedData: Service[] = (data || []).map(service => ({
        ...service,
        tags: Array.isArray(service.tags) ? service.tags.filter(tag => typeof tag === 'string') as string[] : []
      }));
      
      setServices(transformedData);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchPeople = async () => {
    try {
      const { data, error } = await supabase
        .from('people')
        .select(`
          id, 
          name,
          company:companies(name)
        `)
        .order('name');

      if (error) throw error;
      setPeople(data || []);
    } catch (error) {
      console.error('Error fetching people:', error);
    }
  };

  const fetchProductPeople = async () => {
    try {
      const { data, error } = await supabase
        .from('product_people')
        .select(`
          *,
          person:people(
            id,
            name,
            company:companies(name)
          )
        `);

      if (error) throw error;
      setProductPeople(data || []);
    } catch (error) {
      console.error('Error fetching product people:', error);
    }
  };

  const fetchServicePeople = async () => {
    try {
      const { data, error } = await supabase
        .from('service_people')
        .select(`
          *,
          person:people(
            id,
            name,
            company:companies(name)
          )
        `);

      if (error) throw error;
      setServicePeople(data || []);
    } catch (error) {
      console.error('Error fetching service people:', error);
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const submissionData = {
        title: productFormData.title,
        tagline: productFormData.tagline || null,
        description: productFormData.description,
        price: productFormData.price,
        slug: productFormData.slug,
        features: productFormData.features ? productFormData.features.split(',').map(f => f.trim()).filter(Boolean) : [],
        benefits: productFormData.benefits ? productFormData.benefits.split(',').map(b => b.trim()).filter(Boolean) : [],
        is_active: productFormData.is_active
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(submissionData as any)
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast({ title: "Success", description: "Product updated successfully" });
      } else {
        const { error } = await supabase
          .from('products')
          .insert(submissionData as any);

        if (error) throw error;
        toast({ title: "Success", description: "Product created successfully" });
      }

      resetProductForm();
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      toast({ title: "Error", description: "Failed to save product", variant: "destructive" });
    }
  };

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const submissionData = {
        name: serviceFormData.name,
        description: serviceFormData.description || null,
        company_id: serviceFormData.company_id === 'none' ? null : serviceFormData.company_id,
        service_type: serviceFormData.service_type || null,
        pricing_model: serviceFormData.pricing_model || null,
        price_range: serviceFormData.price_range || null,
        tags: serviceFormData.tags ? serviceFormData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
        notes: serviceFormData.notes || null,
        is_active: serviceFormData.is_active
      };

      if (editingService) {
        const { error } = await supabase
          .from('services')
          .update(submissionData as any)
          .eq('id', editingService.id);

        if (error) throw error;
        toast({ title: "Success", description: "Service updated successfully" });
      } else {
        const { error } = await supabase
          .from('services')
          .insert(submissionData as any);

        if (error) throw error;
        toast({ title: "Success", description: "Service created successfully" });
      }

      resetServiceForm();
      fetchServices();
    } catch (error) {
      console.error('Error saving service:', error);
      toast({ title: "Error", description: "Failed to save service", variant: "destructive" });
    }
  };

  const handleAddPersonConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const data = {
        [`${selectedItemType}_id`]: selectedItemId,
        person_id: peopleFormData.person_id,
        relationship_type: peopleFormData.relationship_type,
        notes: peopleFormData.notes || null
      };

      const table = selectedItemType === 'product' ? 'product_people' : 'service_people';
      const { error } = await supabase
        .from(table)
        .insert(data as any);

      if (error) throw error;

      toast({ title: "Success", description: "Person connection added successfully" });
      setPeopleFormData({ person_id: 'none', relationship_type: 'user', notes: '' });
      setIsPeopleDialogOpen(false);
      
      if (selectedItemType === 'product') {
        fetchProductPeople();
      } else {
        fetchServicePeople();
      }
    } catch (error) {
      console.error('Error adding person connection:', error);
      toast({ title: "Error", description: "Failed to add person connection", variant: "destructive" });
    }
  };

  const resetProductForm = () => {
    setProductFormData({
      title: '',
      tagline: '',
      description: '',
      price: '',
      slug: '',
      features: '',
      benefits: '',
      is_active: true
    });
    setEditingProduct(null);
    setIsProductFormOpen(false);
  };

  const resetServiceForm = () => {
    setServiceFormData({
      name: '',
      description: '',
      company_id: 'none',
      service_type: '',
      pricing_model: '',
      price_range: '',
      tags: '',
      notes: '',
      is_active: true
    });
    setEditingService(null);
    setIsServiceFormOpen(false);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductFormData({
      title: product.title,
      tagline: product.tagline || '',
      description: product.description,
      price: product.price,
      slug: product.slug,
      features: product.features.join(', '),
      benefits: product.benefits.join(', '),
      is_active: product.is_active
    });
    setIsProductFormOpen(true);
  };

  const handleEditService = (service: Service) => {
    setEditingService(service);
    setServiceFormData({
      name: service.name,
      description: service.description || '',
      company_id: service.company_id || 'none',
      service_type: service.service_type || '',
      pricing_model: service.pricing_model || '',
      price_range: service.price_range || '',
      tags: service.tags.join(', '),
      notes: service.notes || '',
      is_active: service.is_active
    });
    setIsServiceFormOpen(true);
  };

  const openPeopleDialog = (itemId: string, itemType: 'product' | 'service') => {
    setSelectedItemId(itemId);
    setSelectedItemType(itemType);
    setIsPeopleDialogOpen(true);
  };

  const getConnectedPeople = (itemId: string, itemType: 'product' | 'service') => {
    const connections = itemType === 'product' 
      ? productPeople.filter(pp => pp.product_id === itemId)
      : servicePeople.filter(sp => sp.service_id === itemId);
    
    return connections;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold">Products & Services</h3>
          <p className="text-muted-foreground">Manage products and services linked to companies</p>
        </div>
      </div>

      <Tabs defaultValue="products" className="space-y-6">
        <TabsList>
          <TabsTrigger value="products">Products ({products.length})</TabsTrigger>
          <TabsTrigger value="services">Services ({services.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-6">
          <div className="flex justify-between items-center">
            <h4 className="text-lg font-medium">Products</h4>
            <Dialog open={isProductFormOpen} onOpenChange={setIsProductFormOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetProductForm(); setIsProductFormOpen(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleProductSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={productFormData.title}
                      onChange={(e) => setProductFormData({ ...productFormData, title: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="slug">Slug *</Label>
                    <Input
                      id="slug"
                      value={productFormData.slug}
                      onChange={(e) => setProductFormData({ ...productFormData, slug: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="tagline">Tagline</Label>
                    <Input
                      id="tagline"
                      value={productFormData.tagline}
                      onChange={(e) => setProductFormData({ ...productFormData, tagline: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={productFormData.description}
                      onChange={(e) => setProductFormData({ ...productFormData, description: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="price">Price *</Label>
                    <Input
                      id="price"
                      value={productFormData.price}
                      onChange={(e) => setProductFormData({ ...productFormData, price: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="features">Features (comma-separated)</Label>
                    <Textarea
                      id="features"
                      value={productFormData.features}
                      onChange={(e) => setProductFormData({ ...productFormData, features: e.target.value })}
                      placeholder="Feature 1, Feature 2, Feature 3"
                    />
                  </div>

                  <div>
                    <Label htmlFor="benefits">Benefits (comma-separated)</Label>
                    <Textarea
                      id="benefits"
                      value={productFormData.benefits}
                      onChange={(e) => setProductFormData({ ...productFormData, benefits: e.target.value })}
                      placeholder="Benefit 1, Benefit 2, Benefit 3"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={productFormData.is_active}
                      onCheckedChange={(checked) => setProductFormData({ ...productFormData, is_active: checked })}
                    />
                    <Label htmlFor="is_active">Active</Label>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={resetProductForm}>Cancel</Button>
                    <Button type="submit">{editingProduct ? 'Update' : 'Create'} Product</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Package className="h-5 w-5 text-blue-500" />
                      {product.title}
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEditProduct(product)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => openPeopleDialog(product.id, 'product')}
                      >
                        <Link className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={product.is_active ? 'default' : 'secondary'}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant="outline">{product.price}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {product.tagline && (
                    <p className="text-sm font-medium text-muted-foreground">{product.tagline}</p>
                  )}
                  
                  <p className="text-sm text-muted-foreground line-clamp-3">{product.description}</p>

                  {product.features.length > 0 && (
                    <div>
                      <span className="text-sm font-medium">Features:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {product.features.slice(0, 3).map((feature, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                        {product.features.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{product.features.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {getConnectedPeople(product.id, 'product').length > 0 && (
                    <div className="pt-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Connected People:</span>
                        <Badge variant="secondary">{getConnectedPeople(product.id, 'product').length}</Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {products.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground py-8">
                No products found. Create your first product to get started.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="services" className="space-y-6">
          <div className="flex justify-between items-center">
            <h4 className="text-lg font-medium">Services</h4>
            <Dialog open={isServiceFormOpen} onOpenChange={setIsServiceFormOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetServiceForm(); setIsServiceFormOpen(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Service
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingService ? 'Edit Service' : 'Add New Service'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleServiceSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={serviceFormData.name}
                      onChange={(e) => setServiceFormData({ ...serviceFormData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="company">Company *</Label>
                    <Select value={serviceFormData.company_id} onValueChange={(value) => setServiceFormData({ ...serviceFormData, company_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select company" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No company</SelectItem>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={serviceFormData.description}
                      onChange={(e) => setServiceFormData({ ...serviceFormData, description: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="service_type">Service Type</Label>
                    <Input
                      id="service_type"
                      value={serviceFormData.service_type}
                      onChange={(e) => setServiceFormData({ ...serviceFormData, service_type: e.target.value })}
                      placeholder="consulting, support, training"
                    />
                  </div>

                  <div>
                    <Label htmlFor="pricing_model">Pricing Model</Label>
                    <Select value={serviceFormData.pricing_model} onValueChange={(value) => setServiceFormData({ ...serviceFormData, pricing_model: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select pricing model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="project">Project-based</SelectItem>
                        <SelectItem value="subscription">Subscription</SelectItem>
                        <SelectItem value="retainer">Retainer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="price_range">Price Range</Label>
                    <Input
                      id="price_range"
                      value={serviceFormData.price_range}
                      onChange={(e) => setServiceFormData({ ...serviceFormData, price_range: e.target.value })}
                      placeholder="$100-500/hour, $5,000-10,000/project"
                    />
                  </div>

                  <div>
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input
                      id="tags"
                      value={serviceFormData.tags}
                      onChange={(e) => setServiceFormData({ ...serviceFormData, tags: e.target.value })}
                      placeholder="enterprise, B2B, technical"
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={serviceFormData.notes}
                      onChange={(e) => setServiceFormData({ ...serviceFormData, notes: e.target.value })}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={serviceFormData.is_active}
                      onCheckedChange={(checked) => setServiceFormData({ ...serviceFormData, is_active: checked })}
                    />
                    <Label htmlFor="is_active">Active</Label>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={resetServiceForm}>Cancel</Button>
                    <Button type="submit">{editingService ? 'Update' : 'Create'} Service</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <Card key={service.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Settings className="h-5 w-5 text-green-500" />
                      {service.name}
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEditService(service)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => openPeopleDialog(service.id, 'service')}
                      >
                        <Link className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={service.is_active ? 'default' : 'secondary'}>
                      {service.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {service.service_type && (
                      <Badge variant="outline">{service.service_type}</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Company:</span>
                    <span className="text-sm">{service.company.name}</span>
                  </div>

                  {service.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{service.description}</p>
                  )}

                  {service.pricing_model && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Pricing:</span>
                      <span className="text-sm">{service.pricing_model}</span>
                      {service.price_range && (
                        <Badge variant="outline" className="text-xs">{service.price_range}</Badge>
                      )}
                    </div>
                  )}

                  {service.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2">
                      {service.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {service.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{service.tags.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}

                  {getConnectedPeople(service.id, 'service').length > 0 && (
                    <div className="pt-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Connected People:</span>
                        <Badge variant="secondary">{getConnectedPeople(service.id, 'service').length}</Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {services.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground py-8">
                No services found. Create your first service to get started.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* People Connection Dialog */}
      <Dialog open={isPeopleDialogOpen} onOpenChange={setIsPeopleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Person to {selectedItemType === 'product' ? 'Product' : 'Service'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddPersonConnection} className="space-y-4">
            <div>
              <Label htmlFor="person">Person *</Label>
              <Select value={peopleFormData.person_id} onValueChange={(value) => setPeopleFormData({ ...peopleFormData, person_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select a person</SelectItem>
                  {people.map((person) => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.name} {person.company?.name && `(${person.company.name})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="relationship_type">Relationship Type *</Label>
              <Select value={peopleFormData.relationship_type} onValueChange={(value) => setPeopleFormData({ ...peopleFormData, relationship_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="decision_maker">Decision Maker</SelectItem>
                  <SelectItem value="influencer">Influencer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="connection_notes">Notes</Label>
              <Textarea
                id="connection_notes"
                value={peopleFormData.notes}
                onChange={(e) => setPeopleFormData({ ...peopleFormData, notes: e.target.value })}
                placeholder="Additional context about this connection..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsPeopleDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={peopleFormData.person_id === 'none'}>
                Connect Person
              </Button>
            </div>
          </form>

          {/* Show existing connections */}
          <div className="mt-6">
            <h4 className="font-medium mb-2">Current Connections:</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {getConnectedPeople(selectedItemId, selectedItemType).map((connection) => (
                <div key={connection.id} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div>
                    <span className="font-medium">{connection.person.name}</span>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {connection.relationship_type}
                    </Badge>
                    {connection.person.company?.name && (
                      <span className="text-sm text-muted-foreground ml-2">
                        ({connection.person.company.name})
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {getConnectedPeople(selectedItemId, selectedItemType).length === 0 && (
                <p className="text-sm text-muted-foreground">No connections yet.</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};