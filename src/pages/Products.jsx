/**
 * @file Products.jsx
 * @description Página principal que muestra la colección de productos.
 * ACTUALIZADO: Ahora incluye búsqueda automática desde parámetros de URL
 * FIXED: Problemas de responsividad completamente solucionados
 * NEW: Categorías dinámicas obtenidas de la base de datos
 */
import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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
  FiZap,
  FiX
} from "react-icons/fi";

// Componente para la animación de carga moderna con shimmer
const ModernSkeletonCard = () => (
  <div className="group relative overflow-hidden bg-gradient-to-br from-white to-gray-50 p-3 sm:p-4 lg:p-6 rounded-2xl sm:rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500">
    {/* Shimmer effect usando Tailwind */}
    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
    
    <div className="relative animate-pulse">
      <div className="w-full h-48 sm:h-56 lg:h-72 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl sm:rounded-2xl mb-3 sm:mb-4 lg:mb-6"></div>
      <div className="space-y-2 sm:space-y-3">
        <div className="h-4 sm:h-5 lg:h-6 bg-gray-200 rounded-lg sm:rounded-xl w-3/4"></div>
        <div className="h-3 sm:h-4 bg-gray-200 rounded-md sm:rounded-lg w-1/2"></div>
        <div className="flex justify-between items-center mt-3 sm:mt-4">
          <div className="h-6 sm:h-7 lg:h-8 bg-gray-200 rounded-lg sm:rounded-xl w-1/3"></div>
          <div className="h-8 sm:h-9 lg:h-10 bg-gray-200 rounded-full w-8 sm:w-9 lg:w-10"></div>
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
      relative overflow-hidden px-3 py-2 sm:px-4 sm:py-2 lg:px-6 lg:py-3 rounded-full text-xs sm:text-sm font-medium 
      transition-all duration-300 transform hover:scale-105 active:scale-95
      ${active 
        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25' 
        : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 hover:border-gray-300'
      }
      group
    `}
  >
    {Icon && <Icon className="inline-block w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />}
    <span className="whitespace-nowrap">{children}</span>
    {active && (
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 animate-pulse"></div>
    )}
  </button>
);

const Products = () => {
  // --- ESTADOS ---
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // Estados modernos adicionales
  const [viewMode, setViewMode] = useState("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [priceRange, setPriceRange] = useState("all");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // --- NUEVO: Estado para categorías dinámicas ---
  const [availableCategories, setAvailableCategories] = useState([]);

  // --- URL PARAMS PARA BÚSQUEDA AUTOMÁTICA ---
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // --- LÓGICA DE DATOS ---
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      console.log("LOG: [Products] Iniciando carga de la lista pública de productos...");
      try {
        const { data, error: fetchError } = await supabase.rpc('get_all_products_for_listing');
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

  // --- NUEVO: Extraer categorías dinámicamente cuando se cargan los productos ---
  useEffect(() => {
    if (products.length > 0) {
      console.log("LOG: [Products] Extrayendo categorías únicas de los productos...");
      
      // Extraer categorías únicas y filtrar valores nulos/vacíos
      const uniqueCategories = [...new Set(
        products
          .map(product => product.category)
          .filter(category => category && category.trim() !== "")
      )].sort();
      
      console.log("LOG: [Products] Categorías encontradas:", uniqueCategories);
      
      // Agregar "all" al inicio para mostrar todos los productos
      setAvailableCategories(['all', ...uniqueCategories]);
    }
  }, [products]);

  // --- APLICAR BÚSQUEDA Y CATEGORÍA AUTOMÁTICA DESDE URL ---
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    const urlCategory = searchParams.get('category');
    
    console.log(`LOG: [Products] Verificando parámetros desde URL - search:`, urlSearch, 'category:', urlCategory);
    console.log(`LOG: [Products] Estado actual - searchTerm:`, searchTerm, 'selectedCategory:', selectedCategory);
    
    // Aplicar búsqueda si existe
    if (urlSearch && urlSearch !== searchTerm) {
      console.log(`LOG: [Products] Aplicando búsqueda automática: "${urlSearch}"`);
      setSearchTerm(urlSearch);
    }
    
    // Aplicar categoría si existe y es válida
    if (urlCategory && urlCategory !== selectedCategory) {
      // Verificar que la categoría existe en nuestras categorías disponibles
      if (availableCategories.includes(urlCategory)) {
        console.log(`LOG: [Products] Aplicando filtro de categoría automático: "${urlCategory}"`);
        setSelectedCategory(urlCategory);
        // También abrir los filtros para que el usuario vea qué está activo
        setShowFilters(true);
      } else {
        console.log(`LOG: [Products] Categoría "${urlCategory}" no encontrada en categorías disponibles:`, availableCategories);
      }
    }
  }, [searchParams, searchTerm, selectedCategory, availableCategories]);

  // Lógica de filtrado y ordenamiento mejorada
  const filteredAndSortedProducts = useMemo(() => {
    console.log("LOG: [Products] Recalculando la lista de productos a mostrar...");
    console.log("LOG: [Products] searchTerm actual en filtrado:", searchTerm);
    let processedProducts = [...products];

    // Filtro por búsqueda
    if (searchTerm.trim() !== "") {
      console.log("LOG: [Products] Aplicando filtro de búsqueda:", searchTerm);
      processedProducts = processedProducts.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      console.log("LOG: [Products] Productos después del filtro:", processedProducts.length);
    }

    // Filtro por categoría
    if (selectedCategory !== "all") {
      console.log("LOG: [Products] Aplicando filtro de categoría:", selectedCategory);
      processedProducts = processedProducts.filter(p => 
        p.category === selectedCategory
      );
      console.log("LOG: [Products] Productos después del filtro de categoría:", processedProducts.length);
    }

    // Filtro por rango de precio
    if (priceRange !== "all") {
      console.log("LOG: [Products] Aplicando filtro de precio:", priceRange);
      const [min, max] = priceRange.split("-").map(Number);
      processedProducts = processedProducts.filter(p => 
        p.price_menudeo >= min && (max ? p.price_menudeo <= max : true)
      );
      console.log("LOG: [Products] Productos después del filtro de precio:", processedProducts.length);
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
    
    console.log("LOG: [Products] Lista final filtrada y ordenada para mostrar:", processedProducts);
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

  const clearAllFilters = () => {
    console.log("LOG: [Products] Limpiando todo y navegando");
    // Limpiar todos los parámetros de URL
    navigate("/products", { replace: true });
    setTimeout(() => {
      setSearchTerm("");
      setSelectedCategory("all");
      setPriceRange("all");
      setSortBy("newest");
      setShowFilters(false);
    }, 10);
  };

  // --- NUEVO: Función para obtener el nombre de categoría formateado ---
  const getCategoryDisplayName = (category) => {
    if (category === "all") return "Todas";
    
    // Capitalizar primera letra y mantener el resto como está
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const priceRanges = [
    { value: "all", label: "Todos" },
    { value: "0-500", label: "$0-$500" },
    { value: "500-1000", label: "$500-$1K" },
    { value: "1000-2000", label: "$1K-$2K" },
    { value: "2000", label: "$2K+" }
  ];

  return (
    <>
      {/* Hero Section con gradiente moderno - RESPONSIVE FIXED */}
      <div className="relative overflow-hidden bg-gradient-to-br from-lightpink via-red-500 to-red-800">
        {/* Elementos decorativos de fondo */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0)`,
            backgroundSize: '20px 20px sm:30px sm:30px'
          }}></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
          <div className="text-center">
            <div className="inline-flex items-center px-3 py-1 sm:px-4 sm:py-2 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-xs sm:text-sm font-medium mb-4 sm:mb-6">
              <FiZap className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-yellow-400" />
              Nueva Colección 2025
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-white tracking-tight mb-4 sm:mb-6 leading-tight">
              Descubre Tu
              <span className="block bg-gradient-to-r from-white via-yellow-200 to-yellow-400 bg-clip-text text-transparent">
                Estilo Único
              </span>
            </h1>
            
            <p className="max-w-3xl mx-auto text-base sm:text-lg lg:text-xl text-white/80 mb-8 sm:mb-12 leading-relaxed px-4">
              Explora nuestra colección curada de piezas exclusivas. Donde la calidad se encuentra con el diseño contemporáneo.
            </p>

            {/* Stats modernos - RESPONSIVE FIXED */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 max-w-lg mx-auto mb-6 sm:mb-8">
              <div className="text-center py-2 sm:py-0">
                <div className="text-2xl sm:text-3xl font-bold text-white">{products.length}+</div>
                <div className="text-white/60 text-xs sm:text-sm">Productos</div>
              </div>
              <div className="text-center py-2 sm:py-0">
                <div className="text-2xl sm:text-3xl font-bold text-white">4.9</div>
                <div className="text-white/60 text-xs sm:text-sm flex items-center justify-center">
                  <FiStar className="w-3 h-3 mr-1" /> Rating
                </div>
              </div>
              <div className="text-center py-2 sm:py-0">
                <div className="text-2xl sm:text-3xl font-bold text-white">24h</div>
                <div className="text-white/60 text-xs sm:text-sm">Envío</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
          
          {/* Barra de búsqueda y filtros moderna - COMPLETELY RESPONSIVE */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 lg:mb-12 border border-white/20">
            <div className="flex flex-col gap-4 sm:gap-6">
              
              {/* Barra de búsqueda mejorada - MOBILE FIRST */}
              <div className="w-full">
                <div className={`
                  relative transition-all duration-300 transform
                  ${isSearchFocused ? 'scale-[1.02]' : ''}
                `}>
                  <FiSearch className={`
                    absolute top-1/2 left-3 sm:left-4 -translate-y-1/2 transition-colors duration-300 w-4 h-4 sm:w-5 sm:h-5
                    ${isSearchFocused ? 'text-purple-500' : 'text-gray-400'}
                  `} />
                  <input 
                    type="search"
                    placeholder="Buscar productos..."
                    value={searchTerm}
                    onChange={(e) => {
                      console.log("LOG: [Products] Usuario escribiendo en búsqueda:", e.target.value);
                      setSearchTerm(e.target.value);
                    }}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    className="w-full pl-10 sm:pl-12 pr-10 sm:pr-4 py-3 sm:py-4 border-2 border-gray-200 rounded-xl sm:rounded-2xl focus:ring-2 sm:focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-300 text-base sm:text-lg placeholder-gray-400 bg-white"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => {
                        console.log("LOG: [Products] Limpiando búsqueda");
                        setSearchTerm("");
                      }}
                      className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                    >
                      <FiX className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Controles de vista y ordenamiento - MOBILE OPTIMIZED */}
              <div className="flex flex-col gap-3 sm:gap-4">
                
                {/* Primera fila: Vista y Ordenamiento */}
                <div className="flex gap-3 sm:gap-4">
                  
                  {/* Selector de vista - LARGER TOUCH TARGETS */}
                  <div className="flex bg-gray-100 rounded-lg sm:rounded-xl p-1">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-2 sm:p-3 rounded-md sm:rounded-lg transition-all duration-200 min-w-[44px] ${
                        viewMode === "grid" 
                          ? 'bg-white shadow-md text-purple-600' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <FiGrid className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-2 sm:p-3 rounded-md sm:rounded-lg transition-all duration-200 min-w-[44px] ${
                        viewMode === "list" 
                          ? 'bg-white shadow-md text-purple-600' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <FiList className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Ordenamiento - RESPONSIVE SELECT */}
                  <div className="relative flex-1">
                    <select 
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="appearance-none bg-white pl-3 sm:pl-4 pr-8 sm:pr-12 py-2 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 sm:focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 text-gray-700 font-medium text-sm sm:text-base w-full min-h-[44px]"
                    >
                      <option value="newest">🆕 Más nuevos</option>
                      <option value="popular">🔥 Populares</option>
                      <option value="price-asc">💰 Precio ↑</option>
                      <option value="price-desc">💎 Precio ↓</option>
                      <option value="name">🔤 A-Z</option>
                    </select>
                    <FiChevronDown className="absolute top-1/2 right-2 sm:right-4 -translate-y-1/2 text-gray-400 pointer-events-none w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                </div>

                {/* Segunda fila: Botón de filtros - FULL WIDTH ON MOBILE */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`
                    flex items-center justify-center px-4 sm:px-6 py-3 rounded-lg sm:rounded-xl font-medium transition-all duration-300 text-sm sm:text-base min-h-[44px] w-full sm:w-auto
                    ${showFilters 
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25' 
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <FiFilter className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
                  {availableCategories.length > 1 && (
                    <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                      {availableCategories.length - 1}
                    </span>
                  )}
                </button>
              </div>

              {/* Panel de filtros expandible - MOBILE OPTIMIZED */}
              {showFilters && (
                <div className="mt-4 sm:mt-6 lg:mt-8 pt-4 sm:pt-6 lg:pt-8 border-t border-gray-200 animate-slide-down">
                  <div className="grid grid-cols-1 gap-6 sm:gap-8">
                    
                    {/* Filtros por categoría - AHORA DINÁMICOS */}
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">
                        Categorías 
                        {availableCategories.length > 1 && (
                          <span className="text-sm font-normal text-gray-500 ml-2">
                            ({availableCategories.length - 1} disponibles)
                          </span>
                        )}
                      </h3>
                      <div className="flex flex-wrap gap-2 sm:gap-3">
                        {availableCategories.map((category) => (
                          <FilterChip
                            key={category}
                            active={selectedCategory === category}
                            onClick={() => {
                              console.log("LOG: [Products] Seleccionando categoría:", category);
                              setSelectedCategory(category);
                            }}
                          >
                            {getCategoryDisplayName(category)}
                          </FilterChip>
                        ))}
                      </div>
                      
                      {/* Mostrar mensaje si no hay categorías */}
                      {availableCategories.length <= 1 && (
                        <p className="text-sm text-gray-500 italic">
                          No hay categorías disponibles aún.
                        </p>
                      )}
                    </div>

                    {/* Filtros por precio */}
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Rango de Precio</h3>
                      <div className="flex flex-wrap gap-2 sm:gap-3">
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

                    {/* Botón limpiar filtros */}
                    <div className="flex justify-center pt-2">
                      <button
                        onClick={clearAllFilters}
                        className="text-sm text-gray-500 hover:text-gray-700 underline"
                      >
                        Limpiar todos los filtros
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Indicador de resultados - MOBILE RESPONSIVE */}
          {!loading && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                  {filteredAndSortedProducts.length} productos
                </h2>
                
                {/* Mostrar filtros activos */}
                <div className="flex flex-wrap gap-2">
                  {searchTerm && (
                    <span className="inline-block px-2 sm:px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs sm:text-sm font-medium">
                      para "{searchTerm}"
                    </span>
                  )}
                  {selectedCategory !== "all" && (
                    <span className="inline-block px-2 sm:px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs sm:text-sm font-medium">
                      {getCategoryDisplayName(selectedCategory)}
                    </span>
                  )}
                  {priceRange !== "all" && (
                    <span className="inline-block px-2 sm:px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs sm:text-sm font-medium">
                      {priceRanges.find(p => p.value === priceRange)?.label}
                    </span>
                  )}
                </div>
              </div>
              
              {filteredAndSortedProducts.length > 0 && (
                <div className="flex items-center text-xs sm:text-sm text-gray-500">
                  <FiTrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  Actualizado ahora
                </div>
              )}
            </div>
          )}
          
          {/* Grid de productos - COMPLETELY RESPONSIVE */}
          {loading ? (
            <div className={`
              grid gap-4 sm:gap-6 lg:gap-8 
              ${viewMode === "grid" 
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
                : "grid-cols-1"
              }
            `}>
              {[...Array(8)].map((_, i) => <ModernSkeletonCard key={i} />)}
            </div>
          ) : error ? (
            <div className="text-center py-12 sm:py-20">
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4 sm:mb-6">
                <span className="text-2xl sm:text-3xl">😕</span>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">Oops! Algo salió mal</h3>
              <p className="text-red-500 mb-4 sm:mb-6 text-sm sm:text-base px-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-purple-600 text-white rounded-lg sm:rounded-xl hover:bg-purple-700 transition-colors text-sm sm:text-base"
              >
                Intentar de nuevo
              </button>
            </div>
          ) : filteredAndSortedProducts.length === 0 ? (
            <div className="text-center py-12 sm:py-20">
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4 sm:mb-6">
                <FiSearch className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">No encontramos productos</h3>
              <p className="text-gray-600 mb-6 sm:mb-8 max-w-md mx-auto text-sm sm:text-base px-4">
                Intenta ajustar tus filtros o realiza una búsqueda diferente para encontrar lo que buscas.
              </p>
              <div className="flex justify-center">
                <button
                  onClick={clearAllFilters}
                  className="px-6 sm:px-8 py-2 sm:py-3 bg-purple-600 text-white rounded-lg sm:rounded-xl hover:bg-purple-700 transition-colors font-medium text-sm sm:text-base"
                >
                  Ver todos los productos
                </button>
              </div>
            </div>
          ) : (
            <div className={`
              grid gap-4 sm:gap-6 lg:gap-8 
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