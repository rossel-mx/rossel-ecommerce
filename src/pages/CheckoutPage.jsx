/**
 * @file CheckoutPage.jsx
 * @description Página para finalizar la compra, completamente adaptada a la nueva arquitectura.
 * Esta versión incluye:
 * - Un robusto sistema de validación pre-checkout que llama a 'validate_cart_items' al cargar
 * para verificar el stock y la existencia de cada artículo, limpiando el carrito si es necesario.
 * - Lógica para enviar los datos del carrito en el formato correcto a la nueva función RPC 'create_new_order'.
 * - Selección de dirección de envío y la capacidad de añadir una nueva dirección sobre la marcha.
 */
import { useState, useEffect, useCallback } from "react";
import { useUser } from "../context/UserContext";
import { useCart } from "../context/CartContext";
import { supabase } from "../services/supabaseClient";
import { useNavigate, Link } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import AddressModal from "../components/modals/AddressModal";

const CheckoutPage = () => {
  // --- ESTADOS ---
  const { user } = useUser();
  const { cart, getTotal, clearCart, setCart } = useCart(); // Necesitamos setCart para la validación
  const navigate = useNavigate();
  
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- LÓGICA DE DATOS Y VALIDACIÓN ---
  /**
   * Se ejecuta al cargar la página. Valida el carrito y carga las direcciones.
   */
  const initializeCheckout = useCallback(async () => {
    console.log("LOG: [CheckoutPage] Iniciando inicialización y validación del checkout...");
    setLoading(true);
    
    try {
      // 1. Si el carrito está vacío, no hay nada que hacer. Redirigimos.
      if (cart.length === 0) {
        console.log("LOG: [CheckoutPage] Carrito vacío, redirigiendo a la tienda.");
        navigate("/products");
        return;
      }

      // 2. Validar los artículos del carrito con la función RPC 'validate_cart_items'.
      console.log("LOG: [CheckoutPage] Llamando a RPC 'validate_cart_items' para verificar stock y existencia...");
      const cartToValidate = cart.map(item => ({ id: item.id, quantity: item.quantity }));
      const { data: validItems, error: validationError } = await supabase.rpc('validate_cart_items', {
        cart_items: cartToValidate
      });
      if (validationError) throw validationError;

      // 3. Comparar el carrito original con los artículos válidos que devolvió la función.
      if (validItems.length < cart.length) {
        console.warn("WARN: [CheckoutPage] Se detectaron artículos no válidos en el carrito. Actualizando...");
        toast.error("Algunos productos de tu carrito ya no están disponibles y han sido eliminados.", { duration: 5000 });
        
        // Actualizamos el carrito en el contexto para que contenga solo los artículos que pasaron la validación.
        const validItemIds = new Set(validItems.map(item => item.id));
        const updatedCart = cart.filter(item => validItemIds.has(item.id));
        setCart(updatedCart);
      } else {
        console.log("LOG: [CheckoutPage] Todos los artículos del carrito son válidos.");
      }

      // 4. Cargar las direcciones del usuario.
      const { data: addressData, error: addressError } = await supabase.from('user_addresses').select('*').order('is_default', { ascending: false });
      if (addressError) throw addressError;
      setAddresses(addressData || []);
      const defaultAddress = addressData?.find(addr => addr.is_default) || addressData?.[0];
      if (defaultAddress) setSelectedAddressId(defaultAddress.id);

    } catch (error) {
      console.error("ERROR: [CheckoutPage] Error durante la inicialización:", error);
      toast.error("Hubo un problema al cargar el checkout. Intenta de nuevo.");
      navigate("/cart"); // Si algo falla, es más seguro devolver al usuario al carrito.
    } finally {
      setLoading(false);
    }
  }, [cart, setCart, navigate]);

  useEffect(() => {
    // Solo inicializamos si hay algo en el carrito.
    if(cart.length > 0) {
      initializeCheckout();
    } else if (!loading) {
      // Si el carrito se vació después de la carga inicial, redirigimos.
      navigate("/products");
    }
  }, [initializeCheckout, cart.length]);

  // --- MANEJADORES DE EVENTOS ---
  
  /**
   * Se ejecuta al hacer clic en "Finalizar Compra".
   * Prepara los datos del carrito y llama a la nueva función RPC 'create_new_order'.
   */
  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      toast.error("Por favor, selecciona o añade una dirección de envío.");
      return;
    }

    setIsSubmitting(true);
    toast.loading('Procesando tu pedido...');
    
    try {
      // Preparamos los datos del carrito en el formato simple que nuestra nueva función espera.
      const cartItemsForRPC = cart.map(item => ({
        id: item.id, // Este es el variant_id
        quantity: item.quantity,
      }));

      console.log("LOG: [CheckoutPage] Llamando a RPC 'create_new_order' con:", cartItemsForRPC);
      const { data: newOrderId, error: orderError } = await supabase.rpc('create_new_order', {
        cart_items: cartItemsForRPC
      });
      if (orderError) throw orderError;
      
      console.log(`LOG: [CheckoutPage] Orden #${newOrderId} creada exitosamente en la BD.`);
      
      // La lógica de envío de email no cambia.

      toast.dismiss();
      toast.success("¡Gracias por tu compra! Tu pedido se ha realizado con éxito.");
      clearCart();
      navigate(`/orden-confirmada/${newOrderId}`);

    } catch (error) {
      toast.dismiss();
      toast.error(error.message || "No se pudo procesar tu pedido.");
      console.error("ERROR: [CheckoutPage] Error al finalizar el pedido:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Callback que se pasa al modal. Se ejecuta cuando una dirección se añade
   * o edita con éxito, para recargar la lista de direcciones.
   */
  const handleModalSuccess = () => {
    console.log("LOG: [CheckoutPage] Modal reportó éxito. Recargando direcciones...");
    // Volvemos a llamar a la función de inicialización para recargar y re-seleccionar.
    initializeCheckout();
  };
  
  const formatCurrency = (amount) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);

  // --- RENDERIZADO ---
  if (loading) return <div className="text-center py-20">Preparando tu checkout...</div>;
  if (cart.length === 0) return <div className="text-center py-20">Tu carrito está vacío. Serás redirigido...</div>;
  
  return (
    <>
      <div className="bg-gray-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <Toaster position="top-right" />
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-extrabold text-primary mb-8">Finalizar Compra</h1>
          <div className="bg-white p-8 rounded-xl shadow-lg space-y-8">
            
            {/* --- Sección 1: Dirección de Envío --- */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">1. Dirección de Envío</h2>
                <button onClick={() => setIsModalOpen(true)} className="text-sm text-primary font-semibold hover:underline">+ Añadir nueva</button>
              </div>
              <div className="space-y-3">
                {addresses.map(address => (
                  <label key={address.id} className={`flex items-start p-4 border rounded-lg cursor-pointer transition-all ${selectedAddressId === address.id ? 'border-primary ring-2 ring-primary' : 'border-gray-200'}`}>
                    <input type="radio" name="address" className="h-5 w-5 mt-1 flex-shrink-0" checked={selectedAddressId === address.id} onChange={() => setSelectedAddressId(address.id)} />
                    <div className="ml-4 text-sm">
                      <p className="font-bold">{address.label}</p>
                      <address className="not-italic text-gray-600">
                        {address.street_address}, {address.address_line_2 ? `${address.address_line_2}, ` : ''} Col. {address.colonia}, {address.city}, {address.state}, C.P. {address.zip_code}
                      </address>
                    </div>
                  </label>
                ))}
                {addresses.length === 0 && <p className="text-sm text-center text-gray-500 p-4 bg-gray-50 rounded-md">No tienes direcciones guardadas. Por favor, añade una.</p>}
              </div>
            </div>

            {/* --- Sección 2: Resumen del Pedido --- */}
            <div>
              <h2 className="text-xl font-bold mb-4">2. Resumen de tu Pedido</h2>
              <div className="space-y-4 border p-4 rounded-md">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between items-center text-sm">
                    <p>{item.name} <span className="text-gray-500">({item.color})</span> <span className="text-gray-500">x {item.quantity}</span></p>
                    <p className="font-medium">{formatCurrency((item.quantity >= 4 ? item.price_mayoreo : item.price_menudeo) * item.quantity)}</p>
                  </div>
                ))}
                <div className="border-t pt-4 mt-4 flex justify-between font-bold text-lg">
                  <p>Total</p>
                  <p>{formatCurrency(getTotal())}</p>
                </div>
              </div>
            </div>
            
            {/* --- Sección 3: Botón de Acción --- */}
            <div>
              <p className="text-xs text-gray-500 mb-4">Al hacer clic, se simulará un pago exitoso y se creará tu orden.</p>
              <button onClick={handlePlaceOrder} disabled={isSubmitting || cart.length === 0 || addresses.length === 0} className="w-full bg-primary text-white py-3 rounded-lg text-lg font-bold hover:bg-red-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed">
                {isSubmitting ? "Procesando Pedido..." : "Finalizar Compra"}
              </button>
            </div>
          </div>
        </div>
      </div>
      <AddressModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={handleModalSuccess} />
    </>
  );
};

export default CheckoutPage;
