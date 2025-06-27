/**
 * @file Navbar.jsx
 * @description Barra de navegación final, dinámica e inteligente.
 * Esta versión definitiva incluye todas las mejoras de diseño:
 * - Logo de tamaño prominente con ajuste responsivo (h-12/h-16/h-20).
 * - Padding optimizado para evitar que la navbar se vea muy ancha en escritorio.
 * - Fondo que transiciona de transparente a un rosa personalizado.
 * - Cierre automático del menú móvil.
 * - ¡NUEVO! Un efecto de hover con una línea animada que usa el color primario
 * de la marca para una experiencia de usuario premium y elegante.
 * 
 * @version 2.1
 * @changelog
 * - v2.1: Agregado logo responsivo (h-12 md:h-16 lg:h-20) y padding optimizado (py-3 md:py-2 lg:py-1)
 * - v2.0: Implementación de línea animada en hover y estructura NavLink
 * - v1.0: Versión base con funcionalidad completa
 */
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useUser } from "../context/UserContext";
import { useScrollPosition } from "../hooks/useScrollPosition";
import toast, { Toaster } from "react-hot-toast";

/**
 * @name NavLink
 * @description Un sub-componente reutilizable para los enlaces de navegación.
 * Encapsula el enlace de React Router y el efecto de hover con la línea animada.
 * @param {string} to - Ruta de destino del enlace
 * @param {function} onClick - Función a ejecutar al hacer clic
 * @param {ReactNode} children - Contenido del enlace
 */
const NavLink = ({ to, onClick, children }) => {
  console.log(`LOG: [NavLink] Renderizando enlace hacia: ${to}`);
  
  return (
    <Link 
      to={to} 
      onClick={() => {
        console.log(`LOG: [NavLink] Usuario navegando a: ${to}`);
        onClick && onClick();
      }} 
      className="relative group py-2 md:py-0 text-white transition-colors duration-200"
    >
      <span>{children}</span>
      {/* Esta es la línea animada que aparece en el hover */}
      <span className="absolute bottom-[-2px] left-0 block w-full h-0.5 bg-[#b91c1c] transform scale-x-0 transition-transform duration-300 ease-in-out group-hover:scale-x-100"></span>
    </Link>
  );
};

const Navbar = () => {
  console.log("LOG: [Navbar] Componente Navbar renderizándose...");
  
  // --- ESTADOS Y HOOKS ---
  const [menuOpen, setMenuOpen] = useState(false);
  const { cart } = useCart();
  const { user, logout, loading } = useUser();
  const scrollPosition = useScrollPosition();
  const location = useLocation();
  const navigate = useNavigate();

  console.log(`LOG: [Navbar] Estado actual - Usuario: ${user?.email || 'No autenticado'}, Carrito: ${cart.length} items, Scroll: ${scrollPosition}px`);

  // --- LÓGICA DE ESTILO DINÁMICO ---
  const isTransparent = location.pathname === '/' && scrollPosition < 50;
  console.log(`LOG: [Navbar] Navbar transparente: ${isTransparent} (Ruta: ${location.pathname}, Scroll: ${scrollPosition})`);

 // ACTUALIZADO: Color de navbar que conecta con el gradiente del hero
  const navbarClasses = `
    w-full fixed top-0 left-0 z-50 transition-all duration-300 ease-in-out px-4 py-3 md:py-2 lg:py-1
    ${isTransparent ? 'bg-transparent' : 'bg-red-300 shadow-lg'}
  `;
  
  // --- MANEJADORES DE EVENTOS ---
  const closeMobileMenu = () => {
    console.log("LOG: [Navbar] Cerrando menú móvil.");
    setMenuOpen(false);
  };

  const handleLogout = async () => {
    console.log("LOG: [Navbar] El usuario hizo clic en 'Cerrar sesión'.");
    try {
      await logout();
      toast.success("Sesión cerrada exitosamente");
      console.log("LOG: [Navbar] Sesión cerrada exitosamente, redirigiendo al inicio.");
      // Redirigimos al inicio ('/') en lugar de al login para una mejor UX.
      navigate("/");
      closeMobileMenu();
    } catch (error) {
      console.error("ERROR: [Navbar] Error al cerrar sesión:", error);
      toast.error("Error al cerrar sesión");
    }
  };

  const handleCartClick = (e) => {
    console.log(`LOG: [Navbar] Usuario hizo clic en carrito. Usuario autenticado: ${!!user}`);
    
    if (!user) {
      e.preventDefault();
      console.log("LOG: [Navbar] Usuario no autenticado, mostrando mensaje y redirigiendo al login.");
      toast.error("Debes iniciar sesión para ver tu carrito.");
      setTimeout(() => {
        console.log("LOG: [Navbar] Redirigiendo a login tras 1.5 segundos.");
        navigate("/login");
      }, 1500);
    }
    closeMobileMenu();
  };

  const handleMenuToggle = () => {
    const newMenuState = !menuOpen;
    console.log(`LOG: [Navbar] Alternando menú móvil. Nuevo estado: ${newMenuState ? 'Abierto' : 'Cerrado'}`);
    setMenuOpen(newMenuState);
  };

  const handleLogoClick = () => {
    console.log("LOG: [Navbar] Usuario hizo clic en el logo, navegando al inicio.");
    closeMobileMenu();
  };

  // --- RENDERIZADO ---
  console.log("LOG: [Navbar] Renderizando componente completo.");
  
  return (
    <nav className={navbarClasses}>
      <Toaster position="top-right" />
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* LOGO ACTUALIZADO: Ahora con tamaños responsivos optimizados */}
        <Link to="/" onClick={handleLogoClick} className="flex-shrink-0">
          <img 
            src="/rossel-logo.webp" 
            alt="Rossel Logo" 
            className="h-12 md:h-16 lg:h-20 transition-all duration-300 hover:opacity-80"
            onLoad={() => console.log("LOG: [Navbar] Logo cargado exitosamente.")}
            onError={() => console.error("ERROR: [Navbar] Error al cargar el logo.")}
          />
        </Link>

        {/* Botón de menú para móviles */}
        <button
          className="md:hidden text-white text-3xl z-20"
          onClick={handleMenuToggle}
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
        >
          {menuOpen ? '×' : '☰'}
        </button>
        
        {/* Contenedor de los enlaces de navegación */}
        <div
          className={`
            absolute top-0 left-0 w-full h-screen pt-24 md:h-auto md:pt-0 md:static md:w-auto
            flex flex-col items-center gap-8 md:flex-row md:gap-6
            transition-transform duration-300 ease-in-out text-white text-lg md:text-base
            bg-[#CD919E] md:bg-transparent
            ${menuOpen ? 'translate-x-0' : '-translate-x-full'}
            md:translate-x-0
          `}
        >
          <NavLink to="/" onClick={closeMobileMenu}>Inicio</NavLink>
          <NavLink to="/products" onClick={closeMobileMenu}>Productos</NavLink>
          
          {/* Enlace del carrito con estructura consistente */}
          <Link 
            to="/cart" 
            onClick={handleCartClick} 
            className="relative group py-2 md:py-0 text-white transition-colors duration-200"
          >
            <span>
              Carrito
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-3 md:top-0 md:-right-4 bg-white text-[#b91c1c] text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                  {cart.length}
                </span>
              )}
            </span>
            <span className="absolute bottom-[-2px] left-0 block w-full h-0.5 bg-[#b91c1c] transform scale-x-0 transition-transform duration-300 ease-in-out group-hover:scale-x-100"></span>
          </Link>
          
          {/* Sección de autenticación */}
          {!loading && (
            <>
              {!user ? (
                <NavLink to="/login" onClick={closeMobileMenu}>Iniciar sesión</NavLink>
              ) : (
                <>
                  {user.role === "admin" && (
                    <NavLink to="/admin" onClick={closeMobileMenu}>Panel Admin</NavLink>
                  )}
                  {user.role === "client" && (
                    <NavLink to="/mi-cuenta/perfil" onClick={closeMobileMenu}>Mi Cuenta</NavLink>
                  )}
                  <button 
                    onClick={handleLogout} 
                    className="relative group text-white transition-colors duration-200"
                    aria-label="Cerrar sesión"
                  >
                     <span>Cerrar sesión</span>
                     <span className="absolute bottom-[-2px] left-0 block w-full h-0.5 bg-[#b91c1c] transform scale-x-0 transition-transform duration-300 ease-in-out group-hover:scale-x-100"></span>
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;