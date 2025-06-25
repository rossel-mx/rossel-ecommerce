/**
 * @file CartContext.jsx
 * @description Contexto de React para gestionar el estado del carrito de compras.
 * Esta es la versión final y robusta que ahora es "consciente del usuario":
 * 1. Persiste el carrito en localStorage usando una clave única para cada usuario.
 * 2. Carga automáticamente el carrito correcto cuando un usuario inicia sesión.
 * 3. Se limpia automáticamente y de forma proactiva cuando un usuario cierra sesión.
 *
 * @requires react
 * @requires ./UserContext
 */
import React, { createContext, useContext, useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useUser } from "./UserContext"; // 1. Importamos el hook de usuario para saber quién está logueado

const CartContext = createContext();

// Hook personalizado para consumir el contexto fácilmente
export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  // 2. Obtenemos el usuario actual desde nuestro UserContext
  const { user } = useUser();
  const [cart, setCart] = useState([]);

  // --- EFECTO DE CARGA Y LIMPIEZA AUTOMÁTICA ---
  // Este efecto es el corazón de la solución. Se dispara cada vez que el estado del 'user' cambia.
  useEffect(() => {
    // Si hay un usuario (alguien ha iniciado sesión)...
    if (user && user.id) {
      console.log(`LOG: [CartProvider] Usuario ${user.id} detectado. Cargando su carrito...`);
      try {
        // ...intentamos cargar su carrito específico desde localStorage.
        const userCartKey = `rossel_cart_${user.id}`;
        const localData = window.localStorage.getItem(userCartKey);
        
        if (localData) {
          setCart(JSON.parse(localData));
          console.log("LOG: [CartProvider] Carrito del usuario cargado desde localStorage.");
        } else {
          // Si no tenía un carrito guardado, lo inicializamos como un arreglo vacío.
          setCart([]);
          console.log("LOG: [CartProvider] El usuario no tenía un carrito guardado.");
        }
      } catch (error) {
        console.error("ERROR: [CartProvider] No se pudo leer el carrito del usuario desde localStorage.", error);
        setCart([]);
      }
    } else {
      // Si NO hay usuario (se ha cerrado la sesión), limpiamos el carrito.
      console.log("LOG: [CartProvider] Ningún usuario detectado. El carrito se ha vaciado.");
      setCart([]);
    }
  }, [user]); // Esta es la dependencia clave. El efecto se ejecuta cuando 'user' cambia.

  // --- EFECTO DE PERSISTENCIA ---
  // Este efecto guarda el carrito en localStorage cada vez que el estado 'cart' o el 'user' cambian.
  useEffect(() => {
    // Solo guardamos si hay un usuario logueado.
    if (user && user.id) {
      try {
        const userCartKey = `rossel_cart_${user.id}`;
        console.log(`LOG: [CartProvider] Guardando carrito para el usuario ${user.id} en localStorage...`);
        window.localStorage.setItem(userCartKey, JSON.stringify(cart));
      } catch (error) {
        console.error("ERROR: [CartProvider] No se pudo guardar el carrito en localStorage.", error);
      }
    }
  }, [cart, user]);


 // --- FUNCIONES DEL CARRITO ---

  /**
   * Añade una variante de producto al carrito.
   * Si la variante ya existe, incrementa su cantidad.
   * @param {object} variantToAdd - El objeto de la variante a añadir. Debe tener un 'id' único.
   */
  const addToCart = (variantToAdd) => {
    console.log("LOG: [CartProvider] Añadiendo al carrito la variante:", variantToAdd);
    
    setCart(prevCart => {
      const existingItem = prevCart.find((item) => item.id === variantToAdd.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === variantToAdd.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevCart, { ...variantToAdd, quantity: 1 }];
      }
    });
    toast.success(`${variantToAdd.name} (${variantToAdd.color}) agregado al carrito.`);
  };

  const removeFromCart = (variantId) => {
    setCart(cart.filter((item) => item.id !== variantId));
    toast.error("Producto eliminado del carrito.");
  };

  const updateQuantity = (variantId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(variantId);
    } else {
      setCart(cart.map((item) => item.id === variantId ? { ...item, quantity } : item));
    }
  };

  const clearCart = () => {
    console.log("LOG: [CartProvider] Vaciando el carrito por completo.");
    setCart([]);
  };

  const getTotal = () => {
    return cart.reduce((sum, item) => {
      const price = item.quantity >= 4 ? item.price_mayoreo : item.price_menudeo;
      return sum + price * item.quantity;
    }, 0);
  };

  const value = { cart, addToCart, removeFromCart, updateQuantity, clearCart, getTotal };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
