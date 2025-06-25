/**
 * @file ProductCard.jsx
 * @description Componente reutilizable que muestra la tarjeta de un producto en una cuadrícula.
 * Esta versión está actualizada para funcionar con la nueva estructura de datos devuelta
 * por la función RPC `get_public_product_list`, mostrando la imagen de portada y el
 * precio de menudeo correctamente.
 *
 * @props {object} product - El objeto de producto a mostrar, con la estructura nueva.
 * @props {function} onClick - Función a ejecutar al hacer clic en la tarjeta.
 */
import React from 'react';

const ProductCard = ({ product, onClick }) => {
  // Log para verificar los datos que recibe el componente.
  console.log(`LOG: [ProductCard] Renderizando tarjeta para el producto: "${product.name}"`, product);

  // --- LÓGICA DE IMAGEN INTELIGENTE ---
  // La función RPC ya nos da la URL de la imagen principal en el campo 'image_url'.
  const imageUrl = product.image_url || '/rossel-placeholder.webp';
  
  // Determinamos el estilo de la imagen: 'cover' para fotos reales, 'contain' para el placeholder.
  const imageFitClass = product.image_url ? 'object-cover' : 'object-contain p-4';

  return (
    <div 
      onClick={onClick} 
      className="bg-white rounded-xl shadow-lg overflow-hidden group cursor-pointer transform transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl h-full flex flex-col"
    >
      <div className="relative w-full h-64 bg-gray-100">
        <img 
          src={imageUrl} 
          alt={product.name} 
          className={`w-full h-full ${imageFitClass}`} 
        />
        {/* Mostramos el precio de menudeo que ahora viene directamente en el objeto 'product' */}
        <div className="absolute top-0 right-0 bg-primary text-white text-sm font-semibold px-3 py-1 m-2 rounded-full">
          ${product.price_menudeo}
        </div>
      </div>
      <div className="p-5 flex-grow flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 truncate">{product.name}</h3>
          {/* El color ya no se muestra aquí, se verá en el modal de detalles */}
          <p className="text-gray-500 text-sm mt-1 truncate">{product.description || 'Haz clic para ver más detalles.'}</p>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;