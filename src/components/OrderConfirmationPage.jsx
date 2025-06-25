/**
 * @file OrderConfirmationPage.jsx
 * @description Página de confirmación de pedido mejorada (sin dependencias externas)
 */
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { supabase } from "../services/supabaseClient";

const OrderConfirmationPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(60); // Cambiado de 10 a 60 segundos

  // Cargar detalles de la orden
  useEffect(() => {
    const loadOrderDetails = async () => {
      try {
        // Obtener detalles de la orden
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select(`
            id,
            created_at,
            status,
            order_items (
              quantity,
              unit_price,
              product_variants (
                color,
                products (
                  name
                )
              )
            )
          `)
          .eq('id', orderId)
          .eq('user_id', user.id)
          .single();

        if (orderError) throw orderError;
        setOrderDetails(order);
      } catch (error) {
        console.error("Error cargando detalles de la orden:", error);
      } finally {
        setLoading(false);
      }
    };

    if (orderId && user) {
      loadOrderDetails();
    }
  }, [orderId, user]);

  // Countdown y redirección automática
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          navigate("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  const formatCurrency = (amount) => new Intl.NumberFormat('es-MX', { 
    style: 'currency', 
    currency: 'MXN' 
  }).format(amount || 0);

  const calculateTotal = () => {
    if (!orderDetails?.order_items) return 0;
    return orderDetails.order_items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4">Cargando detalles de tu pedido...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        
        {/* Header de Confirmación */}
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <span className="text-3xl">✅</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
            ¡Pedido Confirmado!
          </h1>
          <p className="text-lg text-gray-600">
            Gracias por tu compra. Tu pedido <span className="font-bold text-primary">#{orderId}</span> ha sido procesado exitosamente.
          </p>
        </div>

        {/* Detalles del Pedido */}
        {orderDetails && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Detalles de tu Pedido</h2>
            
            {/* Items del Pedido */}
            <div className="space-y-4 mb-6">
              {orderDetails.order_items.map((item, index) => (
                <div key={index} className="flex justify-between items-center py-3 border-b border-gray-200 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">
                      {item.product_variants.products.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      Color: {item.product_variants.color} • Cantidad: {item.quantity}
                    </p>
                  </div>
                  <p className="font-medium text-gray-900">
                    {formatCurrency(item.unit_price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between items-center">
                <p className="text-lg font-bold text-gray-900">Total Pagado</p>
                <p className="text-lg font-bold text-primary">{formatCurrency(calculateTotal())}</p>
              </div>
            </div>
          </div>
        )}

        {/* Información de Seguimiento */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">¿Qué sigue?</h2>
          
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-2xl mr-2">📧</span>
              </div>
              <div className="ml-2">
                <h3 className="font-medium text-gray-900">Confirmación por Email</h3>
                <p className="text-sm text-gray-600">
                  Recibirás un email de confirmación en {user?.email} con todos los detalles de tu pedido.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-2xl mr-2">🚚</span>
              </div>
              <div className="ml-2">
                <h3 className="font-medium text-gray-900">Procesamiento y Envío</h3>
                <p className="text-sm text-gray-600">
                  Tu pedido será procesado en 1-2 días hábiles. Te notificaremos cuando sea enviado.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="text-center space-y-4">
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              to="/mi-cuenta/pedidos"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-red-700 transition"
            >
              Ver Mis Pedidos
              <span className="ml-2">→</span>
            </Link>
            
            <Link
              to="/products"
              className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition"
            >
              Seguir Comprando
            </Link>
          </div>
          
          {/* Barra de progreso visual del countdown */}
          <div className="w-full max-w-md mx-auto bg-gray-200 rounded-full h-2 mb-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${(countdown / 60) * 100}%` }}
            ></div>
          </div>
          
          <p className="text-sm text-gray-500">
            Serás redirigido automáticamente al inicio en {countdown} segundo{countdown !== 1 ? 's' : ''}
          </p>
          
          <button
            onClick={() => navigate("/")}
            className="text-primary hover:text-red-700 text-sm font-medium"
          >
            Ir al inicio ahora
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmationPage;