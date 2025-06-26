import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { supabase } from "../services/supabaseClient";
import toast from "react-hot-toast";

// 🔒 UTILIDADES DE SEGURIDAD
const SecurityUtils = {
  // Rate limiting por IP/Email
  getAttemptKey: (email) => `login_attempts_${email}`,
  getBlockKey: (email) => `login_blocked_${email}`,
  
  // Obtener intentos fallidos
  getFailedAttempts: (email) => {
    try {
      const attempts = localStorage.getItem(SecurityUtils.getAttemptKey(email));
      return attempts ? JSON.parse(attempts) : { count: 0, lastAttempt: null };
    } catch {
      return { count: 0, lastAttempt: null };
    }
  },
  
  // Incrementar intentos fallidos
  incrementFailedAttempts: (email) => {
    const attempts = SecurityUtils.getFailedAttempts(email);
    const newAttempts = {
      count: attempts.count + 1,
      lastAttempt: Date.now()
    };
    localStorage.setItem(SecurityUtils.getAttemptKey(email), JSON.stringify(newAttempts));
    return newAttempts;
  },
  
  // Limpiar intentos fallidos (login exitoso)
  clearFailedAttempts: (email) => {
    localStorage.removeItem(SecurityUtils.getAttemptKey(email));
    localStorage.removeItem(SecurityUtils.getBlockKey(email));
  },
  
  // Verificar si está bloqueado
  isBlocked: (email) => {
    try {
      const blockData = localStorage.getItem(SecurityUtils.getBlockKey(email));
      if (!blockData) return { blocked: false };
      
      const { blockedUntil, reason } = JSON.parse(blockData);
      if (Date.now() < blockedUntil) {
        return { 
          blocked: true, 
          remainingTime: Math.ceil((blockedUntil - Date.now()) / 1000 / 60),
          reason 
        };
      } else {
        // Bloqueo expirado, limpiar
        localStorage.removeItem(SecurityUtils.getBlockKey(email));
        return { blocked: false };
      }
    } catch {
      return { blocked: false };
    }
  },
  
  // Bloquear cuenta
  blockAccount: (email, minutes = 15, reason = "Demasiados intentos fallidos") => {
    const blockData = {
      blockedUntil: Date.now() + (minutes * 60 * 1000),
      reason,
      blockedAt: Date.now()
    };
    localStorage.setItem(SecurityUtils.getBlockKey(email), JSON.stringify(blockData));
  },
  
  // Sanitizar email
  sanitizeEmail: (email) => {
    return email.toLowerCase().trim().replace(/[^\w@.-]/g, '');
  },
  
  // Validar email
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }
};

const Login = () => {
  const navigate = useNavigate();
  const { login } = useUser();
  
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // 🔒 ESTADOS DE SEGURIDAD
  const [securityState, setSecurityState] = useState({
    failedAttempts: 0,
    isBlocked: false,
    blockRemainingTime: 0,
    blockReason: "",
    lastAttemptTime: null
  });
  const [emailError, setEmailError] = useState("");

  // 🔒 VERIFICAR ESTADO DE SEGURIDAD AL CAMBIAR EMAIL
  useEffect(() => {
    if (formData.email) {
      const sanitizedEmail = SecurityUtils.sanitizeEmail(formData.email);
      if (sanitizedEmail) {
        const attempts = SecurityUtils.getFailedAttempts(sanitizedEmail);
        const blockStatus = SecurityUtils.isBlocked(sanitizedEmail);
        
        setSecurityState({
          failedAttempts: attempts.count,
          isBlocked: blockStatus.blocked,
          blockRemainingTime: blockStatus.remainingTime || 0,
          blockReason: blockStatus.reason || "",
          lastAttemptTime: attempts.lastAttempt
        });
      }
    }
  }, [formData.email]);

  // 🔒 ACTUALIZAR TIEMPO RESTANTE DE BLOQUEO
  useEffect(() => {
    let interval;
    if (securityState.isBlocked && securityState.blockRemainingTime > 0) {
      interval = setInterval(() => {
        const sanitizedEmail = SecurityUtils.sanitizeEmail(formData.email);
        const blockStatus = SecurityUtils.isBlocked(sanitizedEmail);
        
        if (!blockStatus.blocked) {
          setSecurityState(prev => ({ ...prev, isBlocked: false, blockRemainingTime: 0 }));
        } else {
          setSecurityState(prev => ({ ...prev, blockRemainingTime: blockStatus.remainingTime }));
        }
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [securityState.isBlocked, formData.email]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "email") {
      // Limpiar errores al cambiar email
      setEmailError("");
      // Sanitizar email en tiempo real
      const sanitized = SecurityUtils.sanitizeEmail(value);
      setFormData(prev => ({ ...prev, [name]: sanitized }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 🔒 VALIDACIONES DE SEGURIDAD PREVIAS
    const sanitizedEmail = SecurityUtils.sanitizeEmail(formData.email);
    
    // Validar formato de email
    if (!SecurityUtils.isValidEmail(sanitizedEmail)) {
      setEmailError("Formato de email inválido");
      toast.error("Por favor ingresa un email válido");
      return;
    }
    
    // Verificar si está bloqueado
    const blockStatus = SecurityUtils.isBlocked(sanitizedEmail);
    if (blockStatus.blocked) {
      const message = `Cuenta bloqueada por ${blockStatus.remainingTime} minutos más debido a múltiples intentos fallidos`;
      toast.error(message);
      return;
    }
    
    // Verificar límite de intentos (advertencia antes del bloqueo)
    const attempts = SecurityUtils.getFailedAttempts(sanitizedEmail);
    if (attempts.count >= 3) {
      toast.error(`⚠️ Advertencia: ${5 - attempts.count} intentos restantes antes del bloqueo`, {
        duration: 4000,
        style: {
          background: '#FEF3C7',
          color: '#92400E',
          border: '1px solid #F59E0B'
        }
      });
    }
    
    setIsSubmitting(true);

    try {
      console.log(`LOG: [Login] Intento de login para: ${sanitizedEmail}`);
      
      const { error } = await login({
        email: sanitizedEmail,
        password: formData.password
      });
      
      if (error) {
        console.log(`LOG: [Login] Error de autenticación:`, error.message);
        
        // 🔒 INCREMENTAR CONTADOR DE INTENTOS FALLIDOS
        const newAttempts = SecurityUtils.incrementFailedAttempts(sanitizedEmail);
        
        setSecurityState(prev => ({
          ...prev,
          failedAttempts: newAttempts.count,
          lastAttemptTime: newAttempts.lastAttempt
        }));
        
        // Bloquear si alcanza el límite
        if (newAttempts.count >= 5) {
          SecurityUtils.blockAccount(sanitizedEmail, 15, "Demasiados intentos de login fallidos");
          setSecurityState(prev => ({
            ...prev,
            isBlocked: true,
            blockRemainingTime: 15,
            blockReason: "Demasiados intentos fallidos"
          }));
          
          toast.error("Cuenta bloqueada por 15 minutos debido a múltiples intentos fallidos");
          return;
        }
        
        // Mensajes específicos según el tipo de error
        let errorMessage = "Email o contraseña incorrectos";
        
        if (error.message.includes("Invalid login credentials")) {
          errorMessage = `Credenciales incorrectas. ${5 - newAttempts.count} intentos restantes`;
        } else if (error.message.includes("Email not confirmed")) {
          errorMessage = "Por favor confirma tu email antes de iniciar sesión";
        } else if (error.message.includes("Account is disabled")) {
          errorMessage = "Tu cuenta ha sido deshabilitada. Contacta soporte";
        }
        
        toast.error(errorMessage);
        
        // Enfocar campo de password para nuevo intento
        setTimeout(() => {
          document.getElementById('password')?.select();
        }, 100);
        
        return;
      }
      
      // 🔒 LOGIN EXITOSO - LIMPIAR INTENTOS FALLIDOS
      console.log(`LOG: [Login] Login exitoso para: ${sanitizedEmail}`);
      SecurityUtils.clearFailedAttempts(sanitizedEmail);
      
      setSecurityState({
        failedAttempts: 0,
        isBlocked: false,
        blockRemainingTime: 0,
        blockReason: "",
        lastAttemptTime: null
      });
      
      toast.success("¡Bienvenido de vuelta!");
      navigate("/");
      
    } catch (error) {
      console.error("Error inesperado en login:", error);
      toast.error("Error inesperado. Intenta de nuevo");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    
    const sanitizedEmail = SecurityUtils.sanitizeEmail(resetEmail);
    
    if (!SecurityUtils.isValidEmail(sanitizedEmail)) {
      toast.error("Por favor ingresa un email válido");
      return;
    }

    setIsResetting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      toast.success("Se ha enviado un enlace de recuperación a tu correo");
      setShowForgotPassword(false);
      setResetEmail("");
    } catch (error) {
      console.error("Error en reset password:", error);
      
      let errorMessage = "Error al enviar el correo de recuperación";
      if (error.message.includes("Email rate limit exceeded")) {
        errorMessage = "Demasiados emails enviados. Espera unos minutos antes de intentar de nuevo";
      }
      
      toast.error(errorMessage);
    } finally {
      setIsResetting(false);
    }
  };

  // Componente de estado de seguridad
  const SecurityStatus = () => {
    if (securityState.isBlocked) {
      return (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="font-medium">Cuenta temporalmente bloqueada</span>
          </div>
          <p className="text-red-700 text-sm mt-1">
            Tiempo restante: {securityState.blockRemainingTime} minutos
          </p>
          <p className="text-red-600 text-xs mt-1">
            Motivo: {securityState.blockReason}
          </p>
        </div>
      );
    }
    
    if (securityState.failedAttempts > 0) {
      return (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="font-medium">
              {securityState.failedAttempts} intento{securityState.failedAttempts > 1 ? 's' : ''} fallido{securityState.failedAttempts > 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-yellow-700 text-sm mt-1">
            {5 - securityState.failedAttempts} intentos restantes antes del bloqueo
          </p>
        </div>
      );
    }
    
    return null;
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-lightpink py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Recuperar Contraseña
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña
            </p>
          </div>
          
          <form className="mt-8 space-y-6" onSubmit={handleForgotPassword}>
            <div>
              <label htmlFor="reset-email" className="sr-only">
                Correo electrónico
              </label>
              <input
                id="reset-email"
                name="reset-email"
                type="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(SecurityUtils.sanitizeEmail(e.target.value))}
                className="relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-primary focus:border-primary"
                placeholder="Correo electrónico"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetEmail("");
                }}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isResetting}
                className="flex-1 py-3 px-4 bg-primary text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition"
              >
                {isResetting ? "Enviando..." : "Enviar Enlace"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-lightpink py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <img
            className="mx-auto h-16 w-auto"
            src="/rossel-logo.webp"
            alt="Rossel"
          />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Inicia sesión en tu cuenta
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            O{" "}
            <Link
              to="/register"
              className="font-medium text-primary hover:text-red-700"
            >
              crea una cuenta nueva
            </Link>
          </p>
        </div>
        
        {/* 🔒 ESTADO DE SEGURIDAD */}
        <SecurityStatus />
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className={`relative block w-full px-3 py-3 border placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-primary focus:border-primary ${
                  emailError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                }`}
                placeholder="Correo electrónico"
                disabled={securityState.isBlocked}
              />
              {emailError && (
                <p className="mt-1 text-sm text-red-600">{emailError}</p>
              )}
            </div>
            <div className="relative">
              <label htmlFor="password" className="sr-only">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="relative block w-full px-3 py-3 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-primary focus:border-primary"
                placeholder="Contraseña"
                disabled={securityState.isBlocked}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                disabled={securityState.isBlocked}
              >
                {showPassword ? (
                  <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="font-medium text-primary hover:text-red-700"
                disabled={securityState.isBlocked}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting || securityState.isBlocked}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {isSubmitting ? "Iniciando sesión..." : "Iniciar sesión"}
            </button>
          </div>
          
          {securityState.isBlocked && (
            <div className="text-center text-sm text-gray-500">
              El formulario está bloqueado temporalmente por seguridad
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Login;