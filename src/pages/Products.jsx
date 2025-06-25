/**
 * @file Products.jsx
 * @description Página principal que muestra la colección de productos.
 * Esta versión final y completa incluye toda la lógica para cargar, filtrar,
 * ordenar y mostrar los productos, y para manejar la apertura del modal de detalles.
 * Funciona con la nueva arquitectura de productos y variantes.
 */
import { useEffect, useState, useMemo } from "react";
import { supabase } from "../services/supabaseClient";
import ProductDetailModal from "../components/ProductDetailModal";
import ProductCard from "../components/ProductCard";
import { FiSearch, FiChevronDown } from "react-icons/fi";

// Componente para la animación de carga (esqueleto)
const SkeletonCard = () => (
  <div className="bg-white p-4 rounded-xl shadow-lg animate-pulse">
    <div className="w-full h-64 bg-gray-200 rounded-md mb-4"></div>
    <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
    <div className="h-8 bg-gray-200 rounded w-1/4 mt-3"></div>
  </div>
);

const Products = () => {
  // --- ESTADOS ---
  const [products, setProducts] = useState([]); // Almacena la lista de productos base desde la BD
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // --- LÓGICA DE DATOS ---
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      console.log("LOG: [Products] Iniciando carga de la lista pública de productos...");
      try {
        const { data, error: fetchError } = await supabase.rpc('get_public_product_list');
        if (fetchError) throw fetchError;
        setProducts(data || []);
        console.log("LOG: [Products] Lista de productos públicos cargada:", data);
      } catch (err) {
        setError(err.message || "Error al cargar productos.");
        console.error("ERROR: [Products] Error al cargar la lista:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);
  
  // --- ¡LÓGICA DE FILTRADO Y ORDENAMIENTO COMPLETA Y CORREGIDA! ---
  // useMemo optimiza el rendimiento, recalculando esta lista solo cuando cambian las dependencias.
  const filteredAndSortedProducts = useMemo(() => {
    console.log("LOG: [Products] Recalculando la lista de productos a mostrar...");
    let processedProducts = [...products];

    // 1. Filtrado por Búsqueda: Se aplica sobre la lista completa primero.
    if (searchTerm.trim() !== "") {
      processedProducts = processedProducts.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 2. Ordenamiento: Se aplica sobre la lista ya filtrada.
    switch (sortBy) {
      case 'price-asc':
        processedProducts.sort((a, b) => a.price_menudeo - b.price_menudeo);
        break;
      case 'price-desc':
        processedProducts.sort((a, b) => b.price_menudeo - a.price_menudeo);
        break;
      case 'newest':
      default:
        processedProducts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
    }
    
    console.log("LOG: [Products] Lista final filtrada y ordenada para mostrar:", processedProducts);
    return processedProducts;

  }, [products, searchTerm, sortBy]);

  // --- MANEJADORES DEL MODAL ---
  const handleOpenModal = (product) => {
    console.log(`LOG: [Products] Abriendo modal para el producto:`, product);
    setSelectedProduct(product); // Guardamos el objeto completo
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    console.log("LOG: [Products] Cerrando modal.");
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  // --- RENDERIZADO ---
  return (
    <>
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          
          <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold text-primary tracking-tight sm:text-5xl">Nuestra Colección</h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-500">Encuentra el estilo que te define. Calidad y diseño en cada pieza.</p>
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-8 p-4 bg-white rounded-xl shadow-md sticky top-20 z-40">
            <div className="relative flex-grow">
              <FiSearch className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
              <input 
                type="search"
                placeholder="Buscar por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
              />
            </div>
            <div className="relative">
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full md:w-56 appearance-none bg-white pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
              >
                <option value="newest">Más nuevos</option>
                <option value="price-asc">Precio: Menor a Mayor</option>
                <option value="price-desc">Precio: Mayor a Menor</option>
              </select>
              <FiChevronDown className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : error ? (
            <div className="text-center py-20 text-red-500">{error}</div>
          ) : filteredAndSortedProducts.length === 0 ? (
             <div className="text-center py-20">
                <h3 className="text-xl font-semibold text-gray-700">No se encontraron productos</h3>
                <p className="text-gray-500 mt-2">Intenta con otros filtros o una búsqueda diferente.</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredAndSortedProducts.map((product) => (
                // Pasamos el objeto 'product' completo al hacer clic
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={() => handleOpenModal(product)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Ahora le pasamos el objeto 'selectedProduct' completo al modal */}
      {isModalOpen && <ProductDetailModal product={selectedProduct} onClose={handleCloseModal} />}
    </>
  );
};

export default Products;


