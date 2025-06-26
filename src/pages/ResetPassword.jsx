/**
 * @file ResetPassword.jsx
 * @description Componente moderno para el restablecimiento de contraseña.
 * Funciona con el flujo de recuperación de Supabase, validando el token
 * y permitiendo al usuario establecer una nueva contraseña segura.
 * 
 * CARACTERÍSTICAS:
 * - ✅ Validación de token automática
 * - ✅ Validación de contraseña en tiempo real
 * - ✅ Interfaz moderna con glassmorphism
 * - ✅ Estados de loading y error
 * - ✅ Feedback visual completo
 * - ✅ Redirección automática tras éxito
 * - ✅ Debug completo de tokens
 */
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import toast from "react-hot-toast";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Estados del formulario
  const [form, setForm] = useState({
    password: "",
    confirmPassword: ""
  });
  
  // Estados de UI
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [matchError, setMatchError] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Validación en tiempo real
  useEffect(() => {
    // Validar fortaleza de contraseña
    if (form.password && !/^(?=.*[A-Z])(?=.*\d).{6,}$/.test(form.password)) {
      setPasswordError("Debe tener al menos 6 caracteres, una mayúscula y un número.");
    } else {
      setPasswordError("");
    }
    
    // Validar coincidencia de contraseñas
    if (form.confirmPassword && form.password !== form.confirmPassword) {
      setMatchError("Las contraseñas no coinciden.");
    } else {
      setMatchError("");
    }
    
    // Determinar si el formulario es válido
    const formIsValid = form.password.length > 0 && 
                       /^(?=.*[A-Z])(?=.*\d).{6,}$/.test(form.password) && 
                       form.password === form.confirmPassword &&
                       form.confirmPassword.length > 0;
    setIsValid(formIsValid);
  }, [form.password, form.confirmPassword]);

  // Verificar token al cargar la página
  useEffect(() => {
    const verifyToken = async () => {
      console.log("LOG: [ResetPassword] === INICIO DEBUG COMPLETO ===");
      
      // 1. CAPTURAR TOKENS INMEDIATAMENTE ANTES DE QUE SUPABASE LOS PROCESE
      // Esta es la clave: capturar desde localStorage donde Supabase los almacena temporalmente
      let tokensFromStorage = null;
      try {
        // Supabase guarda la sesión en localStorage cuando procesa los tokens
        const supabaseSession = localStorage.getItem(`sb-${supabase.supabaseKey}-auth-token`);
        if (supabaseSession) {
          const parsedSession = JSON.parse(supabaseSession);
          console.log("LOG: [ResetPassword] Sesión encontrada en localStorage:", parsedSession);
          tokensFromStorage = parsedSession;
        }
      } catch (err) {
        console.log("LOG: [ResetPassword] No se pudo leer sesión de localStorage:", err);
      }
      
      // 2. DEBUGGING COMPLETO DE LA URL
      console.log("LOG: [ResetPassword] URL completa:", window.location.href);
      console.log("LOG: [ResetPassword] Pathname:", window.location.pathname);
      console.log("LOG: [ResetPassword] Search:", window.location.search);
      console.log("LOG: [ResetPassword] Hash:", window.location.hash);
      
      // 3. DEBUGGING DE TODOS LOS PARÁMETROS POSIBLES
      console.log("LOG: [ResetPassword] Query Params completos:");
      searchParams.forEach((value, key) => {
        console.log(`  ${key}: "${value}"`);
      });
      
      // 4. DEBUGGING DE HASH FRAGMENTS
      if (window.location.hash) {
        console.log("LOG: [ResetPassword] Hash fragments:");
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        hashParams.forEach((value, key) => {
          console.log(`  ${key}: "${value}"`);
        });
      }
      
      // 5. BUSCAR TOKENS EN TODOS LOS LUGARES POSIBLES
      console.log("LOG: [ResetPassword] Buscando tokens...");
      
      try {
        // Verificar si ya hay una sesión activa
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (sessionData.session) {
          console.log("LOG: [ResetPassword] ¡ENCONTRÉ SESIÓN ACTIVA!", {
            user: sessionData.session.user.email,
            expires_at: sessionData.session.expires_at,
            token_type: sessionData.session.token_type,
            recovery_sent_at: sessionData.session.user.recovery_sent_at,
            confirmed_at: sessionData.session.user.confirmed_at,
            last_sign_in_at: sessionData.session.user.last_sign_in_at
          });
          
          // Verificar si es una sesión de recovery válida
          if (sessionData.session.user.recovery_sent_at) {
            console.log("LOG: [ResetPassword] Sesión de recovery válida detectada");
            
            // Guardar los tokens antes de cerrar la sesión
            window.resetTokens = {
              accessToken: sessionData.session.access_token,
              refreshToken: sessionData.session.refresh_token
            };
            
            console.log("LOG: [ResetPassword] Tokens guardados, cerrando sesión por seguridad...");
            await supabase.auth.signOut();
            
            console.log("LOG: [ResetPassword] Sesión cerrada, tokens de recovery válidos");
            setTokenValid(true);
            toast.success("Enlace de recuperación válido. Establece tu nueva contraseña.");
            setInitialLoading(false);
            return;
          } else {
            console.log("LOG: [ResetPassword] Sesión normal detectada, cerrando por seguridad...");
            await supabase.auth.signOut();
          }
        }

        // Si llegamos aquí, buscar tokens en URL (aunque probablemente ya no estén)
        let accessToken = searchParams.get('access_token');
        let refreshToken = searchParams.get('refresh_token');
        let type = searchParams.get('type');
        let tokenHash = searchParams.get('token_hash');
        let token = searchParams.get('token');
        
        // También buscar variaciones comunes
        if (!accessToken) {
          accessToken = searchParams.get('access-token') || 
                       searchParams.get('accessToken') ||
                       searchParams.get('token');
        }
        
        // Buscar en hash fragments
        if (!accessToken && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          accessToken = hashParams.get('access_token') || 
                       hashParams.get('access-token') ||
                       hashParams.get('accessToken') ||
                       hashParams.get('token');
          refreshToken = hashParams.get('refresh_token') || 
                        hashParams.get('refresh-token') ||
                        hashParams.get('refreshToken');
          type = hashParams.get('type');
          tokenHash = hashParams.get('token_hash');
        }
        
        console.log("LOG: [ResetPassword] Tokens encontrados en URL:", {
          accessToken: accessToken ? `${accessToken.substring(0, 20)}...` : null,
          refreshToken: refreshToken ? `${refreshToken.substring(0, 20)}...` : null,
          type: `"${type}"`,
          tokenHash: tokenHash ? `${tokenHash.substring(0, 20)}...` : null,
          token: token ? `${token.substring(0, 20)}...` : null
        });

        // Intentar con tokens de localStorage si no están en URL
        if (!accessToken && tokensFromStorage) {
          console.log("LOG: [ResetPassword] Usando tokens de localStorage...");
          accessToken = tokensFromStorage.access_token;
          refreshToken = tokensFromStorage.refresh_token;
        }

        // VALIDACIÓN: Debe haber algún token o sesión de recovery
        if (!accessToken && !tokenHash && !token) {
          console.error("ERROR: [ResetPassword] No se encontraron tokens en la URL ni en la sesión");
          throw new Error('Acceso directo no permitido. Usa el enlace de recuperación enviado a tu email.');
        }

        // Si encontramos tokens, intentar diferentes flujos
        if (tokenHash) {
          console.log("LOG: [ResetPassword] Intentando con token_hash...");
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery'
          });
          
          if (error) {
            console.error("ERROR: [ResetPassword] Error con token_hash:", error);
            throw new Error(`Error con token_hash: ${error.message}`);
          }
          
          if (data.user) {
            console.log("LOG: [ResetPassword] ¡Token_hash válido!");
            setTokenValid(true);
            toast.success("Enlace de recuperación válido. Establece tu nueva contraseña.");
            setInitialLoading(false);
            return;
          }
        }
        
        if (token) {
          console.log("LOG: [ResetPassword] Intentando con token genérico...");
          const { data, error } = await supabase.auth.verifyOtp({
            token: token,
            type: 'recovery'
          });
          
          if (error) {
            console.error("ERROR: [ResetPassword] Error con token genérico:", error);
            throw new Error(`Error con token: ${error.message}`);
          }
          
          if (data.user) {
            console.log("LOG: [ResetPassword] ¡Token genérico válido!");
            setTokenValid(true);
            toast.success("Enlace de recuperación válido. Establece tu nueva contraseña.");
            setInitialLoading(false);
            return;
          }
        }

        // Flujo normal con access_token
        if (accessToken) {
          if (type && type !== 'recovery') {
            throw new Error(`Tipo de token incorrecto: esperado 'recovery', recibido '${type}'`);
          }

          console.log("LOG: [ResetPassword] Estableciendo sesión con access_token...");
          
          const { data: newSessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (sessionError) {
            console.error("ERROR: [ResetPassword] Error al establecer sesión:", sessionError);
            
            if (sessionError.message.includes('expired') || 
                sessionError.message.includes('invalid_token') ||
                sessionError.message.includes('Token has expired')) {
              throw new Error('El enlace de recuperación ha expirado. Solicita uno nuevo desde la página de login.');
            }
            
            if (sessionError.message.includes('invalid')) {
              throw new Error('El enlace de recuperación es inválido. Verifica que sea el enlace más reciente enviado a tu email.');
            }
            
            throw sessionError;
          }

          if (!newSessionData.user) {
            throw new Error('No se pudo autenticar con el enlace de recuperación');
          }

          console.log("LOG: [ResetPassword] ¡Sesión establecida exitosamente para:", newSessionData.user.email);
          window.resetTokens = { accessToken, refreshToken };
          setTokenValid(true);
          toast.success("Enlace de recuperación válido. Establece tu nueva contraseña.");
          
          // Limpiar URL
          if (window.location.hash) {
            window.history.replaceState(null, '', window.location.pathname);
          }
        }

      } catch (err) {
        console.error("ERROR: [ResetPassword] Error completo:", err);
        setTokenValid(false);
        
        // Mensajes de error más user-friendly
        let userMessage = err.message;
        if (err.message.includes('No se encontraron tokens') || err.message.includes('Acceso directo no permitido')) {
          userMessage = 'Esta página solo es accesible através del enlace de recuperación enviado a tu email. No se puede acceder directamente.';
        } else if (err.message.includes('expirado') || err.message.includes('expired')) {
          userMessage = 'El enlace de recuperación ha expirado. Los enlaces son válidos por tiempo limitado por seguridad.';
        } else if (err.message.includes('inválido') || err.message.includes('invalid')) {
          userMessage = 'El enlace de recuperación no es válido. Asegúrate de usar el enlace más reciente.';
        }
        
        toast.error(userMessage);
      } finally {
        setInitialLoading(false);
        console.log("LOG: [ResetPassword] === FIN DEBUG COMPLETO ===");
      }
    };

    verifyToken();
  }, [searchParams]);

  // Manejar cambios en los inputs
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid || !tokenValid) return;

    setLoading(true);
    console.log("LOG: [ResetPassword] Iniciando actualización de contraseña...");

    try {
      // Verificar que aún tenemos tokens válidos
      const tokens = window.resetTokens;
      if (!tokens) {
        throw new Error('Sesión expirada. Solicita un nuevo enlace de recuperación.');
      }

      // Verificar que la sesión actual sigue siendo válida
      const { data: currentSession } = await supabase.auth.getSession();
      
      if (!currentSession.session) {
        console.log("LOG: [ResetPassword] No hay sesión activa, reestableciendo...");
        
        // Reestablecer sesión si se perdió
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken
        });

        if (sessionError) {
          console.error("ERROR: [ResetPassword] Error al reestablecer sesión:", sessionError);
          
          if (sessionError.message.includes('expired') || sessionError.message.includes('invalid')) {
            throw new Error('El enlace de recuperación ha expirado durante el proceso. Solicita uno nuevo.');
          }
          throw sessionError;
        }

        if (!sessionData.user) {
          throw new Error('No se pudo reestablecer la sesión de recuperación');
        }
      }

      console.log("LOG: [ResetPassword] Sesión válida, actualizando contraseña...");

      // Actualizar la contraseña
      const { data, error } = await supabase.auth.updateUser({
        password: form.password
      });

      if (error) {
        console.error("ERROR: [ResetPassword] Error al actualizar contraseña:", error);
        
        if (error.message.includes('session_not_found')) {
          throw new Error('La sesión ha expirado durante la actualización. Solicita un nuevo enlace.');
        } else if (error.message.includes('same_password')) {
          throw new Error('La nueva contraseña debe ser diferente a la actual.');
        } else if (error.message.includes('weak_password')) {
          throw new Error('La contraseña no cumple con los requisitos de seguridad.');
        }
        
        throw error;
      }

      console.log("LOG: [ResetPassword] Contraseña actualizada exitosamente");
      setSuccessMessage("¡Contraseña actualizada exitosamente!");
      toast.success("¡Tu contraseña ha sido actualizada exitosamente!");

      // Limpiar tokens y cerrar sesión después de éxito
      delete window.resetTokens;
      
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate("/login", { 
          state: { 
            message: "Contraseña actualizada exitosamente. Inicia sesión con tu nueva contraseña.",
            type: "success"
          }
        });
      }, 3000);

    } catch (err) {
      console.error("ERROR: [ResetPassword] Error completo:", err);
      
      let errorMessage = err.message || "Error al actualizar la contraseña. Intenta de nuevo.";
      
      // Mensajes específicos para diferentes tipos de error
      if (err.message.includes('expirado') || err.message.includes('expired')) {
        errorMessage = 'El enlace de recuperación ha expirado. Por favor, solicita un nuevo enlace desde la página de login.';
        setTokenValid(false); // Marcar token como inválido
      } else if (err.message.includes('network') || err.message.includes('fetch')) {
        errorMessage = 'Error de conexión. Verifica tu internet e intenta nuevamente.';
      }
      
      toast.error(errorMessage);
      
    } finally {
      setLoading(false);
    }
  };

  // Loading inicial
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 text-center max-w-md mx-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Verificando enlace...</h3>
          <p className="text-gray-500">Validando tu token de recuperación</p>
        </div>
      </div>
    );
  }

  // Token inválido
  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 text-center max-w-md mx-4 border border-red-100">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-red-800 mb-4">Enlace Inválido</h2>
          <p className="text-red-600 mb-6">
            El enlace de recuperación es inválido o ha expirado. 
            Por favor, solicita un nuevo enlace de recuperación.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => navigate("/login")}
              className="w-full bg-gradient-to-r from-primary to-red-700 text-white px-6 py-3 rounded-xl hover:from-red-600 hover:to-red-800 transition-all duration-300 transform hover:scale-105 shadow-lg font-medium"
            >
              Ir al Login
            </button>
            <p className="text-center text-sm text-red-600">
              Puedes solicitar un nuevo enlace desde la página de login haciendo clic en "¿Olvidaste tu contraseña?"
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Éxito
  if (successMessage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 text-center max-w-md mx-4 border border-green-100">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-green-800 mb-4">¡Contraseña Actualizada!</h2>
          <p className="text-green-600 mb-6">
            Tu contraseña ha sido actualizada exitosamente. 
            Serás redirigido al login en unos segundos.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-green-600">
            <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
            Redirigiendo...
          </div>
        </div>
      </div>
    );
  }

  // Formulario principal
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center py-12 px-4">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-md border border-gray-200/50">
        
        {/* Header */}
        <div className="text-center p-8 pb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-red-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            Nueva Contraseña
          </h2>
          <p className="text-gray-600 mt-2">
            Establece una contraseña segura para tu cuenta
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-8 pt-0 space-y-6">
          
          {/* Nueva Contraseña */}
          <div className="relative">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Nueva Contraseña
            </label>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              value={form.password}
              onChange={handleChange}
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
              placeholder="Ingresa tu nueva contraseña"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-11 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
            {passwordError && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                {passwordError}
              </p>
            )}
          </div>

          {/* Confirmar Contraseña */}
          <div className="relative">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirmar Nueva Contraseña
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              required
              value={form.confirmPassword}
              onChange={handleChange}
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
              placeholder="Confirma tu nueva contraseña"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-11 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showConfirmPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
            {matchError && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                {matchError}
              </p>
            )}
          </div>

          {/* Requisitos de contraseña */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Requisitos de contraseña:</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className={`flex items-center gap-2 text-xs ${form.password.length >= 6 ? 'text-green-600' : 'text-gray-500'}`}>
                <span className={`w-2 h-2 rounded-full ${form.password.length >= 6 ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                6+ caracteres
              </div>
              <div className={`flex items-center gap-2 text-xs ${/[A-Z]/.test(form.password) ? 'text-green-600' : 'text-gray-500'}`}>
                <span className={`w-2 h-2 rounded-full ${/[A-Z]/.test(form.password) ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                Mayúscula
              </div>
              <div className={`flex items-center gap-2 text-xs ${/\d/.test(form.password) ? 'text-green-600' : 'text-gray-500'}`}>
                <span className={`w-2 h-2 rounded-full ${/\d/.test(form.password) ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                Un número
              </div>
              <div className={`flex items-center gap-2 text-xs ${form.password === form.confirmPassword && form.confirmPassword.length > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                <span className={`w-2 h-2 rounded-full ${form.password === form.confirmPassword && form.confirmPassword.length > 0 ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                Coinciden
              </div>
            </div>
          </div>

          {/* Botón de envío */}
          <button
            type="submit"
            disabled={!isValid || loading}
            className="w-full bg-gradient-to-r from-primary to-red-700 text-white py-4 rounded-xl text-lg font-semibold hover:from-red-600 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Actualizando contraseña...
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Actualizar Contraseña
              </div>
            )}
          </button>

          {/* Links de navegación */}
          <div className="text-center text-sm text-gray-500">
            ¿Recordaste tu contraseña?{" "}
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="font-medium text-primary hover:text-red-700 transition-colors"
            >
              Volver al login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;