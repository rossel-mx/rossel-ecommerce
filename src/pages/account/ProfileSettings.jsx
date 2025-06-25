/**
 * ProfileSettings.jsx
 * --------------------
 * Componente para la sección "Mi Perfil" del panel de usuario.
 * Permite al usuario ver y editar su información personal y cambiar su contraseña.
 * Incluye un "modo edición" para una mejor experiencia de usuario.
 */
import { useState, useEffect } from "react";
import { useUser } from "../../context/UserContext";
import { supabase } from "../../services/supabaseClient";
import toast from "react-hot-toast";

const ProfileSettings = () => {
  // --- ESTADOS ---
  const { user, loading: userLoading } = useUser();
  
  // Estado para el "modo edición" del perfil.
  const [isEditing, setIsEditing] = useState(false);
  // Estado para el formulario de datos de perfil.
  const [profileForm, setProfileForm] = useState({ full_name: '', phone: '' });
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);

  // Estado para el formulario de cambio de contraseña.
  const [passwordForm, setPasswordForm] = useState({ new_password: '', confirm_password: '' });
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // Rellena el formulario con los datos del usuario una vez que el contexto los carga.
  useEffect(() => {
    if (user) {
      console.log("ProfileSettings: Datos de usuario recibidos del contexto.", user);
      setProfileForm({
        full_name: user.full_name || '',
        phone: user.phone || ''
      });
    }
  }, [user]);

  // Manejadores de cambios para los formularios.
  const handleProfileChange = (e) => setProfileForm({ ...profileForm, [e.target.name]: e.target.value });
  const handlePasswordChange = (e) => setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });

  // Se ejecuta al guardar los cambios del perfil.
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingProfile(true);
    console.log(`ProfileSettings: Actualizando perfil para usuario ${user.id} con datos:`, profileForm);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileForm.full_name,
          phone: profileForm.phone
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success("¡Perfil actualizado con éxito!");
      setIsEditing(false); // Salimos del modo edición al guardar.
      // NOTA: Para ver el cambio reflejado en el Navbar, sería necesario un método para refrescar el `user` en el contexto.
      // Por ahora, el cambio se verá al recargar la página.

    } catch (error) {
      toast.error(error.message);
      console.error("ProfileSettings: Error al actualizar perfil:", error);
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  // Se ejecuta al cambiar la contraseña.
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password.length < 6) {
      toast.error("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }
    
    setIsSubmittingPassword(true);
    console.log(`ProfileSettings: Intentando cambiar la contraseña para el usuario ${user.id}`);
    
    try {
      // Usamos el método seguro de Supabase Auth para cambiar la contraseña.
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.new_password
      });

      if (error) throw error;

      toast.success("¡Contraseña cambiada con éxito!");
      setPasswordForm({ new_password: '', confirm_password: '' }); // Limpiamos los campos

    } catch (error) {
      toast.error(error.message);
      console.error("ProfileSettings: Error al cambiar la contraseña:", error);
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  if (userLoading) {
    return <p>Cargando información del perfil...</p>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">Mi Perfil</h2>
      
      {/* --- Formulario de Datos Personales --- */}
      <form onSubmit={handleProfileSubmit} className="space-y-6">
        {/* Campo Nombre Completo */}
        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">Nombre Completo</label>
          <input type="text" id="full_name" name="full_name" value={profileForm.full_name} onChange={handleProfileChange} disabled={!isEditing} className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary disabled:bg-gray-100 disabled:cursor-not-allowed" />
        </div>
        
        {/* Campo Teléfono */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Teléfono</label>
          <input type="tel" id="phone" name="phone" value={profileForm.phone} onChange={handleProfileChange} disabled={!isEditing} className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary disabled:bg-gray-100 disabled:cursor-not-allowed" />
        </div>

        {/* Campo Correo (no editable) */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Correo Electrónico</label>
          <input type="email" id="email" value={user?.email || ''} disabled className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3 bg-gray-100 text-gray-500" />
        </div>
        
        {/* Botones de Acción para Perfil (Editar/Guardar/Cancelar) */}
        <div className="text-right space-x-4">
          {isEditing ? (
            <>
              <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-2 rounded-lg bg-gray-200 hover:bg-gray-300">Cancelar</button>
              <button type="submit" disabled={isSubmittingProfile} className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-red-700 transition disabled:bg-gray-400">
                {isSubmittingProfile ? "Guardando..." : "Guardar Cambios"}
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setIsEditing(true)} className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-red-700 transition">
              Editar Perfil
            </button>
          )}
        </div>
      </form>

      {/* --- Formulario de Cambio de Contraseña --- */}
      <div className="mt-12 border-t pt-6">
         <h3 className="text-xl font-bold text-gray-800 mb-4">Cambiar Contraseña</h3>
         <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
            <div>
              <label htmlFor="new_password" className="block text-sm font-medium text-gray-700">Nueva Contraseña</label>
              <input type="password" id="new_password" name="new_password" value={passwordForm.new_password} onChange={handlePasswordChange} className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary" />
            </div>
             <div>
              <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700">Confirmar Nueva Contraseña</label>
              <input type="password" id="confirm_password" name="confirm_password" value={passwordForm.confirm_password} onChange={handlePasswordChange} className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary" />
            </div>
             <div className="text-right">
                <button type="submit" disabled={isSubmittingPassword} className="bg-gray-700 text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition disabled:bg-gray-400">
                    {isSubmittingPassword ? "Actualizando..." : "Actualizar Contraseña"}
                </button>
             </div>
         </form>
      </div>
    </div>
  );
};

export default ProfileSettings;
