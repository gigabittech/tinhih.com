import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/context/page-context";
import { ArrowLeft, ShoppingCart, DollarSign, Star, Heart, Package, Truck, Shield } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  retail_price?: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  category: string;
  is_enabled: boolean;
  rating: number;
  reviews: number;
  tags: string[];
  isFeatured: boolean;
  isOnSale: boolean;
  salePercentage?: number;
  longDescription?: string;
  specifications?: Record<string, string>;
}

export default function ProductDetail() {
  const [, setLocation] = useLocation();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const { toast } = useToast();
  const { setPageInfo } = usePageTitle();

  // Sample product data (in real app, this would come from API)
  const sampleProducts: Product[] = [
    {
      id: "1",
      name: "Recovery Journal",
      description: "A guided journal to support your recovery journey with daily prompts and reflections.",
      longDescription: "This comprehensive recovery journal is designed specifically for individuals on their journey to sobriety and healing. Each page includes thoughtful prompts, space for reflection, and motivational quotes to keep you inspired. The journal features a durable hardcover, high-quality paper, and a ribbon bookmark for easy navigation.",
      price: 24.99,
      retail_price: 24.99,
      originalPrice: 29.99,
      image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=300&fit=crop",
      images: [
        "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=300&fit=crop"
      ],
      category: "books",
      is_enabled: true,
      rating: 4.8,
      reviews: 127,
      tags: ["recovery", "journal", "self-help"],
      isFeatured: true,
      isOnSale: true,
      salePercentage: 17,
      specifications: {
        "Pages": "200",
        "Cover": "Hardcover",
        "Size": "8.5 x 11 inches",
        "Paper": "Premium 80gsm",
        "Binding": "Sewn binding"
      }
    },
    {
      id: "2",
      name: "TiNHiH T-Shirt",
      description: "Comfortable cotton t-shirt with TiNHiH logo. Support our mission with style.",
      longDescription: "Show your support for TiNHiH with this comfortable, high-quality cotton t-shirt. The shirt features our logo prominently displayed and is available in multiple sizes. Made from 100% organic cotton, it's soft, breathable, and perfect for everyday wear.",
      price: 19.99,
      retail_price: 19.99,
      image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=300&fit=crop",
      images: [
        "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=300&fit=crop"
      ],
      category: "clothing",
      is_enabled: true,
      rating: 4.6,
      reviews: 89,
      tags: ["clothing", "merchandise", "support"],
      isFeatured: true,
      isOnSale: false,
      specifications: {
        "Material": "100% Organic Cotton",
        "Fit": "Regular fit",
        "Care": "Machine wash cold",
        "Sizes": "XS, S, M, L, XL, XXL",
        "Print": "Screen printed logo"
      }
    }
  ];

  useEffect(() => {
    // Get product ID from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    
    if (productId) {
      // Find product in sample data
      const foundProduct = sampleProducts.find(p => p.id === productId);
      if (foundProduct) {
        setProduct(foundProduct);
        setPageInfo(foundProduct.name, foundProduct.description);
      } else {
        toast({
          title: "Product Not Found",
          description: "The requested product could not be found.",
          variant: "destructive",
        });
        setLocation("/store");
      }
    } else {
      toast({
        title: "Invalid Product",
        description: "No product ID provided.",
        variant: "destructive",
      });
      setLocation("/store");
    }
    setLoading(false);
  }, [setPageInfo, setLocation, toast]);

  const handleAddToCart = async () => {
    if (!product) return;
    
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Added to Cart",
        description: `${product.name} has been added to your cart.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
      });
      setLocation("/store");
    }
    setLoading(false);
  };

  const handleBuyNow = () => {
    if (!product) return;
    
    toast({
      title: "Buy Now",
      description: "Redirecting to checkout...",
    });
    setLocation("/checkout");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <span className="ml-2">Loading product...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
            <p className="text-gray-600 mb-4">
              The requested product could not be found.
            </p>
            <Button onClick={() => setLocation("/store")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Store
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const productPrice = product.retail_price || product.price;
  const productImages = product.images || [product.image];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => setLocation("/store")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Store
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="relative">
              <img
                src={productImages[selectedImage]}
                alt={product.name}
                className="w-full h-96 object-cover rounded-lg"
              />
              {product.isOnSale && (
                <Badge className="absolute top-4 right-4 bg-red-500 text-white">
                  {product.salePercentage}% OFF
                </Badge>
              )}
              {product.isFeatured && (
                <Badge className="absolute top-4 left-4 bg-yellow-500 text-white">
                  Featured
                </Badge>
              )}
            </div>
            
            {/* Thumbnail Images */}
            {productImages.length > 1 && (
              <div className="flex space-x-2">
                {productImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`w-20 h-20 rounded-lg overflow-hidden border-2 ${
                      selectedImage === index ? 'border-blue-500' : 'border-gray-200'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex items-center space-x-1">
                  <Star className="h-5 w-5 text-yellow-500 fill-current" />
                  <span className="font-medium">{product.rating}</span>
                  <span className="text-gray-500">({product.reviews} reviews)</span>
                </div>
                <Badge variant="outline">{product.category}</Badge>
              </div>
              <p className="text-lg text-gray-600">{product.description}</p>
            </div>

            {/* Price */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-3xl font-bold">${productPrice?.toFixed(2)}</span>
                {product.originalPrice && product.originalPrice !== productPrice && (
                  <span className="text-xl text-gray-500 line-through">
                    ${product.originalPrice.toFixed(2)}
                  </span>
                )}
              </div>
              {product.isOnSale && (
                <p className="text-green-600 font-medium">
                  Save ${((product.originalPrice || 0) - (productPrice || 0)).toFixed(2)}!
                </p>
              )}
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantity</label>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  -
                </Button>
                <span className="w-12 text-center">{quantity}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  +
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <Button
                onClick={handleAddToCart}
                disabled={!product.is_enabled || loading}
                className="flex-1"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Add to Cart
              </Button>
              <Button
                onClick={handleBuyNow}
                disabled={!product.is_enabled}
                className="flex-1"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Buy Now
              </Button>
            </div>

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Features */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Truck className="h-5 w-5 text-gray-400" />
                <span className="text-sm">Free shipping</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-gray-400" />
                <span className="text-sm">Secure checkout</span>
              </div>
            </div>
          </div>
        </div>

        {/* Product Description */}
        {product.longDescription && (
          <div className="mt-12">
            <Card>
              <CardHeader>
                <CardTitle>Product Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 leading-relaxed">
                  {product.longDescription}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Specifications */}
        {product.specifications && Object.keys(product.specifications).length > 0 && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Specifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="font-medium">{key}:</span>
                      <span className="text-gray-600">{value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
