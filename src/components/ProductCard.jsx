/**
 * @file ProductCard.jsx
 * @description Componente reutilizable que muestra la tarjeta de un producto en una cuadrícula.
 * Esta versión moderna está actualizada para funcionar con la nueva estructura de datos
 * y mantiene consistencia visual con el modal mejorado.
 *
 * MEJORAS VISUALES MODERNAS:
 * - ✅ Diseño glassmorphism y efectos premium
 * - ✅ Animaciones suaves y microinteracciones
 * - ✅ Gradientes y sombras sofisticadas
 * - ✅ Hover effects más atractivos
 * - ✅ Layout mejorado con mejor espaciado
 * - ✅ Estados de loading y efectos visuales
 *
 * @props {object} product - El objeto de producto a mostrar, con la estructura nueva.
 * @props {function} onClick - Función a ejecutar al hacer clic en la tarjeta.
 */
import React, { useState } from 'react';

const ProductCard = ({ product, onClick }) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Log para verificar los datos que recibe el componente.
  console.log(`LOG: [ProductCard] Renderizando tarjeta para el producto: "${product.name}"`, product);

  // --- LÓGICA DE IMAGEN INTELIGENTE ---
  const imageUrl = product.image_url || '/rossel-placeholder.webp';
  const isPlaceholder = !product.image_url || imageError;
  const imageFitClass = isPlaceholder ? 'object-contain p-4' : 'object-cover';

  // Formatear precio
  const formatCurrency = (amount) => new Intl.NumberFormat('es-MX', { 
    style: 'currency', 
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  return (
    <div 
      onClick={onClick} 
      className="group relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl overflow-hidden cursor-pointer transform transition-all duration-500 hover:-translate-y-3 hover:scale-[1.02] h-full flex flex-col border border-gray-100/50"
    >
      {/* Overlay sutil para profundidad */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"></div>
      
      {/* Container de imagen con efectos modernos */}
      <div className="relative w-full h-64 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        {/* Loading state */}
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        
        {/* Imagen principal */}
        <img 
          src={imageUrl} 
          alt={product.name} 
          className={`w-full h-full ${imageFitClass} transition-all duration-700 group-hover:scale-110 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
        
        {/* Overlay de gradiente sutil */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none"></div>
        
        {/* Badge de precio moderno */}
        <div className="absolute top-4 right-4 z-30">
          <div className="bg-white/90 backdrop-blur-sm text-primary text-sm font-bold px-3 py-2 rounded-full shadow-lg border border-white/50 transform transition-all duration-300 group-hover:scale-110 group-hover:bg-white group-hover:shadow-xl">
            {formatCurrency(product.price_menudeo)}
          </div>
        </div>

        {/* Indicador de "nuevo" o promoción (opcional) */}
        {product.is_featured && (
          <div className="absolute top-4 left-4 z-30">
            <div className="bg-gradient-to-r from-primary to-red-700 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
              ⭐ Destacado
            </div>
          </div>
        )}
      </div>
      
      {/* Contenido de la tarjeta */}
      <div className="p-6 flex-grow flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          {/* Título con gradiente sutil */}
          <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent line-clamp-2 group-hover:from-primary group-hover:to-red-700 transition-all duration-300">
            {product.name}
          </h3>
          
          {/* Descripción mejorada */}
          <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">
            {product.description || 'Descubre más detalles de este increíble producto.'}
          </p>
        </div>

        {/* Footer de la tarjeta */}
        <div className="flex items-center justify-between mt-auto pt-4">
          {/* Indicador de disponibilidad */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-500 font-medium">Disponible</span>
          </div>
          
          {/* Call to action sutil */}
          <div className="flex items-center gap-1 text-primary text-sm font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
            <span>Ver detalles</span>
            <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Efecto de borde animado en hover */}
      <div className="absolute inset-0 rounded-2xl border-2 border-primary/30 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none"></div>
    </div>
  );
};

export default ProductCard;