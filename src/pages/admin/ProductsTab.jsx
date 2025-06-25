/**
 * @file ProductsTab.jsx
 * @description Pestaña de gestión de productos para el panel de administración.
 * Esta es la versión final y reestructurada que maneja la nueva arquitectura
 * de productos y variantes. Sus responsabilidades son:
 * - Cargar la lista jerárquica de productos y sus variantes anidadas.
 * - Mantener la lista actualizada en tiempo real mediante suscripciones a las tablas 'products' y 'product_variants'.
 * - Centralizar la lógica de eliminación segura, que borra un producto padre y todas sus variantes y imágenes asociadas.
 * - Orquestar los componentes hijos ProductForm y ProductList.
 * - Manejar correctamente el flujo de edición CRUD.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import ProductList from "./ProductList";
import ProductForm from "./ProductForm";

const ProductsTab = () => {
  // --- ESTADOS ---
  const [products, setProducts] = useState([]); // Almacenará productos con sus variantes anidadas
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null); // Producto a editar
  const [isActionLoading, setIsActionLoading] = useState(false); // Para deshabilitar botones durante una acción

  // --- LÓGICA DE DATOS ---
  
  /**
   * Carga la lista de productos y sus variantes anidadas desde la base de datos
   * llamando a nuestra nueva función RPC 'get_products_with_variants'.
   */
  const fetchProductsWithVariants = useCallback(async () => {
    // No activamos el 'loading' principal en las recargas para una UX más fluida,
    // solo en la carga inicial.
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
      // Nos aseguramos de quitar el estado de carga solo si estaba activo.
      if (loading) setLoading(false);
    }
  }, [loading]); // Depende de 'loading' para poder gestionarlo en el 'finally'

  // --- EFECTOS ---

  // 1. Efecto para la carga inicial de datos.
  useEffect(() => {
    fetchProductsWithVariants();
    // Deshabilitamos la regla de ESLint porque queremos que este efecto se ejecute solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // El array vacío asegura que se ejecute solo una vez.

  // 2. Efecto para la suscripción a cambios en tiempo real en AMBAS tablas.
  useEffect(() => {
    console.log("LOG: [ProductsTab] Configurando suscripciones en tiempo real a 'products' y 'product_variants'.");
    
    const handleDbChange = (payload) => {
      console.log('LOG: [ProductsTab] ¡Cambio en tiempo real detectado!', payload);
      toast.success("El inventario se ha actualizado.");
      fetchProductsWithVariants();
    };

    const channel = supabase.channel('products-variants-realtime')
      // Escuchamos cambios en la tabla de productos padre
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, handleDbChange)
      // Y también escuchamos cambios en la tabla de variantes
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_variants' }, handleDbChange)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('LOG: [ProductsTab] ¡Conectado al canal de Realtime!');
        }
      });
      
    // Función de limpieza para desuscribirse cuando el componente se desmonta.
    return () => {
      console.log("LOG: [ProductsTab] Desmontando. Limpiando suscripción en tiempo real.");
      supabase.removeChannel(channel);
    };
  }, [fetchProductsWithVariants]);

  // --- MANEJADORES DE EVENTOS ---

  /**
   * Se ejecuta cuando el ProductForm completa una operación de creación/edición.
   * También se usa para cancelar la edición.
   */
  const handleFormSuccess = () => {
    console.log("LOG: [ProductsTab] El formulario reportó éxito o se canceló la edición.");
    
    // Limpiar el estado de edición
    setEditingProduct(null);
    
    // Forzar recarga para ver los cambios al instante
    fetchProductsWithVariants();
  };

  /**
   * Maneja el inicio de la edición de un producto.
   * @param {Object} product - El producto completo con sus variantes a editar.
   */
  const handleEdit = (product) => {
    console.log("LOG: [ProductsTab] Iniciando edición de producto:", product);
    
    // Verificar que el producto tiene la estructura correcta
    if (!product || !product.id) {
      console.error("ERROR: [ProductsTab] Producto inválido para edición:", product);
      toast.error("Error: Producto inválido para edición");
      return;
    }

    // Formatear el producto para que sea compatible con el formulario
    const formattedProduct = {
      id: product.id,
      sku: product.sku || '',
      name: product.name || '',
      description: product.description || '',
      category: product.category || '',
      variants: product.variants?.map(variant => ({
        variant_id: variant.id || variant.variant_id, // Asegurarse de que tenemos el ID
        color: variant.color || '',
        stock: variant.stock || 0,
        price: variant.price || '',
        price_menudeo: variant.price_menudeo || '',
        price_mayoreo: variant.price_mayoreo || '',
        image_urls: variant.image_urls || [],
        newImageFiles: [] // Inicializar array para nuevas imágenes
      })) || []
    };

    console.log("LOG: [ProductsTab] Producto formateado para edición:", formattedProduct);
    
    // Establecer el producto en modo de edición
    setEditingProduct(formattedProduct);
    
    // Hacer scroll hacia arriba para que el admin vea el formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // ❌ LÍNEA ELIMINADA: No más toast duplicado aquí
    // toast.success(`Modo edición activado para: ${product.name}`);
  };

  /**
   * Maneja la cancelación de la edición.
   */
  const handleCancelEdit = () => {
    console.log("LOG: [ProductsTab] Cancelando edición...");
    setEditingProduct(null);
    toast.success("Edición cancelada");
  };
  
  /**
   * Maneja la eliminación de un producto padre y todas sus variantes y imágenes asociadas.
   * @param {number} productId - El ID del producto padre a eliminar.
   */
  const handleDelete = async (productId) => {
    const productToDelete = products.find(p => p.id === productId);
    if (!productToDelete || !window.confirm(`¿Estás seguro de eliminar "${productToDelete.name}" y TODAS sus variantes de color?\nEsta acción es irreversible.`)) return;

    setIsActionLoading(true);
    toast.loading('Eliminando producto...');
    
    try {
      // 1. Recolectar TODAS las URLs de imágenes de TODAS las variantes.
      const allImageUrls = (productToDelete.variants || []).flatMap(variant => variant.image_urls || []);

      // 2. Si hay imágenes, llamar a la Edge Function para borrarlas de Cloudinary.
      if (allImageUrls.length > 0) {
        console.log("LOG: [ProductsTab] Invocando 'delete-cloudinary-images' para:", allImageUrls);
        const { error: functionError } = await supabase.functions.invoke('delete-cloudinary-images', { body: { imageUrls: allImageUrls } });
        if (functionError) {
          console.warn("WARN: [ProductsTab] La función para eliminar imágenes falló:", functionError);
          toast.error("Error al borrar imágenes en la nube, pero el producto se eliminará.");
        }
      }

      // 3. Gracias a "ON DELETE CASCADE" en la base de datos, solo necesitamos borrar el producto padre.
      // La base de datos se encargará de borrar todas sus variantes asociadas automáticamente.
      console.log(`LOG: [ProductsTab] Eliminando producto padre ID: ${productId} de la base de datos...`);
      const { error: deleteError } = await supabase.from('products').delete().eq('id', productId);
      if (deleteError) throw deleteError;

      // Si estábamos editando este producto, cancelar la edición
      if (editingProduct && editingProduct.id === productId) {
        setEditingProduct(null);
      }

      toast.dismiss();
      toast.success("Producto y todas sus variantes eliminados.");
      // No necesitamos llamar a fetchProducts() aquí, el listener de Realtime se encargará de actualizar la UI.

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
      <h3 className="text-2xl font-bold mb-4">Gestión de Inventario</h3>
      
      {/* Botón para crear nuevo producto (solo se muestra si no estamos editando) */}
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
      
      {/* El formulario para crear/editar productos y sus variantes */}
      <ProductForm 
        onFormSubmit={handleFormSuccess} 
        editingProduct={editingProduct}
        key={editingProduct ? `edit-${editingProduct.id}` : 'create'} // Key para forzar re-render
      />
      
      {/* La lista jerárquica de productos y variantes */}
      {loading ? (
        <p className="text-center py-10">Cargando inventario...</p>
      ) : (
        <ProductList 
          products={products}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isActionLoading={isActionLoading}
          editingProductId={editingProduct?.id} // Para resaltar el producto en edición
        />
      )}
    </div>
  );
};

export default ProductsTab;