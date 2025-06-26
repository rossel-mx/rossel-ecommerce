/**
 * @file CartContext.jsx
 * @description Contexto de React para gestionar el estado del carrito de compras.
 * Esta es la versión final y robusta que ahora es "consciente del usuario" + Analytics:
 * 1. Persiste el carrito en localStorage usando una clave única para cada usuario.
 * 2. Carga automáticamente el carrito correcto cuando un usuario inicia sesión.
 * 3. Se limpia automáticamente y de forma proactiva cuando un usuario cierra sesión.
 * 4. 📊 NUEVO: Integración completa con Google Analytics 4 y Enhanced Ecommerce.
 * 5. 📊 NUEVO: Tracking automático de todas las acciones del carrito.
 *
 * @requires react
 * @requires ./UserContext
 * @requires react-hot-toast
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
  
  // 📊 3. Estado para Analytics (se inicializa después del primer render)
  const [analytics, setAnalytics] = useState(null);

  // 📊 INICIALIZAR ANALYTICS CUANDO EL COMPONENTE SE MONTA
  useEffect(() => {
    // Importación dinámica para evitar problemas de dependencias circulares
    const initAnalytics = async () => {
      try {
        // Verificar si ya existe el contexto de Analytics
        if (typeof window !== 'undefined' && window.gtag) {
          // Crear objeto analytics local para este contexto
          const analyticsInstance = {
            trackAddToCart: (product, quantity = 1) => {
              if (typeof window.gtag === 'undefined') return;
              
              const formattedProduct = {
                item_id: product.id?.toString() || 'unknown',
                item_name: product.name || 'Producto sin nombre',
                category: product.category || 'General',
                price: parseFloat(product.price_menudeo) || 0,
                quantity: parseInt(quantity) || 1,
                currency: 'MXN'
              };
              
              window.gtag('event', 'add_to_cart', {
                currency: 'MXN',
                value: formattedProduct.price * quantity,
                items: [formattedProduct]
              });

              console.log('LOG: [CartProvider] Analytics - add_to_cart tracked:', formattedProduct);
            },

            trackRemoveFromCart: (product, quantity = 1) => {
              if (typeof window.gtag === 'undefined') return;
              
              const formattedProduct = {
                item_id: product.id?.toString() || 'unknown',
                item_name: product.name || 'Producto sin nombre',
                category: product.category || 'General',
                price: parseFloat(product.price_menudeo) || 0,
                quantity: parseInt(quantity) || 1,
                currency: 'MXN'
              };
              
              window.gtag('event', 'remove_from_cart', {
                currency: 'MXN',
                value: formattedProduct.price * quantity,
                items: [formattedProduct]
              });

              console.log('LOG: [CartProvider] Analytics - remove_from_cart tracked:', formattedProduct);
            },

            trackViewCart: (cartItems, cartTotal) => {
              if (typeof window.gtag === 'undefined') return;
              
              const formattedItems = cartItems.map(item => ({
                item_id: item.id?.toString() || 'unknown',
                item_name: item.name || 'Producto sin nombre',
                category: item.category || 'General',
                price: parseFloat(item.quantity >= 4 ? item.price_mayoreo : item.price_menudeo) || 0,
                quantity: parseInt(item.quantity) || 1,
                currency: 'MXN'
              }));
              
              window.gtag('event', 'view_cart', {
                currency: 'MXN',
                value: parseFloat(cartTotal) || 0,
                items: formattedItems
              });

              console.log('LOG: [CartProvider] Analytics - view_cart tracked:', { cartTotal, itemsCount: formattedItems.length });
            },

            trackBeginCheckout: (cartItems, cartTotal) => {
              if (typeof window.gtag === 'undefined') return;
              
              const formattedItems = cartItems.map(item => ({
                item_id: item.id?.toString() || 'unknown',
                item_name: item.name || 'Producto sin nombre',
                category: item.category || 'General',
                price: parseFloat(item.quantity >= 4 ? item.price_mayoreo : item.price_menudeo) || 0,
                quantity: parseInt(item.quantity) || 1,
                currency: 'MXN'
              }));
              
              window.gtag('event', 'begin_checkout', {
                currency: 'MXN',
                value: parseFloat(cartTotal) || 0,
                items: formattedItems
              });

              console.log('LOG: [CartProvider] Analytics - begin_checkout tracked:', { cartTotal, itemsCount: formattedItems.length });
            },

            trackCartUpdate: (action, product, newQuantity, oldQuantity = 0) => {
              if (typeof window.gtag === 'undefined') return;
              
              window.gtag('event', 'cart_update', {
                action: action, // 'add', 'remove', 'update_quantity', 'clear'
                product_id: product?.id || 'unknown',
                product_name: product?.name || 'unknown',
                old_quantity: oldQuantity,
                new_quantity: newQuantity,
                user_type: user?.role || 'guest',
                timestamp: new Date().toISOString()
              });

              console.log('LOG: [CartProvider] Analytics - cart_update tracked:', { action, product: product?.name, newQuantity, oldQuantity });
            }
          };

          setAnalytics(analyticsInstance);
          console.log('LOG: [CartProvider] Analytics inicializado correctamente');
        }
      } catch (error) {
        console.warn('WARN: [CartProvider] No se pudo inicializar Analytics:', error);
        // Crear analytics mock para evitar errores
        setAnalytics({
          trackAddToCart: () => {},
          trackRemoveFromCart: () => {},
          trackViewCart: () => {},
          trackBeginCheckout: () => {},
          trackCartUpdate: () => {}
        });
      }
    };

    // Delay para asegurar que gtag esté disponible
    setTimeout(initAnalytics, 500);
  }, [user]);

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
          const loadedCart = JSON.parse(localData);
          setCart(loadedCart);
          console.log("LOG: [CartProvider] Carrito del usuario cargado desde localStorage.");
          
          // 📊 TRACKING: Usuario cargó su carrito guardado
          if (analytics && loadedCart.length > 0) {
            const cartTotal = loadedCart.reduce((sum, item) => {
              const price = item.quantity >= 4 ? item.price_mayoreo : item.price_menudeo;
              return sum + price * item.quantity;
            }, 0);
            
            analytics.trackViewCart(loadedCart, cartTotal);
          }
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
  }, [user, analytics]); // Analytics agregado como dependencia

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

  // --- FUNCIONES DEL CARRITO CON ANALYTICS INTEGRADO ---

  /**
   * Añade una variante de producto al carrito.
   * Si la variante ya existe, incrementa su cantidad.
   * 📊 Incluye tracking automático de Analytics.
   * @param {object} variantToAdd - El objeto de la variante a añadir. Debe tener un 'id' único.
   */
  const addToCart = (variantToAdd) => {
    console.log("LOG: [CartProvider] Añadiendo al carrito la variante:", variantToAdd);
    
    // Encontrar si el item ya existe para determinar la cantidad anterior
    const existingItem = cart.find((item) => item.id === variantToAdd.id);
    const oldQuantity = existingItem ? existingItem.quantity : 0;
    const newQuantity = oldQuantity + 1;
    
    setCart(prevCart => {
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

    // 📊 TRACKING DE ANALYTICS
    if (analytics) {
      analytics.trackAddToCart(variantToAdd, 1);
      analytics.trackCartUpdate('add', variantToAdd, newQuantity, oldQuantity);
    }

    toast.success(`${variantToAdd.name} (${variantToAdd.color}) agregado al carrito.`);
  };

  /**
   * Remueve completamente una variante del carrito.
   * 📊 Incluye tracking automático de Analytics.
   * @param {string} variantId - El ID de la variante a remover.
   */
  const removeFromCart = (variantId) => {
    // Encontrar el item antes de removerlo para analytics
    const itemToRemove = cart.find(item => item.id === variantId);
    const oldQuantity = itemToRemove ? itemToRemove.quantity : 0;
    
    setCart(cart.filter((item) => item.id !== variantId));

    // 📊 TRACKING DE ANALYTICS
    if (analytics && itemToRemove) {
      analytics.trackRemoveFromCart(itemToRemove, oldQuantity);
      analytics.trackCartUpdate('remove', itemToRemove, 0, oldQuantity);
    }

    toast.error("Producto eliminado del carrito.");
  };

  /**
   * Actualiza la cantidad de una variante específica en el carrito.
   * 📊 Incluye tracking automático de Analytics.
   * @param {string} variantId - El ID de la variante.
   * @param {number} quantity - La nueva cantidad.
   */
  const updateQuantity = (variantId, quantity) => {
    const itemToUpdate = cart.find(item => item.id === variantId);
    const oldQuantity = itemToUpdate ? itemToUpdate.quantity : 0;

    if (quantity <= 0) {
      removeFromCart(variantId);
    } else {
      setCart(cart.map((item) => item.id === variantId ? { ...item, quantity } : item));

      // 📊 TRACKING DE ANALYTICS PARA ACTUALIZACIÓN
      if (analytics && itemToUpdate) {
        const quantityDiff = quantity - oldQuantity;
        if (quantityDiff > 0) {
          // Se incrementó la cantidad
          analytics.trackAddToCart(itemToUpdate, quantityDiff);
        } else if (quantityDiff < 0) {
          // Se decrementó la cantidad
          analytics.trackRemoveFromCart(itemToUpdate, Math.abs(quantityDiff));
        }
        analytics.trackCartUpdate('update_quantity', itemToUpdate, quantity, oldQuantity);
      }
    }
  };

  /**
   * Vacía completamente el carrito.
   * 📊 Incluye tracking automático de Analytics.
   */
  const clearCart = () => {
    console.log("LOG: [CartProvider] Vaciando el carrito por completo.");
    
    // 📊 TRACKING DE ANALYTICS ANTES DE LIMPIAR
    if (analytics && cart.length > 0) {
      analytics.trackCartUpdate('clear', null, 0, cart.length);
    }

    setCart([]);
  };

  /**
   * Calcula el total del carrito considerando precios mayoreo/menudeo.
   * @returns {number} El total en pesos mexicanos.
   */
  const getTotal = () => {
    return cart.reduce((sum, item) => {
      const price = item.quantity >= 4 ? item.price_mayoreo : item.price_menudeo;
      return sum + price * item.quantity;
    }, 0);
  };

  /**
   * 📊 NUEVA FUNCIÓN: Trackea cuando el usuario ve el carrito.
   * Útil para llamar desde el componente Cart cuando se monta.
   */
  const trackViewCart = () => {
    if (analytics && cart.length > 0) {
      const total = getTotal();
      analytics.trackViewCart(cart, total);
    }
  };

  /**
   * 📊 NUEVA FUNCIÓN: Trackea cuando el usuario inicia el checkout.
   * Útil para llamar desde el componente Checkout cuando se monta.
   */
  const trackBeginCheckout = () => {
    if (analytics && cart.length > 0) {
      const total = getTotal();
      analytics.trackBeginCheckout(cart, total);
    }
  };

  /**
   * 📊 NUEVA FUNCIÓN: Obtener información del carrito para analytics externos.
   * Útil para otros componentes que necesiten datos del carrito para tracking.
   */
  const getCartAnalyticsData = () => {
    return {
      items: cart,
      itemCount: cart.length,
      totalValue: getTotal(),
      hasItems: cart.length > 0,
      averageItemValue: cart.length > 0 ? getTotal() / cart.length : 0,
      mostExpensiveItem: cart.reduce((max, item) => {
        const price = item.quantity >= 4 ? item.price_mayoreo : item.price_menudeo;
        return price > (max?.price || 0) ? { ...item, price } : max;
      }, null)
    };
  };

  // 📊 EFECTO PARA DEBUGGING DE ANALYTICS (solo en desarrollo)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && cart.length > 0) {
      console.log('LOG: [CartProvider] Estado actual del carrito:', {
        itemCount: cart.length,
        total: getTotal(),
        items: cart.map(item => ({ 
          id: item.id, 
          name: item.name, 
          quantity: item.quantity,
          price: item.quantity >= 4 ? item.price_mayoreo : item.price_menudeo
        }))
      });
    }
  }, [cart]);

  // 📊 VALOR DEL CONTEXTO EXPANDIDO CON FUNCIONES DE ANALYTICS
  const value = { 
    // Funciones originales
    cart, 
    addToCart, 
    removeFromCart, 
    updateQuantity, 
    clearCart, 
    getTotal,
    
    // 📊 Nuevas funciones de Analytics
    trackViewCart,
    trackBeginCheckout,
    getCartAnalyticsData,
    
    // 📊 Estado de Analytics
    analyticsReady: !!analytics
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
};