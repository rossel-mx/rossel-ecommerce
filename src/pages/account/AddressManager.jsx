/**
 * @file AddressManager.jsx
 * @description Componente principal para la sección "Mis Direcciones" del panel de usuario.
 * Se encarga de:
 * - Cargar y mostrar la lista de direcciones guardadas por el usuario desde Supabase.
 * - Orquestar las acciones de Añadir, Editar, Eliminar y Marcar como Predeterminada.
 * - Manejar los estados de carga y error para una mejor experiencia de usuario.
 * - Mostrar la "etiqueta" o nombre que el usuario le da a cada dirección.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import { useUser } from "../../context/UserContext";
import toast, { Toaster } from "react-hot-toast";
import AddressModal from "../../components/modals/AddressModal"; // El modal que ya creamos

/**
 * @name AddressCard
 * @description Un sub-componente de presentación para mostrar una dirección individual.
 * Recibe los datos y las funciones de acción como props desde el componente padre.
 * @param {{address: object, onEdit: function, onDelete: function, onSetDefault: function, isSettingDefault: boolean}} props
 */
const AddressCard = ({ address, onEdit, onDelete, onSetDefault, isSettingDefault }) => (
  <div className={`p-4 rounded-lg border transition-shadow duration-200 ${address.is_default ? 'border-primary shadow-lg' : 'border-gray-200 hover:shadow-md'}`}>
    <div className="flex justify-between items-start">
      <h3 className="font-bold text-lg text-primary">{address.label}</h3>
      {address.is_default && (
        <div className="text-xs font-bold text-white bg-primary inline-block px-2 py-0.5 rounded-full">
          PREDETERMINADA
        </div>
      )}
    </div>
    <address className="not-italic mt-2 text-sm text-gray-600">
      {address.street_address}<br/>
      {address.address_line_2 && <>{address.address_line_2}<br/></>}
      Col. {address.colonia}<br/>
      {address.city}, {address.state}, C.P. {address.zip_code}<br/>
      {address.country}
    </address>
    <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 pt-4 border-t">
      <button onClick={() => onEdit(address)} className="text-sm font-semibold text-blue-600 hover:underline">Editar</button>
      <button onClick={() => onDelete(address.id)} className="text-sm font-semibold text-red-600 hover:underline">Eliminar</button>
      {!address.is_default && (
        <button 
          onClick={() => onSetDefault(address.id)} 
          disabled={isSettingDefault}
          className="text-sm font-semibold text-green-600 hover:underline disabled:text-gray-400 disabled:no-underline"
        >
          {isSettingDefault ? 'Guardando...' : 'Marcar como Predeterminada'}
        </button>
      )}
    </div>
  </div>
);

const AddressManager = () => {
  // --- ESTADOS ---
  const { user } = useUser();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [addressToEdit, setAddressToEdit] = useState(null); // Almacena la dirección a editar
  const [isSettingDefault, setIsSettingDefault] = useState(false); // Para el spinner del botón "Marcar como Predeterminada"

  // --- LÓGICA DE DATOS ---
  /**
   * Carga la lista de direcciones del usuario desde Supabase.
   * Se envuelve en useCallback para memorizar la función y optimizar el rendimiento.
   */
  const fetchAddresses = useCallback(async () => {
    console.log("LOG: [AddressManager] Iniciando carga de direcciones para el usuario:", user?.id);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .order('is_default', { ascending: false }); // Las predeterminadas siempre se muestran primero

      if (error) throw error;
      
      setAddresses(data || []);
      console.log("LOG: [AddressManager] Direcciones cargadas exitosamente:", data);
    } catch (error) {
      console.error("ERROR: [AddressManager] Error al cargar direcciones:", error);
      toast.error("No se pudieron cargar tus direcciones.");
    } finally {
      setLoading(false);
    }
  }, [user]); // Depende del usuario para asegurar que se ejecute si el usuario cambia

  // Carga las direcciones al montar el componente si el usuario ya está disponible.
  useEffect(() => {
    if(user) {
        fetchAddresses();
    }
  }, [user, fetchAddresses]);

  // --- MANEJADORES DE EVENTOS ---
  /**
   * Abre el modal. Si se le pasa una dirección, es para editar. Si no, es para crear.
   * @param {object|null} address - La dirección a editar, o null para crear una nueva.
   */
  const handleOpenModal = (address = null) => {
    console.log("LOG: [AddressManager] Abriendo modal. Modo:", address ? "Editar" : "Crear");
    setAddressToEdit(address);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => setIsModalOpen(false);

  /**
   * Elimina una dirección de la base de datos después de una confirmación.
   * @param {number} addressId - El ID de la dirección a eliminar.
   */
  const handleDelete = async (addressId) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar esta dirección?")) {
      console.log(`LOG: [AddressManager] Intentando eliminar dirección ID: ${addressId}`);
      try {
        const { error } = await supabase.from('user_addresses').delete().eq('id', addressId);
        if (error) throw error;
        toast.success("Dirección eliminada.");
        fetchAddresses(); // Recargamos la lista para reflejar el cambio.
      } catch (error) {
        console.error("ERROR: [AddressManager] Error al eliminar dirección:", error);
        toast.error("No se pudo eliminar la dirección.");
      }
    }
  };

  /**
   * Marca una dirección como predeterminada llamando a la función RPC segura.
   * @param {number} addressId - El ID de la dirección a marcar como predeterminada.
   */
  const handleSetDefault = async (addressId) => {
    setIsSettingDefault(true);
    console.log(`LOG: [AddressManager] Marcando como predeterminada la dirección ID: ${addressId}`);
    try {
      const { error } = await supabase.rpc('set_default_address', { p_address_id: addressId });
      if (error) throw error;
      toast.success("Dirección predeterminada actualizada.");
      fetchAddresses(); // Recargamos la lista para ver el cambio.
    } catch (error) {
      console.error("ERROR: [AddressManager] Error al marcar como predeterminada:", error);
      toast.error("No se pudo actualizar la dirección predeterminada.");
    } finally {
      setIsSettingDefault(false);
    }
  };
  
  // --- RENDERIZADO DEL COMPONENTE ---
  return (
    <div>
      <Toaster position="top-right" />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b pb-4 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Mis Direcciones</h2>
        <button onClick={() => handleOpenModal()} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200 whitespace-nowrap">
          Añadir Nueva Dirección
        </button>
      </div>
      
      {loading ? (
        <p className="text-center py-10">Cargando direcciones...</p>
      ) : addresses.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-lg">
            <p className="font-semibold text-gray-700">Aún no has guardado ninguna dirección.</p>
            <p className="text-sm text-gray-500 mt-1">¡Añade una para agilizar tus futuras compras!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {addresses.map(address => (
            <AddressCard 
              key={address.id}
              address={address}
              onEdit={handleOpenModal}
              onDelete={handleDelete}
              onSetDefault={handleSetDefault}
              isSettingDefault={isSettingDefault}
            />
          ))}
        </div>
      )}

      {/* El modal para añadir/editar se renderiza aquí, pero está oculto por defecto */}
      <AddressModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        addressToEdit={addressToEdit}
        onSuccess={fetchAddresses} // Le pasamos la función para que el modal pueda recargar la lista
      />
    </div>
  );
};

export default AddressManager;
