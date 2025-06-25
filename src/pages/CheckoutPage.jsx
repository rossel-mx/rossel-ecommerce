/**
 * @file CheckoutPage.jsx - Versión de Producción
 * @description Página para finalizar la compra, optimizada y limpia para producción
 */
import { useState, useEffect, useCallback } from "react";
import { useUser } from "../context/UserContext";
import { useCart } from "../context/CartContext";
import { supabase } from "../services/supabaseClient";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import AddressModal from "../components/modals/AddressModal";

const CheckoutPage = () => {
  // --- ESTADOS ---
  const { user } = useUser();
  const { cart, getTotal, clearCart, setCart } = useCart();
  const navigate = useNavigate();
  
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- VALIDACIÓN MANUAL DEL CARRITO ---
  const validateCartManually = async () => {
    try {
      const validatedItems = [];
      
      for (const item of cart) {
        const { data: variant, error: variantError } = await supabase
          .from('product_variants')
          .select(`
            id,
            product_id,
            color,
            stock,
            price_menudeo,
            price_mayoreo,
            image_urls,
            products (
              id,
              name,
              description
            )
          `)
          .eq('id', item.id)
          .single();

        if (variantError || !variant?.products) {
          continue;
        }

        if (variant.stock < item.quantity) {
          if (variant.stock > 0) {
            const adjustedItem = {
              ...item,
              quantity: variant.stock,
              name: item.name || variant.products.name,
              description: item.description || variant.products.description
            };
            validatedItems.push(adjustedItem);
            toast.warning(`Stock limitado para ${variant.products.name}. Cantidad ajustada a ${variant.stock}.`);
          } else {
            toast.error(`${variant.products.name} (${variant.color}) ya no tiene stock disponible.`);
          }
          continue;
        }

        const validItem = {
          ...item,
          name: item.name || variant.products.name,
          description: item.description || variant.products.description,
          available_stock: variant.stock
        };
        validatedItems.push(validItem);
      }

      return validatedItems;
    } catch (error) {
      console.error("Error en validación manual:", error);
      throw error;
    }
  };

  // --- LÓGICA DE INICIALIZACIÓN ---
  const initializeCheckout = useCallback(async () => {
    setLoading(true);
    
    try {
      if (cart.length === 0) {
        navigate("/products");
        return;
      }

      // Validar carrito usando RPC
      const cartToValidate = cart.map(item => ({ 
        id: item.id, 
        quantity: item.quantity 
      }));
      
      let validItems = [];
      let useManualValidation = false;
      
      try {
        const { data: rpcResult, error: validationError } = await supabase.rpc('validate_cart_items', {
          cart_items: cartToValidate
        });
        
        if (validationError) {
          useManualValidation = true;
        } else {
          validItems = rpcResult || [];
        }
      } catch (rpcError) {
        useManualValidation = true;
      }

      // Usar validación manual como respaldo
      if (useManualValidation) {
        toast.info("Verificando disponibilidad de productos...");
        const manualValidatedItems = await validateCartManually();
        
        validItems = manualValidatedItems.map(item => ({
          id: item.id,
          name: item.name,
          color: item.color,
          quantity: item.quantity,
          price_menudeo: item.price_menudeo,
          price_mayoreo: item.price_mayoreo,
          image_urls: item.image_urls,
          available_stock: item.available_stock || item.stock,
          description: item.description
        }));
      }

      // Comparar y actualizar carrito si es necesario
      const normalizedValidItems = validItems.map(validItem => {
        const originalItem = cart.find(cartItem => cartItem.id === validItem.id);
        return {
          ...originalItem,
          ...validItem,
          quantity: validItem.quantity || originalItem?.quantity || 1
        };
      });
      
      if (normalizedValidItems.length !== cart.length) {
        const removedItems = cart.filter(cartItem => 
          !normalizedValidItems.some(validItem => validItem.id === cartItem.id)
        );
        
        const adjustedItems = normalizedValidItems.filter(validItem => {
          const originalItem = cart.find(cartItem => cartItem.id === validItem.id);
          return originalItem && originalItem.quantity !== validItem.quantity;
        });
        
        if (removedItems.length > 0) {
          toast.error(`${removedItems.length} producto(s) no disponible(s) fueron eliminados del carrito.`, { duration: 5000 });
        }
        
        if (adjustedItems.length > 0) {
          adjustedItems.forEach(item => {
            const original = cart.find(c => c.id === item.id);
            toast.warning(`${item.name}: cantidad ajustada de ${original.quantity} a ${item.quantity} (stock disponible).`);
          });
        }
        
        setCart(normalizedValidItems);
        
        if (normalizedValidItems.length === 0) {
          toast.error("Ningún producto en tu carrito está disponible actualmente.");
          navigate("/products");
          return;
        }
      }

      // Cargar direcciones
      const { data: addressData, error: addressError } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });
        
      if (addressError) throw addressError;
      
      setAddresses(addressData || []);
      
      const defaultAddress = addressData?.find(addr => addr.is_default) || addressData?.[0];
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id);
      }

    } catch (error) {
      console.error("Error durante inicialización:", error);
      toast.error("Hubo un problema al cargar el checkout. Intenta de nuevo.");
      navigate("/cart");
    } finally {
      setLoading(false);
    }
  }, [cart, setCart, navigate, user]);

  useEffect(() => {
    if(cart.length > 0) {
      initializeCheckout();
    } else if (!loading) {
      navigate("/products");
    }
  }, [initializeCheckout, cart.length]);

  // --- ENVÍO DE EMAIL DE CONFIRMACIÓN ---
const sendOrderConfirmationEmail = async (orderId) => {
  try {
    console.log("=== INICIANDO ENVÍO DE EMAIL ===");
    console.log("Enviando email de confirmación para orden:", orderId);
    
    // Calcular total
    const total = cart.reduce((sum, item) => {
      const price = item.quantity >= 4 ? item.price_mayoreo : item.price_menudeo;
      return sum + (price * item.quantity);
    }, 0);

    // ✅ FORMATEAR DATOS CORRECTAMENTE - DENTRO DE UN OBJETO 'order'
    const emailPayload = {
      order: {  // ← ¡ESTA ES LA CLAVE!
        id: orderId,
        customer_email: user.email,
        customer_name: user.full_name || user.email,
        total_amount: total,
        items: cart.map(item => ({
          quantity: item.quantity,
          product_name: `${item.name} (${item.color})`
        }))
      }
    };

    console.log("=== PAYLOAD COMPLETO QUE SE ENVIARÁ ===");
    console.log(JSON.stringify(emailPayload, null, 2));

    console.log("=== LLAMANDO A EDGE FUNCTION ===");
    const { data, error } = await supabase.functions.invoke('send-order-confirmation', {
      body: emailPayload  // ← Enviamos el payload con la estructura correcta
    });

    console.log("=== RESPUESTA DE EDGE FUNCTION ===");
    console.log("Data:", data);
    console.log("Error:", error);

    if (error) {
      console.error("❌ Error enviando email de confirmación:", error);
      toast.error("No se pudo enviar el email de confirmación, pero tu pedido fue creado exitosamente.");
    } else {
      console.log("✅ Email de confirmación enviado exitosamente:", data);
      toast.success("Email de confirmación enviado exitosamente");
    }
  } catch (error) {
    console.error("❌ Error en función de email:", error);
    toast.error("Problema enviando email de confirmación, pero tu pedido fue creado exitosamente.");
  }
};

  // --- MANEJADOR DE PEDIDO ---
  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      toast.error("Por favor, selecciona o añade una dirección de envío.");
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading('Procesando tu pedido...');
    
    try {
      // Preparar datos para RPC
      const cartItemsForRPC = cart.map(item => ({
        id: item.id,
        quantity: item.quantity,
      }));

      console.log("Enviando datos a create_new_order:", cartItemsForRPC);

      // Crear la orden
      const { data: newOrderId, error: orderError } = await supabase.rpc('create_new_order', {
        cart_items: cartItemsForRPC,
        shipping_address_id: selectedAddressId
      });
      
      if (orderError) {
        console.error("Error al crear orden:", orderError);
        throw orderError;
      }

      console.log(`Orden #${newOrderId} creada exitosamente`);
      
      // Cerrar loading toast
      toast.dismiss(loadingToast);
      
      // Mostrar éxito
      toast.success("¡Gracias por tu compra! Tu pedido se ha realizado con éxito.", { duration: 3000 });
      
      // Navegar INMEDIATAMENTE a la página de confirmación
      console.log(`Navegando a confirmación de orden: /orden-confirmada/${newOrderId}`);
      navigate(`/orden-confirmada/${newOrderId}`, { replace: true });
      
      // Limpiar carrito DESPUÉS de navegar (en segundo plano)
      setTimeout(() => {
        clearCart();
      }, 100);
      
      // Enviar email de confirmación en segundo plano (no bloqueante)
      setTimeout(() => {
        sendOrderConfirmationEmail(newOrderId);
      }, 500);

    } catch (error) {
      console.error("Error al finalizar pedido:", error);
      toast.dismiss(loadingToast);
      toast.error(error.message || "No se pudo procesar tu pedido. Inténtalo de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalSuccess = () => {
    initializeCheckout();
  };
  
  const formatCurrency = (amount) => new Intl.NumberFormat('es-MX', { 
    style: 'currency', 
    currency: 'MXN' 
  }).format(amount || 0);

  // --- RENDERIZADO ---
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4">Preparando tu checkout...</p>
        </div>
      </div>
    );
  }
  
  if (cart.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <p>Tu carrito está vacío. Serás redirigido...</p>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <div className="bg-gray-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <Toaster position="top-right" />
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-extrabold text-primary mb-8">Finalizar Compra</h1>
          
          <div className="bg-white p-8 rounded-xl shadow-lg space-y-8">
            
            {/* Dirección de Envío */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">1. Dirección de Envío</h2>
                <button 
                  onClick={() => setIsModalOpen(true)} 
                  className="text-sm text-primary font-semibold hover:underline"
                >
                  + Añadir nueva
                </button>
              </div>
              <div className="space-y-3">
                {addresses.map(address => (
                  <label 
                    key={address.id} 
                    className={`flex items-start p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedAddressId === address.id 
                        ? 'border-primary ring-2 ring-primary bg-red-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="address" 
                      className="h-5 w-5 mt-1 flex-shrink-0 text-primary" 
                      checked={selectedAddressId === address.id} 
                      onChange={() => setSelectedAddressId(address.id)} 
                    />
                    <div className="ml-4 text-sm">
                      <p className="font-bold text-gray-900">{address.label}</p>
                      <address className="not-italic text-gray-600 mt-1">
                        {address.street_address}
                        {address.address_line_2 && `, ${address.address_line_2}`}
                        <br />
                        Col. {address.colonia}, {address.city}, {address.state}
                        <br />
                        C.P. {address.zip_code}
                      </address>
                    </div>
                  </label>
                ))}
                {addresses.length === 0 && (
                  <p className="text-sm text-center text-gray-500 p-4 bg-gray-50 rounded-md">
                    No tienes direcciones guardadas. Por favor, añade una.
                  </p>
                )}
              </div>
            </div>

            {/* Resumen del Pedido */}
            <div>
              <h2 className="text-xl font-bold mb-4">2. Resumen de tu Pedido</h2>
              <div className="border border-gray-200 rounded-lg">
                <div className="p-4 space-y-4">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-500">
                          Color: {item.color} • Cantidad: {item.quantity}
                        </p>
                      </div>
                      <p className="font-medium text-gray-900">
                        {formatCurrency((item.quantity >= 4 ? item.price_mayoreo : item.price_menudeo) * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  <div className="flex justify-between items-center">
                    <p className="text-lg font-bold text-gray-900">Total</p>
                    <p className="text-lg font-bold text-primary">{formatCurrency(getTotal())}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Botón de Finalizar Compra */}
            <div>
              <p className="text-xs text-gray-500 mb-4">
                Al hacer clic, se procesará tu pago y se creará tu orden de compra.
              </p>
              <button 
                onClick={handlePlaceOrder} 
                disabled={isSubmitting || cart.length === 0 || addresses.length === 0} 
                className="w-full bg-primary text-white py-4 rounded-lg text-lg font-bold hover:bg-red-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg"
              >
                {isSubmitting ? "Procesando Pedido..." : `Finalizar Compra - ${formatCurrency(getTotal())}`}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <AddressModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={handleModalSuccess} 
      />
    </>
  );
};

export default CheckoutPage;