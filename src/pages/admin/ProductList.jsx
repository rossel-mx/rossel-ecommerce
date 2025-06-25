/**
 * @file ProductList.jsx
 * @description Componente de presentación que muestra una lista jerárquica de productos y sus variantes.
 * Cada producto principal en la tabla se puede expandir para ver los detalles específicos
 * de sus variantes de color (stock, precios, etc.) en una sub-tabla.
 * Recibe todos los datos y funciones desde su padre, ProductsTab.jsx.
 */
import React, { useState } from 'react';
import { FiChevronDown, FiChevronUp, FiEdit, FiTrash2 } from 'react-icons/fi'; // Íconos para expandir/colapsar y acciones

const ProductList = ({ products, onEdit, onDelete, isActionLoading, editingProductId }) => {
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

  /**
   * Formatea un precio para mostrar
   * @param {number|string} price - El precio a formatear
   * @returns {string} - Precio formateado
   */
  const formatPrice = (price) => {
    if (!price) return '0.00';
    return parseFloat(price).toFixed(2);
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
            <th className="py-2 px-4 text-left">Categoría</th>
            <th className="py-2 px-4 text-center">Nº de Variantes</th>
            <th className="py-2 px-4 text-center">Estado</th>
            <th className="py-2 px-4 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 ? (
            <tr>
              <td colSpan="7" className="text-center py-8 text-gray-500">
                No hay productos registrados. Utiliza el formulario de arriba para añadir uno.
              </td>
            </tr>
          ) : (
            // Iteramos sobre cada producto "padre"
            products.map((product) => {
              const isBeingEdited = editingProductId === product.id;
              const totalStock = product.variants?.reduce((sum, variant) => sum + (parseInt(variant.stock) || 0), 0) || 0;
              
              return (
                // Usamos un Fragment (<>) para agrupar la fila principal y la de detalles
                <React.Fragment key={product.id}>
                  <tr className={`border-t hover:bg-gray-50 ${isBeingEdited ? 'bg-blue-50 border-blue-200' : ''}`}>
                    <td className="py-3 px-4 text-center">
                      <button 
                        onClick={() => toggleExpand(product.id)} 
                        className="text-primary font-bold hover:bg-gray-100 p-1 rounded"
                        title={expandedProductId === product.id ? "Ocultar variantes" : "Mostrar variantes"}
                      >
                        {expandedProductId === product.id ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <div className={`font-bold text-base ${isBeingEdited ? 'text-blue-800' : ''}`}>
                          {product.name}
                          {isBeingEdited && <span className="ml-2 text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">EDITANDO</span>}
                        </div>
                        {product.description && (
                          <div className="text-xs text-gray-600 mt-1 truncate max-w-xs">
                            {product.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-700">{product.sku}</td>
                    <td className="py-3 px-4 text-gray-600">{product.category || 'Sin categoría'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="bg-blue-100 text-blue-800 font-semibold px-2 py-1 rounded-full">
                        {product.variants?.length || 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex flex-col items-center space-y-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          totalStock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          Stock: {totalStock}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex justify-center space-x-2">
                        {/* Los botones de acción ahora actúan sobre el producto "padre" */}
                        <button 
                          onClick={() => onEdit(product)} 
                          disabled={isActionLoading} 
                          className={`flex items-center gap-1 px-3 py-1 rounded text-sm transition-colors disabled:opacity-50 ${
                            isBeingEdited 
                              ? 'bg-blue-500 text-white hover:bg-blue-600' 
                              : 'bg-yellow-400 text-black hover:bg-yellow-500'
                          }`}
                          title={isBeingEdited ? 'Editando actualmente' : 'Editar producto'}
                        >
                          <FiEdit size={14} />
                          {isBeingEdited ? 'Editando' : 'Editar'}
                        </button>
                        <button 
                          onClick={() => onDelete(product.id)} 
                          disabled={isActionLoading || isBeingEdited} 
                          className="flex items-center gap-1 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm transition-colors disabled:opacity-50"
                          title="Eliminar producto y todas sus variantes"
                        >
                          <FiTrash2 size={14} />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                  
                  {/* --- SUB-TABLA DE VARIANTES EXPANDIBLE --- */}
                  {/* Esta fila solo se renderiza si el producto está expandido */}
                  {expandedProductId === product.id && (
                    <tr className="bg-gray-50">
                      <td></td> {/* Celda vacía para alinear con el botón de expandir */}
                      <td colSpan="6" className="p-4">
                        <div className="bg-white rounded-lg border">
                          <div className="bg-gray-100 px-4 py-2 rounded-t-lg">
                            <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                              🎨 Variantes de Color - "{product.name}"
                              <span className="text-sm font-normal text-gray-500">
                                ({product.variants?.length || 0} variante{(product.variants?.length || 0) !== 1 ? 's' : ''})
                              </span>
                            </h4>
                          </div>
                          
                          {(!product.variants || product.variants.length === 0) ? (
                            <div className="p-4 text-center text-gray-500">
                              No hay variantes registradas para este producto.
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="min-w-full">
                                <thead className="bg-gray-200 text-xs">
                                  <tr>
                                    <th className="py-2 px-3 text-center">Imagen</th>
                                    <th className="py-2 px-3 text-left">Color</th>
                                    <th className="py-2 px-3 text-right">Stock</th>
                                    <th className="py-2 px-3 text-right">Costo</th>
                                    <th className="py-2 px-3 text-right">Menudeo</th>
                                    <th className="py-2 px-3 text-right">Mayoreo</th>
                                    <th className="py-2 px-3 text-center">Imágenes</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {product.variants.map((variant, index) => (
                                    <tr key={variant.variant_id || variant.id || index} className="border-b last:border-b-0 hover:bg-gray-50">
                                      <td className="py-2 px-3 text-center">
                                        <div className="flex justify-center">
                                          <img 
                                            src={variant.image_urls && variant.image_urls.length > 0 ? variant.image_urls[0] : '/rossel-placeholder.webp'} 
                                            alt={`${product.name} - ${variant.color}`} 
                                            className="w-12 h-12 object-cover rounded-md border shadow-sm"
                                            onError={(e) => {
                                              e.target.src = '/rossel-placeholder.webp';
                                            }}
                                          />
                                        </div>
                                      </td>
                                      <td className="py-2 px-3">
                                        <span className="font-medium text-gray-800">{variant.color}</span>
                                      </td>
                                      <td className="py-2 px-3 text-right">
                                        <span className={`font-bold ${
                                          parseInt(variant.stock) > 0 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                          {variant.stock || 0}
                                        </span>
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono text-gray-700">
                                        ${formatPrice(variant.price)}
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono text-gray-700">
                                        ${formatPrice(variant.price_menudeo)}
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono text-gray-700">
                                        ${formatPrice(variant.price_mayoreo)}
                                      </td>
                                      <td className="py-2 px-3 text-center">
                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                          {variant.image_urls?.length || 0} img{(variant.image_urls?.length || 0) !== 1 ? 's' : ''}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ProductList;