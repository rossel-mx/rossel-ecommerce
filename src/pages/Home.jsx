/**
 * @file Home.jsx
 * @description Página de inicio final y dinámica, completamente adaptada a la nueva
 * arquitectura de base de datos. Mantiene el diseño de alto impacto con múltiples
 * secciones animadas y corrige la lógica de carga de datos para "Favorito del Mes"
 * y "Recién Llegados".
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
  "/banner/banner-hero.webp", // Asegúrate de tener esta imagen principal
  "/banner/banner2.webp",
  "/banner/banner3.webp"
];

const Home = () => {
  // --- ESTADOS ---
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [favoriteProduct, setFavoriteProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null); // Guardará el objeto completo
  const [currentSlide, setCurrentSlide] = useState(0);

  // --- LÓGICA DE DATOS (CORREGIDA) ---
  useEffect(() => {
    // Lógica para el slider del banner
    const sliderInterval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);

    // Lógica para cargar los datos de los productos
    const fetchHomeData = async () => {
      console.log("LOG: [Home] Montado. Iniciando carga de datos con la nueva lógica...");
      try {
        // --- ¡AQUÍ ESTÁ LA CORRECCIÓN! ---
        // Llamamos a la función RPC que ya creamos y funciona.
        // Nos devuelve una lista de productos "padre" listos para mostrar.
        const { data: products, error: fetchError } = await supabase.rpc('get_public_product_list');
        if (fetchError) throw fetchError;

        if (products && products.length > 0) {
          console.log("LOG: [Home] Datos públicos de productos cargados:", products);
          
          // Los más nuevos ya vienen primero por el 'ORDER BY' de la función SQL.
          setFeaturedProducts(products.slice(0, 3));
          
          // Asignamos el primer producto de la lista como el "Favorito del Mes".
          setFavoriteProduct(products[0]);
        }
        
      } catch (error) {
        console.error("ERROR: [Home] Error al cargar los datos de la página:", error);
      }
    };

    fetchHomeData();

    // Función de limpieza para el intervalo del slider
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
  
  // --- LÓGICA DE IMAGEN PARA EL FAVORITO DEL MES ---
  const hasFavoriteImage = favoriteProduct?.image_url;
  const favoriteImageUrl = hasFavoriteImage ? favoriteProduct.image_url : '/rossel-placeholder.webp';
  const favoriteImageFitClass = hasFavoriteImage ? 'object-cover' : 'object-contain p-8';

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
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">Estilo que te Acompaña a Cada Paso</h1>
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
              <div className="group relative overflow-hidden rounded-lg shadow-lg"><img src="/categories/bolsas.webp" alt="Bolsas de Mano" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"/><div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center"><h3 className="text-2xl font-bold text-white">Bolsas de Mano</h3></div></div>
              <div className="group relative overflow-hidden rounded-lg shadow-lg"><img src="/categories/mochilas.webp" alt="Mochilas Urbanas" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"/><div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center"><h3 className="text-2xl font-bold text-white">Mochilas Urbanas</h3></div></div>
              <div className="group relative overflow-hidden rounded-lg shadow-lg"><img src="/categories/accesorios.webp" alt="Accesorios" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"/><div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center"><h3 className="text-2xl font-bold text-white">Accesorios</h3></div></div>
            </div>
          </Fade>
        </div>
        
        {/* --- 3. SECCIÓN FAVORITO DEL MES --- */}
        {favoriteProduct && (
          <div className="bg-white overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <Slide direction="left" triggerOnce>
                <div className="w-full h-96 rounded-lg shadow-xl overflow-hidden bg-gray-100">
                  <img src={favoriteImageUrl} alt={favoriteProduct.name} className={`w-full h-full ${favoriteImageFitClass}`} />
                </div>
              </Slide>
              <Slide direction="right" triggerOnce>
                <div className="text-center md:text-left">
                  <h3 className="text-sm font-bold text-primary uppercase tracking-widest">Favorito del Mes</h3>
                  <h2 className="text-4xl font-bold text-gray-800 mt-2">{favoriteProduct.name}</h2>
                  <p className="mt-4 text-gray-600">{favoriteProduct.description}</p>
                  <button onClick={() => handleOpenModal(favoriteProduct)} className="mt-8 bg-primary text-white px-8 py-3 rounded-lg text-lg font-bold hover:bg-red-700 transition-transform duration-300 hover:scale-105">
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
              <p className="mt-4 text-lg text-red-100">Creemos que un bolso es más que un accesorio. Es un compañero de viaje. Por eso, cada pieza Rossel está diseñada con atención al detalle, materiales de calidad y un estilo que perdura.</p>
            </Fade>
          </div>
        </div>

        {/* --- 5. SECCIÓN PRODUCTOS DESTACADOS --- */}
        <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8 text-center">
          <Slide direction="down" triggerOnce><h2 className="text-3xl font-bold text-primary mb-12">Recién Llegados</h2></Slide>
          {featuredProducts.length > 0 && (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <Fade cascade damping={0.1} triggerOnce>
                {featuredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} onClick={() => handleOpenModal(product)} />
                ))}
              </Fade>
            </div>
          )}
          <Fade direction="up" triggerOnce>
            <Link to="/products" className="mt-12 inline-block bg-primary text-white px-6 py-3 rounded-lg hover:bg-red-700 transition">
              Ver Toda la Colección
            </Link>
          </Fade>
        </div>
      </main>

      {isModalOpen && <ProductDetailModal product={selectedProduct} onClose={handleCloseModal} />}
    </>
  );
};

export default Home;
