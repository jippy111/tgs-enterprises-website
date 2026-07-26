import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { products } from "../data/products";

const CartContext = createContext(null);
const storageKey = "tgs-cart";

const readCart = () => {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) ?? [];
  } catch {
    return [];
  }
};

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(readCart);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(cartItems));
  }, [cartItems]);

  const enrichedItems = useMemo(
    () =>
      cartItems
        .map((item) => {
          const product = products.find((candidate) => candidate.id === item.productId);
          return product ? { ...product, quantity: item.quantity } : null;
        })
        .filter(Boolean),
    [cartItems],
  );

  const cartCount = enrichedItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = enrichedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const addToCart = (productId, quantity = 1) => {
    setCartItems((items) => {
      const existing = items.find((item) => item.productId === productId);
      if (existing) {
        return items.map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.min(item.quantity + quantity, 10) }
            : item,
        );
      }
      return [...items, { productId, quantity }];
    });
  };

  const updateQuantity = (productId, quantity) => {
    const nextQuantity = Number(quantity);
    setCartItems((items) =>
      items.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.max(1, Math.min(nextQuantity || 1, 10)) }
          : item,
      ),
    );
  };

  const removeFromCart = (productId) => {
    setCartItems((items) => items.filter((item) => item.productId !== productId));
  };

  const clearCart = () => setCartItems([]);

  return (
    <CartContext.Provider
      value={{ cartItems: enrichedItems, cartCount, cartTotal, addToCart, updateQuantity, removeFromCart, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
