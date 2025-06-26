/**
 * @file AnalyticsProvider.jsx
 * @description Proveedor de contexto para Google Analytics que se integra automáticamente
 * con el router y las acciones del usuario en Rossel
 */

import React, { createContext, useContext, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAnalytics } from '../hooks/useAnalytics';
import { useUser } from './UserContext';

// 📊 CREAR CONTEXTO
const AnalyticsContext = createContext();

// 🎯 MAPEO DE RUTAS A TÍTULOS
const getPageTitle = (pathname) => {
  const routes = {
    '/': 'Inicio - Rossel',
    '/products': 'Productos - Rossel',
    '/cart': 'Carrito - Rossel',
    '/checkout': 'Checkout - Rossel',
    '/login': 'Iniciar Sesión - Rossel',
    '/register': 'Registrarse - Rossel',
    '/reset-password': 'Recuperar Contraseña - Rossel',
    '/mi-cuenta': 'Mi Cuenta - Rossel',
    '/mi-cuenta/perfil': 'Mi Perfil - Rossel',
    '/mi-cuenta/direcciones': 'Mis Direcciones - Rossel',
    '/mi-cuenta/pedidos': 'Mis Pedidos - Rossel',
    '/contacto': 'Contacto - Rossel',
    '/envios': 'Envíos y Devoluciones - Rossel',
    '/faq': 'Preguntas Frecuentes - Rossel',
    '/privacidad': 'Política de Privacidad - Rossel',
    '/admin': 'Panel Admin - Rossel'
  };

  // Verificar rutas exactas
  if (routes[pathname]) {
    return routes[pathname];
  }

  // Verificar rutas dinámicas
  if (pathname.startsWith('/products/')) {
    return 'Detalle de Producto - Rossel';
  }
  
  if (pathname.startsWith('/orden-confirmada/')) {
    return 'Orden Confirmada - Rossel';
  }

  // Ruta por defecto
  return 'Rossel | Con estilo propio';
};

// 🏪 PROVEEDOR DE ANALYTICS
export const AnalyticsProvider = ({ children }) => {
  const location = useLocation();
  const { user } = useUser();
  const analytics = useAnalytics();

  // 📍 TRACKING AUTOMÁTICO DE PÁGINAS
  useEffect(() => {
    const pageTitle = getPageTitle(location.pathname);
    
    // Pequeño delay para asegurar que la página se cargó
    const timeoutId = setTimeout(() => {
      analytics.trackPageView(location.pathname, pageTitle);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [location.pathname, analytics]);

  // 👤 TRACKING AUTOMÁTICO DE USUARIO
  useEffect(() => {
    if (user) {
      // Configurar usuario en GA4 cuando se loguea
      analytics.trackLogin(user);
      
      console.log('LOG: [AnalyticsProvider] Usuario logueado:', user.email);
    }
  }, [user, analytics]);

  // 🔧 FUNCIONES MEJORADAS CON CONTEXTO
  const trackWithContext = {
    // Heredar todas las funciones originales
    ...analytics,
    
    // Sobrescribir con versiones mejoradas que incluyen contexto
    trackAddToCart: (product, quantity = 1) => {
      analytics.trackAddToCart(product, quantity);
      
      // Tracking adicional con contexto de usuario
      analytics.trackEvent('add_to_cart_detailed', {
        product_id: product.id,
        product_name: product.name,
        user_type: user?.role || 'guest',
        page_location: location.pathname,
        quantity: quantity
      });
    },
    
    trackPurchase: (orderId, orderItems, orderTotal, shipping = 0, tax = 0) => {
      analytics.trackPurchase(orderId, orderItems, orderTotal, shipping, tax);
      
      // Tracking adicional para análisis de conversión
      analytics.trackEvent('purchase_detailed', {
        transaction_id: orderId,
        user_type: user?.role || 'guest',
        payment_method: 'online', // Podrías pasarlo como parámetro
        device_type: window.innerWidth < 768 ? 'mobile' : 'desktop',
        items_count: orderItems.length,
        average_item_value: orderTotal / orderItems.length
      });
    },
    
    trackSearch: (query, resultsCount = null) => {
      analytics.trackSearch(query);
      
      // Tracking detallado de búsqueda
      analytics.trackEvent('search_detailed', {
        search_term: query,
        results_count: resultsCount,
        user_type: user?.role || 'guest',
        page_location: location.pathname
      });
    }
  };

  // 🎯 VALOR DEL CONTEXTO
  const contextValue = {
    analytics: trackWithContext,
    user,
    currentPage: location.pathname,
    pageTitle: getPageTitle(location.pathname)
  };

  return (
    <AnalyticsContext.Provider value={contextValue}>
      {children}
    </AnalyticsContext.Provider>
  );
};

// 🪝 HOOK PARA USAR EL CONTEXTO
export const useAnalyticsContext = () => {
  const context = useContext(AnalyticsContext);
  
  if (!context) {
    throw new Error('useAnalyticsContext debe usarse dentro de AnalyticsProvider');
  }
  
  return context;
};

export default AnalyticsProvider;