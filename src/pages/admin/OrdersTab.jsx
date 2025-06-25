/**
 * @file OrdersTab.jsx
 * @description Panel de gestión de pedidos para el administrador. Esta es la versión final y robusta que incluye:
 * - Visualización detallada de órdenes (con artículos, color y dirección).
 * - Gestión completa del ciclo de vida del pedido (actualización de estado).
 * - Capacidad de añadir un número de seguimiento.
 * - Generación de un PDF imprimible con el checklist de empaque.
 * - Generación de un PDF imprimible con la etiqueta de envío.
 * - Documentación completa y logs de consola para facilitar el mantenimiento y la depuración.
 *
 * @requires react
 * @requires supabaseClient
 * @requires react-hot-toast
 * @requires jspdf
 * @requires jspdf-autotable
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import toast, { Toaster } from "react-hot-toast";

// Importamos la librería principal y la función autoTable para el PDF.
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


/**
 * @name StatusBadge
 * @description Un sub-componente para mostrar una etiqueta de estado con colores.
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


const OrdersTab = () => {
  // --- ESTADOS ---
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // --- LÓGICA DE DATOS ---
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    console.log("LOG: [OrdersTab] Iniciando fetchOrders...");
    try {
      const { data, error: rpcError } = await supabase.rpc('get_admin_order_details');
      if (rpcError) throw rpcError;
      console.log("LOG: [OrdersTab] Órdenes detalladas recibidas:", data);
      setOrders(data || []);
    } catch (err) {
      setError(err.message);
      console.error("ERROR: [OrdersTab] Error al cargar órdenes:", err);
      toast.error("No se pudieron cargar las órdenes.");
    } finally {
      setLoading(false);
      console.log("LOG: [OrdersTab] fetchOrders finalizado.");
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);
  
  // --- MANEJADORES DE EVENTOS ---
  
  const handleUpdateStatus = async (orderId, newStatus) => {
    console.log(`LOG: [OrdersTab] Intentando actualizar orden #${orderId} a estado "${newStatus}"`);
    let updateData = { status: newStatus };
    
    if (newStatus === 'shipped') {
      const trackingNumber = window.prompt("Por favor, introduce el número de seguimiento (guía):");
      if (!trackingNumber) {
        toast.error("Actualización cancelada. Se requiere un número de seguimiento.");
        return;
      }
      updateData.tracking_number = trackingNumber;
      updateData.completed_at = new Date().toISOString();
    }
    
    if (newStatus === 'processing') {
      updateData.processing_at = new Date().toISOString();
    }

    try {
      const { error } = await supabase.from('orders').update(updateData).eq('id', orderId);
      if (error) throw error;
      toast.success(`Orden #${orderId} actualizada.`);
      fetchOrders();
    } catch (error) {
      console.error("ERROR: [OrdersTab] Error al actualizar estado:", error);
      toast.error(error.message);
    }
  };

  /**
   * Genera y descarga un PDF con el checklist de productos de una orden.
   * @param {object} order - El objeto completo de la orden.
   */
  const handlePrintChecklist = (order) => {
    console.log(`LOG: [OrdersTab] Generando checklist en PDF para la orden #${order.id}`);
    try {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text("Checklist de Empaque - Rossel", 14, 22);
      doc.setFontSize(12);
      doc.text(`Pedido ID: #${order.id}`, 14, 32);
      doc.text(`Cliente: ${order.client_name}`, 14, 38);
      doc.text(`Fecha: ${new Date(order.created_at).toLocaleDateString('es-MX')}`, 14, 44);

      const tableColumn = ["Cant.", "Producto", "Color", "OK"];
      const tableRows = [];
      (order.items || []).forEach(item => {
        tableRows.push([item.quantity, item.product_name, item.color || 'N/A', '[  ]']);
      });

      autoTable(doc, { head: [tableColumn], body: tableRows, startY: 55 });
      const fileName = `Checklist-Rossel-Pedido-${order.id}.pdf`;
      doc.save(fileName);
      console.log(`LOG: [OrdersTab] Checklist generado y descargado como "${fileName}".`);
    } catch (error) {
      console.error("ERROR: [OrdersTab] No se pudo generar el PDF del checklist:", error);
      toast.error("No se pudo generar el checklist.");
    }
  };

  /**
   * Genera y descarga un PDF con la etiqueta de envío de una orden.
   * @param {object} order - El objeto completo de la orden.
   */
  const handleGenerateShippingLabel = (order) => {
    console.log(`LOG: [OrdersTab] Generando etiqueta de envío para la orden #${order.id}`);
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [100, 150]
      });

      const sender = {
        name: "Rossel Tienda",
        address: "Av. Siempre Viva 123, Col. Centro",
        city: "Guadalajara, Jalisco, C.P. 44100",
        country: "México"
      };

      const recipient = order.shipping_address;
      if (!recipient?.street_address) {
        toast.error("No se puede generar la etiqueta. Falta la dirección de envío en este pedido.");
        return;
      }

      doc.rect(5, 5, 140, 90);
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text("DE:", 10, 15);
      doc.setFont(undefined, 'normal');
      doc.text(sender.name, 20, 15);
      doc.text(sender.address, 10, 20);
      doc.text(sender.city, 10, 25);
      doc.line(10, 35, 135, 35);
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text("PARA:", 10, 45);
      doc.setFontSize(14);
      doc.text(`${recipient.street_address}`, 10, 55);
      if (recipient.address_line_2) doc.text(recipient.address_line_2, 10, 62);
      doc.text(`Col. ${recipient.colonia}`, 10, 69);
      doc.text(`${recipient.city}, ${recipient.state}`, 10, 76);
      doc.text(`C.P. ${recipient.zip_code}, ${recipient.country}`, 10, 83);
      doc.setFontSize(10);
      doc.text(`Cliente: ${order.client_name}`, 10, 90);

      const fileName = `Etiqueta-Rossel-Pedido-${order.id}.pdf`;
      doc.save(fileName);
      console.log(`LOG: [OrdersTab] Etiqueta generada y descargada como "${fileName}".`);
    } catch (error) {
      console.error("ERROR: [OrdersTab] No se pudo generar la etiqueta de envío:", error);
      toast.error("No se pudo generar la etiqueta.");
    }
  };

  const toggleExpand = (orderId) => setExpandedOrderId(prevId => prevId === orderId ? null : orderId);
  const formatCurrency = (amount) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);

  if (loading) return <p className="text-center py-10">Cargando pedidos...</p>;
  if (error) return <p className="text-center text-red-500 py-10">Error: {error}</p>;

  return (
    <div className="overflow-x-auto">
      <Toaster position="top-right" />
      <h2 className="text-2xl font-bold mb-4">Gestión de Pedidos</h2>
      <table className="min-w-full bg-white rounded-lg overflow-hidden shadow">
        <thead className="bg-gray-100 text-left text-sm text-gray-600">
          <tr>
            <th className="py-2 px-4 w-12"></th>
            <th className="py-2 px-4">Pedido</th>
            <th className="py-2 px-4">Cliente</th>
            <th className="py-2 px-4">Fecha</th>
            <th className="py-2 px-4">Estado</th>
            <th className="py-2 px-4 text-right">Total</th>
            <th className="py-2 px-4 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 ? (
            <tr><td colSpan="7" className="text-center py-8 text-gray-500">No hay pedidos registrados por el momento.</td></tr>
          ) : (
            orders.map((order) => (
              <>
                <tr key={order.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 text-center"><button onClick={() => toggleExpand(order.id)} className="text-primary text-xl font-bold">{expandedOrderId === order.id ? '−' : '+'}</button></td>
                  <td className="py-3 px-4 font-mono">#{order.id}</td>
                  <td className="py-3 px-4 font-medium">{order.client_name || 'N/A'}</td>
                  <td className="py-3 px-4 text-sm">{new Date(order.created_at).toLocaleString('es-MX')}</td>
                  <td className="py-3 px-4"><StatusBadge status={order.status} /></td>
                  <td className="py-3 px-4 text-right font-mono text-base">{formatCurrency(order.total_amount)}</td>
                  <td className="py-3 px-4 text-center space-x-2 whitespace-nowrap">
                    {order.status === 'pending' && <button onClick={() => handleUpdateStatus(order.id, 'processing')} className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600">Procesar</button>}
                    {order.status === 'processing' && <button onClick={() => handleUpdateStatus(order.id, 'shipped')} className="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600">Marcar como Enviado</button>}
                  </td>
                </tr>
                {expandedOrderId === order.id && (
                  <tr className="bg-gray-100">
                    <td colSpan="7" className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-bold mb-2">Detalles del Cliente y Envío</h4>
                          {order.shipping_address?.street_address ? (
                            <div className="text-sm text-gray-700">
                              <p><strong>Cliente:</strong> {order.client_name}</p>
                              <p><strong>Email:</strong> {order.client_email}</p>
                              <p className="mt-2"><strong>Dirección de Envío:</strong></p>
                              <address className="not-italic border-l-2 border-primary pl-2 mt-1">
                                {order.shipping_address.street_address}<br/>
                                {order.shipping_address.address_line_2 && <>{order.shipping_address.address_line_2}<br/></>}
                                Col. {order.shipping_address.colonia}<br/>
                                {order.shipping_address.city}, {order.shipping_address.state}, C.P. {order.shipping_address.zip_code}
                              </address>
                            </div>
                          ) : <p className="text-sm text-gray-500">No hay dirección de envío registrada.</p>}
                           {order.tracking_number && (<p className="mt-2 text-sm"><strong>Guía de seguimiento:</strong> <span className="font-mono bg-gray-200 px-2 py-1 rounded">{order.tracking_number}</span></p>)}
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Artículos en este pedido:</h4>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {(order.items || []).map((item, index) => (
                              <li key={index}>
                                <span className="font-medium">({item.quantity}x) {item.product_name}</span>
                                {item.color && <span className="text-gray-500"> ({item.color})</span>}
                                <span> - {formatCurrency(item.unit_price)} c/u</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div className="flex flex-wrap justify-end gap-4 mt-4 border-t pt-4">
                        <button onClick={() => handlePrintChecklist(order)} className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition text-sm font-semibold">
                          Imprimir Checklist
                        </button>
                        <button onClick={() => handleGenerateShippingLabel(order)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-semibold">
                          Generar Etiqueta de Envío
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default OrdersTab;