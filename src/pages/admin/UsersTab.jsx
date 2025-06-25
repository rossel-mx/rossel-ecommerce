/**
 * @file UsersTab.jsx
 * @description Pestaña en el panel de admin para la gestión de clientes.
 * Esta versión está actualizada para funcionar con la nueva arquitectura de base de datos,
 * llamando a la función RPC 'get_admin_user_list' para obtener una lista
 * enriquecida de usuarios con sus estadísticas de compra.
 *
 * @requires react
 * @requires supabaseClient
 * @requires react-hot-toast
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import toast, { Toaster } from "react-hot-toast";

const UsersTab = () => {
  // --- ESTADOS ---
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- LÓGICA DE DATOS ---
  /**
   * Carga la lista enriquecida de usuarios llamando a nuestra nueva función RPC.
   */
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    console.log("LOG: [UsersTab] Iniciando carga de lista de usuarios...");
    try {
      // Llamamos a nuestra nueva y potente función RPC 'get_admin_user_list'
      const { data, error: rpcError } = await supabase.rpc('get_admin_user_list');

      if (rpcError) {
        console.error("ERROR: [UsersTab] La llamada RPC devolvió un error:", rpcError);
        throw rpcError;
      }

      setUsers(data || []);
      console.log("LOG: [UsersTab] Lista de usuarios cargada exitosamente:", data);

    } catch (err) {
      console.error("ERROR: [UsersTab] Error capturado al cargar usuarios:", err);
      setError(err.message || "No se pudieron cargar los datos de usuarios.");
      toast.error("No se pudieron cargar los datos de usuarios.");
    } finally {
      setLoading(false);
      console.log("LOG: [UsersTab] fetchUsers finalizado.");
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // --- FUNCIONES AUXILIARES ---
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);
  };

  // --- RENDERIZADO CONDICIONAL ---
  if (loading) return <p className="text-center p-10">Cargando usuarios...</p>;
  if (error) return <p className="text-center text-red-500 p-10">Error: {error}</p>;

  // --- RENDERIZADO PRINCIPAL ---
  return (
    <div className="overflow-x-auto">
      <Toaster position="top-right" />
      <h2 className="text-2xl font-bold mb-4">Gestión de Clientes</h2>
      <table className="min-w-full bg-white rounded-lg overflow-hidden shadow">
        <thead className="bg-gray-100 text-left text-sm text-gray-600">
          <tr>
            <th className="py-2 px-4">Nombre</th>
            <th className="py-2 px-4">Correo</th>
            <th className="py-2 px-4">Rol</th>
            <th className="py-2 px-4 text-right">Total Gastado</th>
            <th className="py-2 px-4 text-center">Nº Pedidos</th>
            <th className="py-2 px-4">Último Pedido</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan="6" className="text-center py-8 text-gray-500">
                Aún no hay clientes registrados.
              </td>
            </tr>
          ) : (
            users.map((user) => (
              <tr key={user.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">{user.full_name || 'N/A'}</td>
                <td className="py-3 px-4">{user.email}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 text-xs rounded-full font-semibold ${user.role === 'admin' ? 'bg-primary text-white' : 'bg-gray-200'}`}>
                    {user.role}
                  </span>
                </td>
                <td className="py-3 px-4 text-right font-mono">{formatCurrency(user.total_spent)}</td>
                <td className="py-3 px-4 text-center font-bold">{user.total_orders}</td>
                <td className="py-3 px-4 text-sm">
                  {user.last_order_date ? new Date(user.last_order_date).toLocaleDateString('es-MX') : 'Nunca'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default UsersTab;
