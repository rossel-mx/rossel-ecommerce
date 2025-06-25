// src/pages/account/UserDashboardLayout.jsx

import { NavLink, Outlet } from "react-router-dom";
import { useUser } from "../../context/UserContext";

// Componente para los enlaces del menú, para no repetir código
const MenuLink = ({ to, children }) => {
  // NavLink nos da acceso a la variable 'isActive' para saber si el enlace es el actual
  const activeClassName = "bg-primary text-white";
  const inactiveClassName = "text-gray-600 hover:bg-gray-200 hover:text-gray-800";

  return (
    <NavLink 
      to={to}
      // La prop 'end' es importante para que el NavLink de "/" no se quede activo siempre
      end 
      className={({ isActive }) => 
        `block w-full text-left px-4 py-2 rounded-md transition-colors duration-200 ${isActive ? activeClassName : inactiveClassName}`
      }
    >
      {children}
    </NavLink>
  );
};


const UserDashboardLayout = () => {
  const { user } = useUser();

  console.log("UserDashboardLayout: Renderizando layout para el usuario:", user?.email);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* --- Columna de Navegación (Sidebar) --- */}
        <aside className="md:col-span-1">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-center mb-4 border-b pb-4">
              <h2 className="font-bold text-lg text-primary truncate">{user?.full_name || user?.email}</h2>
              <p className="text-sm text-gray-500 capitalize">{user?.role}</p>
            </div>
            <nav className="space-y-1">
              <MenuLink to="/mi-cuenta/perfil">Mi Perfil</MenuLink>
              <MenuLink to="/mi-cuenta/direcciones">Mis Direcciones</MenuLink>
              <MenuLink to="/mi-cuenta/pedidos">Mis Pedidos</MenuLink>
            </nav>
          </div>
        </aside>

        {/* --- Área de Contenido Principal --- */}
        <main className="md:col-span-3">
          <div className="bg-white p-6 rounded-lg shadow min-h-[300px]">
            {/* Outlet es el componente mágico de React Router que renderiza
                la ruta hija activa (ProfileSettings, AddressManager, etc.) */}
            <Outlet />
          </div>
        </main>

      </div>
    </div>
  );
};

export default UserDashboardLayout;