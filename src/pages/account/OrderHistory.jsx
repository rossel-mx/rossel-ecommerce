/**
 * @file OrderHistory.jsx
 * @description Componente para la sección "Mis Pedidos" del panel de usuario.
 * Esta versión final muestra una lista completa del historial de pedidos del cliente,
 * incluyendo el color específico de cada producto comprado, para una mayor claridad.
 *
 * @requires react
 * @requires supabaseClient
 * @requires react-hot-toast
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import toast, { Toaster } from "react-hot-toast";

/**
 * Un sub-componente de presentación para mostrar una etiqueta de estado (badge)
 * con colores diferentes según el estado del pedido.
 * @param {{ status: string }} props
 */
const StatusBadge = ({ status }) => {
  const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full capitalize";
  let specificClasses = "";
  switch (status) {
    case 'pending': specificClasses = 'bg-yellow-200 text-yellow-800'; break;
    case 'processing': specificClasses = 'bg-blue-200 text-blue-800'; break;
    case 'shipped': specificClasses = 'bg-green-200 text-green-800'; break;
    case 'delivered': specificClasses = 'bg-teal-200 text-teal-800'; break;
    default: specificClasses = 'bg-gray-200 text-gray-800';
  }
  return <span className={`${baseClasses} ${specificClasses}`}>{status}</span>;
};

const OrderHistory = () => {
  // --- ESTADOS ---
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedOrderId, setExpandedOrderId] = useState(null); // Controla qué pedido está expandido

  // --- LÓGICA DE DATOS ---
  /**
   * Carga el historial de pedidos del usuario llamando a la función RPC 'get_my_orders'.
   */
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    console.log("LOG: [OrderHistory] Iniciando carga de historial de pedidos...");
    try {
      const { data, error: rpcError } = await supabase.rpc('get_my_orders');
      if (rpcError) throw rpcError;

      setOrders(data || []);
      console.log("LOG: [OrderHistory] Pedidos cargados exitosamente:", data);
    } catch (err) {
      setError(err.message);
      console.error("ERROR: [OrderHistory] Error al cargar pedidos:", err);
      toast.error("No se pudieron cargar tus pedidos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);
  
  // --- FUNCIONES AUXILIARES ---
  const formatCurrency = (amount) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);
  const toggleExpand = (orderId) => {
    console.log(`LOG: [OrderHistory] Alternando visibilidad para pedido #${orderId}`);
    setExpandedOrderId(prevId => prevId === orderId ? null : orderId);
  };
  
  // --- RENDERIZADO ---
  if (loading) return <p>Cargando historial de pedidos...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;

  return (
    <div>
      <Toaster position="top-right" />
      <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">Mis Pedidos</h2>
      
      {orders.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-lg">
            <p className="font-semibold text-gray-700">Aún no has realizado ningún pedido.</p>
            <p className="text-sm text-gray-500 mt-1">¡Explora nuestros productos y estrena algo nuevo!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              {/* Resumen del Pedido (la fila principal) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                <div>
                  <p className="text-xs text-gray-500">Pedido ID</p>
                  <p className="font-bold font-mono">#{order.id}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Fecha</p>
                  <p className="font-semibold">{new Date(order.created_at).toLocaleDateString('es-MX')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Estado</p>
                  <StatusBadge status={order.status} />
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="font-bold text-lg">{formatCurrency(order.total_amount)}</p>
                </div>
              </div>
              <div className="text-center mt-2">
                <button onClick={() => toggleExpand(order.id)} className="text-sm text-primary font-semibold hover:underline">
                  {expandedOrderId === order.id ? 'Ocultar Detalles' : 'Ver Detalles'}
                </button>
              </div>

              {/* Detalles Expandibles del Pedido */}
              {expandedOrderId === order.id && (
                <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Columna de Artículos */}
                  <div>
                    <h4 className="font-semibold mb-2">Artículos en este pedido:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {(order.items || []).map((item, index) => (
                        <li key={index}>
                          <span className="font-medium">
                            ({item.quantity}x) {item.product_name}
                            {/* --- ¡AQUÍ ESTÁ LA MEJORA! --- */}
                            {/* Mostramos el color del producto si está disponible en los datos */}
                            {item.color && <span className="text-gray-500"> ({item.color})</span>}
                          </span>
                          <span> - {formatCurrency(item.unit_price)} c/u</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {/* Columna de Dirección y Envío */}
                  <div>
                     <h4 className="font-semibold mb-2">Detalles de Envío</h4>
                     {order.shipping_address?.street_address ? (
                        <address className="not-italic text-sm text-gray-700">
                            {order.shipping_address.street_address}<br/>
                            {order.shipping_address.address_line_2 && <>{order.shipping_address.address_line_2}<br/></>}
                            Col. {order.shipping_address.colonia}<br/>
                            {order.shipping_address.city}, {order.shipping_address.state}, C.P. {order.shipping_address.zip_code}
                        </address>
                     ) : <p className="text-sm text-gray-500">No hay dirección de envío registrada.</p>}
                      {order.tracking_number && (
                        <p className="mt-2 text-sm"><strong>Guía de seguimiento:</strong> <span className="font-mono bg-gray-200 px-2 py-1 rounded">{order.tracking_number}</span></p>
                      )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderHistory;