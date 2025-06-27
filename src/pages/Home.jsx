/**
 * @file Home.jsx
 * @description Página de inicio completamente actualizada con las nuevas funciones RPC.
 * Incluye "Favorito de la Semana" con rotación automática cada 7 días y 
 * "Recién Llegados" basado en los productos más recientes del catálogo.
 *
 * NUEVAS CARACTERÍSTICAS:
 * - ✅ Favorito de la Semana con rotación automática
 * - ✅ Recién Llegados basados en fecha de creación
 * - ✅ Funciones RPC optimizadas para rendimiento
 * - ✅ Manejo de errores mejorado
 * - ✅ Compatible con ProductCard existente
 *
 * @requires react
 * @requires react-router-dom
 * @requires supabaseClient
 * @requires react-awesome-reveal
 * @requires ../components/ProductCard
 * @requires ../components/ProductDetailModal
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import ProductCard from "../components/ProductCard";
import ProductDetailModal from "../components/ProductDetailModal";
import { Fade, Slide } from "react-awesome-reveal";

// Imágenes del banner
const slides = [
  "/banner/banner-hero.webp",
  "/banner/banner2.webp",
  "/banner/banner3.webp"
];

const Home = () => {
  // --- ESTADOS ---
  const [recentProducts, setRecentProducts] = useState([]);
  const [weeklyFavorite, setWeeklyFavorite] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- LÓGICA DE DATOS CON NUEVAS FUNCIONES RPC ---
  useEffect(() => {
    // Configurar slider del banner
    const sliderInterval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);

    // Cargar datos de la página de inicio
    const fetchHomeData = async () => {
      setLoading(true);
      setError(null);
      console.log("LOG: [Home] Iniciando carga de datos con nuevas funciones RPC...");
      
      try {
        // Cargar Favorito de la Semana
        console.log("LOG: [Home] Cargando favorito de la semana...");
        const { data: favoriteData, error: favoriteError } = await supabase
          .rpc('get_weekly_favorite_product');
        
        if (favoriteError) {
          console.error("ERROR: [Home] Error al cargar favorito de la semana:", favoriteError);
          throw new Error(`Error al cargar favorito: ${favoriteError.message}`);
        }
        
        if (favoriteData && favoriteData.length > 0) {
          setWeeklyFavorite(favoriteData[0]);
          console.log("LOG: [Home] Favorito de la semana cargado:", favoriteData[0]);
        } else {
          console.warn("WARN: [Home] No se encontró favorito de la semana");
        }

        // Cargar Recién Llegados (últimos 3 productos)
        console.log("LOG: [Home] Cargando productos recién llegados...");
        const { data: recentData, error: recentError } = await supabase
          .rpc('get_recent_products', { limit_count: 3 });
        
        if (recentError) {
          console.error("ERROR: [Home] Error al cargar productos recientes:", recentError);
          throw new Error(`Error al cargar recientes: ${recentError.message}`);
        }
        
        if (recentData && recentData.length > 0) {
          setRecentProducts(recentData);
          console.log("LOG: [Home] Productos recientes cargados:", recentData);
        } else {
          console.warn("WARN: [Home] No se encontraron productos recientes");
          setRecentProducts([]);
        }

      } catch (err) {
        console.error("ERROR: [Home] Error general al cargar datos:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();

    // Cleanup del slider
    return () => clearInterval(sliderInterval);
  }, []);

  // --- MANEJADORES DEL MODAL ---
  const handleOpenModal = (product) => {
    console.log(`LOG: [Home] Abriendo modal para el producto:`, product);
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };
  
  // --- LÓGICA DE IMAGEN PARA EL FAVORITO DE LA SEMANA ---
  const favoriteImageUrl = weeklyFavorite?.image_url || '/rossel-placeholder.webp';
  const isPlaceholderImage = !weeklyFavorite?.image_url || weeklyFavorite.image_url === '/rossel-placeholder.webp';
  const favoriteImageFitClass = isPlaceholderImage ? 'object-contain p-8' : 'object-cover';

  // --- RENDERIZADO ---
  return (
    <>
      <main className="bg-lightpink">
        {/* --- 1. SECCIÓN DE HÉROE --- */}
        <section 
          className="relative h-screen flex items-center justify-center text-center text-white bg-cover bg-center"
          style={{ backgroundImage: "url('/banner/banner-hero.webp')" }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-40"></div>
          <div className="relative z-10 p-4">
            <Fade direction="down" cascade damping={0.3} triggerOnce>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
                Estilo que te Acompaña a Cada Paso
              </h1>
              <p className="mt-4 max-w-2xl mx-auto text-lg md:text-xl text-gray-200">
                Descubre diseños únicos que no solo complementan tu look, sino que cuentan tu historia.
              </p>
            </Fade>
            <Fade direction="up" delay={500} triggerOnce>
              <Link 
                to="/products" 
                className="mt-8 inline-block bg-primary text-white px-8 py-3 rounded-lg text-lg font-bold hover:bg-red-700 transition-transform duration-300 hover:scale-105"
              >
                Explorar la Colección
              </Link>
            </Fade>
          </div>
        </section>

        {/* --- 2. SECCIÓN DE CATEGORÍAS --- */}
        <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8 text-center">
          <Slide direction="down" triggerOnce>
            <h2 className="text-3xl font-bold text-primary mb-12">Nuestras Categorías</h2>
          </Slide>
          <Fade cascade damping={0.1} triggerOnce>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="group relative overflow-hidden rounded-lg shadow-lg">
                <img 
                  src="/categories/bolsas.webp" 
                  alt="Bolsas de Mano" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                  <h3 className="text-2xl font-bold text-white">Bolsas de Mano</h3>
                </div>
              </div>
              <div className="group relative overflow-hidden rounded-lg shadow-lg">
                <img 
                  src="/categories/mochilas.webp" 
                  alt="Mochilas Urbanas" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                  <h3 className="text-2xl font-bold text-white">Mochilas Urbanas</h3>
                </div>
              </div>
              <div className="group relative overflow-hidden rounded-lg shadow-lg">
                <img 
                  src="/categories/accesorios.webp" 
                  alt="Accesorios" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                  <h3 className="text-2xl font-bold text-white">Accesorios</h3>
                </div>
              </div>
            </div>
          </Fade>
        </div>
        
        {/* --- 3. SECCIÓN FAVORITO DE LA SEMANA --- */}
        {loading ? (
          <div className="bg-white overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div className="w-full h-96 rounded-lg bg-gray-200 animate-pulse"></div>
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3"></div>
                <div className="h-8 bg-gray-200 rounded animate-pulse w-2/3"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                <div className="h-12 bg-gray-200 rounded animate-pulse w-1/2 mt-8"></div>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8 text-center">
              <div className="text-red-500 mb-4">
                <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Error al cargar contenido</h3>
              <p className="text-gray-600">{error}</p>
            </div>
          </div>
        ) : weeklyFavorite && (
          <div className="bg-white overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <Slide direction="left" triggerOnce>
                <div className="w-full h-96 rounded-lg shadow-xl overflow-hidden bg-gray-100">
                  <img 
                    src={favoriteImageUrl} 
                    alt={weeklyFavorite.name} 
                    className={`w-full h-full ${favoriteImageFitClass}`} 
                  />
                </div>
              </Slide>
              <Slide direction="right" triggerOnce>
                <div className="text-center md:text-left">
                  <h3 className="text-sm font-bold text-primary uppercase tracking-widest">
                    Favorito de la Semana
                  </h3>
                  <h2 className="text-4xl font-bold text-gray-800 mt-2">
                    {weeklyFavorite.name}
                  </h2>
                  <p className="mt-4 text-gray-600">
                    {weeklyFavorite.description}
                  </p>
                  <div className="mt-4 flex items-center gap-2 justify-center md:justify-start">
                    <span className="text-sm text-gray-500">Color disponible:</span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                      {weeklyFavorite.color}
                    </span>
                  </div>
                  <button 
                    onClick={() => handleOpenModal(weeklyFavorite)} 
                    className="mt-8 bg-primary text-white px-8 py-3 rounded-lg text-lg font-bold hover:bg-red-700 transition-transform duration-300 hover:scale-105"
                  >
                    Ver Detalles
                  </button>
                </div>
              </Slide>
            </div>
          </div>
        )}
        
        {/* --- 4. SECCIÓN DE MANIFIESTO --- */}
        <div className="bg-primary text-white">
          <div className="max-w-4xl mx-auto px-4 py-12 text-center">
            <Fade cascade damping={0.2} triggerOnce>
              <h2 className="text-3xl font-bold">Diseñado en Guadalajara, con Pasión por la Calidad</h2>
              <p className="mt-4 text-lg text-red-100">
                Creemos que un bolso es más que un accesorio. Es un compañero de viaje. 
                Por eso, cada pieza Rossel está diseñada con atención al detalle, 
                materiales de calidad y un estilo que perdura.
              </p>
            </Fade>
          </div>
        </div>

        {/* --- 5. SECCIÓN RECIÉN LLEGADOS --- */}
        <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8 text-center">
          <Slide direction="down" triggerOnce>
            <h2 className="text-3xl font-bold text-primary mb-12">Recién Llegados</h2>
          </Slide>
          
          {loading ? (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-lg p-4 animate-pulse">
                  <div className="w-full h-64 bg-gray-200 rounded mb-4"></div>
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : recentProducts.length > 0 ? (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <Fade cascade damping={0.1} triggerOnce>
                {recentProducts.map((product) => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    onClick={() => handleOpenModal(product)} 
                  />
                ))}
              </Fade>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No hay productos recientes</h3>
              <p className="text-gray-500">Próximamente agregaremos nuevos productos a nuestro catálogo.</p>
            </div>
          )}
          
          <Fade direction="up" triggerOnce>
            <Link 
              to="/products" 
              className="mt-12 inline-block bg-primary text-white px-6 py-3 rounded-lg hover:bg-red-700 transition"
            >
              Ver Toda la Colección
            </Link>
          </Fade>
        </div>
      </main>

      {/* Modal de detalles del producto */}
      {isModalOpen && (
        <ProductDetailModal 
          product={selectedProduct} 
          onClose={handleCloseModal} 
        />
      )}
    </>
  );
};

export default Home;