/**
 * @file Products.jsx - Versión Moderna 2025
 * @description Página de productos completamente renovada con diseño moderno,
 * animaciones fluidas, micro-interacciones y elementos visuales avanzados.
 */
import { useEffect, useState, useMemo } from "react";
import { supabase } from "../services/supabaseClient";
import ProductDetailModal from "../components/ProductDetailModal";
import ProductCard from "../components/ProductCard";
import { 
  FiSearch, 
  FiChevronDown, 
  FiFilter,
  FiGrid,
  FiList,
  FiTrendingUp,
  FiStar,
  FiZap
} from "react-icons/fi";

// Componente para la animación de carga moderna con shimmer
const ModernSkeletonCard = () => (
  <div className="group relative overflow-hidden bg-gradient-to-br from-white to-gray-50 p-6 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500">
    {/* Shimmer effect usando Tailwind */}
    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
    
    <div className="relative animate-pulse">
      <div className="w-full h-72 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl mb-6"></div>
      <div className="space-y-3">
        <div className="h-6 bg-gray-200 rounded-xl w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded-lg w-1/2"></div>
        <div className="flex justify-between items-center mt-4">
          <div className="h-8 bg-gray-200 rounded-xl w-1/3"></div>
          <div className="h-10 bg-gray-200 rounded-full w-10"></div>
        </div>
      </div>
    </div>
  </div>
);

// Componente para filtros avanzados
const FilterChip = ({ active, children, onClick, icon: Icon }) => (
  <button
    onClick={onClick}
    className={`
      relative overflow-hidden px-6 py-3 rounded-full text-sm font-medium 
      transition-all duration-300 transform hover:scale-105 hover:-translate-y-1
      ${active 
        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25' 
        : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 hover:border-gray-300'
      }
      group
    `}
  >
    {Icon && <Icon className="inline-block w-4 h-4 mr-2" />}
    {children}
    {active && (
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 animate-pulse"></div>
    )}
  </button>
);

const Products = () => {
  // Estados base
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // Estados modernos adicionales
  const [viewMode, setViewMode] = useState("grid"); // grid | list
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [priceRange, setPriceRange] = useState("all");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      console.log("LOG: [Products] Iniciando carga de productos...");
      try {
        const { data, error: fetchError } = await supabase.rpc('get_public_product_list');
        if (fetchError) throw fetchError;
        setProducts(data || []);
        console.log("LOG: [Products] Productos cargados:", data);
      } catch (err) {
        setError(err.message || "Error al cargar productos.");
        console.error("ERROR: [Products]", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Lógica de filtrado y ordenamiento mejorada
  const filteredAndSortedProducts = useMemo(() => {
    let processedProducts = [...products];

    // Filtro por búsqueda
    if (searchTerm.trim() !== "") {
      processedProducts = processedProducts.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por categoría (si tienes categorías)
    if (selectedCategory !== "all") {
      processedProducts = processedProducts.filter(p => 
        p.category === selectedCategory
      );
    }

    // Filtro por rango de precio
    if (priceRange !== "all") {
      const [min, max] = priceRange.split("-").map(Number);
      processedProducts = processedProducts.filter(p => 
        p.price_menudeo >= min && (max ? p.price_menudeo <= max : true)
      );
    }

    // Ordenamiento
    switch (sortBy) {
      case 'price-asc':
        processedProducts.sort((a, b) => a.price_menudeo - b.price_menudeo);
        break;
      case 'price-desc':
        processedProducts.sort((a, b) => b.price_menudeo - a.price_menudeo);
        break;
      case 'popular':
        processedProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'name':
        processedProducts.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'newest':
      default:
        processedProducts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
    }
    
    return processedProducts;
  }, [products, searchTerm, sortBy, selectedCategory, priceRange]);

  // Manejadores
  const handleOpenModal = (product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  const categories = ["all", "camisetas", "pantalones", "accesorios"]; // Ajusta según tus categorías
  const priceRanges = [
    { value: "all", label: "Todos los precios" },
    { value: "0-500", label: "$0 - $500" },
    { value: "500-1000", label: "$500 - $1,000" },
    { value: "1000-2000", label: "$1,000 - $2,000" },
    { value: "2000", label: "$2,000+" }
  ];

  return (
    <>
      {/* Hero Section con gradiente moderno */}
      <div className="relative overflow-hidden bg-gradient-to-br from-lightpink via-red-500 to-red-800">
        {/* Elementos decorativos de fondo */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0)`,
            backgroundSize: '30px 30px'
          }}></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm font-medium mb-6 animate-bounce">
              <FiZap className="w-4 h-4 mr-2 text-yellow-400" />
              Nueva Colección 2025
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight mb-6">
              Descubre Tu
              <span className="block bg-gradient-to-r from-white via-yellow-200 to-yellow-400 bg-clip-text text-transparent">
                Estilo Único
              </span>
            </h1>
            
            <p className="max-w-3xl mx-auto text-xl text-white/80 mb-12 leading-relaxed">
              Explora nuestra colección curada de piezas exclusivas. Donde la calidad se encuentra con el diseño contemporáneo.
            </p>

            {/* Stats modernos */}
            <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto mb-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">{products.length}+</div>
                <div className="text-white/60 text-sm">Productos</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">4.9</div>
                <div className="text-white/60 text-sm flex items-center justify-center">
                  <FiStar className="w-3 h-3 mr-1" /> Rating
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">24h</div>
                <div className="text-white/60 text-sm">Envío</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          
          {/* Barra de búsqueda y filtros moderna */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 mb-12 sticky top-4 z-40 border border-white/20">
            <div className="flex flex-col lg:flex-row gap-6">
              
              {/* Barra de búsqueda mejorada */}
              <div className="flex-grow relative">
                <div className={`
                  relative transition-all duration-300 transform
                  ${isSearchFocused ? 'scale-105' : ''}
                `}>
                  <FiSearch className={`
                    absolute top-1/2 left-4 -translate-y-1/2 transition-colors duration-300
                    ${isSearchFocused ? 'text-purple-500' : 'text-gray-400'}
                  `} />
                  <input 
                    type="search"
                    placeholder="Buscar productos, marcas, categorías..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-300 text-lg placeholder-gray-400"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Controles de vista y ordenamiento */}
              <div className="flex items-center gap-4">
                
                {/* Selector de vista */}
                <div className="flex bg-gray-100 rounded-xl p-1">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-3 rounded-lg transition-all duration-200 ${
                      viewMode === "grid" 
                        ? 'bg-white shadow-md text-purple-600' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <FiGrid className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-3 rounded-lg transition-all duration-200 ${
                      viewMode === "list" 
                        ? 'bg-white shadow-md text-purple-600' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <FiList className="w-5 h-5" />
                  </button>
                </div>

                {/* Ordenamiento mejorado */}
                <div className="relative">
                  <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="appearance-none bg-white pl-4 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 text-gray-700 font-medium min-w-[200px]"
                  >
                    <option value="newest">🆕 Más nuevos</option>
                    <option value="popular">🔥 Más populares</option>
                    <option value="price-asc">💰 Precio: Menor a Mayor</option>
                    <option value="price-desc">💎 Precio: Mayor a Menor</option>
                    <option value="name">🔤 Nombre A-Z</option>
                  </select>
                  <FiChevronDown className="absolute top-1/2 right-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>

                {/* Botón de filtros */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`
                    flex items-center px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105
                    ${showFilters 
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25' 
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <FiFilter className="w-5 h-5 mr-2" />
                  Filtros
                </button>
              </div>
            </div>

            {/* Panel de filtros expandible */}
            {showFilters && (
              <div className="mt-8 pt-8 border-t border-gray-200 animate-slide-down">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  
                  {/* Filtros por categoría */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Categorías</h3>
                    <div className="flex flex-wrap gap-3">
                      {categories.map((category) => (
                        <FilterChip
                          key={category}
                          active={selectedCategory === category}
                          onClick={() => setSelectedCategory(category)}
                        >
                          {category === "all" ? "Todas" : category.charAt(0).toUpperCase() + category.slice(1)}
                        </FilterChip>
                      ))}
                    </div>
                  </div>

                  {/* Filtros por precio */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Rango de Precio</h3>
                    <div className="flex flex-wrap gap-3">
                      {priceRanges.map((range) => (
                        <FilterChip
                          key={range.value}
                          active={priceRange === range.value}
                          onClick={() => setPriceRange(range.value)}
                        >
                          {range.label}
                        </FilterChip>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Indicador de resultados */}
          {!loading && (
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800">
                  {filteredAndSortedProducts.length} productos encontrados
                </h2>
                {searchTerm && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                    para "{searchTerm}"
                  </span>
                )}
              </div>
              
              {filteredAndSortedProducts.length > 0 && (
                <div className="flex items-center text-sm text-gray-500">
                  <FiTrendingUp className="w-4 h-4 mr-1" />
                  Actualizado hace un momento
                </div>
              )}
            </div>
          )}
          
          {/* Grid de productos */}
          {loading ? (
            <div className={`
              grid gap-8 
              ${viewMode === "grid" 
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
                : "grid-cols-1"
              }
            `}>
              {[...Array(8)].map((_, i) => <ModernSkeletonCard key={i} />)}
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <div className="w-24 h-24 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-6">
                <span className="text-3xl">😕</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Oops! Algo salió mal</h3>
              <p className="text-red-500 mb-6">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
              >
                Intentar de nuevo
              </button>
            </div>
          ) : filteredAndSortedProducts.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <FiSearch className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">No encontramos productos</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Intenta ajustar tus filtros o realiza una búsqueda diferente para encontrar lo que buscas.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedCategory("all");
                    setPriceRange("all");
                  }}
                  className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
                >
                  Limpiar filtros
                </button>
                <button
                  onClick={() => setSortBy("newest")}
                  className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition-colors"
                >
                  Ver todos los productos
                </button>
              </div>
            </div>
          ) : (
            <div className={`
              grid gap-8 
              ${viewMode === "grid" 
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
                : "grid-cols-1 max-w-4xl mx-auto"
              }
            `}>
              {filteredAndSortedProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="opacity-0 animate-fade-in"
                  style={{
                    animationDelay: `${index * 50}ms`
                  }}
                >
                  <ProductCard
                    product={product}
                    onClick={() => handleOpenModal(product)}
                    viewMode={viewMode}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal mejorado */}
      {isModalOpen && (
        <ProductDetailModal 
          product={selectedProduct} 
          onClose={handleCloseModal}
        />
      )}


    </>
  );
};

export default Products;