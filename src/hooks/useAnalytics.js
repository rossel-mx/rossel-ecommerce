/**
 * @file useAnalytics.js
 * @description Hook personalizado para Google Analytics 4 con Enhanced Ecommerce
 * Maneja todos los eventos de tracking para Rossel ecommerce
 */

import { useEffect } from 'react';

// 🔧 CONFIGURACIÓN
const GA_MEASUREMENT_ID = 'G-00DB6CNMBM';
const DEBUG_MODE = process.env.NODE_ENV === 'development';

// 🚀 INICIALIZAR GOOGLE ANALYTICS
const initGA = () => {
  // Verificar si gtag ya existe
  if (typeof window.gtag !== 'undefined') {
    if (DEBUG_MODE) console.log('LOG: [Analytics] GA4 ya inicializado');
    return;
  }

  // Crear script de Google Analytics
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // Inicializar gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = function() {
    window.dataLayer.push(arguments);
  };
  
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    // Configuraciones Enhanced Ecommerce
    custom_map: {
      'custom_parameter_1': 'user_type',
      'custom_parameter_2': 'product_category'
    },
    // Configuraciones de privacidad
    anonymize_ip: true,
    allow_google_signals: true,
    allow_ad_personalization_signals: true
  });

  if (DEBUG_MODE) console.log('LOG: [Analytics] GA4 inicializado correctamente');
};

// 🛒 UTILIDADES PARA ECOMMERCE
const formatProduct = (product) => {
  return {
    item_id: product.id?.toString() || 'unknown',
    item_name: product.name || product.title || 'Producto sin nombre',
    category: product.category || 'General',
    price: parseFloat(product.price) || 0,
    quantity: parseInt(product.quantity) || 1,
    currency: 'MXN'
  };
};

const formatUser = (user) => {
  return {
    user_id: user?.id || null,
    user_type: user?.role || 'guest',
    email: user?.email || null
  };
};

// 📊 HOOK PRINCIPAL
export const useAnalytics = () => {
  // Inicializar GA4 cuando se monta el hook
  useEffect(() => {
    initGA();
  }, []);

  // 🔄 EVENTOS BÁSICOS
  const trackPageView = (pagePath, pageTitle) => {
    if (typeof window.gtag === 'undefined') return;
    
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: pagePath,
      page_title: pageTitle
    });

    if (DEBUG_MODE) {
      console.log('LOG: [Analytics] Page view:', { pagePath, pageTitle });
    }
  };

  const trackEvent = (eventName, parameters = {}) => {
    if (typeof window.gtag === 'undefined') return;

    window.gtag('event', eventName, {
      ...parameters,
      timestamp: new Date().toISOString()
    });

    if (DEBUG_MODE) {
      console.log('LOG: [Analytics] Event:', eventName, parameters);
    }
  };

  // 👤 EVENTOS DE USUARIO
  const trackLogin = (user, method = 'email') => {
    const userData = formatUser(user);
    
    // Configurar usuario en GA4
    window.gtag('config', GA_MEASUREMENT_ID, {
      user_id: userData.user_id,
      custom_map: {
        user_type: userData.user_type
      }
    });

    // Evento de login
    trackEvent('login', {
      method: method,
      user_type: userData.user_type
    });
  };

  const trackSignUp = (user, method = 'email') => {
    const userData = formatUser(user);
    
    trackEvent('sign_up', {
      method: method,
      user_type: userData.user_type
    });
  };

  const trackLogout = () => {
    trackEvent('logout', {});
  };

  // 🛍️ EVENTOS DE PRODUCTOS
  const trackViewItem = (product) => {
    const formattedProduct = formatProduct(product);
    
    trackEvent('view_item', {
      currency: 'MXN',
      value: formattedProduct.price,
      items: [formattedProduct]
    });
  };

  const trackViewItemList = (products, category = 'General') => {
    const formattedProducts = products.map(formatProduct);
    
    trackEvent('view_item_list', {
      item_list_name: category,
      currency: 'MXN',
      items: formattedProducts
    });
  };

  const trackSearch = (query, category = null) => {
    trackEvent('search', {
      search_term: query,
      category: category
    });
  };

  // 🛒 EVENTOS DE CARRITO
  const trackAddToCart = (product, quantity = 1) => {
    const formattedProduct = {
      ...formatProduct(product),
      quantity: quantity
    };
    
    trackEvent('add_to_cart', {
      currency: 'MXN',
      value: formattedProduct.price * quantity,
      items: [formattedProduct]
    });
  };

  const trackRemoveFromCart = (product, quantity = 1) => {
    const formattedProduct = {
      ...formatProduct(product),
      quantity: quantity
    };
    
    trackEvent('remove_from_cart', {
      currency: 'MXN',
      value: formattedProduct.price * quantity,
      items: [formattedProduct]
    });
  };

  const trackViewCart = (cartItems, cartTotal) => {
    const formattedItems = cartItems.map(formatProduct);
    
    trackEvent('view_cart', {
      currency: 'MXN',
      value: parseFloat(cartTotal) || 0,
      items: formattedItems
    });
  };

  // 💳 EVENTOS DE CHECKOUT
  const trackBeginCheckout = (cartItems, cartTotal) => {
    const formattedItems = cartItems.map(formatProduct);
    
    trackEvent('begin_checkout', {
      currency: 'MXN',
      value: parseFloat(cartTotal) || 0,
      items: formattedItems
    });
  };

  const trackAddPaymentInfo = (paymentMethod, cartTotal) => {
    trackEvent('add_payment_info', {
      currency: 'MXN',
      value: parseFloat(cartTotal) || 0,
      payment_type: paymentMethod
    });
  };

  const trackAddShippingInfo = (shippingMethod, cartTotal) => {
    trackEvent('add_shipping_info', {
      currency: 'MXN',
      value: parseFloat(cartTotal) || 0,
      shipping_tier: shippingMethod
    });
  };

  // 🎉 EVENTO DE COMPRA (MÁS IMPORTANTE)
  const trackPurchase = (orderId, orderItems, orderTotal, shipping = 0, tax = 0) => {
    const formattedItems = orderItems.map(formatProduct);
    
    trackEvent('purchase', {
      transaction_id: orderId.toString(),
      currency: 'MXN',
      value: parseFloat(orderTotal) || 0,
      shipping: parseFloat(shipping) || 0,
      tax: parseFloat(tax) || 0,
      items: formattedItems
    });

    // También trackear como conversión
    trackEvent('conversion', {
      send_to: `${GA_MEASUREMENT_ID}/purchase`,
      value: parseFloat(orderTotal) || 0,
      currency: 'MXN',
      transaction_id: orderId.toString()
    });
  };

  // 🔄 EVENTOS ADICIONALES
  const trackShare = (content, method) => {
    trackEvent('share', {
      content_type: 'product',
      content_id: content.id,
      method: method
    });
  };

  const trackException = (description, fatal = false) => {
    trackEvent('exception', {
      description: description,
      fatal: fatal
    });
  };

  const trackTiming = (name, value, category = 'Performance') => {
    trackEvent('timing_complete', {
      name: name,
      value: parseInt(value),
      event_category: category
    });
  };

  // 📱 EVENTOS PERSONALIZADOS PARA ROSSEL
  const trackContactForm = (type) => {
    trackEvent('contact_form_submit', {
      form_type: type
    });
  };

  const trackNewsletterSignup = (location) => {
    trackEvent('newsletter_signup', {
      location: location
    });
  };

  const trackFilterUse = (filterType, filterValue) => {
    trackEvent('filter_use', {
      filter_type: filterType,
      filter_value: filterValue
    });
  };

  // 🎯 RETORNAR TODAS LAS FUNCIONES
  return {
    // Básicos
    trackPageView,
    trackEvent,
    
    // Usuario
    trackLogin,
    trackSignUp,
    trackLogout,
    
    // Productos
    trackViewItem,
    trackViewItemList,
    trackSearch,
    
    // Carrito
    trackAddToCart,
    trackRemoveFromCart,
    trackViewCart,
    
    // Checkout
    trackBeginCheckout,
    trackAddPaymentInfo,
    trackAddShippingInfo,
    trackPurchase,
    
    // Adicionales
    trackShare,
    trackException,
    trackTiming,
    
    // Rossel específicos
    trackContactForm,
    trackNewsletterSignup,
    trackFilterUse
  };
};

export default useAnalytics;