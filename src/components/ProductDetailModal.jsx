/**
 * @file ProductDetailModal.jsx
 * @description Modal final y completo que muestra los detalles de un producto.
 * Esta versión está completamente reestructurada para funcionar con la nueva arquitectura
 * de productos y variantes. Carga todas las variantes de color de un producto
 * mediante una consulta directa y eficiente, y muestra una galería de imágenes interactiva.
 * 
 * NUEVAS MEJORAS VISUALES:
 * - ✅ Diseño glassmorphism moderno y elegante
 * - ✅ Animaciones suaves y microinteracciones
 * - ✅ Gradientes y efectos visuales premium
 * - ✅ Botones con estados hover más atractivos
 * - ✅ Efectos de backdrop blur y sombras sofisticadas
 * - ✅ Layout mejorado con mejor espaciado y tipografía
 * - ✅ IMÁGENES CORREGIDAS: object-contain para mostrar productos completos
 *
 * @props {object} product - El objeto del producto base a cargar (contiene id, name, description).
 * @props {function} onClose - Función callback para cerrar el modal.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { useCart } from "../context/CartContext";
import { useUser } from "../context/UserContext";
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
  const [variants, setVariants] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [mainImage, setMainImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState(false);
  
  const { addToCart } = useCart();
  const { user } = useUser();
  const navigate = useNavigate();

  // --- LÓGICA DE DATOS ---
  useEffect(() => {
    if (!product || !product.id) {
        console.warn("WARN: [Modal] No se proporcionó un producto válido para cargar detalles.");
        setLoading(false);
        return;
    };

    const fetchVariants = async () => {
      setLoading(true);
      console.log(`LOG: [Modal] Iniciando carga de variantes para el producto ID: ${product.id} ("${product.name}")`);
      
      try {
        const { data, error } = await supabase
            .from('product_variants')
            .select('*')
            .eq('product_id', product.id)
            .order('color');

        if (error) throw error;
        
        console.log(`LOG: [Modal] Encontradas ${data?.length || 0} variantes.`, data);
        setVariants(data || []);
        
        if (data && data.length > 0) {
          const firstVariant = data[0];
          setSelectedVariant(firstVariant);

          if (firstVariant.image_urls && firstVariant.image_urls.length > 0) {
            setMainImage(firstVariant.image_urls[0]);
          } else {
             setMainImage('/rossel-placeholder.webp');
          }
        } else {
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
  }, [product]);

  // --- MANEJADORES DE EVENTOS ---

  const handleSelectVariant = (variant) => {
    console.log("LOG: [Modal] El usuario seleccionó la variante de color:", variant);
    setSelectedVariant(variant);
    if (variant.image_urls && variant.image_urls.length > 0) {
      setImageLoading(true);
      setMainImage(variant.image_urls[0]);
    } else {
      setMainImage('/rossel-placeholder.webp');
    }
  };

  const handleSelectImage = (imageUrl) => {
    setImageLoading(true);
    setMainImage(imageUrl);
  };

  const handleAddToCart = () => {
    if (!selectedVariant) return;
    
    if (!user) {
      console.log("LOG: [Modal] Usuario no autenticado intentó agregar al carrito");
      toast.error("Debes iniciar sesión para agregar productos al carrito");
      onClose();
      setTimeout(() => {
        navigate("/login");
      }, 1000);
      return;
    }
    
    console.log("LOG: [Modal] Usuario autenticado. Añadiendo al carrito la variante:", selectedVariant);
    
    const itemToAdd = {
        id: selectedVariant.id,
        name: product.name,
        description: product.description,
        color: selectedVariant.color,
        price_menudeo: selectedVariant.price_menudeo,
        price_mayoreo: selectedVariant.price_mayoreo,
        image_urls: selectedVariant.image_urls
    };

    addToCart(itemToAdd);
    toast.success(`${itemToAdd.name} (${itemToAdd.color}) agregado al carrito!`);
    onClose();
  };
  
  const formatCurrency = (amount) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);

  // --- RENDERIZADO DEL MODAL ---
  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in" 
      onClick={onClose}
    >
      <div 
        className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl w-full md:w-4/5 max-w-6xl max-h-[90vh] overflow-hidden relative animate-slide-down" 
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Botón de cerrar con diseño moderno */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-20 bg-white/80 backdrop-blur-sm hover:bg-white/90 text-gray-600 hover:text-gray-800 rounded-full p-3 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110 group"
          aria-label="Cerrar modal"
        >
          <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center gap-3">
              <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-lg font-medium text-gray-600">Cargando detalles...</span>
            </div>
          </div>
        ) : !selectedVariant ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-600">Producto no encontrado o no disponible</p>
          </div>
        ) : (
          <div className="overflow-y-auto max-h-[90vh]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
              
              {/* Columna de Galería de Imágenes */}
              <div className="space-y-6">
                <div className="relative w-full aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl flex items-center justify-center overflow-hidden shadow-inner group">
                  {imageLoading && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
                      <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                  <img 
                    key={mainImage} 
                    src={mainImage} 
                    alt={product.name} 
                    className="max-w-full max-h-full object-contain transition-all duration-500 group-hover:scale-105"
                    onLoad={() => setImageLoading(false)}
                    onError={() => setImageLoading(false)}
                  />
                  
                  {/* Overlay sutil para darle profundidad */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none"></div>
                </div>
                
                {selectedVariant.image_urls && selectedVariant.image_urls.length > 1 && (
                  <div className="grid grid-cols-5 gap-3">
                    {selectedVariant.image_urls.map((url, index) => (
                      <button 
                        key={index} 
                        onClick={() => handleSelectImage(url)} 
                        className={`aspect-square border-3 rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-lg bg-gray-50 flex items-center justify-center ${
                          mainImage === url 
                            ? 'border-primary ring-4 ring-primary/30 shadow-lg' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <img src={url} alt={`Vista ${index + 1}`} className="max-w-full max-h-full object-contain"/>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Columna de Detalles y Acciones */}
              <div className="flex flex-col space-y-6">
                <div className="space-y-3">
                  <h2 className="text-4xl font-bold bg-gradient-to-r from-primary to-red-700 bg-clip-text text-transparent leading-tight pr-12">
                    {product.name}
                  </h2>
                  <p className="text-gray-600 text-lg leading-relaxed">{product.description}</p>
                </div>
                
                {variants.length > 1 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Color: <span className="font-bold text-primary">{selectedVariant.color}</span>
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {variants.map(variant => {
                        const backgroundColor = colorMap[variant.color?.toLowerCase()] || '#cccccc';
                        const isSelected = selectedVariant.id === variant.id;
                        return (
                          <button 
                            key={variant.id} 
                            onClick={() => handleSelectVariant(variant)} 
                            title={variant.color} 
                            className={`relative w-12 h-12 rounded-full border-3 transition-all duration-300 hover:scale-110 hover:shadow-lg ${
                              isSelected 
                                ? 'border-primary ring-4 ring-primary/30 shadow-lg' 
                                : 'border-gray-300 hover:border-gray-400'
                            }`} 
                            style={{ backgroundColor }}
                          >
                            {isSelected && (
                              <div className="absolute inset-0 rounded-full border-2 border-white shadow-inner"></div>
                            )}
                            {backgroundColor === '#FFFFFF' && (
                              <div className="absolute inset-1 rounded-full border border-gray-200"></div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 font-medium">Precio Menudeo:</span>
                    <span className="text-2xl font-bold text-gray-800">{formatCurrency(selectedVariant.price_menudeo)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 font-medium">Precio Mayoreo (4+ pzs):</span>
                    <span className="text-2xl font-bold text-green-600">{formatCurrency(selectedVariant.price_mayoreo)}</span>
                  </div>
                  
                  {/* Badge de ahorro */}
                  {selectedVariant.price_menudeo > selectedVariant.price_mayoreo && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 mt-4">
                      <p className="text-green-700 font-semibold text-sm text-center">
                        💰 Ahorra {formatCurrency(selectedVariant.price_menudeo - selectedVariant.price_mayoreo)} por pieza comprando 4 o más
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-auto pt-6">
                  <button 
                    onClick={handleAddToCart} 
                    className={`w-full py-4 rounded-2xl text-lg font-bold transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                      selectedVariant.stock === 0
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : !user 
                          ? 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white shadow-lg hover:shadow-xl' 
                          : 'bg-gradient-to-r from-primary to-red-700 hover:from-red-600 hover:to-red-800 text-white shadow-lg hover:shadow-xl'
                    }`}
                    disabled={selectedVariant.stock === 0}
                  >
                     <span className="flex items-center justify-center gap-2">
                       {selectedVariant.stock === 0 ? (
                         <>
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                           </svg>
                           Agotado
                         </>
                       ) : !user ? (
                         <>
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                           </svg>
                           Inicia sesión para comprar
                         </>
                       ) : (
                         <>
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 11-4 0v-6m4 0V9a2 2 0 00-2-2V7a2 2 0 00-2-2H9a2 2 0 00-2 2v0a2 2 0 00-2 2v2" />
                           </svg>
                           Agregar al Carrito
                         </>
                       )}
                     </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetailModal;