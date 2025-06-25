/**
 * App.jsx (Versión Completa con Panel de Usuario)
 * ------------------------------------------------
 * Este es el componente raíz que define la estructura de las rutas de toda la aplicación.
 * Organiza las páginas en tres categorías:
 * 1. Rutas Públicas: Accesibles para cualquier visitante.
 * 2. Rutas Protegidas (Usuario): Requieren que el usuario haya iniciado sesión.
 * 3. Rutas Protegidas (Admin): Requieren que el usuario haya iniciado sesión Y tenga el rol de 'admin'.
 */
import { useEffect } from "react";
import { Routes, Route, useParams, useNavigate, useLocation } from "react-router-dom";

// --- Importación de Componentes de Layout ---
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";

// --- Importación de Páginas Principales ---
import Home from "./pages/Home";
import Products from "./pages/Products";
import Cart from "./pages/Cart";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CheckoutPage from "./pages/CheckoutPage";
import AdminPanel from "./pages/AdminPanel";

// --- Importación de las NUEVAS Páginas del Panel de Usuario ---
import UserDashboardLayout from "./pages/account/UserDashboardLayout";
import ProfileSettings from "./pages/account/ProfileSettings";
import AddressManager from "./pages/account/AddressManager"; // Importamos el nuevo componente
import OrderHistory from "./pages/account/OrderHistory"; // <-- Importamos el componente real

// --- ¡NUEVO! Importación de las Páginas Informativas ---
import ContactPage from "./pages/ContactPage";
import ShippingReturnsPage from "./pages/ShippingReturnsPage";
import FaqPage from "./pages/FaqPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";


// --- Componentes Placeholder para Futuras Secciones ---
// Estos son componentes temporales para que nuestras rutas funcionen.
// Más adelante los reemplazaremos por los componentes reales.
const ProductDetailPage = () => <div>Página de Detalle de Producto (Próximamente)</div>;


/**
 * Componente para la página de confirmación de pedido.
 * Muestra un mensaje de éxito y redirige al inicio después de 5 segundos.
 */
const OrderConfirmationPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    console.log(`OrderConfirmationPage: Mostrando confirmación para el pedido #${orderId}`);
    const timer = setTimeout(() => {
      console.log("OrderConfirmationPage: Redirigiendo al inicio...");
      navigate("/");
    }, 5000);

    // Limpia el temporizador si el usuario navega a otra parte antes de tiempo
    return () => clearTimeout(timer);
  }, [navigate, orderId]);

  return (
    <div className="text-center min-h-[50vh] flex flex-col justify-center items-center p-4">
      <h2 className="text-3xl font-bold text-green-600 mb-4">¡Gracias por tu compra!</h2>
      <p className="text-lg text-gray-700">Tu pedido <span className="font-bold">#{orderId}</span> se ha procesado correctamente.</p>
      <p className="text-gray-500 mt-4">En unos segundos serás redirigido a la página principal...</p>
    </div>
  );
};


function App() {
  // --- LÓGICA DE LAYOUT CONDICIONAL ---
  const location = useLocation(); // Hook para obtener la ruta actual
  const isHomePage = location.pathname === '/'; // Comprobamos si estamos en el Home
  
  console.log(`LOG: [App.jsx] Ruta actual: ${location.pathname}. ¿Es Home? ${isHomePage}`);

  return (
    <div className="flex flex-col min-h-screen bg-lightpink">
      <Navbar />
      {/* --- ¡AQUÍ ESTÁ LA SOLUCIÓN DEFINITIVA! --- */}
      {/* Aplicamos el padding-top solo si NO estamos en la página de inicio. */}
      <main className={`flex-grow ${!isHomePage ? 'pt-20' : ''}`}>
        <Routes>
          
          {/* --- 1. RUTAS PÚBLICAS --- */}
          {/* Accesibles para todos los visitantes, hayan iniciado sesión o no. */}
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:productId" element={<ProductDetailPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* --- ¡NUEVO! Rutas para las páginas informativas --- */}
          <Route path="/contacto" element={<ContactPage />} />
          <Route path="/envios" element={<ShippingReturnsPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/privacidad" element={<PrivacyPolicyPage />} />
          
          {/* --- 2. RUTAS PROTEGIDAS PARA USUARIOS LOGUEADOS --- */}
          {/* El componente <ProtectedRoute> envuelve estas rutas, asegurando
              que solo usuarios autenticados puedan acceder a ellas. */}
          <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
          <Route path="/orden-confirmada/:orderId" element={<ProtectedRoute><OrderConfirmationPage /></ProtectedRoute>} />

          {/* ▼▼▼ SECCIÓN NUEVA: Panel de "Mi Cuenta" ▼▼▼ */}
          <Route 
            path="/mi-cuenta" 
            element={<ProtectedRoute><UserDashboardLayout /></ProtectedRoute>}
          >
            {/* La ruta 'index' es la que se muestra por defecto al entrar a /mi-cuenta */}
            <Route index element={<ProfileSettings />} />
            <Route path="perfil" element={<ProfileSettings />} />
            <Route path="direcciones" element={<AddressManager />} />
            <Route path="pedidos" element={<OrderHistory />} />
          </Route>

          {/* --- 3. RUTA PROTEGIDA SOLO PARA ADMINISTRADORES --- */}
          {/* Pasamos la prop 'requireAdmin={true}' a ProtectedRoute para que verifique
              no solo si el usuario está logueado, sino también si su rol es 'admin'. */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminPanel />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;