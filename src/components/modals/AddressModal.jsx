/**
 * @file AddressModal.jsx
 * @description Componente de modal reutilizable para crear y editar las direcciones de un usuario.
 * Esta versión final está completamente documentada e incluye todas las mejoras:
 * - Un campo "label" para que el usuario pueda nombrar cada dirección (ej. "Casa", "Oficina").
 * - Campos esenciales para envíos en México como "Colonia" y una línea de referencias.
 * - Menús desplegables para País y Estado para mejorar la UX y la consistencia de los datos.
 * - Lógica corregida para cumplir con las políticas de seguridad (RLS) y evitar errores al actualizar.
 *
 * @props {boolean} isOpen - Controla si el modal está visible o no.
 * @props {function} onClose - Función a ejecutar para cerrar el modal.
 * @props {object|null} addressToEdit - Objeto con los datos de la dirección a editar. Si es null, el modal está en modo "creación".
 * @props {function} onSuccess - Función callback a ejecutar después de una operación exitosa (para recargar la lista de direcciones).
 */
import { useState, useEffect } from "react";
import { supabase } from "../../services/supabaseClient";
import { useUser } from "../../context/UserContext";
import toast from "react-hot-toast";

// Lista estática de estados para el menú desplegable.
const mexicanStates = [
  "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas",
  "Chihuahua", "Coahuila", "Colima", "Durango", "Guanajuato", "Guerrero",
  "Hidalgo", "Jalisco", "México", "Michoacán", "Morelos", "Nayarit", "Nuevo León",
  "Oaxaca", "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa",
  "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas"
];

// Estado inicial para el formulario, con todos los campos necesarios.
const INITIAL_STATE = {
  label: '',
  address_type: 'shipping',
  street_address: '',
  address_line_2: '',
  colonia: '',
  city: '',
  state: 'Jalisco',
  zip_code: '',
  country: 'México'
};

const AddressModal = ({ isOpen, onClose, addressToEdit, onSuccess }) => {
  // --- ESTADOS ---
  const { user } = useUser(); // Hook para obtener el usuario actual
  const [formData, setFormData] = useState(INITIAL_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Este efecto se dispara cada vez que el modal se abre.
  useEffect(() => {
    if (isOpen) {
      if (addressToEdit) {
        // MODO EDICIÓN: Rellenamos el formulario con los datos de la dirección existente.
        console.log("LOG: [AddressModal] Abierto en modo EDICIÓN para la dirección:", addressToEdit);
        setFormData(addressToEdit);
      } else {
        // MODO CREACIÓN: Reseteamos el formulario a su estado inicial.
        console.log("LOG: [AddressModal] Abierto en modo CREACIÓN.");
        setFormData(INITIAL_STATE);
      }
    }
  }, [isOpen, addressToEdit]);

  // Maneja los cambios en cualquier campo del formulario.
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  /**
   * Se ejecuta al enviar el formulario.
   * Maneja tanto la creación como la actualización de direcciones.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error("Debes iniciar sesión para guardar una dirección.");
      return;
    }

    setIsSubmitting(true);
    console.log("LOG: [AddressModal] Enviando formulario...");
    try {
      let result;

      if (addressToEdit) {
        // --- LÓGICA DE ACTUALIZACIÓN ---
        // Desestructuramos para separar el 'id' del resto de los datos.
        // Esto es CRUCIAL para evitar el error "column 'id' can only be updated to DEFAULT".
        const { id, ...dataToUpdate } = formData;
        
        console.log(`LOG: [AddressModal] Actualizando dirección ID: ${id}`);
        console.log("LOG: [AddressModal] Datos para actualizar (sin 'id'):", dataToUpdate);

        // Pasamos solo los datos a actualizar, usando el 'id' solo en la cláusula .eq()
        result = await supabase.from('user_addresses').update(dataToUpdate).eq('id', id);

      } else {
        // --- LÓGICA DE CREACIÓN ---
        // Incluimos el user_id para cumplir con la política de seguridad RLS.
        const addressData = { ...formData, user_id: user.id };
        console.log("LOG: [AddressModal] Creando nueva dirección con datos:", addressData);
        result = await supabase.from('user_addresses').insert(addressData);
      }

      // Verificamos si la operación en Supabase devolvió un error.
      if (result.error) throw result.error;
      
      toast.success(`Dirección ${addressToEdit ? 'actualizada' : 'guardada'} con éxito.`);
      onSuccess(); // Llama a la función del padre para recargar la lista de direcciones.
      onClose();   // Cierra este modal.

    } catch (error) {
      console.error("ERROR: [AddressModal] Error al guardar la dirección:", error);
      toast.error(error.message || "No se pudo guardar la dirección.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Si el modal no está abierto, no renderiza nada.
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div className="bg-white p-6 rounded-lg shadow-xl w-full md:w-1/2 max-w-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">{addressToEdit ? 'Editar Dirección' : 'Añadir Nueva Dirección'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <label htmlFor="label" className="text-sm font-medium text-gray-700">Etiqueta de Dirección (ej. Casa, Oficina)</label>
            <input type="text" id="label" name="label" value={formData.label} onChange={handleChange} placeholder="Casa" className="w-full p-2 border rounded-md mt-1" required />
          </div>

          <input type="text" name="street_address" value={formData.street_address} onChange={handleChange} placeholder="Calle y Número" className="w-full p-2 border rounded-md" required />
          <input type="text" name="address_line_2" value={formData.address_line_2 || ''} onChange={handleChange} placeholder="Interior, Depto., Referencias (Opcional)" className="w-full p-2 border rounded-md" />

          <div className="grid grid-cols-2 gap-4">
            <input type="text" name="colonia" value={formData.colonia} onChange={handleChange} placeholder="Colonia" className="w-full p-2 border rounded-md" required />
            <input type="text" name="zip_code" value={formData.zip_code} onChange={handleChange} placeholder="Código Postal" className="w-full p-2 border rounded-md" required />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <input type="text" name="city" value={formData.city} onChange={handleChange} placeholder="Ciudad / Municipio" className="w-full p-2 border rounded-md" required />
            <select name="state" value={formData.state} onChange={handleChange} className="w-full p-2 border rounded-md bg-white" required>
              <option value="" disabled>Selecciona un estado...</option>
              {mexicanStates.map(state => (<option key={state} value={state}>{state}</option>))}
            </select>
          </div>
          
          <select name="country" value={formData.country} onChange={handleChange} className="w-full p-2 border rounded-md bg-white">
            <option value="México">México</option>
          </select>

          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-red-700 disabled:bg-gray-400">
              {isSubmitting ? 'Guardando...' : 'Guardar Dirección'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddressModal;