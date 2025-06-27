/**
 * @file Home.jsx - REESCRITO DESDE CERO
 * @description Página de inicio con videos funcionando correctamente
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  // Estados principales
  const [recentProducts, setRecentProducts] = useState([]);
  const [weeklyFavorite, setWeeklyFavorite] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados para videos
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [videoRefs] = useState({});
  
  const navigate = useNavigate();

  // Cargar datos
  useEffect(() => {
    const sliderInterval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);

    const fetchHomeData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Cargar Favorito de la Semana
        const { data: favoriteData, error: favoriteError } = await supabase
          .rpc('get_weekly_favorite_product');
        
        if (favoriteError) throw new Error(`Error al cargar favorito: ${favoriteError.message}`);
        
        if (favoriteData && favoriteData.length > 0) {
          setWeeklyFavorite(favoriteData[0]);
        }

        // Cargar Recién Llegados
        const { data: recentData, error: recentError } = await supabase
          .rpc('get_recent_products', { limit_count: 3 });
        
        if (recentError) throw new Error(`Error al cargar recientes: ${recentError.message}`);
        
        if (recentData && recentData.length > 0) {
          setRecentProducts(recentData);
        } else {
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
    return () => clearInterval(sliderInterval);
  }, []);

  // Configuración de categorías
  const categories = [
    {
      id: 'bolsas',
      title: 'Bolsas de Mano',
      video: '/categories/bolsas.webm',
      description: 'Elegancia y funcionalidad en cada diseño',
      searchKeyword: 'bolsa'
    },
    {
      id: 'mochilas', 
      title: 'Mochilas',
      video: '/categories/mochilas.webm',
      description: 'Estilo urbano para tu día a día',
      searchKeyword: 'mochila'
    },
    {
      id: 'carteras',
      title: 'Carteras de Fiesta',
      video: '/categories/carteras.webm', 
      description: 'Sofisticación para ocasiones especiales',
      searchKeyword: 'cartera'
    }
  ];

  // Manejadores de video SIMPLES
  const handleVideoMouseEnter = async (categoryId) => {
    console.log(`LOG: [Video] Mouse ENTER en ${categoryId}`);
    setHoveredCategory(categoryId);
    const video = videoRefs[categoryId];
    if (video) {
      try {
        video.currentTime = 0;
        await video.play();
        console.log(`LOG: [Video] ${categoryId} INICIADO correctamente`);
      } catch (error) {
        console.log(`ERROR: [Video] ${categoryId} no pudo reproducirse:`, error);
      }
    }
  };

  const handleVideoMouseLeave = (categoryId) => {
    console.log(`LOG: [Video] Mouse LEAVE en ${categoryId}`);
    setHoveredCategory(null);
    const video = videoRefs[categoryId];
    if (video) {
      video.pause();
      video.currentTime = 0;
      console.log(`LOG: [Video] ${categoryId} PAUSADO correctamente`);
    }
  };

  // Navegación a productos
  const navigateToProducts = (searchKeyword) => {
    console.log(`LOG: [Navigation] Navegando a productos con: ${searchKeyword}`);
    navigate(`/products?search=${encodeURIComponent(searchKeyword)}`);
  };

  // Manejadores del modal
  const handleOpenModal = (product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };
  
  // Lógica de imagen para favorito
  const favoriteImageUrl = weeklyFavorite?.image_url || '/rossel-placeholder.webp';
  const isPlaceholderImage = !weeklyFavorite?.image_url || weeklyFavorite.image_url === '/rossel-placeholder.webp';
  const favoriteImageFitClass = isPlaceholderImage ? 'object-contain p-8' : 'object-cover';

  return (
    <>
      <main className="bg-lightpink">
        {/* SECCIÓN HÉROE */}
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

        {/* SECCIÓN DE CATEGORÍAS CON VIDEOS */}
        <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8 text-center">
          <Slide direction="down" triggerOnce>
            <h2 className="text-3xl font-bold text-primary mb-4">Nuestras Categorías</h2>
            <p className="text-gray-600 mb-12 max-w-2xl mx-auto">
              Descubre nuestra colección cuidadosamente curada para cada momento de tu vida
            </p>
          </Slide>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {categories.map((category, index) => {
              const isHovered = hoveredCategory === category.id;
              const isOtherHovered = hoveredCategory && hoveredCategory !== category.id;

              return (
                <div
                  key={category.id}
                  className={`
                    relative overflow-hidden rounded-2xl shadow-xl
                    transition-all duration-500 ease-out
                    ${isHovered 
                      ? 'scale-110 z-20 shadow-2xl' 
                      : isOtherHovered 
                        ? 'scale-95 opacity-75' 
                        : 'scale-100'
                    }
                  `}
                  onMouseEnter={() => handleVideoMouseEnter(category.id)}
                  onMouseLeave={() => handleVideoMouseLeave(category.id)}
                >
                  {/* Contenedor del video */}
                  <div className="relative w-full aspect-[4/3] overflow-hidden">
                    <video
                      ref={(el) => {
                        if (el) {
                          videoRefs[category.id] = el;
                        }
                      }}
                      className="w-full h-full object-cover"
                      muted
                      loop
                      playsInline
                      preload="auto"
                    >
                      <source src={category.video} type="video/webm" />
                      Tu navegador no soporta videos HTML5.
                    </video>

                    {/* Overlay de gradiente */}
                    <div className={`
                      absolute inset-0 transition-all duration-500
                      ${isHovered 
                        ? 'bg-gradient-to-t from-black/60 via-black/20 to-transparent' 
                        : 'bg-gradient-to-t from-black/70 via-black/30 to-black/10'
                      }
                    `}></div>

                    {/* Contenido de texto */}
                    <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
                      <div className={`
                        transition-all duration-300
                        ${isHovered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-90'}
                      `}>
                        <h3 className={`
                          font-bold text-white mb-2 transition-all duration-300
                          ${isHovered ? 'text-2xl' : 'text-xl'}
                        `}>
                          {category.title}
                        </h3>
                        
                        <p className={`
                          text-gray-200 text-sm leading-relaxed transition-all duration-300
                          ${isHovered ? 'opacity-100' : 'opacity-0'}
                        `}>
                          {category.description}
                        </p>

                        {/* Botón que aparece solo en hover */}
                        {isHovered && (
                          <button
                            onClick={() => navigateToProducts(category.searchKeyword)}
                            className="mt-4 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg border border-white/30 hover:bg-white/30 transition-all duration-200"
                          >
                            Ver productos
                          </button>
                        )}
                      </div>

                      {/* Indicador de play */}
                      {isHovered && (
                        <div className="absolute top-4 right-4">
                          <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Indicaciones */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 italic">
              ✨ Pasa el mouse para ver el video • 🖱️ Haz click en "Ver productos" para explorar
            </p>
          </div>
        </div>
        
        {/* FAVORITO DE LA SEMANA */}
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
        
        {/* SECCIÓN DE MANIFIESTO */}
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

        {/* RECIÉN LLEGADOS */}
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

      {/* Modal */}
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