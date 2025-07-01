/**
 * @file OrdersTab.jsx - VERSIÓN MODERNA
 * @description Panel de gestión de pedidos con modal moderno para tracking y eliminación segura
 * UPDATED: Modal moderno para tracking number y botón de eliminación con doble confirmación
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import { 
  FiTrash2, 
  FiTruck, 
  FiX, 
  FiAlertTriangle, 
  FiPackage,
  FiPrinter,
  FiTag,
  FiEye,
  FiEyeOff
} from "react-icons/fi";

// Importamos la librería principal y la función autoTable para el PDF.
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * @name StatusBadge
 * @description Un sub-componente para mostrar una etiqueta de estado con colores.
 */
const StatusBadge = ({ status }) => {
  const baseClasses = "px-3 py-1.5 text-xs font-semibold rounded-full capitalize";
  let specificClasses = "";
  let icon = "";
  
  switch (status) {
    case 'pending': 
      specificClasses = 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      icon = "⏳";
      break;
    case 'processing': 
      specificClasses = 'bg-blue-100 text-blue-800 border border-blue-200';
      icon = "🔄";
      break;
    case 'shipped': 
      specificClasses = 'bg-green-100 text-green-800 border border-green-200';
      icon = "🚚";
      break;
    case 'delivered': 
      specificClasses = 'bg-teal-100 text-teal-800 border border-teal-200';
      icon = "✅";
      break;
    default: 
      specificClasses = 'bg-gray-100 text-gray-800 border border-gray-200';
      icon = "❓";
  }
  
  return (
    <span className={`${baseClasses} ${specificClasses} inline-flex items-center gap-1`}>
      <span>{icon}</span>
      {status}
    </span>
  );
};

/**
 * @name TrackingModal
 * @description Modal moderno para ingresar número de tracking
 */
const TrackingModal = ({ isOpen, onClose, onConfirm, orderNumber }) => {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!trackingNumber.trim()) {
      toast.error("Por favor ingresa un número de seguimiento válido");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onConfirm(trackingNumber.trim());
      setTrackingNumber("");
      onClose();
    } catch (error) {
      console.error("Error al procesar tracking:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setTrackingNumber("");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-t-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <FiTruck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Marcar como Enviado</h3>
                <p className="text-green-100 text-sm">Pedido #{orderNumber}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Número de Seguimiento / Guía
            </label>
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Ej: 1Z999AA1234567890"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all text-lg font-mono"
              disabled={isSubmitting}
              autoFocus
            />
            <p className="text-gray-500 text-sm mt-2">
              Este número será enviado al cliente para el seguimiento del envío
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !trackingNumber.trim()}
              className="flex-1 px-4 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <FiTruck className="w-4 h-4" />
                  Marcar como Enviado
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/**
 * @name DeleteConfirmModal
 * @description Modal de confirmación para eliminar órdenes con doble seguridad
 */
const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, orderNumber }) => {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const expectedText = `ELIMINAR-${orderNumber}`;

  const handleDelete = async () => {
    if (confirmText !== expectedText) {
      toast.error("El texto de confirmación no coincide");
      return;
    }
    
    setIsDeleting(true);
    try {
      await onConfirm();
      setConfirmText("");
      onClose();
    } catch (error) {
      console.error("Error al eliminar:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setConfirmText("");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-t-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <FiAlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Eliminar Pedido</h3>
                <p className="text-red-100 text-sm">Acción irreversible</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isDeleting}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <FiAlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-800 mb-1">¡Advertencia!</h4>
                <p className="text-red-700 text-sm">
                  Estás a punto de eliminar permanentemente el pedido #{orderNumber}. 
                  Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Para confirmar, escribe: <code className="bg-gray-100 px-2 py-1 rounded font-mono text-red-600">{expectedText}</code>
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={expectedText}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all font-mono"
              disabled={isDeleting}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isDeleting}
              className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting || confirmText !== expectedText}
              className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <FiTrash2 className="w-4 h-4" />
                  Eliminar Pedido
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const OrdersTab = () => {
  // --- ESTADOS ---
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  
  // Estados para modales
  const [trackingModal, setTrackingModal] = useState({ isOpen: false, orderId: null, orderNumber: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, orderId: null, orderNumber: null });

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

  // Manejador para abrir modal de tracking
  const handleShippedClick = (orderId, orderNumber) => {
    setTrackingModal({ isOpen: true, orderId, orderNumber });
  };

  // Confirmar tracking y marcar como enviado
  const handleConfirmTracking = async (trackingNumber) => {
    const { orderId } = trackingModal;
    
    const updateData = {
      status: 'shipped',
      tracking_number: trackingNumber,
      completed_at: new Date().toISOString()
    };

    try {
      const { error } = await supabase.from('orders').update(updateData).eq('id', orderId);
      if (error) throw error;
      toast.success(`Orden #${orderId} marcada como enviada con guía: ${trackingNumber}`);
      fetchOrders();
    } catch (error) {
      console.error("ERROR: [OrdersTab] Error al actualizar tracking:", error);
      toast.error("Error al actualizar el tracking: " + error.message);
      throw error;
    }
  };

  // Manejador para abrir modal de eliminación
  const handleDeleteClick = (orderId, orderNumber) => {
    setDeleteModal({ isOpen: true, orderId, orderNumber });
  };

  // Confirmar eliminación
  const handleConfirmDelete = async () => {
    const { orderId } = deleteModal;
    
    try {
      // Primero eliminar order_items
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId);
      
      if (itemsError) throw itemsError;

      // Luego eliminar la orden
      const { error: orderError } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);
      
      if (orderError) throw orderError;

      toast.success(`Orden #${orderId} eliminada correctamente`);
      fetchOrders();
    } catch (error) {
      console.error("ERROR: [OrdersTab] Error al eliminar orden:", error);
      toast.error("Error al eliminar la orden: " + error.message);
      throw error;
    }
  };

  /**
   * Genera y descarga un PDF con el checklist de productos de una orden.
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
      toast.success("Checklist generado correctamente");
    } catch (error) {
      console.error("ERROR: [OrdersTab] No se pudo generar el PDF del checklist:", error);
      toast.error("No se pudo generar el checklist.");
    }
  };

  /**
   * Genera y descarga un PDF con la etiqueta de envío de una orden.
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
      toast.success("Etiqueta de envío generada correctamente");
    } catch (error) {
      console.error("ERROR: [OrdersTab] No se pudo generar la etiqueta de envío:", error);
      toast.error("No se pudo generar la etiqueta.");
    }
  };

  const toggleExpand = (orderId) => setExpandedOrderId(prevId => prevId === orderId ? null : orderId);
  const formatCurrency = (amount) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando pedidos...</p>
      </div>
    </div>
  );
  
  if (error) return (
    <div className="text-center py-20">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <FiAlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      <h3 className="text-xl font-semibold text-gray-800 mb-2">Error al cargar pedidos</h3>
      <p className="text-red-500 mb-4">{error}</p>
      <button 
        onClick={fetchOrders}
        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-red-700 transition-colors"
      >
        Reintentar
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Gestión de Pedidos</h2>
          <p className="text-gray-600 mt-1">Administra y procesa los pedidos de los clientes</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-2xl font-bold text-primary">{orders.length}</div>
          <div className="text-sm text-gray-600">Total Pedidos</div>
        </div>
      </div>

      {/* Tabla moderna */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="py-4 px-6 text-left text-sm font-semibold text-gray-600 w-12"></th>
                <th className="py-4 px-6 text-left text-sm font-semibold text-gray-600">Pedido</th>
                <th className="py-4 px-6 text-left text-sm font-semibold text-gray-600">Cliente</th>
                <th className="py-4 px-6 text-left text-sm font-semibold text-gray-600">Fecha</th>
                <th className="py-4 px-6 text-left text-sm font-semibold text-gray-600">Estado</th>
                <th className="py-4 px-6 text-right text-sm font-semibold text-gray-600">Total</th>
                <th className="py-4 px-6 text-center text-sm font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <FiPackage className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay pedidos</h3>
                      <p className="text-gray-500">No hay pedidos registrados por el momento.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <>
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <button 
                          onClick={() => toggleExpand(order.id)} 
                          className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                        >
                          {expandedOrderId === order.id ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-mono font-semibold text-primary">#{order.id}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-medium text-gray-900">{order.client_name || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{order.client_email || ''}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-900">
                          {new Date(order.created_at).toLocaleDateString('es-MX')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(order.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="font-bold text-lg text-gray-900">{formatCurrency(order.total_amount)}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          {/* Botón Procesar */}
                          {order.status === 'pending' && (
                            <button 
                              onClick={() => handleUpdateStatus(order.id, 'processing')} 
                              className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-semibold hover:bg-blue-600 transition-colors flex items-center gap-1"
                            >
                              🔄 Procesar
                            </button>
                          )}
                          
                          {/* Botón Enviar */}
                          {order.status === 'processing' && (
                            <button 
                              onClick={() => handleShippedClick(order.id, order.id)} 
                              className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-semibold hover:bg-green-600 transition-colors flex items-center gap-1"
                            >
                              <FiTruck className="w-3 h-3" />
                              Enviar
                            </button>
                          )}
                          
                          {/* Botón Eliminar - SIEMPRE VISIBLE EN PRUEBAS */}
                          <button 
                            onClick={() => handleDeleteClick(order.id, order.id)} 
                            className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600 transition-colors flex items-center gap-1"
                          >
                            <FiTrash2 className="w-3 h-3" />
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Fila expandida */}
                    {expandedOrderId === order.id && (
                      <tr className="bg-gradient-to-r from-gray-50 to-white">
                        <td colSpan="7" className="px-6 py-6">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            
                            {/* Información del cliente y envío */}
                            <div className="space-y-6">
                              <div className="bg-white rounded-xl p-6 shadow-sm border">
                                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                                  Información del Cliente
                                </h4>
                                <div className="space-y-3 text-sm">
                                  <div>
                                    <span className="font-medium text-gray-700">Cliente:</span>
                                    <span className="ml-2 text-gray-900">{order.client_name}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-700">Email:</span>
                                    <span className="ml-2 text-gray-900">{order.client_email}</span>
                                  </div>
                                </div>
                              </div>

                              {order.shipping_address?.street_address ? (
                                <div className="bg-white rounded-xl p-6 shadow-sm border">
                                  <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    Dirección de Envío
                                  </h4>
                                  <address className="not-italic text-sm text-gray-700 bg-gray-50 p-4 rounded-lg border-l-4 border-primary">
                                    <div className="space-y-1">
                                      <div>{order.shipping_address.street_address}</div>
                                      {order.shipping_address.address_line_2 && (
                                        <div>{order.shipping_address.address_line_2}</div>
                                      )}
                                      <div>Col. {order.shipping_address.colonia}</div>
                                      <div>{order.shipping_address.city}, {order.shipping_address.state}</div>
                                      <div className="font-semibold">C.P. {order.shipping_address.zip_code}</div>
                                      <div>{order.shipping_address.country || 'México'}</div>
                                    </div>
                                  </address>
                                </div>
                              ) : (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                                  <div className="flex items-center gap-3">
                                    <FiAlertTriangle className="w-5 h-5 text-yellow-600" />
                                    <p className="text-yellow-800 font-medium">No hay dirección de envío registrada</p>
                                  </div>
                                </div>
                              )}

                              {order.tracking_number && (
                                <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                                  <h4 className="font-bold text-green-800 mb-2">Número de Seguimiento</h4>
                                  <div className="font-mono bg-white px-3 py-2 rounded-lg border text-green-700 font-semibold">
                                    {order.tracking_number}
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Productos del pedido */}
                            <div className="space-y-6">
                              <div className="bg-white rounded-xl p-6 shadow-sm border">
                                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  Productos del Pedido
                                </h4>
                                <div className="space-y-4">
                                  {(order.items || []).map((item, index) => (
                                    <div key={index} className="bg-gray-50 rounded-lg p-4 border">
                                      <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-2">
                                            <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-mono font-semibold">
                                              {item.sku || 'N/A'}
                                            </span>
                                            <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-semibold">
                                              Qty: {item.quantity}
                                            </span>
                                          </div>
                                          <h5 className="font-semibold text-gray-900 mb-1">{item.product_name}</h5>
                                          <p className="text-sm text-gray-600">Color: {item.color || 'N/A'}</p>
                                        </div>
                                        <div className="text-right">
                                          <div className="font-bold text-gray-900">{formatCurrency(item.unit_price)}</div>
                                          <div className="text-xs text-gray-500">c/u</div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Botones de acción */}
                              <div className="bg-white rounded-xl p-6 shadow-sm border">
                                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                  Acciones de Pedido
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <button 
                                    onClick={() => handlePrintChecklist(order)} 
                                    className="bg-gray-700 text-white px-4 py-3 rounded-xl hover:bg-gray-800 transition-colors font-semibold flex items-center justify-center gap-2"
                                  >
                                    <FiPrinter className="w-4 h-4" />
                                    Imprimir Checklist
                                  </button>
                                  <button 
                                    onClick={() => handleGenerateShippingLabel(order)} 
                                    className="bg-blue-600 text-white px-4 py-3 rounded-xl hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center gap-2"
                                  >
                                    <FiTag className="w-4 h-4" />
                                    Generar Etiqueta
                                  </button>
                                </div>
                              </div>
                            </div>
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
      </div>

      {/* Modales */}
      <TrackingModal
        isOpen={trackingModal.isOpen}
        onClose={() => setTrackingModal({ isOpen: false, orderId: null, orderNumber: null })}
        onConfirm={handleConfirmTracking}
        orderNumber={trackingModal.orderNumber}
      />

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, orderId: null, orderNumber: null })}
        onConfirm={handleConfirmDelete}
        orderNumber={deleteModal.orderNumber}
      />
    </div>
  );
};

export default OrdersTab;