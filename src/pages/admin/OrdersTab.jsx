/**
 * @file OrdersTab.jsx
 * @description Panel de gestión de pedidos para el administrador con SKU incluido.
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
      if (rpcError) {
        console.error("ERROR: [OrdersTab] Error RPC:", rpcError);
        throw rpcError;
      }
      console.log("LOG: [OrdersTab] Órdenes detalladas recibidas:", data);
      setOrders(data || []);
    } catch (err) {
      setError(err.message);
      console.error("ERROR: [OrdersTab] Error al cargar órdenes:", err);
      toast.error("No se pudieron cargar las órdenes: " + err.message);
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
      
      // Header del documento
      doc.setFontSize(20);
      doc.text("Checklist de Empaque - Rossel", 14, 22);
      
      // Información del pedido
      doc.setFontSize(12);
      doc.text(`Pedido ID: #${order.id}`, 14, 32);
      doc.text(`Cliente: ${order.client_name}`, 14, 38);
      doc.text(`Fecha: ${new Date(order.created_at).toLocaleDateString('es-MX')}`, 14, 44);
      doc.text(`Estado: ${order.status.toUpperCase()}`, 14, 50);

      // Tabla de productos con SKU
      const tableColumn = ["Cant.", "SKU", "Producto", "Color", "Verificado"];
      const tableRows = [];
      
      (order.items || []).forEach(item => {
        tableRows.push([
          item.quantity.toString(),
          item.sku || 'N/A',
          item.product_name,
          item.color || 'N/A',
          '[  ]'  // Checkbox para marcar como verificado
        ]);
      });

      // Configuración de la tabla
      autoTable(doc, { 
        head: [tableColumn], 
        body: tableRows, 
        startY: 60,
        styles: {
          fontSize: 10,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [184, 28, 28], // Color primary de Rossel
          textColor: 255,
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 20 }, // Cantidad
          1: { halign: 'center', cellWidth: 30 }, // SKU
          2: { cellWidth: 60 }, // Producto
          3: { halign: 'center', cellWidth: 30 }, // Color
          4: { halign: 'center', cellWidth: 25 } // Checkbox
        }
      });

      // Footer con instrucciones
      const finalY = doc.lastAutoTable.finalY + 20;
      doc.setFontSize(10);
      doc.text("Instrucciones:", 14, finalY);
      doc.text("• Verificar cada producto contra este checklist", 14, finalY + 8);
      doc.text("• Marcar la casilla 'Verificado' al confirmar el producto", 14, finalY + 16);
      doc.text("• Verificar que el color y SKU coincidan exactamente", 14, finalY + 24);
      
      // Firma
      doc.text("Empacado por: ________________________", 14, finalY + 40);
      doc.text("Fecha: _______________", 14, finalY + 50);

      const fileName = `Checklist-Rossel-Pedido-${order.id}.pdf`;
      doc.save(fileName);
      console.log(`LOG: [OrdersTab] Checklist con SKU generado y descargado como "${fileName}".`);
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
        orientation: 'portrait',
        unit: 'mm',
        format: [100, 150] // Tamaño estándar de etiqueta
      });

      const sender = {
        name: "Rossel Tienda",
        address: "Av. Siempre Viva 123, Col. Centro",
        city: "Guadalajara, Jalisco, C.P. 44100",
        country: "México",
        phone: "+52 33 1234 5678"
      };

      const recipient = order.shipping_address;
      if (!recipient?.street_address) {
        toast.error("No se puede generar la etiqueta. Falta la dirección de envío en este pedido.");
        return;
      }

      // Colores de Rossel
      const primaryColor = [184, 28, 28]; // Color primary
      const lightGray = [245, 245, 245];
      const darkGray = [75, 85, 99];

      // === HEADER CON LOGO ===
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 100, 25, 'F');
      
      // Logo/Texto de marca
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.text("ROSSEL", 50, 12, { align: 'center' });
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text("Tienda en Línea", 50, 18, { align: 'center' });

      // === SECCIÓN REMITENTE ===
      doc.setFillColor(...lightGray);
      doc.rect(5, 30, 90, 25, 'F');
      
      doc.setTextColor(...darkGray);
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.text("REMITENTE:", 8, 36);
      
      doc.setFont(undefined, 'normal');
      doc.setFontSize(7);
      doc.text(sender.name, 8, 41);
      doc.text(sender.address, 8, 45);
      doc.text(sender.city, 8, 49);
      doc.text(`Tel: ${sender.phone}`, 8, 53);

      // === INFORMACIÓN DEL PEDIDO ===
      doc.setFillColor(...primaryColor);
      doc.rect(5, 60, 90, 12, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text(`PEDIDO #${order.id}`, 50, 68, { align: 'center' });

      // === SECCIÓN DESTINATARIO ===
      doc.setTextColor(...darkGray);
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text("DESTINATARIO:", 8, 82);

      // Nombre del cliente destacado
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(0.5);
      doc.rect(5, 85, 90, 8, 'FD');
      
      doc.setTextColor(...primaryColor);
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(order.client_name || 'Cliente', 50, 90, { align: 'center' });

      // Dirección del destinatario
      doc.setTextColor(...darkGray);
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      
      let yPos = 100;
      doc.text(recipient.street_address, 8, yPos);
      yPos += 5;
      
      if (recipient.address_line_2) {
        doc.text(recipient.address_line_2, 8, yPos);
        yPos += 5;
      }
      
      doc.text(`Col. ${recipient.colonia}`, 8, yPos);
      yPos += 5;
      
      doc.text(`${recipient.city}, ${recipient.state}`, 8, yPos);
      yPos += 5;
      
      doc.setFont(undefined, 'bold');
      doc.text(`C.P. ${recipient.zip_code}`, 8, yPos);
      yPos += 5;
      
      doc.text(recipient.country || 'México', 8, yPos);

      // === CÓDIGOS DE BARRAS SIMULADOS ===
      doc.setFillColor(...darkGray);
      doc.rect(8, 130, 25, 8, 'F');
      doc.rect(38, 130, 25, 8, 'F');
      doc.rect(68, 130, 25, 8, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6);
      doc.text(`#${order.id}`, 20, 135, { align: 'center' });
      doc.text(recipient.zip_code, 50, 135, { align: 'center' });
      doc.text(new Date().getFullYear().toString(), 80, 135, { align: 'center' });

      // === FOOTER ===
      doc.setTextColor(...darkGray);
      doc.setFontSize(6);
      doc.text(`Generado: ${new Date().toLocaleDateString('es-MX')} ${new Date().toLocaleTimeString('es-MX')}`, 50, 145, { align: 'center' });

      // === NÚMERO DE SEGUIMIENTO (si existe) ===
      if (order.tracking_number) {
        doc.setFillColor(...primaryColor);
        doc.rect(5, 140, 90, 5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont(undefined, 'bold');
        doc.text(`TRACKING: ${order.tracking_number}`, 50, 143, { align: 'center' });
      }

      const fileName = `Etiqueta-Rossel-Pedido-${order.id}.pdf`;
      doc.save(fileName);
      console.log(`LOG: [OrdersTab] Etiqueta moderna generada y descargada como "${fileName}".`);
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
                          <div className="space-y-2">
                            {(order.items || []).map((item, index) => (
                              <div key={index} className="bg-white p-3 rounded border text-sm">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      <span className="bg-gray-100 px-2 py-1 rounded text-xs font-mono mr-2">
                                        {item.sku || 'N/A'}
                                      </span>
                                      {item.product_name}
                                    </p>
                                    <p className="text-gray-600 mt-1">
                                      Color: {item.color || 'N/A'} • Cantidad: {item.quantity}
                                    </p>
                                  </div>
                                  <p className="font-medium text-gray-900">
                                    {formatCurrency(item.unit_price)} c/u
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap justify-end gap-4 mt-4 border-t pt-4">
                        <button onClick={() => handlePrintChecklist(order)} className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition text-sm font-semibold">
                          📋 Imprimir Checklist
                        </button>
                        <button onClick={() => handleGenerateShippingLabel(order)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-semibold">
                          🏷️ Generar Etiqueta de Envío
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