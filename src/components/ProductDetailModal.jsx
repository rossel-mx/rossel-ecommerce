/**
 * @file ProductDetailModal.jsx
 * @description Modal final y completo que muestra los detalles de un producto.
 * Esta versión está completamente reestructurada para funcionar con la nueva arquitectura
 * de productos y variantes. Carga todas las variantes de color de un producto
 * mediante una consulta directa y eficiente, y muestra una galería de imágenes interactiva.
 *
 * @props {object} product - El objeto del producto base a cargar (contiene id, name, description).
 * @props {function} onClose - Función callback para cerrar el modal.
 */
import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { useCart } from "../context/CartContext";
import toast from "react-hot-toast";

// Mapa de colores para los selectores visuales.
const colorMap = {
  'negro': '#000000', 'blanco': '#FFFFFF', 'gris': '#808080', 'rojo': '#DC2626',
  'azul': '#2563EB', 'amarillo': '#FBBF24', 'verde': '#16A34A', 'morado': '#7C3AED',
  'naranja': '#F97316', 'cafe': '#78350F', 'beige': '#F5F5DC', 'camel': '#C19A6B',
  'tinto': '#800000', 'vino': '#722F37', 'kaki': '#F0E68C', 'rosa': '#EC4899',
  'celeste': '#38BDF8', 'marino': '#000080',
};

const ProductDetailModal = ({ product, onClose }) => {
  // --- ESTADOS ---
  const [variants, setVariants] = useState([]); // Almacena todas las variantes de color.
  const [selectedVariant, setSelectedVariant] = useState(null); // La variante de color actualmente seleccionada.
  const [mainImage, setMainImage] = useState(''); // La URL de la imagen principal en la galería.
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  // --- LÓGICA DE DATOS ---
  useEffect(() => {
    // Si no se proporciona un producto base, no hacemos nada.
    if (!product || !product.id) {
        console.warn("WARN: [Modal] No se proporcionó un producto válido para cargar detalles.");
        setLoading(false);
        return;
    };

    const fetchVariants = async () => {
      setLoading(true);
      console.log(`LOG: [Modal] Iniciando carga de variantes para el producto ID: ${product.id} ("${product.name}")`);
      
      try {
        // Hacemos una consulta directa para obtener todas las variantes asociadas a este producto padre.
        const { data, error } = await supabase
            .from('product_variants')
            .select('*')
            .eq('product_id', product.id)
            .order('color'); // Ordenamos por color

        if (error) throw error;
        
        console.log(`LOG: [Modal] Encontradas ${data?.length || 0} variantes.`, data);
        setVariants(data || []);
        
        // Por defecto, seleccionamos la primera variante de la lista.
        if (data && data.length > 0) {
          const firstVariant = data[0];
          setSelectedVariant(firstVariant);

          // Y la imagen principal será la primera de esa primera variante.
          if (firstVariant.image_urls && firstVariant.image_urls.length > 0) {
            setMainImage(firstVariant.image_urls[0]);
          } else {
             setMainImage('/rossel-placeholder.webp');
          }
        } else {
          // Si el producto no tiene variantes, lo cual es un caso raro, lo indicamos.
          console.warn(`WARN: [Modal] El producto "${product.name}" no tiene variantes asociadas.`);
          setSelectedVariant(null);
        }
      } catch (error) {
        console.error("ERROR: [Modal] Error al cargar las variantes del producto:", error);
        toast.error("No se pudieron cargar los detalles del producto.");
      } finally {
        setLoading(false);
      }
    };

    fetchVariants();
  }, [product]); // El efecto se ejecuta cada vez que el producto base cambia.

  // --- MANEJADORES DE EVENTOS ---

  const handleSelectVariant = (variant) => {
    console.log("LOG: [Modal] El usuario seleccionó la variante de color:", variant);
    setSelectedVariant(variant);
    if (variant.image_urls && variant.image_urls.length > 0) {
      setMainImage(variant.image_urls[0]);
    } else {
      setMainImage('/rossel-placeholder.webp');
    }
  };

  const handleSelectImage = (imageUrl) => setMainImage(imageUrl);

  const handleAddToCart = () => {
    if (!selectedVariant) return;
    console.log("LOG: [Modal] Añadiendo al carrito la variante:", selectedVariant);
    
    // Creamos un objeto limpio para añadir al carrito.
    const itemToAdd = {
        id: selectedVariant.id, // Usamos el ID de la variante para unicidad en el carrito.
        name: product.name,
        description: product.description,
        color: selectedVariant.color,
        price_menudeo: selectedVariant.price_menudeo,
        price_mayoreo: selectedVariant.price_mayoreo,
        image_urls: selectedVariant.image_urls // Pasamos todas las imágenes
    };

    addToCart(itemToAdd);
    toast.success(`${itemToAdd.name} (${itemToAdd.color}) agregado al carrito!`);
    onClose();
  };
  
  const formatCurrency = (amount) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);

  // --- RENDERIZADO DEL MODAL ---
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full md:w-4/5 max-w-5xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {loading ? (
          <div className="p-8 text-center font-semibold">Cargando detalles...</div>
        ) : !selectedVariant ? (
          <div className="p-8 text-center font-semibold">Producto no encontrado o no disponible.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
            
            {/* Columna de Galería de Imágenes */}
            <div className="flex flex-col gap-4">
              <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden shadow-inner">
                <img key={mainImage} src={mainImage} alt={product.name} className="w-full h-full object-cover animate-fade-in"/>
              </div>
              {selectedVariant.image_urls && selectedVariant.image_urls.length > 1 && (
                <div className="grid grid-cols-5 gap-2">
                  {selectedVariant.image_urls.map((url, index) => (
                    <button key={index} onClick={() => handleSelectImage(url)} className={`aspect-square border-2 rounded-md overflow-hidden transition ${mainImage === url ? 'border-primary ring-2 ring-primary' : 'border-transparent'}`}>
                      <img src={url} alt={`Vista previa ${index + 1}`} className="w-full h-full object-cover"/>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Columna de Detalles y Acciones */}
            <div className="flex flex-col">
              <h2 className="text-3xl font-bold text-primary">{product.name}</h2>
              <p className="text-gray-600 mt-2">{product.description}</p>
              
              {variants.length > 1 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Color: <span className="font-bold">{selectedVariant.color}</span></h3>
                  <div className="flex flex-wrap gap-3">
                    {variants.map(variant => {
                      const backgroundColor = colorMap[variant.color?.toLowerCase()] || '#cccccc';
                      return (
                        <button key={variant.id} onClick={() => handleSelectVariant(variant)} title={variant.color} className={`w-10 h-10 rounded-full border-2 transition-transform duration-200 hover:scale-110 ${selectedVariant.id === variant.id ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-gray-300'}`} style={{ backgroundColor }} />
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                 <p className="text-lg">Precio Menudeo: <span className="font-bold text-gray-800">{formatCurrency(selectedVariant.price_menudeo)}</span></p>
                 <p className="text-lg">Precio Mayoreo (4+ pzs): <span className="font-bold text-green-600">{formatCurrency(selectedVariant.price_mayoreo)}</span></p>
              </div>

              <div className="mt-auto pt-6">
                 <button onClick={handleAddToCart} className="w-full bg-primary text-white py-3 rounded-lg text-lg font-bold hover:bg-red-700 transition disabled:opacity-50" disabled={selectedVariant.stock === 0}>
                    {selectedVariant.stock > 0 ? 'Agregar al Carrito' : 'Agotado'}
                 </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetailModal;

