/**
 * ProfileSettings.jsx - Versión Mejorada
 * --------------------------------------
 * Componente para la sección "Mi Perfil" del panel de usuario.
 * Versión más elegante y enfocada solo en datos personales.
 */
import { useState, useEffect } from "react";
import { useUser } from "../../context/UserContext";
import { supabase } from "../../services/supabaseClient";
import toast from "react-hot-toast";

const ProfileSettings = () => {
  const { user, loading: userLoading } = useUser();
  
  const [isEditing, setIsEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: '', phone: '' });
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileForm({
        full_name: user.full_name || '',
        phone: user.phone || ''
      });
    }
  }, [user]);

  const handleProfileChange = (e) => {
    setProfileForm({ ...profileForm, [e.target.name]: e.target.value });
  };

  const handleCancel = () => {
    // Restaurar valores originales al cancelar
    setProfileForm({
      full_name: user.full_name || '',
      phone: user.phone || ''
    });
    setIsEditing(false);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingProfile(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileForm.full_name.trim(),
          phone: profileForm.phone.trim()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success("¡Perfil actualizado con éxito!");
      setIsEditing(false);

    } catch (error) {
      toast.error(error.message || "Error al actualizar el perfil");
      console.error("Error al actualizar perfil:", error);
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">Cargando información del perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Mi Perfil</h2>
          <p className="text-gray-600 mt-1">Administra tu información personal</p>
        </div>
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)} 
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-red-700 transition duration-200 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editar Perfil
          </button>
        )}
      </div>

      {/* Formulario */}
      <div className="bg-gray-50 rounded-xl p-6">
        <form onSubmit={handleProfileSubmit} className="space-y-6">
          
          {/* Información Personal */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
              Información Personal
            </h3>
            
            {/* Nombre Completo */}
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
                Nombre Completo
              </label>
              <input 
                type="text" 
                id="full_name" 
                name="full_name" 
                value={profileForm.full_name} 
                onChange={handleProfileChange} 
                disabled={!isEditing}
                placeholder="Ingresa tu nombre completo"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed transition duration-200"
              />
            </div>
            
            {/* Teléfono */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Número de Teléfono
              </label>
              <input 
                type="tel" 
                id="phone" 
                name="phone" 
                value={profileForm.phone} 
                onChange={handleProfileChange} 
                disabled={!isEditing}
                placeholder="Ej: +52 33 1234 5678"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed transition duration-200"
              />
            </div>

            {/* Email (readonly) */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Correo Electrónico
              </label>
              <div className="relative">
                <input 
                  type="email" 
                  id="email" 
                  value={user?.email || ''} 
                  disabled 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                El correo electrónico no puede ser modificado
              </p>
            </div>
          </div>

          {/* Información de Cuenta */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
              Información de Cuenta
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tipo de Cuenta */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Cuenta
                </label>
                <div className="px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg">
                  <span className="text-gray-700 capitalize font-medium">
                    {user?.role === 'admin' ? '👑 Administrador' : '👤 Cliente'}
                  </span>
                </div>
              </div>

              {/* Fecha de Registro */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Miembro desde
                </label>
                <div className="px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg">
                  <span className="text-gray-700">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : 'No disponible'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Botones de Acción */}
          {isEditing && (
            <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
              <button 
                type="button" 
                onClick={handleCancel}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition duration-200"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={isSubmittingProfile}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-200 flex items-center gap-2"
              >
                {isSubmittingProfile ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          )}
        </form>

        {/* Información adicional cuando no está editando */}
        {!isEditing && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Para cambiar tu contraseña, utiliza la opción "¿Olvidaste tu contraseña?" en la página de inicio de sesión.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileSettings;