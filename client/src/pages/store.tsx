import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/context/page-context";
import { useAuth } from "@/context/auth-context";
import { useLocation } from "wouter";
import { Search, Star, Package, ShoppingCart, CreditCard, Home, CheckCircle } from "lucide-react";
import { useStoreStore, useCartStore } from "@/store";
import { CartDropdown } from "@/components/cart-dropdown";

export default function Store() {
  const [addingToCart, setAddingToCart] = useState<{ [key: string]: boolean }>({});
  const [buyingNow, setBuyingNow] = useState<{ [key: string]: boolean }>({});
  const { toast } = useToast();
  const { setPageInfo } = usePageTitle();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // Store hooks
  const {
    products,
    filteredProducts,
    isLoading,
    error,
    searchTerm,
    selectedCategory,
    setSearchTerm,
    setSelectedCategory,
    fetchProducts,
    filterProducts
  } = useStoreStore();

  const { addItem } = useCartStore();

  useEffect(() => {
    setPageInfo("TiNHiH Store", "Browse and purchase recovery-themed products");
    fetchProducts();
  }, [setPageInfo, fetchProducts]);

  // Filter products when search term or category changes
  useEffect(() => {
    filterProducts();
  }, [searchTerm, selectedCategory, filterProducts]);

  const handleAddToCart = async (product: any, variantId?: string) => {
    const cartKey = `${product.id}_${variantId || 'default'}`;
    
    // Set loading state
    setAddingToCart(prev => ({ ...prev, [cartKey]: true }));

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      addItem(product, 1, variantId);
      
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
    } finally {
      setAddingToCart(prev => ({ ...prev, [cartKey]: false }));
    }
  };

  const handleBuyNow = async (product: any, variantId?: string) => {
    const buyKey = `${product.id}_${variantId || 'default'}`;
    
    // Set loading state
    setBuyingNow(prev => ({ ...prev, [buyKey]: true }));

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Add item to cart first
      addItem(product, 1, variantId);
      
      toast({
        title: "Item Added",
        description: `${product.name} has been added to your cart. Redirecting to checkout...`,
      });

      // Redirect to checkout after a short delay
      setTimeout(() => {
        setLocation("/checkout");
      }, 1000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process purchase",
        variant: "destructive",
      });
    } finally {
      setBuyingNow(prev => ({ ...prev, [buyKey]: false }));
    }
  };

  const categories = [
    { id: "all", name: "All Products" },
    { id: "apparel", name: "Apparel" },
    { id: "accessories", name: "Accessories" },
    { id: "printful", name: "Printful Products" }
  ];

  if (isLoading) {
    return (
      <div 
        className="min-h-screen py-8 transition-colors duration-300"
        style={{ backgroundColor: `hsl(var(--background))` }}
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ffdd00]"></div>
            <span 
              className="ml-2 transition-colors duration-300"
              style={{ color: `hsl(var(--foreground))` }}
            >
              Loading store...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className="min-h-screen py-8 transition-colors duration-300"
        style={{ backgroundColor: `hsl(var(--background))` }}
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center">
            <h1 
              className="text-2xl font-bold mb-4 transition-colors duration-300"
              style={{ color: `hsl(var(--foreground))` }}
            >
              Store Error
            </h1>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchProducts} className="bg-[#ffdd00] text-black hover:bg-yellow-400">Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen py-4 sm:py-8 transition-colors duration-300"
      style={{ backgroundColor: `hsl(var(--background))` }}
    >
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 
            className="text-2xl sm:text-3xl font-bold mb-2 transition-colors duration-300"
            style={{ color: `hsl(var(--foreground))` }}
          >
            TiNHiH Store
          </h1>
          <p 
            className="text-sm sm:text-base transition-colors duration-300"
            style={{ color: `hsl(var(--muted-foreground))` }}
          >
            Browse and purchase recovery-themed products
          </p>
        </div>

        {/* Navigation and Cart */}
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => setLocation("/member")}
              className="flex items-center space-x-2 text-sm sm:text-base"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Home</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/orders")}
              className="flex items-center space-x-2 text-sm sm:text-base"
            >
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Order History</span>
            </Button>
          </div>
          <CartDropdown />
        </div>

        {/* Filters */}
        <Card className="mb-4 sm:mb-6 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 transition-colors duration-300">
              <Search className="h-4 w-4 sm:h-5 sm:w-5" />
              <span 
                className="text-base sm:text-lg transition-colors duration-300"
                style={{ color: `hsl(var(--foreground))` }}
              >
                Search & Filter
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label 
                  className="text-sm font-medium transition-colors duration-300"
                  style={{ color: `hsl(var(--foreground))` }}
                >
                  Search Products
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, description, or tags..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label 
                  className="text-sm font-medium transition-colors duration-300"
                  style={{ color: `hsl(var(--foreground))` }}
                >
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#ffdd00] transition-colors duration-300"
                  style={{ 
                    backgroundColor: `hsl(var(--background))`,
                    color: `hsl(var(--foreground))`,
                    borderColor: `hsl(var(--border))`
                  }}
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Grid - 3 per row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={handleAddToCart}
              onBuyNow={handleBuyNow}
              addingToCart={addingToCart}
              buyingNow={buyingNow}
              setLocation={setLocation}
            />
          ))}
        </div>

        {/* Empty State */}
        {filteredProducts.length === 0 && !isLoading && (
          <Card className="text-center py-8 sm:py-12 shadow-sm">
            <CardContent>
              <Package className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
              <h3 
                className="text-base sm:text-lg font-medium mb-2 transition-colors duration-300"
                style={{ color: `hsl(var(--foreground))` }}
              >
                No products found
              </h3>
              <p 
                className="text-sm sm:text-base transition-colors duration-300"
                style={{ color: `hsl(var(--muted-foreground))` }}
              >
                Try adjusting your search or filter criteria.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

interface ProductCardProps {
  product: any;
  onAddToCart: (product: any, variantId?: string) => void;
  onBuyNow: (product: any, variantId?: string) => void;
  addingToCart: { [key: string]: boolean };
  buyingNow: { [key: string]: boolean };
  setLocation: (to: string) => void;
}

function ProductCard({ product, onAddToCart, onBuyNow, addingToCart, buyingNow, setLocation }: ProductCardProps) {
  const cartKey = `${product.id}_default`;
  const buyKey = `${product.id}_default`;
  const isAddingToCart = addingToCart[cartKey];
  const isBuyingNow = buyingNow[buyKey];
  const productPrice = product.retail_price || product.price;
  const productImage = product.images && product.images.length > 0 ? product.images[0] : '';
  
  // Check if product has variants/options
  const hasVariants = product.variants && product.variants.length > 1;
  
  // Calculate price range if product has variants
  const getPriceDisplay = () => {
    if (hasVariants) {
      const prices = product.variants.map((v: any) => v.retail_price || v.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      return minPrice === maxPrice 
        ? `$${minPrice.toFixed(2)}` 
        : `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;
    }
    return `$${productPrice?.toFixed(2)}`;
  };

  return (
    <div className="bg-card rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 group h-full flex flex-col border border-border">
      {/* Product Image Container */}
      <div className="relative overflow-hidden bg-muted">
        <img
          src={productImage}
          alt={product.name}
          className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        {/* TiNHiH Logo Badge */}
        <div className="absolute top-3 left-3">
          <div className="bg-[#ffdd00] text-black font-bold px-2 py-1 rounded-full text-xs shadow-lg">
            TINHIH
          </div>
        </div>
        
        {/* Sale Badge */}
        {product.isOnSale && (
          <div className="absolute top-3 right-3">
            <div className="bg-red-500 text-white font-semibold px-2 py-1 rounded-full text-xs shadow-lg">
              SALE
            </div>
          </div>
        )}
      </div>
      
      {/* Product Content */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Product Name */}
        <h3 
          className="font-bold text-lg mb-2 leading-tight transition-colors duration-300"
          style={{ color: `hsl(var(--foreground))` }}
        >
          {product.name}
        </h3>
        
        {/* Rating */}
        {product.rating && (
          <div className="flex items-center mb-3">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  className={`h-4 w-4 ${
                    i < Math.floor(product.rating) 
                      ? 'text-yellow-400 fill-current' 
                      : i < product.rating 
                        ? 'text-yellow-400 fill-current opacity-50' 
                        : 'text-gray-300'
                  }`} 
                />
              ))}
            </div>
            <span 
              className="text-sm ml-1 transition-colors duration-300"
              style={{ color: `hsl(var(--muted-foreground))` }}
            >
              {product.rating.toFixed(1)}
            </span>
          </div>
        )}
        
        {/* Price */}
        <div className="mb-4">
          <span 
            className="font-bold text-xl transition-colors duration-300"
            style={{ color: `hsl(var(--foreground))` }}
          >
            {getPriceDisplay()}
          </span>
          {product.originalPrice && product.originalPrice !== productPrice && (
            <span 
              className="text-sm line-through ml-2 transition-colors duration-300"
              style={{ color: `hsl(var(--muted-foreground))` }}
            >
              ${product.originalPrice.toFixed(2)}
            </span>
          )}
        </div>
        
        {/* Action Button */}
        <div className="mt-auto">
          {hasVariants ? (
            <Button
              onClick={() => setLocation(`/product/${product.id}`)}
              className="w-full bg-[#ffdd00] hover:bg-yellow-400 text-black font-semibold py-3 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
            >
              SELECT OPTIONS
            </Button>
          ) : (
            <Button
              onClick={() => onAddToCart(product)}
              disabled={!product.is_enabled || isAddingToCart}
              className="w-full bg-[#ffdd00] hover:bg-yellow-400 text-black font-semibold py-3 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg flex items-center justify-center"
            >
              {isAddingToCart ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                  Adding...
                </div>
              ) : (
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  ADD TO CART
                </div>
              )}
            </Button>
          )}
        </div>
        
        {/* Out of Stock Message */}
        {!product.is_enabled && (
          <div className="mt-3 p-2 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive text-center font-medium">Out of Stock</p>
          </div>
        )}
      </div>
    </div>
  );
}
