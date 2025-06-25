/**
 * @file ProductList.jsx
 * @description Componente de presentación que muestra una lista jerárquica de productos y sus variantes.
 * Cada producto principal en la tabla se puede expandir para ver los detalles específicos
 * de sus variantes de color (stock, precios, etc.) en una sub-tabla.
 * Recibe todos los datos y funciones desde su padre, ProductsTab.jsx.
 */
import React, { useState } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi'; // Íconos para expandir/colapsar

const ProductList = ({ products, onEdit, onDelete, isActionLoading }) => {
  // Estado local para controlar qué fila de producto está expandida.
  const [expandedProductId, setExpandedProductId] = useState(null);

  /**
   * Alterna la visibilidad de la sub-tabla de variantes para un producto.
   * @param {number} productId - El ID del producto a expandir o colapsar.
   */
  const toggleExpand = (productId) => {
    console.log(`LOG: [ProductList] Alternando visibilidad para producto ID: ${productId}`);
    setExpandedProductId(prevId => prevId === productId ? null : productId);
  };

  console.log(`LOG: [ProductList] Renderizando lista con ${products.length} productos base.`);

  return (
    <div className="overflow-x-auto mt-6">
      <table className="min-w-full bg-white border rounded-lg shadow text-sm">
        <thead className="bg-primary text-white">
          {/* Encabezado para la tabla de productos "padre" */}
          <tr>
            <th className="py-2 px-4 w-12"></th>
            <th className="py-2 px-4 text-left">Producto Base</th>
            <th className="py-2 px-4 text-left">SKU</th>
            <th className="py-2 px-4 text-center">Nº de Variantes</th>
            <th className="py-2 px-4 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 ? (
            <tr>
              <td colSpan="5" className="text-center py-8 text-gray-500">
                No hay productos registrados. Utiliza el formulario de arriba para añadir uno.
              </td>
            </tr>
          ) : (
            // Iteramos sobre cada producto "padre"
            products.map((product) => (
              // Usamos un Fragment (<>) para agrupar la fila principal y la de detalles
              <>
                <tr key={product.id} className="border-t hover:bg-gray-50">
                  <td className="py-3 px-4 text-center">
                    <button 
                      onClick={() => toggleExpand(product.id)} 
                      className="text-primary font-bold"
                      title={expandedProductId === product.id ? "Ocultar variantes" : "Mostrar variantes"}
                    >
                      {expandedProductId === product.id ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
                    </button>
                  </td>
                  <td className="py-3 px-4 font-bold text-base">{product.name}</td>
                  <td className="py-3 px-4 font-mono">{product.sku}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="bg-blue-100 text-blue-800 font-semibold px-2 py-1 rounded-full">
                      {product.variants?.length || 0}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center space-x-2">
                    {/* Los botones de acción ahora actúan sobre el producto "padre" */}
                    <button onClick={() => onEdit(product)} disabled={isActionLoading} className="bg-yellow-400 text-black px-3 py-1 rounded hover:bg-yellow-500 text-sm disabled:opacity-50">
                      Editar
                    </button>
                    <button onClick={() => onDelete(product.id)} disabled={isActionLoading} className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm disabled:opacity-50">
                      Eliminar
                    </button>
                  </td>
                </tr>
                
                {/* --- SUB-TABLA DE VARIANTES EXPANDIBLE --- */}
                {/* Esta fila solo se renderiza si el producto está expandido */}
                {expandedProductId === product.id && (
                  <tr className="bg-gray-50">
                    <td></td> {/* Celda vacía para alinear con el botón de expandir */}
                    <td colSpan="4" className="p-4">
                      <h4 className="font-semibold mb-2 text-gray-700">Variantes de "{product.name}"</h4>
                      <table className="min-w-full bg-white rounded shadow-inner">
                        <thead className="bg-gray-200 text-xs">
                          <tr>
                            <th className="py-1 px-2 text-center">Imagen</th>
                            <th className="py-1 px-2 text-left">Color</th>
                            <th className="py-1 px-2 text-right">Stock</th>
                            <th className="py-1 px-2 text-right">Costo</th>
                            <th className="py-1 px-2 text-right">Menudeo</th>
                            <th className="py-1 px-2 text-right">Mayoreo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(product.variants || []).map(variant => (
                            <tr key={variant.variant_id} className="border-b">
                              <td className="py-1 px-2 text-center">
                                <img 
                                  src={variant.image_urls && variant.image_urls.length > 0 ? variant.image_urls[0] : '/rossel-placeholder.webp'} 
                                  alt={variant.color} 
                                  className="w-10 h-10 object-cover rounded-md mx-auto"
                                />
                              </td>
                              <td className="py-1 px-2">{variant.color}</td>
                              <td className="py-1 px-2 text-right font-bold">{variant.stock}</td>
                              <td className="py-1 px-2 text-right font-mono">${variant.price}</td>
                              <td className="py-1 px-2 text-right font-mono">${variant.price_menudeo}</td>
                              <td className="py-1 px-2 text-right font-mono">${variant.price_mayoreo}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ProductList;