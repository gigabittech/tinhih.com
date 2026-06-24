import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/context/page-context";
import { api } from "@/lib/api";
import { Plus, Package, Eye, Edit, Trash2, RefreshCw, ShoppingCart } from "lucide-react";

interface PrintfulProduct {
  id: number;
  name: string;
  description: string;
  retail_price: number;
  currency: string;
  images: string[];
  variants: any[];
  is_enabled: boolean;
  created: number;
  updated: number;
}

interface ProductTemplate {
  id: number;
  title: string;
  description: string;
  brand: string;
  model: string;
  image: string;
  has_children: boolean;
  has_files: boolean;
  category_id: number;
  category: {
    id: number;
    title: string;
  };
}

export default function AdminPrintful() {
  const [products, setProducts] = useState<PrintfulProduct[]>([]);
  const [templates, setTemplates] = useState<ProductTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ProductTemplate | null>(null);
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    retail_price: "",
    variant_id: "",
    files: [] as { url: string; type: string }[]
  });
  const { toast } = useToast();
  const { setPageInfo } = usePageTitle();

  useEffect(() => {
    console.log('Setting page info...');
    setPageInfo("Printful Management", "Manage your Printful store products");
    console.log('Fetching data...');
    fetchData();
  }, [setPageInfo]);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('Fetching Printful data...');

      const [productsResponse, templatesResponse] = await Promise.all([
        api.get("/api/printful/products"),
        api.get("/api/printful/templates")
      ]);

      console.log('Products response:', productsResponse);
      console.log('Templates response:', templatesResponse);

      if (productsResponse.success) {
        setProducts(productsResponse.data || []);
        console.log('Set products:', productsResponse.data);
      } else {
        console.error('Products response failed:', productsResponse);
      }

      if (templatesResponse.success) {
        setTemplates(templatesResponse.data || []);
        console.log('Set templates:', templatesResponse.data);
      } else {
        console.error('Templates response failed:', templatesResponse);
      }
    } catch (error: any) {
      console.error('Error fetching Printful data:', error);
      setError(error.message || 'Failed to fetch Printful data');
      toast({
        title: "Error",
        description: "Failed to fetch Printful data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async () => {
    try {
      setCreatingProduct(true);

      const response = await api.post("/api/printful/products", {
        name: productForm.name,
        description: productForm.description,
        retail_price: parseFloat(productForm.retail_price),
        variants: [{
          variant_id: parseInt(productForm.variant_id),
          retail_price: parseFloat(productForm.retail_price),
          files: productForm.files
        }]
      });

      if (response.success) {
        toast({
          title: "Success",
          description: "Product created successfully",
        });
        setCreatingProduct(false);
        setProductForm({
          name: "",
          description: "",
          retail_price: "",
          variant_id: "",
          files: []
        });
        setSelectedTemplate(null);
        fetchData(); // Refresh products list
      } else {
        throw new Error(response.error || "Failed to create product");
      }
    } catch (error: any) {
      console.error('Error creating product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create product",
        variant: "destructive",
      });
    } finally {
      setCreatingProduct(false);
    }
  };

  const handleTemplateSelect = (template: ProductTemplate) => {
    setSelectedTemplate(template);
    setProductForm(prev => ({
      ...prev,
      name: template.title,
      description: template.description
    }));
  };

  const addFile = () => {
    const url = prompt("Enter file URL:");
    if (url) {
      setProductForm(prev => ({
        ...prev,
        files: [...prev.files, { url, type: "default" }]
      }));
    }
  };

  const removeFile = (index: number) => {
    setProductForm(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <span className="ml-2">Loading Printful data...</span>
        </div>
      </AdminLayout>
    );

  }

  console.log('Rendering AdminPrintful with:', { products: products.length, templates: templates.length });

  try {
    return (
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Printful Management</h1>
              <p className="text-muted-foreground">
                Manage your Printful store products and fulfillment
              </p>
            </div>
            <Button onClick={fetchData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{products.length}</div>
                <p className="text-xs text-muted-foreground">
                  Products in your store
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available Templates</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{templates.length}</div>
                <p className="text-xs text-muted-foreground">
                  Product templates available
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Products</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {products.filter(p => p.is_enabled).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Currently enabled products
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Create New Product */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Plus className="h-5 w-5" />
                  <span>Create New Product</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Product Name</Label>
                  <Input
                    id="name"
                    value={productForm.name}
                    onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter product name"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={productForm.description}
                    onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter product description"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="retail_price">Retail Price ($)</Label>
                    <Input
                      id="retail_price"
                      type="number"
                      step="0.01"
                      value={productForm.retail_price}
                      onChange={(e) => setProductForm(prev => ({ ...prev, retail_price: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <Label htmlFor="variant_id">Variant ID</Label>
                    <Input
                      id="variant_id"
                      type="number"
                      value={productForm.variant_id}
                      onChange={(e) => setProductForm(prev => ({ ...prev, variant_id: e.target.value }))}
                      placeholder="Enter variant ID"
                    />
                  </div>
                </div>

                <div>
                  <Label>Product Files</Label>
                  <div className="space-y-2">
                    {productForm.files.map((file, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Input value={file.url} disabled />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addFile}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add File
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={handleCreateProduct}
                  disabled={creatingProduct || !productForm.name || !productForm.retail_price || !productForm.variant_id}
                  className="w-full"
                >
                  {creatingProduct ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating Product...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Product
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Product Templates */}
            <Card>
              <CardHeader>
                <CardTitle>Product Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {templates.slice(0, 10).map((template) => (
                    <div
                      key={template.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedTemplate?.id === template.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                        }`}
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <div className="flex items-start space-x-3">
                        {template.image && (
                          <img
                            src={template.image}
                            alt={template.title}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{template.title}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {template.description}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {template.category.title}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              ID: {template.id}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Existing Products */}
          <Card>
            <CardHeader>
              <CardTitle>Existing Products</CardTitle>
            </CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No products yet</h3>
                  <p className="text-muted-foreground">
                    Create your first product using the form above
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map((product) => (
                    <Card key={product.id} className="overflow-hidden">
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-32 object-cover"
                          onError={(e) => {
                            // Fallback to a placeholder if image fails to load
                            e.currentTarget.src = 'https://via.placeholder.com/300x200?text=No+Image';
                          }}
                        />
                      ) : (
                        <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                      <CardContent className="p-4">
                        <h4 className="font-medium text-sm mb-1">{product.name}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {product.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm">
                            ${product.retail_price} {product.currency.toUpperCase()}
                          </span>
                          <Badge variant={product.is_enabled ? "default" : "secondary"}>
                            {product.is_enabled ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2 mt-2">
                          <Button variant="outline" size="sm" className="flex-1">
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1">
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  } catch (error: any) {
    console.error('AdminPrintful component error:', error);
    return (
      <div className="p-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <h2 className="font-bold">Error Loading Printful Management</h2>
          <p>{error.message || 'An unexpected error occurred'}</p>
        </div>
      </div>
    );
  }
}
