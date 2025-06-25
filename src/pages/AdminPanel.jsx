/**
 * @file AdminPanel.jsx
 * @description Panel de administración completamente modernizado.
 * Esta versión incluye diseño premium, información del usuario logueado,
 * navegación elegante y consistencia visual con el resto de la aplicación.
 * 
 * MEJORAS MODERNAS:
 * - ✨ Header glassmorphism con info del admin
 * - 🎯 Navegación con íconos y estados hover
 * - 👤 Perfil del usuario con avatar y menú
 * - 🚀 Animaciones y transiciones suaves
 * - 📱 Diseño completamente responsive
 * - 🎨 Gradientes y efectos premium
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import ProductsTab from "./admin/ProductsTab";
import UsersTab from "./admin/UsersTab";
import OrdersTab from "./admin/OrdersTab";
import DashboardTab from "./admin/DashboardTab";
import toast from "react-hot-toast";

const AdminPanel = () => {
  const { user, loading, logout } = useUser();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();

  // Configuración de pestañas con íconos modernos
  const tabs = [
    { 
      id: 'dashboard', 
      name: 'Dashboard', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    { 
      id: 'products', 
      name: 'Productos', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    },
    { 
      id: 'users', 
      name: 'Usuarios', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      )
    },
    { 
      id: 'orders', 
      name: 'Pedidos', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      )
    }
  ];

  // Manejador de logout
  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Sesión cerrada exitosamente");
      navigate("/");
    } catch (error) {
      toast.error("Error al cerrar sesión");
    }
  };

  // Estados de carga
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <h3 className="text-xl font-semibold text-gray-700">Verificando acceso...</h3>
          <p className="text-gray-500">Validando credenciales de administrador</p>
        </div>
      </div>
    );
  }

  // Control de acceso
  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 text-center max-w-md mx-4 border border-red-100">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-red-800 mb-4">Acceso Denegado</h2>
          <p className="text-red-600 mb-6">No tienes los permisos necesarios para acceder al panel de administración.</p>
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-red-700 text-white px-6 py-3 rounded-xl hover:from-red-600 hover:to-red-800 transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al Inicio
          </Link>
        </div>
      </div>
    );
  }

  // Generar iniciales del usuario
  const getUserInitials = (email) => {
    if (!email) return 'AD';
    return email.substring(0, 2).toUpperCase();
  };

  // Renderizado principal
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header moderno */}
      <header className="bg-white/90 backdrop-blur-md shadow-xl border-b border-gray-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            
            {/* Logo y título */}
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-red-700 rounded-xl flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform duration-300">
                <span className="text-white text-xl font-bold">R</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  Panel de Administración
                </h1>
                <p className="text-gray-500 text-sm">Gestiona tu negocio de manera inteligente</p>
              </div>
            </div>

            {/* Información del usuario */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 bg-gray-100/80 backdrop-blur-sm rounded-2xl px-4 py-3 hover:bg-gray-200/80 transition-all duration-300 group border border-gray-200/50"
              >
                {/* Avatar */}
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-red-700 rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                  <span className="text-white font-bold text-sm">
                    {getUserInitials(user?.email)}
                  </span>
                </div>
                
                {/* Info del usuario */}
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-semibold text-gray-800">Administrador</p>
                  <p className="text-xs text-gray-500 truncate max-w-32">{user?.email}</p>
                </div>
                
                {/* Chevron */}
                <svg 
                  className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${showUserMenu ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Menú desplegable */}
              {showUserMenu && (
                <div className="absolute right-0 mt-3 w-64 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200/50 py-2 z-50 animate-in slide-in-from-top-5 duration-200">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-800">Sesión activa como:</p>
                    <p className="text-xs text-gray-500 break-all">{user?.email}</p>
                    <div className="inline-flex items-center gap-1 mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      Administrador
                    </div>
                  </div>
                  
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 transition-colors duration-200 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navegación de pestañas moderna */}
      <nav className="bg-white/70 backdrop-blur-sm shadow-sm border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-6 py-4 text-sm font-medium transition-all duration-300 relative whitespace-nowrap ${
                  activeTab === tab.id
                    ? "text-primary bg-primary/10 border-b-2 border-primary"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-100/80"
                }`}
              >
                <span className={`transition-all duration-300 ${activeTab === tab.id ? 'scale-110' : ''}`}>
                  {tab.icon}
                </span>
                <span>{tab.name}</span>
                
                {/* Indicador activo */}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-red-700"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="animate-in fade-in-50 duration-500">
          {activeTab === "dashboard" && <DashboardTab />}
          {activeTab === "products" && <ProductsTab />}
          {activeTab === "users" && <UsersTab />}
          {activeTab === "orders" && <OrdersTab />}
        </div>
      </main>

      {/* Click fuera para cerrar menú */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-30" 
          onClick={() => setShowUserMenu(false)}
        ></div>
      )}
    </div>
  );
};

export default AdminPanel;