import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useUser } from "../../context/UserContext";

// Componente para los enlaces del menú mejorado
const MenuLink = ({ to, children, icon, description }) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to === "/mi-cuenta/perfil" && location.pathname === "/mi-cuenta");
  
  return (
    <NavLink 
      to={to}
      className={`block w-full text-left p-4 rounded-xl transition-all duration-200 group ${
        isActive 
          ? 'bg-primary text-white shadow-lg transform scale-[1.02]' 
          : 'text-gray-700 hover:bg-gray-100 hover:text-primary'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${
          isActive ? 'bg-white/20' : 'bg-gray-100 group-hover:bg-primary/10'
        }`}>
          <span className={`text-lg ${isActive ? 'text-white' : 'text-gray-600 group-hover:text-primary'}`}>
            {icon}
          </span>
        </div>
        <div>
          <div className={`font-semibold ${isActive ? 'text-white' : 'text-gray-800'}`}>
            {children}
          </div>
          <div className={`text-sm ${isActive ? 'text-white/80' : 'text-gray-500'}`}>
            {description}
          </div>
        </div>
      </div>
    </NavLink>
  );
};

const UserDashboardLayout = () => {
  const { user } = useUser();
  const location = useLocation();

  // Determinar el título de la página actual
  const getPageTitle = () => {
    if (location.pathname.includes('/direcciones')) return 'Mis Direcciones';
    if (location.pathname.includes('/pedidos')) return 'Mis Pedidos';
    return 'Mi Perfil';
  };

  return (
    <div className="min-h-screen bg-lightpink">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header del Dashboard */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-red-600 rounded-xl flex items-center justify-center text-white text-xl font-bold">
                  {user?.full_name ? user.full_name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || '?'}
                </div>
                
                {/* Info del Usuario */}
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    ¡Hola, {user?.full_name?.split(' ')[0] || 'Usuario'}! 👋
                  </h1>
                  <p className="text-gray-600 mt-1">
                    {user?.email} • <span className="capitalize font-medium text-primary">{user?.role}</span>
                  </p>
                </div>
              </div>

              {/* Badge de rol */}
              <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                user?.role === 'admin' 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {user?.role === 'admin' ? '👑 Administrador' : '🛍️ Cliente'}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar de Navegación */}
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Mi Cuenta</h2>
              
              <nav className="space-y-3">
                <MenuLink 
                  to="/mi-cuenta/perfil" 
                  icon="👤"
                  description="Información personal"
                >
                  Mi Perfil
                </MenuLink>
                
                <MenuLink 
                  to="/mi-cuenta/direcciones" 
                  icon="🏠"
                  description="Direcciones de envío"
                >
                  Mis Direcciones
                </MenuLink>
                
                <MenuLink 
                  to="/mi-cuenta/pedidos" 
                  icon="📦"
                  description="Historial de compras"
                >
                  Mis Pedidos
                </MenuLink>
              </nav>

              {/* Enlaces adicionales */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 mb-4">Enlaces Rápidos</h3>
                <div className="space-y-2">
                  <a 
                    href="/products" 
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary transition-colors"
                  >
                    <span>🛍️</span>
                    Seguir Comprando
                  </a>
                  <a 
                    href="/contacto" 
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary transition-colors"
                  >
                    <span>💬</span>
                    Contactar Soporte
                  </a>
                </div>
              </div>
            </div>
          </aside>

          {/* Área de Contenido Principal */}
          <main className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                <span>Mi Cuenta</span>
                <span>›</span>
                <span className="text-primary font-medium">{getPageTitle()}</span>
              </div>
              
              {/* Contenido */}
              <Outlet />
            </div>
          </main>

        </div>
      </div>
    </div>
  );
};

export default UserDashboardLayout;