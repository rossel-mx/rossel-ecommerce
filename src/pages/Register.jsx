import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import toast from "react-hot-toast";

// 🔒 UTILIDADES DE SEGURIDAD (mismas que Login)
const SecurityUtils = {
  // Rate limiting por Email
  getAttemptKey: (email) => `register_attempts_${email}`,
  getBlockKey: (email) => `register_blocked_${email}`,
  getGlobalAttemptKey: () => `register_global_attempts`,
  
  // Obtener intentos fallidos por email
  getFailedAttempts: (email) => {
    try {
      const attempts = localStorage.getItem(SecurityUtils.getAttemptKey(email));
      return attempts ? JSON.parse(attempts) : { count: 0, lastAttempt: null };
    } catch {
      return { count: 0, lastAttempt: null };
    }
  },
  
  // Obtener intentos globales (por IP/dispositivo)
  getGlobalAttempts: () => {
    try {
      const attempts = localStorage.getItem(SecurityUtils.getGlobalAttemptKey());
      return attempts ? JSON.parse(attempts) : { count: 0, lastAttempt: null };
    } catch {
      return { count: 0, lastAttempt: null };
    }
  },
  
  // Incrementar intentos fallidos
  incrementFailedAttempts: (email) => {
    const attempts = SecurityUtils.getFailedAttempts(email);
    const globalAttempts = SecurityUtils.getGlobalAttempts();
    
    const newAttempts = {
      count: attempts.count + 1,
      lastAttempt: Date.now()
    };
    
    const newGlobalAttempts = {
      count: globalAttempts.count + 1,
      lastAttempt: Date.now()
    };
    
    localStorage.setItem(SecurityUtils.getAttemptKey(email), JSON.stringify(newAttempts));
    localStorage.setItem(SecurityUtils.getGlobalAttemptKey(), JSON.stringify(newGlobalAttempts));
    
    return { email: newAttempts, global: newGlobalAttempts };
  },
  
  // Limpiar intentos fallidos (registro exitoso)
  clearFailedAttempts: (email) => {
    localStorage.removeItem(SecurityUtils.getAttemptKey(email));
    localStorage.removeItem(SecurityUtils.getBlockKey(email));
    // No limpiar globales para mantener protección general
  },
  
  // Verificar si está bloqueado
  isBlocked: (email) => {
    try {
      // Verificar bloqueo específico del email
      const blockData = localStorage.getItem(SecurityUtils.getBlockKey(email));
      if (blockData) {
        const { blockedUntil, reason } = JSON.parse(blockData);
        if (Date.now() < blockedUntil) {
          return { 
            blocked: true, 
            remainingTime: Math.ceil((blockedUntil - Date.now()) / 1000 / 60),
            reason,
            type: 'email'
          };
        } else {
          localStorage.removeItem(SecurityUtils.getBlockKey(email));
        }
      }
      
      // Verificar bloqueo global
      const globalBlockData = localStorage.getItem('register_global_blocked');
      if (globalBlockData) {
        const { blockedUntil, reason } = JSON.parse(globalBlockData);
        if (Date.now() < blockedUntil) {
          return { 
            blocked: true, 
            remainingTime: Math.ceil((blockedUntil - Date.now()) / 1000 / 60),
            reason,
            type: 'global'
          };
        } else {
          localStorage.removeItem('register_global_blocked');
        }
      }
      
      return { blocked: false };
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
  
  // Bloqueo global
  blockGlobal: (minutes = 30, reason = "Demasiados intentos de registro") => {
    const blockData = {
      blockedUntil: Date.now() + (minutes * 60 * 1000),
      reason,
      blockedAt: Date.now()
    };
    localStorage.setItem('register_global_blocked', JSON.stringify(blockData));
  },
  
  // Sanitizar email
  sanitizeEmail: (email) => {
    return email.toLowerCase().trim().replace(/[^\w@.-]/g, '');
  },
  
  // Sanitizar texto
  sanitizeText: (text, maxLength = 100) => {
    return text.trim().slice(0, maxLength).replace(/[<>'"]/g, '');
  },
  
  // Validar email
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }
};

const Register = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [matchError, setMatchError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔒 ESTADOS DE SEGURIDAD
  const [securityState, setSecurityState] = useState({
    emailAttempts: 0,
    globalAttempts: 0,
    isBlocked: false,
    blockRemainingTime: 0,
    blockReason: "",
    blockType: ""
  });

  // Validación en tiempo real (MANTENER ORIGINAL)
  useEffect(() => {
    if (form.password && !/^(?=.*[A-Z])(?=.*\d).{6,}$/.test(form.password)) {
      setPasswordError("Debe tener al menos 6 caracteres, una mayúscula y un número.");
    } else {
      setPasswordError("");
    }
    if (form.confirmPassword && form.password !== form.confirmPassword) {
      setMatchError("Las contraseñas no coinciden.");
    } else {
      setMatchError("");
    }
    const noErrors = form.name.trim() && 
                    form.email.trim() && 
                    /^(?=.*[A-Z])(?=.*\d).{6,}$/.test(form.password) && 
                    form.password === form.confirmPassword;
    setIsValid(noErrors);
  }, [form.name, form.email, form.password, form.confirmPassword]);

  // 🔒 VERIFICAR ESTADO DE SEGURIDAD AL CAMBIAR EMAIL
  useEffect(() => {
    if (form.email) {
      const sanitizedEmail = SecurityUtils.sanitizeEmail(form.email);
      if (sanitizedEmail) {
        const emailAttempts = SecurityUtils.getFailedAttempts(sanitizedEmail);
        const globalAttempts = SecurityUtils.getGlobalAttempts();
        const blockStatus = SecurityUtils.isBlocked(sanitizedEmail);
        
        setSecurityState({
          emailAttempts: emailAttempts.count,
          globalAttempts: globalAttempts.count,
          isBlocked: blockStatus.blocked,
          blockRemainingTime: blockStatus.remainingTime || 0,
          blockReason: blockStatus.reason || "",
          blockType: blockStatus.type || ""
        });
      }
    }
  }, [form.email]);

  // 🔒 ACTUALIZAR TIEMPO RESTANTE DE BLOQUEO
  useEffect(() => {
    let interval;
    if (securityState.isBlocked && securityState.blockRemainingTime > 0) {
      interval = setInterval(() => {
        const sanitizedEmail = SecurityUtils.sanitizeEmail(form.email);
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
  }, [securityState.isBlocked, form.email]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "email") {
      setEmailError(""); // Limpiar errores al cambiar email
      const sanitized = SecurityUtils.sanitizeEmail(value);
      setForm(prev => ({ ...prev, [name]: sanitized }));
    } else if (name === "name") {
      const sanitized = SecurityUtils.sanitizeText(value, 50);
      setForm(prev => ({ ...prev, [name]: sanitized }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;

    // 🔒 VALIDACIONES DE SEGURIDAD PREVIAS
    const sanitizedEmail = SecurityUtils.sanitizeEmail(form.email);
    const sanitizedName = SecurityUtils.sanitizeText(form.name, 50);
    
    // Validar formato de email
    if (!SecurityUtils.isValidEmail(sanitizedEmail)) {
      setEmailError("Formato de email inválido");
      toast.error("Por favor ingresa un email válido");
      return;
    }
    
    // Verificar si está bloqueado
    const blockStatus = SecurityUtils.isBlocked(sanitizedEmail);
    if (blockStatus.blocked) {
      const message = blockStatus.type === 'global' 
        ? `Registro temporalmente bloqueado por ${blockStatus.remainingTime} minutos más`
        : `Email bloqueado por ${blockStatus.remainingTime} minutos más debido a múltiples intentos`;
      toast.error(message);
      return;
    }
    
    // Verificar límite de intentos (advertencia antes del bloqueo)
    const emailAttempts = SecurityUtils.getFailedAttempts(sanitizedEmail);
    const globalAttempts = SecurityUtils.getGlobalAttempts();
    
    if (emailAttempts.count >= 2) {
      toast.warning(`Advertencia: ${3 - emailAttempts.count} intentos restantes para este email`);
    }
    
    if (globalAttempts.count >= 8) {
      toast.warning(`Advertencia: límite de registros casi alcanzado`);
    }

    setLoading(true);
    setEmailError(""); // Limpiar errores previos

    try {
      console.log("LOG: [Register] Iniciando registro para:", sanitizedEmail);
      
      // 🔍 VERIFICACIÓN PREVIA con función RPC (MANTENER ORIGINAL)
      console.log("LOG: [Register] Verificando si el email ya existe...");
      const { data: emailExists, error: rpcError } = await supabase
        .rpc('check_email_exists', { email_to_check: sanitizedEmail });

      console.log("LOG: [Register] Resultado de verificación:", { emailExists, rpcError });

      if (rpcError) {
        console.warn("WARN: [Register] Error en verificación RPC (continuando):", rpcError);
        // Continuamos aunque falle la verificación
      } else if (emailExists) {
        // 🔒 INCREMENTAR INTENTOS POR EMAIL DUPLICADO
        const newAttempts = SecurityUtils.incrementFailedAttempts(sanitizedEmail);
        
        setSecurityState(prev => ({
          ...prev,
          emailAttempts: newAttempts.email.count,
          globalAttempts: newAttempts.global.count
        }));
        
        // Bloquear si alcanza límite
        if (newAttempts.email.count >= 3) {
          SecurityUtils.blockAccount(sanitizedEmail, 15, "Múltiples intentos con email existente");
          setSecurityState(prev => ({
            ...prev,
            isBlocked: true,
            blockRemainingTime: 15,
            blockReason: "Múltiples intentos con email existente",
            blockType: "email"
          }));
          toast.error("Email bloqueado temporalmente por múltiples intentos");
          return;
        }
        
        const friendlyMessage = `El correo ${sanitizedEmail} ya está registrado. ¿Ya tienes cuenta?`;
        setEmailError(friendlyMessage);
        toast.error(friendlyMessage);
        setTimeout(() => {
          document.getElementById('email')?.focus();
        }, 100);
        return;
      }

      console.log("LOG: [Register] Email disponible, procediendo con registro...");
      
      // ✅ REGISTRO DIRECTO (MANTENER ORIGINAL)
      const { data, error } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password: form.password,
        options: {
          data: {
            full_name: sanitizedName,
          },
        },
      });

      console.log("LOG: [Register] Respuesta de registro:", { data, error });

      if (error) {
        console.log("LOG: [Register] Error de registro completo:", error);
        console.log("LOG: [Register] Error message:", error.message);
        console.log("LOG: [Register] Error code:", error.status);
        
        // 🔒 INCREMENTAR INTENTOS POR ERROR
        const newAttempts = SecurityUtils.incrementFailedAttempts(sanitizedEmail);
        
        setSecurityState(prev => ({
          ...prev,
          emailAttempts: newAttempts.email.count,
          globalAttempts: newAttempts.global.count
        }));
        
        // Verificar límites y bloquear si es necesario
        if (newAttempts.email.count >= 3) {
          SecurityUtils.blockAccount(sanitizedEmail, 15, "Múltiples errores en registro");
          toast.error("Email bloqueado temporalmente por múltiples errores");
        }
        
        if (newAttempts.global.count >= 10) {
          SecurityUtils.blockGlobal(30, "Límite de intentos de registro alcanzado");
          toast.error("Registro temporalmente bloqueado por límite alcanzado");
        }
        
        // 🎯 MANEJO INTELIGENTE DE ERRORES DE SUPABASE (MANTENER ORIGINAL)
        const errorMessage = error.message.toLowerCase();
        
        // Todos los posibles mensajes de email duplicado
        if (errorMessage.includes('user already registered') || 
            errorMessage.includes('email address is already registered') ||
            errorMessage.includes('a user with this email address has already been registered') ||
            errorMessage.includes('email address already registered') ||
            errorMessage.includes('email already exists') ||
            errorMessage.includes('email already in use') ||
            errorMessage.includes('user with this email already exists') ||
            errorMessage.includes('duplicate') ||
            error.status === 422) { // Status code común para email duplicado
          
          const friendlyMessage = `El correo ${sanitizedEmail} ya está registrado. ¿Ya tienes cuenta?`;
          setEmailError(friendlyMessage);
          toast.error(friendlyMessage);
          setTimeout(() => {
            document.getElementById('email')?.focus();
          }, 100);
          return;
        }
        
        // Otros errores específicos con mensajes amigables (MANTENER ORIGINAL)
        if (error.message.includes('Invalid email')) {
          const message = 'El formato del correo electrónico no es válido.';
          setEmailError(message);
          toast.error(message);
          return;
        }
        
        if (error.message.includes('Password should be at least')) {
          const message = 'La contraseña debe tener al menos 6 caracteres.';
          toast.error(message);
          return;
        }
        
        if (error.message.includes('Email rate limit exceeded')) {
          const message = 'Se han enviado demasiados emails. Espera unos minutos antes de intentar de nuevo.';
          toast.error(message);
          return;
        }
        
        if (error.message.includes('Signup is disabled')) {
          const message = 'El registro de nuevos usuarios está temporalmente deshabilitado.';
          toast.error(message);
          return;
        }

        if (error.message.includes('Email link is invalid or has expired')) {
          const message = 'El enlace de confirmación ha expirado. Se enviará un nuevo email de confirmación.';
          toast.error(message);
          return;
        }
        
        // Error genérico
        const genericMessage = "Error al registrar. Intenta de nuevo.";
        toast.error(genericMessage);
        console.error("ERROR: [Register] Error no manejado específicamente:", error.message);
        return;
      }

      // ✅ REGISTRO EXITOSO (MANTENER ORIGINAL)
      if (data.user) {
        console.log("LOG: [Register] Usuario creado exitosamente:", data.user);
        
        // 🔒 LIMPIAR INTENTOS FALLIDOS
        SecurityUtils.clearFailedAttempts(sanitizedEmail);
        setSecurityState({
          emailAttempts: 0,
          globalAttempts: 0,
          isBlocked: false,
          blockRemainingTime: 0,
          blockReason: "",
          blockType: ""
        });
        
        // Verificar si el email ya está confirmado o necesita confirmación (MANTENER ORIGINAL)
        if (!data.user.email_confirmed_at) {
          setSuccessMessage("¡Registro exitoso! Por favor, revisa tu correo electrónico para confirmar tu cuenta antes de iniciar sesión.");
          toast.success("¡Cuenta creada exitosamente! Revisa tu email para confirmarla.");
        } else {
          setSuccessMessage("¡Registro exitoso! Tu cuenta ha sido creada y confirmada. Ya puedes iniciar sesión.");
          toast.success("¡Cuenta creada y confirmada exitosamente!");
        }
      } else {
        throw new Error("No se pudo crear la cuenta. Intenta de nuevo.");
      }

    } catch (err) {
      console.error("ERROR: [Register] Error inesperado durante el registro:", err);
      
      // 🔒 INCREMENTAR INTENTOS POR ERROR INESPERADO
      const newAttempts = SecurityUtils.incrementFailedAttempts(sanitizedEmail);
      setSecurityState(prev => ({
        ...prev,
        emailAttempts: newAttempts.email.count,
        globalAttempts: newAttempts.global.count
      }));
      
      const errorMessage = err.message || "Error inesperado al registrar. Intenta de nuevo.";
      toast.error(errorMessage);
      
    } finally {
      setLoading(false);
    }
  };

  // 🔒 Componente de estado de seguridad
  const SecurityStatus = () => {
    if (securityState.isBlocked) {
      return (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="font-medium">
              {securityState.blockType === 'global' ? 'Registro temporalmente bloqueado' : 'Email temporalmente bloqueado'}
            </span>
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
    
    if (securityState.emailAttempts > 0 || securityState.globalAttempts > 5) {
      return (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="font-medium">Advertencia de seguridad</span>
          </div>
          {securityState.emailAttempts > 0 && (
            <p className="text-yellow-700 text-sm mt-1">
              {securityState.emailAttempts} intento{securityState.emailAttempts > 1 ? 's' : ''} con este email. 
              {3 - securityState.emailAttempts} restantes antes del bloqueo.
            </p>
          )}
          {securityState.globalAttempts > 5 && (
            <p className="text-yellow-700 text-sm mt-1">
              Múltiples intentos de registro detectados. Usar con precaución.
            </p>
          )}
        </div>
      );
    }
    
    return null;
  };

  // Si el registro fue exitoso, mostrar mensaje de confirmación (MANTENER ORIGINAL COMPLETO)
  if (successMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-lightpink py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="bg-white p-8 rounded-2xl shadow-lg">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              ¡Cuenta Creada!
            </h2>
            <p className="text-gray-600 mb-6">
              {successMessage}
            </p>
            <div className="space-y-4">
              <Link
                to="/login"
                className="block w-full bg-primary text-white py-3 px-4 rounded-lg hover:bg-red-700 transition font-medium"
              >
                Ir a Iniciar Sesión
              </Link>
              <Link
                to="/"
                className="block w-full text-gray-600 hover:text-primary transition font-medium"
              >
                Volver al Inicio
              </Link>
              <div className="text-center pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  ¿No recibiste el email? Revisa tu carpeta de spam o{" "}
                  <button 
                    onClick={() => window.location.reload()} 
                    className="text-primary hover:underline"
                  >
                    intenta de nuevo
                  </button>
                </p>
              </div>
            </div>
          </div>
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
            Crea tu cuenta
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            O{" "}
            <Link
              to="/login"
              className="font-medium text-primary hover:text-red-700"
            >
              inicia sesión si ya tienes cuenta
            </Link>
          </p>
        </div>
        
        {/* 🔒 ESTADO DE SEGURIDAD */}
        <SecurityStatus />
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Nombre Completo */}
            <div>
              <label htmlFor="name" className="sr-only">
                Nombre completo
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={form.name}
                onChange={handleChange}
                className="relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-primary focus:border-primary"
                placeholder="Nombre completo"
                disabled={securityState.isBlocked}
                maxLength="50"
              />
            </div>

            {/* Email */}
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
                value={form.email}
                onChange={handleChange}
                className={`relative block w-full px-3 py-3 border placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-primary focus:border-primary ${
                  emailError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                }`}
                placeholder="Correo electrónico"
                disabled={securityState.isBlocked}
                maxLength="254"
              />
              {emailError && (
                <div className="mt-1 text-sm text-red-600 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  {emailError}
                  {emailError.includes('ya está registrado') && (
                    <Link to="/login" className="underline hover:text-red-800">
                      Ir a login
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Contraseña */}
            <div className="relative">
              <label htmlFor="password" className="sr-only">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={form.password}
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
              {passwordError && (
                <p className="mt-1 text-sm text-red-600">{passwordError}</p>
              )}
            </div>

            {/* Confirmar Contraseña */}
            <div className="relative">
              <label htmlFor="confirmPassword" className="sr-only">
                Confirmar contraseña
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={form.confirmPassword}
                onChange={handleChange}
                className="relative block w-full px-3 py-3 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-primary focus:border-primary"
                placeholder="Confirmar contraseña"
                disabled={securityState.isBlocked}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                disabled={securityState.isBlocked}
              >
                {showConfirmPassword ? (
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
              {matchError && (
                <p className="mt-1 text-sm text-red-600">{matchError}</p>
              )}
            </div>
          </div>

          {/* Requisitos de contraseña (MANTENER ORIGINAL) */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Requisitos de contraseña:</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li className={`flex items-center gap-2 ${form.password.length >= 6 ? 'text-green-600' : ''}`}>
                <span className={`w-2 h-2 rounded-full ${form.password.length >= 6 ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                Al menos 6 caracteres
              </li>
              <li className={`flex items-center gap-2 ${/[A-Z]/.test(form.password) ? 'text-green-600' : ''}`}>
                <span className={`w-2 h-2 rounded-full ${/[A-Z]/.test(form.password) ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                Una letra mayúscula
              </li>
              <li className={`flex items-center gap-2 ${/\d/.test(form.password) ? 'text-green-600' : ''}`}>
                <span className={`w-2 h-2 rounded-full ${/\d/.test(form.password) ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                Un número
              </li>
              <li className={`flex items-center gap-2 ${form.password === form.confirmPassword && form.confirmPassword.length > 0 ? 'text-green-600' : ''}`}>
                <span className={`w-2 h-2 rounded-full ${form.password === form.confirmPassword && form.confirmPassword.length > 0 ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                Las contraseñas coinciden
              </li>
            </ul>
          </div>

          <div>
            <button
              type="submit"
              disabled={!isValid || loading || securityState.isBlocked}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creando cuenta...
                </>
              ) : (
                "Crear cuenta"
              )}
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

export default Register;