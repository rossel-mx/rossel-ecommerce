import { useState } from "react";
import { Link } from "react-router-dom"; // Importamos Link para el mensaje de error
import { useUser } from "../context/UserContext"; // 1. Importamos el hook de usuario
import ProductsTab from "./admin/ProductsTab";
import UsersTab from "./admin/UsersTab";
import OrdersTab from "./admin/OrdersTab";
import DashboardTab from "./admin/DashboardTab";

const AdminPanel = () => {
  // 2. Obtenemos el usuario y el estado de carga de nuestro contexto
  const { user, loading } = useUser();
  const [activeTab, setActiveTab] = useState("dashboard");

  // 3. Mientras se verifica la sesión, mostramos un mensaje de carga.
  if (loading) {
    return <div className="p-6 text-center">Verificando acceso...</div>;
  }

  // 4. Si la carga terminó y el usuario no es admin, denegamos el acceso.
  if (!user || user.role !== "admin") {
    return (
      <div className="p-6 text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Acceso Denegado</h2>
        <p className="mb-6">No tienes los permisos necesarios para ver esta página.</p>
        <Link to="/" className="bg-primary text-white px-4 py-2 rounded hover:bg-red-700">
          Volver al Inicio
        </Link>
      </div>
    );
  }

  // 5. Si pasa todas las verificaciones, el usuario es admin y le mostramos el panel.
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-primary mb-4">Panel de administración</h2>

      <div className="flex flex-wrap gap-4 mb-6">
        <button onClick={() => setActiveTab("dashboard")} className={tabClass(activeTab, "dashboard")}>Dashboard</button>
        <button onClick={() => setActiveTab("products")} className={tabClass(activeTab, "products")}>Productos</button>
        <button onClick={() => setActiveTab("users")} className={tabClass(activeTab, "users")}>Usuarios</button>
        <button onClick={() => setActiveTab("orders")} className={tabClass(activeTab, "orders")}>Pedidos</button>
      </div>

      <div>
        {activeTab === "dashboard" && <DashboardTab />}
        {activeTab === "products" && <ProductsTab />}
        {activeTab === "users" && <UsersTab />}
        {activeTab === "orders" && <OrdersTab />}
      </div>
    </div>
  );
};

// La función auxiliar para las clases de las pestañas no cambia.
const tabClass = (active, current) =>
  `px-4 py-2 rounded-lg ${
    active === current
      ? "bg-primary text-white"
      : "bg-gray-200 hover:bg-gray-300"
  }`;

export default AdminPanel;