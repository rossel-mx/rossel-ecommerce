/**
 * @file ProductsTab.jsx
 * @description Pestaña de gestión de productos para el panel de administración.
 * Esta es la versión final y reestructurada que maneja la nueva arquitectura
 * de productos y variantes. Sus responsabilidades son:
 * - Cargar la lista jerárquica de productos y sus variantes anidadas.
 * - Mantener la lista actualizada en tiempo real mediante suscripciones a las tablas 'products' y 'product_variants'.
 * - Centralizar la lógica de eliminación segura, que borra un producto padre y todas sus variantes y imágenes asociadas.
 * - Orquestar los componentes hijos ProductForm y ProductList.
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
   */
  const handleFormSuccess = () => {
    console.log("LOG: [ProductsTab] El formulario reportó éxito. Forzando recarga local.");
    setEditingProduct(null);
    fetchProductsWithVariants(); // Forzamos una recarga para ver los cambios al instante.
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
      
      {/* El formulario para crear productos y sus variantes */}
      <ProductForm 
        onFormSubmit={handleFormSuccess} 
        // Pasamos el producto a editar. El formulario se encargará de la lógica de edición.
        editingProduct={editingProduct} 
      />
      
      {/* La lista jerárquica de productos y variantes */}
      {loading ? (
        <p className="text-center py-10">Cargando inventario...</p>
      ) : (
        <ProductList 
          products={products}
          onEdit={(product) => {
            console.log("LOG: [ProductsTab] Editando producto:", product);
            setEditingProduct(product);
            // Hacemos scroll hacia arriba para que el admin vea el formulario rellenado.
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onDelete={handleDelete}
          isActionLoading={isActionLoading}
        />
      )}
    </div>
  );
};

export default ProductsTab;