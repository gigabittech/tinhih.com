import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Trash2, Plus, Minus } from "lucide-react";
import { useCartStore } from "@/store";
import { useLocation } from "wouter";

export function CartDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [, setLocation] = useLocation();
  
  const {
    items: cartItems,
    removeItem,
    updateQuantity,
    getTotal,
    getItemCount,
    clearCart
  } = useCartStore();

  const handleCheckout = () => {
    setIsOpen(false);
    setLocation("/checkout");
  };

  const handleRemoveItem = (productId: string | number, variant?: string) => {
    removeItem(productId, variant);
  };

  const handleUpdateQuantity = (productId: string | number, quantity: number, variant?: string) => {
    updateQuantity(productId, quantity, variant);
  };

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-yellow-400 hover:bg-yellow-500 text-black font-medium"
      >
        <ShoppingCart className="h-4 w-4 mr-2" />
        Cart
        {getItemCount() > 0 && (
          <Badge className="ml-2 bg-red-500 text-white">
            {getItemCount()}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-80 border border-border rounded-lg shadow-lg z-50 bg-background">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              {cartItems.length === 0 ? (
                <div className="text-center py-4">
                  <ShoppingCart className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Your cart is empty</p>
                </div>
              ) : (
                <>
                  <div className="max-h-64 overflow-y-auto space-y-3">
                    {cartItems.map((item) => {
                      const price = item.product.retail_price || item.product.price;
                      const image = item.product.images && item.product.images.length > 0 ? item.product.images[0] : '';
                      
                      return (
                        <div key={`${item.product.id}_${item.selectedVariant}`} className="flex items-center space-x-3 p-2 border-b border-border last:border-b-0">
                          <img
                            src={image}
                            alt={item.product.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate text-foreground">{item.product.name}</h4>
                            <p className="text-sm text-muted-foreground">${price.toFixed(2)}</p>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateQuantity(item.product.id, item.quantity - 1, item.selectedVariant)}
                              disabled={item.quantity <= 1}
                              className="h-6 w-6 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-sm w-6 text-center text-foreground">{item.quantity}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1, item.selectedVariant)}
                              className="h-6 w-6 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRemoveItem(item.product.id, item.selectedVariant)}
                              className="h-6 w-6 p-0 text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="border-t border-border pt-3 mt-3">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-medium text-foreground">Total:</span>
                      <span className="font-bold text-foreground">${getTotal().toFixed(2)}</span>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={handleCheckout}
                        className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black"
                      >
                        Checkout
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          clearCart();
                          setIsOpen(false);
                        }}
                        className="px-3"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
