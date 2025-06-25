/**
 * UserContext.jsx (Versión Definitiva, Unificada y Robusta)
 * --------------------------------------------------------
 * Este contexto combina todas las soluciones a los problemas encontrados:
 * - Manejo de sesión inicial corrupta con un "watchdog" y reinicio suave.
 * - Manejo inteligente de refresco de token para evitar logouts al cambiar de pestaña.
 * - Cierre de sesión instantáneo y fiable.
 */
import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("UserContext: Montado. Configurando listener y vigilante de sesión...");

    let initialLoadHandled = false;

    // --- El "Vigilante" (Watchdog Timeout) ---
    // Nuestra red de seguridad contra cuelgues en la carga inicial.
    const watchdogTimer = setTimeout(() => {
      if (!initialLoadHandled) {
        console.error("UserContext (Vigilante): ¡TIMEOUT! La sesión inicial no respondió. Forzando reinicio limpio...");
        
        // Medida de emergencia: Limpiar almacenamiento y recargar a la página de INICIO.
        localStorage.clear();
        sessionStorage.clear();
        window.location.assign('/'); // Redirección dura a Home
      }
    }, 3000); // Damos 3 segundos de margen

    // --- El Único Listener de Autenticación ---
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`UserContext (Listener): Evento detectado -> ${event}`);
        
        // Lógica para procesar la sesión
        const processSession = async (currentSession) => {
          try {
            if (currentSession) {
              const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', currentSession.user.id)
                .single();

              if (error) throw error; // Lanza el error si no se encuentra el perfil
              
              setUser({ ...currentSession.user, ...profile });
            } else {
              setUser(null);
            }
          } catch (error) {
            console.error("UserContext (Listener): Error al procesar sesión, deslogueando.", error);
            setUser(null);
          } finally {
            // La primera vez que el listener responde, la carga inicial ha terminado.
            if (!initialLoadHandled) {
              initialLoadHandled = true;
              setLoading(false);
              console.log("UserContext (Listener): Carga inicial de sesión finalizada.");
            }
          }
        };

        // El evento INITIAL_SESSION (reemplazado por USER_UPDATED en v2 de la librería)
        // a veces no trae un 'user' aunque sí haya sesión. Es más fiable
        // simplemente procesar el 'session' que nos llega.
        processSession(session);
      }
    );

    // --- Limpieza del Efecto ---
    return () => {
      console.log("UserContext: Desmontado. Limpiando listener y vigilante.");
      authListener.subscription.unsubscribe();
      clearTimeout(watchdogTimer);
    };
  }, []);

  const login = (credentials) => supabase.auth.signInWithPassword(credentials);
  
  const logout = async () => {
    console.log("UserContext: Ejecutando logout...");
    // Primero, le pedimos a Supabase que cierre la sesión en el servidor.
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error("UserContext: Error durante supabase.auth.signOut()", error);
    }
    
    // Después, actualizamos el estado de React INMEDIATAMENTE.
    // Esto asegura que la UI reaccione al instante.
    setUser(null);
    console.log("UserContext: Estado de usuario local limpiado.");
  };

  const value = { user, loading, login, logout };
  
  return (
    <UserContext.Provider value={value}>
      {!loading && children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);