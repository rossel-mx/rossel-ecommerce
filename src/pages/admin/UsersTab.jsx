/**
 * @file UsersTab.jsx
 * @description Pestaña en el panel de admin para la gestión de clientes.
 * Esta versión incluye funcionalidad de eliminación segura de usuarios
 * con múltiples confirmaciones y limpieza completa de datos relacionados.
 *
 * NUEVAS FUNCIONALIDADES:
 * - ✅ Eliminación segura de usuarios con confirmaciones múltiples
 * - ✅ Limpieza automática de datos relacionados (perfiles, órdenes, etc.)
 * - ✅ Protección contra eliminación de administradores
 * - ✅ Interfaz moderna con estados de loading
 * - ✅ Logs detallados para debugging
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import toast, { Toaster } from "react-hot-toast";

const UsersTab = () => {
  // --- ESTADOS ---
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null); // ID del usuario que se está eliminando
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  // --- LÓGICA DE DATOS ---
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    console.log("LOG: [UsersTab] Iniciando carga de lista de usuarios...");
    try {
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

  // --- FUNCIONES DE ELIMINACIÓN ---
  
  /**
   * Inicia el proceso de eliminación mostrando el modal de confirmación
   */
  const handleDeleteClick = (user) => {
    console.log("LOG: [UsersTab] Iniciando proceso de eliminación para:", user);
    
    // Verificar que no sea admin
    if (user.role === 'admin') {
      toast.error("No se pueden eliminar usuarios administradores por seguridad.");
      return;
    }

    setUserToDelete(user);
    setShowDeleteModal(true);
    setDeleteConfirmation('');
  };

  /**
   * Confirma y ejecuta la eliminación del usuario
   */
  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    // Verificación de confirmación de texto
    if (deleteConfirmation.toLowerCase() !== 'eliminar permanentemente') {
      toast.error('Debes escribir exactamente "eliminar permanentemente" para confirmar.');
      return;
    }

    setDeletingUser(userToDelete.id);
    console.log("LOG: [UsersTab] Ejecutando eliminación del usuario:", userToDelete);

    try {
      // Llamar a función RPC para eliminación completa y segura
      const { data, error } = await supabase.rpc('delete_user_completely', {
        user_id_to_delete: userToDelete.id
      });

      if (error) {
        console.error("ERROR: [UsersTab] Error en RPC de eliminación:", error);
        throw error;
      }

      console.log("LOG: [UsersTab] Usuario eliminado exitosamente:", data);
      
      // Actualizar la lista de usuarios
      setUsers(users.filter(u => u.id !== userToDelete.id));
      
      toast.success(`Usuario ${userToDelete.full_name || userToDelete.email} eliminado exitosamente.`);
      
      // Cerrar modal
      setShowDeleteModal(false);
      setUserToDelete(null);
      setDeleteConfirmation('');

    } catch (err) {
      console.error("ERROR: [UsersTab] Error al eliminar usuario:", err);
      toast.error(`Error al eliminar usuario: ${err.message}`);
    } finally {
      setDeletingUser(null);
    }
  };

  /**
   * Cancela el proceso de eliminación
   */
  const cancelDelete = () => {
    setShowDeleteModal(false);
    setUserToDelete(null);
    setDeleteConfirmation('');
  };

  // --- FUNCIONES AUXILIARES ---
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);
  };

  // --- RENDERIZADO CONDICIONAL ---
  if (loading) return <p className="text-center p-10">Cargando usuarios...</p>;
  if (error) return <p className="text-center text-red-500 p-10">Error: {error}</p>;

  // --- RENDERIZADO PRINCIPAL ---
  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Gestión de Clientes</h2>
        <div className="text-sm text-gray-600">
          Total de usuarios: <span className="font-semibold">{users.length}</span>
        </div>
      </div>

      {/* Tabla de usuarios */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700">Nombre</th>
                <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700">Correo</th>
                <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700">Rol</th>
                <th className="py-4 px-6 text-right text-sm font-semibold text-gray-700">Total Gastado</th>
                <th className="py-4 px-6 text-center text-sm font-semibold text-gray-700">Nº Pedidos</th>
                <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700">Último Pedido</th>
                <th className="py-4 px-6 text-center text-sm font-semibold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-gray-500">
                    <div className="flex flex-col items-center space-y-3">
                      <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                      </svg>
                      <p className="text-lg font-medium">Aún no hay clientes registrados</p>
                      <p className="text-sm">Los usuarios aparecerán aquí cuando se registren</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="py-4 px-6">
                      <div className="font-medium text-gray-900">{user.full_name || 'N/A'}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-gray-600">{user.email}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${
                        user.role === 'admin' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role === 'admin' ? '👑 Admin' : '👤 Cliente'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="font-mono font-semibold text-gray-900">
                        {formatCurrency(user.total_spent)}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-primary/10 text-primary rounded-full text-sm font-bold">
                        {user.total_orders}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm text-gray-600">
                        {user.last_order_date 
                          ? new Date(user.last_order_date).toLocaleDateString('es-MX', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })
                          : 'Nunca'
                        }
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      {user.role === 'admin' ? (
                        <span className="text-xs text-gray-400 italic">Protegido</span>
                      ) : (
                        <button
                          onClick={() => handleDeleteClick(user)}
                          disabled={deletingUser === user.id}
                          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingUser === user.id ? (
                            <>
                              <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                              Eliminando...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Eliminar
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de confirmación de eliminación */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-300">
            {/* Header del modal */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Eliminar Usuario</h3>
                <p className="text-sm text-gray-500">Esta acción no se puede deshacer</p>
              </div>
            </div>

            {/* Información del usuario */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-gray-900 mb-2">Usuario a eliminar:</h4>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Nombre:</span> {userToDelete?.full_name || 'N/A'}</p>
                <p><span className="font-medium">Email:</span> {userToDelete?.email}</p>
                <p><span className="font-medium">Pedidos:</span> {userToDelete?.total_orders}</p>
                <p><span className="font-medium">Total gastado:</span> {formatCurrency(userToDelete?.total_spent)}</p>
              </div>
            </div>

            {/* Advertencias */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-red-800 mb-2">⚠️ Esta acción eliminará permanentemente:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• El usuario de autenticación</li>
                <li>• Su perfil y datos personales</li>
                <li>• Todos sus pedidos e historial</li>
                <li>• Sus direcciones guardadas</li>
                <li>• Cualquier dato relacionado</li>
              </ul>
            </div>

            {/* Confirmación por texto */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Para confirmar, escribe: <span className="font-bold text-red-600">eliminar permanentemente</span>
              </label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                placeholder="eliminar permanentemente"
              />
            </div>

            {/* Botones */}
            <div className="flex gap-3">
              <button
                onClick={cancelDelete}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteUser}
                disabled={deleteConfirmation.toLowerCase() !== 'eliminar permanentemente' || deletingUser}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {deletingUser ? 'Eliminando...' : 'Eliminar Usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersTab;