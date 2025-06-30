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
 * - 🆕 SELECTOR DE CANTIDAD: Input manual + botones +/- con precios dinámicos
 * - 🆕 COLORES ACTUALIZADOS: 32 colores estándar (era 18, ahora incluye Dorado, Plateado, etc.)
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
import { FiMinus, FiPlus, FiShoppingCart, FiUser, FiX } from "react-icons/fi";

// 🆕 ACTUALIZADO: Mapa completo de 32 colores estándar para los selectores visuales
const colorMap = {
  // Básicos
  'negro': '#000000',
  'blanco': '#FFFFFF', 
  'gris': '#808080',
  'beige': '#F5F5DC',
  'crema': '#FFFDD0',
  'marfil': '#FFFFF0',
  
  // Cálidos
  'rojo': '#DC2626',
  'rosa': '#EC4899',
  'coral': '#FF7F50',
  'naranja': '#F97316',
  'amarillo': '#FBBF24',
  'dorado': '#FFD700',
  'cafe': '#78350F',
  'marrón': '#A52A2A',
  'marron': '#A52A2A', // Variación sin tilde
  'camel': '#C19A6B',
  'tinto': '#800000',
  'vino': '#722F37',
  
  // Fríos
  'azul': '#2563EB',
  'marino': '#000080',
  'celeste': '#38BDF8',
  'verde': '#16A34A',
  'kaki': '#F0E68C',
  'morado': '#7C3AED',
  'violeta': '#8A2BE2',
  'lila': '#DDA0DD',
  
  // Metálicos/Especiales
  'plateado': '#C0C0C0',
  'bronce': '#CD7F32',
  'cobre': '#B87333',
  
  // Neutros modernos
  'topo': '#8B7765',
  'hueso': '#F9F6EE',
  'arena': '#C2B280',
  'tierra': '#8B4513'
};

// Componente Selector de Cantidad
const QuantitySelector = ({ value, onChange, max = 99, min = 1, disabled = false }) => (
  <div className="flex items-center bg-gray-50 rounded-xl p-2 gap-3">
    <button 
      onClick={() => onChange(Math.max(min, value - 1))}
      disabled={disabled || value <= min}
      className="w-10 h-10 rounded-lg bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm border border-gray-200 hover:border-gray-300 transition-all duration-200 hover:scale-105 active:scale-95"
    >
      <FiMinus className="w-4 h-4 text-gray-600" />
    </button>
    
    <input
      type="number"
      value={value}
      onChange={(e) => {
        const newValue = parseInt(e.target.value) || min;
        onChange(Math.max(min, Math.min(max, newValue)));
      }}
      disabled={disabled}
      className="w-16 text-center text-lg font-bold bg-transparent border-none outline-none disabled:opacity-50"
      min={min}
      max={max}
    />
    
    <button 
      onClick={() => onChange(Math.min(max, value + 1))}
      disabled={disabled || value >= max}
      className="w-10 h-10 rounded-lg bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm border border-gray-200 hover:border-gray-300 transition-all duration-200 hover:scale-105 active:scale-95"
    >
      <FiPlus className="w-4 h-4 text-gray-600" />
    </button>
  </div>
);

const ProductDetailModal = ({ product, onClose }) => {
  // --- ESTADOS ---
  const [variants, setVariants] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [mainImage, setMainImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState(false);
  
  // 🆕 NUEVO: Estado para cantidad
  const [quantity, setQuantity] = useState(1);
  
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

  // 🆕 Resetear cantidad cuando cambia la variante
  useEffect(() => {
    if (selectedVariant) {
      setQuantity(1);
    }
  }, [selectedVariant]);

  // --- FUNCIONES DE CÁLCULO DE PRECIOS ---
  const getUnitPrice = () => {
    if (!selectedVariant) return 0;
    return quantity >= 4 ? selectedVariant.price_mayoreo : selectedVariant.price_menudeo;
  };

  const getTotalPrice = () => {
    return getUnitPrice() * quantity;
  };

  const getSavingsMessage = () => {
    if (!selectedVariant) return null;
    
    if (quantity >= 4) {
      const savings = (selectedVariant.price_menudeo - selectedVariant.price_mayoreo) * quantity;
      return {
        type: 'success',
        message: `¡Ahorras ${formatCurrency(savings)} con precio mayoreo!`
      };
    }
    
    if (quantity >= 3) {
      const needed = 4 - quantity;
      const potentialSavings = (selectedVariant.price_menudeo - selectedVariant.price_mayoreo) * 4;
      return {
        type: 'info',
        message: `Agrega ${needed} más para ahorrar ${formatCurrency(potentialSavings)} con precio mayoreo`
      };
    }
    
    return null;
  };

  const getMaxQuantity = () => {
    if (!selectedVariant) return 99;
    return selectedVariant.stock || 99;
  };

  // --- MANEJADORES DE EVENTOS ---

  const handleSelectVariant = (variant) => {
    console.log("LOG: [Modal] El usuario seleccionó la variante de color:", variant);
    setSelectedVariant(variant);
    setQuantity(1); // Reset cantidad al cambiar variante
    if (variant.image_urls && variant.image_urls.length > 1) {
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

  const handleQuantityChange = (newQuantity) => {
    const maxQty = getMaxQuantity();
    const validQuantity = Math.max(1, Math.min(maxQty, newQuantity));
    setQuantity(validQuantity);
    console.log("LOG: [Modal] Cantidad actualizada a:", validQuantity);
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

    if (selectedVariant.stock !== undefined && quantity > selectedVariant.stock) {
      toast.error(`Solo hay ${selectedVariant.stock} unidades disponibles`);
      return;
    }
    
    console.log("LOG: [Modal] Usuario autenticado. Añadiendo al carrito:", {
      variant: selectedVariant,
      quantity: quantity
    });
    
    const itemToAdd = {
        id: selectedVariant.id,
        name: product.name,
        description: product.description,
        color: selectedVariant.color,
        price_menudeo: selectedVariant.price_menudeo,
        price_mayoreo: selectedVariant.price_mayoreo,
        image_urls: selectedVariant.image_urls,
        stock: selectedVariant.stock // ✅ NUEVO: Incluir stock para validación en Cart
    };

    // 🆕 Pasar la cantidad seleccionada al contexto
    addToCart(itemToAdd, quantity);
    
    // Toast personalizado según la cantidad
    const message = quantity === 1 
      ? `${itemToAdd.name} (${itemToAdd.color}) agregado al carrito!`
      : `${quantity} × ${itemToAdd.name} (${itemToAdd.color}) agregado al carrito!`;
    
    toast.success(message);
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
          <FiX className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
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
              <FiX className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-lg font-medium text-gray-600">Producto no encontrado o no disponible</p>
          </div>
        ) : (
          <div className="overflow-y-auto max-h-[90vh]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 p-4 sm:p-6 lg:p-8">
              
              {/* Columna de Galería de Imágenes */}
              <div className="space-y-4 sm:space-y-6">
                <div className="relative w-full aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl sm:rounded-2xl flex items-center justify-center overflow-hidden shadow-inner group">
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
                  <div className="grid grid-cols-5 gap-2 sm:gap-3">
                    {selectedVariant.image_urls.map((url, index) => (
                      <button 
                        key={index} 
                        onClick={() => handleSelectImage(url)} 
                        className={`aspect-square border-2 sm:border-3 rounded-lg sm:rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-lg bg-gray-50 flex items-center justify-center ${
                          mainImage === url 
                            ? 'border-primary ring-2 sm:ring-4 ring-primary/30 shadow-lg' 
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
              <div className="flex flex-col space-y-4 sm:space-y-6">
                <div className="space-y-2 sm:space-y-3">
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary to-red-700 bg-clip-text text-transparent leading-tight pr-12">
                    {product.name}
                  </h2>
                  <p className="text-gray-600 text-base sm:text-lg leading-relaxed">{product.description}</p>
                </div>
                
                {variants.length > 1 && (
                  <div className="space-y-3 sm:space-y-4">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                      Color: <span className="font-bold text-primary">{selectedVariant.color}</span>
                    </h3>
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      {variants.map(variant => {
                        // 🆕 MEJORADO: Ahora busca el color con mejor compatibilidad
                        const colorKey = variant.color?.toLowerCase();
                        const backgroundColor = colorMap[colorKey] || colorMap[colorKey?.replace('ó', 'o')] || '#cccccc';
                        const isSelected = selectedVariant.id === variant.id;
                        
                        return (
                          <button 
                            key={variant.id} 
                            onClick={() => handleSelectVariant(variant)} 
                            title={variant.color} 
                            className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 sm:border-3 transition-all duration-300 hover:scale-110 hover:shadow-lg ${
                              isSelected 
                                ? 'border-primary ring-2 sm:ring-4 ring-primary/30 shadow-lg' 
                                : 'border-gray-300 hover:border-gray-400'
                            }`} 
                            style={{ backgroundColor }}
                          >
                            {isSelected && (
                              <div className="absolute inset-0 rounded-full border-2 border-white shadow-inner"></div>
                            )}
                            {(backgroundColor === '#FFFFFF' || colorKey === 'blanco') && (
                              <div className="absolute inset-1 rounded-full border border-gray-200"></div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 🆕 SELECTOR DE CANTIDAD */}
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-800">Cantidad</h3>
                    {selectedVariant.stock !== undefined && (
                      <span className="text-xs sm:text-sm text-gray-500">
                        {selectedVariant.stock} disponibles
                      </span>
                    )}
                  </div>
                  <QuantitySelector 
                    value={quantity}
                    onChange={handleQuantityChange}
                    max={getMaxQuantity()}
                    disabled={selectedVariant.stock === 0}
                  />
                </div>

                {/* 🆕 PRECIOS DINÁMICOS */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 backdrop-blur-sm p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-gray-200/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 font-medium text-sm sm:text-base">Precio unitario:</span>
                    <span className="text-lg sm:text-xl font-bold text-gray-800">
                      {formatCurrency(getUnitPrice())}
                    </span>
                  </div>
                  
                  {quantity > 1 && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 font-medium text-sm sm:text-base">
                        Total ({quantity} pzs):
                      </span>
                      <span className="text-xl sm:text-2xl font-bold text-primary">
                        {formatCurrency(getTotalPrice())}
                      </span>
                    </div>
                  )}

                  {/* Información de precios mayoreo/menudeo */}
                  <div className="pt-3 border-t border-gray-200/50 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Precio menudeo:</span>
                      <span className="text-gray-700">{formatCurrency(selectedVariant.price_menudeo)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Precio mayoreo (4+ pzs):</span>
                      <span className="text-green-600 font-medium">{formatCurrency(selectedVariant.price_mayoreo)}</span>
                    </div>
                  </div>
                  
                  {/* 🆕 MENSAJE DE AHORRO DINÁMICO */}
                  {getSavingsMessage() && (
                    <div className={`rounded-lg sm:rounded-xl p-3 mt-4 ${
                      getSavingsMessage().type === 'success' 
                        ? 'bg-green-500/10 border border-green-500/20' 
                        : 'bg-blue-500/10 border border-blue-500/20'
                    }`}>
                      <p className={`font-semibold text-xs sm:text-sm text-center ${
                        getSavingsMessage().type === 'success' ? 'text-green-700' : 'text-blue-700'
                      }`}>
                        {getSavingsMessage().type === 'success' ? '💰' : '💡'} {getSavingsMessage().message}
                      </p>
                    </div>
                  )}
                </div>

                {/* 🆕 BOTÓN AGREGAR AL CARRITO MEJORADO */}
                <div className="mt-auto pt-4 sm:pt-6">
                  <button 
                    onClick={handleAddToCart} 
                    className={`w-full py-3 sm:py-4 rounded-xl sm:rounded-2xl text-base sm:text-lg font-bold transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
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
                           <FiX className="w-4 h-4 sm:w-5 sm:h-5" />
                           Agotado
                         </>
                       ) : !user ? (
                         <>
                           <FiUser className="w-4 h-4 sm:w-5 sm:h-5" />
                           Inicia sesión para comprar
                         </>
                       ) : (
                         <>
                           <FiShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                           {quantity === 1 
                             ? 'Agregar al Carrito' 
                             : `Agregar ${quantity} al Carrito`
                           }
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