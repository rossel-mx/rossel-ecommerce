/**
 * @file ProductsTab.jsx  
 * @description Pestaña principal de gestión de productos con dos modos:
 * 1. Carga Individual - Para productos ocasionales (con transformaciones Cloudinary)
 * 2. Carga Masiva - Para setup inicial (sin transformaciones, 0 tokens)
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import { FiUser, FiPackage } from 'react-icons/fi';
import ProductList from "./ProductList";
import ProductForm from "./ProductForm";
import MassiveUpload from "./MassiveUpload";

const ProductsTab = () => {
  // --- ESTADOS ---
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('individual'); // 'individual' | 'massive'

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

    const channel = supabase.channel('products-variants-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, handleDbChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_variants' }, handleDbChange)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('LOG: [ProductsTab] ¡Conectado al canal de Realtime!');
        }
      });
      
    return () => {
      console.log("LOG: [ProductsTab] Desmontando. Limpiando suscripción en tiempo real.");
      supabase.removeChannel(channel);
    };
  }, [fetchProductsWithVariants]);

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
  
  const handleDelete = async (productId) => {
    const productToDelete = products.find(p => p.id === productId);
    if (!productToDelete || !window.confirm(`¿Estás seguro de eliminar "${productToDelete.name}" y TODAS sus variantes de color?\nEsta acción es irreversible.`)) return;

    setIsActionLoading(true);
    toast.loading('Eliminando producto...');
    
    try {
      const allImageUrls = (productToDelete.variants || []).flatMap(variant => variant.image_urls || []);

      if (allImageUrls.length > 0) {
        console.log("LOG: [ProductsTab] Invocando 'delete-cloudinary-images' para:", allImageUrls);
        const { error: functionError } = await supabase.functions.invoke('delete-cloudinary-images', { body: { imageUrls: allImageUrls } });
        if (functionError) {
          console.warn("WARN: [ProductsTab] La función para eliminar imágenes falló:", functionError);
          toast.error("Error al borrar imágenes en la nube, pero el producto se eliminará.");
        }
      }

      console.log(`LOG: [ProductsTab] Eliminando producto padre ID: ${productId} de la base de datos...`);
      const { error: deleteError } = await supabase.from('products').delete().eq('id', productId);
      if (deleteError) throw deleteError;

      if (editingProduct && editingProduct.id === productId) {
        setEditingProduct(null);
      }

      toast.dismiss();
      toast.success("Producto y todas sus variantes eliminados.");

    } catch (error) {
      toast.dismiss();
      console.error("ERROR: [ProductsTab] Error durante el proceso de eliminación:", error);
      toast.error(error.message || "No se pudo eliminar el producto.");
    } finally {
      setIsActionLoading(false);
    }
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
    </div>
  );
};

export default ProductsTab;