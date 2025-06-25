/**
 * App.jsx (Versión Completa con Panel de Usuario)
 * ------------------------------------------------
 * Este es el componente raíz que define la estructura de las rutas de toda la aplicación.
 */
import { Routes, Route, useLocation } from "react-router-dom";

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

// --- Importación de las Páginas del Panel de Usuario ---
import UserDashboardLayout from "./pages/account/UserDashboardLayout";
import ProfileSettings from "./pages/account/ProfileSettings";
import AddressManager from "./pages/account/AddressManager";
import OrderHistory from "./pages/account/OrderHistory";

// --- Importación de las Páginas Informativas ---
import ContactPage from "./pages/ContactPage";
import ShippingReturnsPage from "./pages/ShippingReturnsPage";
import FaqPage from "./pages/FaqPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";

// --- Importar el nuevo componente de confirmación ---
import OrderConfirmationPage from "./components/OrderConfirmationPage";

// --- Componentes Placeholder para Futuras Secciones ---
const ProductDetailPage = () => <div>Página de Detalle de Producto (Próximamente)</div>;

function App() {
  // --- LÓGICA DE LAYOUT CONDICIONAL ---
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  
  console.log(`LOG: [App.jsx] Ruta actual: ${location.pathname}. ¿Es Home? ${isHomePage}`);

  return (
    <div className="flex flex-col min-h-screen bg-lightpink">
      <Navbar />
      <main className={`flex-grow ${!isHomePage ? 'pt-20' : ''}`}>
        <Routes>
          
          {/* --- 1. RUTAS PÚBLICAS --- */}
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:productId" element={<ProductDetailPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* --- Rutas para las páginas informativas --- */}
          <Route path="/contacto" element={<ContactPage />} />
          <Route path="/envios" element={<ShippingReturnsPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/privacidad" element={<PrivacyPolicyPage />} />
          
          {/* --- 2. RUTAS PROTEGIDAS PARA USUARIOS LOGUEADOS --- */}
          <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
          <Route path="/orden-confirmada/:orderId" element={<ProtectedRoute><OrderConfirmationPage /></ProtectedRoute>} />

          {/* --- Panel de "Mi Cuenta" --- */}
          <Route 
            path="/mi-cuenta" 
            element={<ProtectedRoute><UserDashboardLayout /></ProtectedRoute>}
          >
            <Route index element={<ProfileSettings />} />
            <Route path="perfil" element={<ProfileSettings />} />
            <Route path="direcciones" element={<AddressManager />} />
            <Route path="pedidos" element={<OrderHistory />} />
          </Route>

          {/* --- 3. RUTA PROTEGIDA SOLO PARA ADMINISTRADORES --- */}
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