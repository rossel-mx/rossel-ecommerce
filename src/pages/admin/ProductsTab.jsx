/**
 * @file ProductsTab.jsx  
 * @description Pestaña principal de gestión de productos con dos modos:
 * 1. Carga Individual - Para productos ocasionales (con transformaciones Cloudinary)
 * 2. Carga Masiva - Para setup inicial (sin transformaciones, 0 tokens)
 * ✅ ACTUALIZADO: Modal moderno y elegante para eliminación de productos.
 * 🔥 NUEVO: Navegación automática desde validación SKU en ProductForm
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import { FiUser, FiPackage, FiTrash2, FiAlertTriangle, FiImage, FiLayers } from 'react-icons/fi';
import ProductList from "./ProductList";
import ProductForm from "./ProductForm";
import MassiveUpload from "./MassiveUpload/MassiveUpload";

const ProductsTab = () => {
  // --- ESTADOS ---
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('individual'); // 'individual' | 'massive'
  
  // 🆕 ESTADOS PARA MODAL DE ELIMINACIÓN
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // --- LÓGICA DE DATOS ---
  
  const fetchProductsWithVariants = useCallback(async () => {
    console.log("LOG: [ProductsTab] Iniciando carga/recarga de productos con variantes...");
    try {
      const { data, error } = await supabase.rpc('get_products_with_variants');
      if (error) throw error;

      setProducts(data || []);
      console.log("LOG: [ProductsTab] Productos con variantes cargados exitosamente:", data);

    } catch (error) {
      toast.error(error.message || "Error al cargar el inventario.");
      console.error("ERROR: [ProductsTab] Error al cargar productos:", error);
    } finally {
      if (loading) setLoading(false);
    }
  }, [loading]);

  // --- EFECTOS ---

  useEffect(() => {
    fetchProductsWithVariants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    console.log("LOG: [ProductsTab] Configurando suscripciones en tiempo real...");
    
    const handleDbChange = (payload) => {
      console.log('LOG: [ProductsTab] ¡Cambio en tiempo real detectado!', payload);
      toast.success("El inventario se ha actualizado.");
      fetchProductsWithVariants();
    };

    // 🔥 NUEVO: Listener para navegación desde validación SKU
    const handleEditBySku = (event) => {
      const productId = event.detail.productId;
      console.log(`LOG: [ProductsTab] Navegación SKU solicitada para producto ID: ${productId}`);
      
      const product = products.find(p => p.id === productId);
      if (product) {
        console.log(`LOG: [ProductsTab] Producto encontrado: ${product.name}, iniciando edición...`);
        handleEdit(product);
        toast.success(`🔍 Navegando a: ${product.name}`);
      } else {
        console.error(`ERROR: [ProductsTab] Producto con ID ${productId} no encontrado`);
        toast.error('Producto no encontrado en la lista actual');
      }
    };

    const channel = supabase.channel('products-variants-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, handleDbChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_variants' }, handleDbChange)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('LOG: [ProductsTab] ¡Conectado al canal de Realtime!');
        }
      });

    // 🔥 NUEVO: Agregar listener del evento personalizado
    window.addEventListener('editProductBySku', handleEditBySku);
      
    return () => {
      console.log("LOG: [ProductsTab] Desmontando. Limpiando suscripciones...");
      supabase.removeChannel(channel);
      // 🔥 NUEVO: Limpiar listener del evento personalizado
      window.removeEventListener('editProductBySku', handleEditBySku);
    };
  }, [fetchProductsWithVariants, products]); // 🔥 IMPORTANTE: Agregar 'products' a dependencies

  // --- MANEJADORES DE EVENTOS ---

  const handleFormSuccess = () => {
    console.log("LOG: [ProductsTab] El formulario reportó éxito o se canceló la edición.");
    setEditingProduct(null);
    fetchProductsWithVariants();
  };

  const handleMassiveUploadSuccess = () => {
    console.log("LOG: [ProductsTab] Carga masiva completada exitosamente.");
    fetchProductsWithVariants();
    toast.success("¡Carga masiva completada! Cambiando a vista de lista...");
    // Cambiar a pestaña individual para ver los productos cargados
    setTimeout(() => setActiveTab('individual'), 2000);
  };

  const handleEdit = (product) => {
    console.log("LOG: [ProductsTab] Iniciando edición de producto:", product);
    
    if (!product || !product.id) {
      console.error("ERROR: [ProductsTab] Producto inválido para edición:", product);
      toast.error("Error: Producto inválido para edición");
      return;
    }

    const formattedProduct = {
      id: product.id,
      sku: product.sku || '',
      name: product.name || '',
      description: product.description || '',
      category: product.category || '',
      variants: product.variants?.map(variant => ({
        variant_id: variant.id || variant.variant_id,
        color: variant.color || '',
        stock: variant.stock || 0,
        price: variant.price || '',
        price_menudeo: variant.price_menudeo || '',
        price_mayoreo: variant.price_mayoreo || '',
        image_urls: variant.image_urls || [],
        newImageFiles: []
      })) || []
    };

    console.log("LOG: [ProductsTab] Producto formateado para edición:", formattedProduct);
    
    setEditingProduct(formattedProduct);
    setActiveTab('individual'); // Cambiar a pestaña individual para editar
    
    // Scroll hacia arriba
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    console.log("LOG: [ProductsTab] Cancelando edición...");
    setEditingProduct(null);
    toast.success("Edición cancelada");
  };
  
  // --- 🆕 FUNCIONES DE MODAL DE ELIMINACIÓN ---

  /**
   * Inicia el proceso de eliminación mostrando el modal moderno
   */
  const handleDelete = (productId) => {
    const productToDelete = products.find(p => p.id === productId);
    if (!productToDelete) {
      console.error("ERROR: [ProductsTab] Producto no encontrado para eliminación:", productId);
      toast.error("Error: Producto no encontrado");
      return;
    }

    console.log("LOG: [ProductsTab] Iniciando proceso de eliminación para producto:", productToDelete);
    setProductToDelete(productToDelete);
    setShowDeleteModal(true);
    setDeleteConfirmation('');
    setIsDeleting(false);
  };

  /**
   * Cancela el proceso de eliminación
   */
  const handleCancelDelete = () => {
    console.log("LOG: [ProductsTab] Usuario canceló eliminación");
    setShowDeleteModal(false);
    setProductToDelete(null);
    setDeleteConfirmation('');
    setIsDeleting(false);
  };

  /**
   * Confirma y ejecuta la eliminación del producto
   */
  const handleConfirmDelete = async () => {
    if (!productToDelete) {
      console.error("ERROR: [ProductsTab] No hay producto seleccionado para eliminar");
      return;
    }

    // Verificación de confirmación de texto
    const expectedText = `ELIMINAR ${productToDelete.name.toUpperCase()}`;
    if (deleteConfirmation !== expectedText) {
      console.log("LOG: [ProductsTab] Texto de confirmación incorrecto:", deleteConfirmation, "vs", expectedText);
      toast.error('❌ El texto de confirmación no coincide exactamente');
      return;
    }

    console.log("LOG: [ProductsTab] Confirmación válida, procediendo con eliminación...");
    setIsDeleting(true);
    setIsActionLoading(true);

    try {
      const allImageUrls = (productToDelete.variants || []).flatMap(variant => variant.image_urls || []);
      console.log("LOG: [ProductsTab] Imágenes a eliminar de Cloudinary:", allImageUrls);

      if (allImageUrls.length > 0) {
        console.log("LOG: [ProductsTab] Invocando 'delete-cloudinary-images'...");
        const { data: cloudinaryResult, error: functionError } = await supabase.functions.invoke('delete-cloudinary-images', { 
          body: { imageUrls: allImageUrls } 
        });
        
        if (functionError) {
          console.warn("WARN: [ProductsTab] Error al eliminar imágenes de Cloudinary:", functionError);
          toast.error("⚠️ Error al eliminar imágenes de Cloudinary, pero el producto se eliminará");
        } else {
          console.log("LOG: [ProductsTab] Imágenes eliminadas exitosamente de Cloudinary:", cloudinaryResult);
        }
      } else {
        console.log("LOG: [ProductsTab] No hay imágenes para eliminar");
      }

      console.log(`LOG: [ProductsTab] Eliminando producto ID: ${productToDelete.id} de la base de datos...`);
      const { error: deleteError } = await supabase.from('products').delete().eq('id', productToDelete.id);
      if (deleteError) {
        console.error("ERROR: [ProductsTab] Error al eliminar producto de BD:", deleteError);
        throw deleteError;
      }

      console.log("LOG: [ProductsTab] Producto eliminado exitosamente de la base de datos");

      // Limpiar estado de edición si era el producto que se estaba editando
      if (editingProduct && editingProduct.id === productToDelete.id) {
        console.log("LOG: [ProductsTab] Limpiando estado de edición del producto eliminado");
        setEditingProduct(null);
      }

      // Actualizar lista local de productos
      setProducts(prevProducts => prevProducts.filter(p => p.id !== productToDelete.id));

      // Cerrar modal y mostrar éxito
      setShowDeleteModal(false);
      setProductToDelete(null);
      setDeleteConfirmation('');
      
      toast.success(`✅ Producto "${productToDelete.name}" eliminado completamente`);
      console.log("LOG: [ProductsTab] Proceso de eliminación completado exitosamente");

    } catch (error) {
      console.error("ERROR: [ProductsTab] Error durante eliminación:", error);
      toast.error(`❌ Error al eliminar producto: ${error.message}`);
    } finally {
      setIsDeleting(false);
      setIsActionLoading(false);
    }
  };

  // --- FUNCIONES AUXILIARES ---
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);
  };

  const getTotalStock = (product) => {
    return product.variants?.reduce((sum, variant) => sum + (parseInt(variant.stock) || 0), 0) || 0;
  };

  const getTotalImages = (product) => {
    return product.variants?.flatMap(v => v.image_urls || []).length || 0;
  };

  // --- RENDERIZADO ---
  return (
    <div className="p-4">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-2xl font-bold mb-2">Gestión de Inventario</h3>
        <p className="text-gray-600">
          Gestiona tu inventario de forma individual o mediante carga masiva
        </p>
      </div>
      
      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('individual')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'individual'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <FiUser className="w-4 h-4" />
                Carga Individual
              </div>
            </button>
            <button
              onClick={() => setActiveTab('massive')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'massive'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <FiPackage className="w-4 h-4" />
                Carga Masiva
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'individual' && (
        <div>
          {/* Indicador de edición */}
          {editingProduct && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex justify-between items-center">
                <p className="text-blue-800 font-medium">
                  📝 Editando: <strong>{editingProduct.name}</strong>
                </p>
                <button 
                  onClick={handleCancelEdit}
                  className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600 transition"
                >
                  ✕ Cancelar
                </button>
              </div>
            </div>
          )}
          
          {/* Formulario individual */}
          <ProductForm 
            onFormSubmit={handleFormSuccess} 
            editingProduct={editingProduct}
            key={editingProduct ? `edit-${editingProduct.id}` : 'create'}
          />
          
          {/* Lista de productos */}
          {loading ? (
            <p className="text-center py-10">Cargando inventario...</p>
          ) : (
            <ProductList 
              products={products}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isActionLoading={isActionLoading}
              editingProductId={editingProduct?.id}
            />
          )}
        </div>
      )}

      {activeTab === 'massive' && (
        <div>
          <MassiveUpload onUploadSuccess={handleMassiveUploadSuccess} />
        </div>
      )}

      {/* 🆕 MODAL MODERNO DE ELIMINACIÓN */}
      {showDeleteModal && productToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-300">
            
            {/* Header del modal */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <FiAlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Eliminar Producto</h3>
                <p className="text-sm text-gray-500">Esta acción no se puede deshacer</p>
              </div>
            </div>

            {/* Información del producto */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 mb-6 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FiTrash2 className="w-4 h-4 text-red-500" />
                Producto a eliminar:
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Nombre:</span>
                  <span className="text-gray-900 font-semibold">{productToDelete.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">SKU:</span>
                  <span className="text-gray-900 font-mono">{productToDelete.sku}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600 flex items-center gap-1">
                    <FiLayers className="w-3 h-3" />
                    Variantes:
                  </span>
                  <span className="text-gray-900 font-semibold">{productToDelete.variants?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Stock total:</span>
                  <span className="text-gray-900 font-semibold">{getTotalStock(productToDelete)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600 flex items-center gap-1">
                    <FiImage className="w-3 h-3" />
                    Imágenes:
                  </span>
                  <span className="text-gray-900 font-semibold">{getTotalImages(productToDelete)}</span>
                </div>
              </div>
            </div>

            {/* Advertencias */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <h4 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                ⚠️ Esta acción eliminará permanentemente:
              </h4>
              <ul className="text-sm text-red-700 space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0"></span>
                  El producto base y todas sus variantes de color
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0"></span>
                  Todas las imágenes de Cloudinary ({getTotalImages(productToDelete)} imágenes)
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0"></span>
                  Datos de stock, precios y configuración
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0"></span>
                  Historial de ventas relacionado
                </li>
              </ul>
            </div>

            {/* Confirmación por texto */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Para confirmar, escribe exactamente: 
                <span className="block font-bold text-red-600 bg-red-50 px-2 py-1 rounded mt-1">
                  ELIMINAR {productToDelete.name.toUpperCase()}
                </span>
              </label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                placeholder={`ELIMINAR ${productToDelete.name.toUpperCase()}`}
                disabled={isDeleting}
              />
              {deleteConfirmation && deleteConfirmation !== `ELIMINAR ${productToDelete.name.toUpperCase()}` && (
                <p className="text-xs text-red-500 mt-1">❌ El texto no coincide exactamente</p>
              )}
            </div>

            {/* Botones */}
            <div className="flex gap-3">
              <button
                onClick={handleCancelDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteConfirmation !== `ELIMINAR ${productToDelete.name.toUpperCase()}` || isDeleting}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Eliminando...
                  </>
                ) : (
                  <>
                    <FiTrash2 className="w-4 h-4" />
                    Eliminar Producto
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsTab;