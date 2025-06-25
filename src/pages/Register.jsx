import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import toast from "react-hot-toast";

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
  const [emailError, setEmailError] = useState(""); // Nuevo estado para errores de email
  const [isValid, setIsValid] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Validación en tiempo real
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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    setEmailError(""); // Limpiar errores previos

    try {
      console.log("Verificando si el email ya existe en la base de datos:", form.email);
      
      // 🔍 VERIFICACIÓN PREVIA: Buscar si ya existe un perfil con este email
      // Como no podemos buscar directamente en auth.users, intentamos hacer login
      const { data: loginAttempt, error: loginError } = await supabase.auth.signInWithPassword({
        email: form.email.toLowerCase().trim(),
        password: 'password-temporal-para-verificar-123456' // Contraseña falsa
      });

      console.log("Resultado de verificación de login:", { loginAttempt, loginError });

      // Analizar el error para determinar si el email existe
      if (loginError) {
        // Si el error NO es "Invalid login credentials", el email podría existir
        if (loginError.message.includes('Email not confirmed') || 
            loginError.message.includes('Email address not confirmed') ||
            loginError.message.includes('Email link is invalid or has expired')) {
          throw new Error(`El correo ${form.email} ya está registrado pero no confirmado. Revisa tu email o intenta hacer login.`);
        }
        
        // Si es "Invalid login credentials", significa que el email existe pero la contraseña es incorrecta
        if (loginError.message.includes('Invalid login credentials') && 
            !loginError.message.includes('Email not confirmed')) {
          throw new Error(`El correo ${form.email} ya está registrado. ¿Ya tienes cuenta?`);
        }
        
        // Otros errores de login indican que el email podría existir
        if (!loginError.message.includes('Invalid login credentials') && 
            !loginError.message.includes('User not found')) {
          console.log("Posible email existente detectado por error:", loginError.message);
          throw new Error(`El correo ${form.email} ya está registrado. ¿Ya tienes cuenta?`);
        }
      }

      // Si llegamos aquí, el email probablemente no existe, proceder con registro
      console.log("Email parece estar disponible, procediendo con el registro...");
      
      const { data, error } = await supabase.auth.signUp({
        email: form.email.toLowerCase().trim(),
        password: form.password,
        options: {
          data: {
            full_name: form.name.trim(),
          },
        },
      });

      console.log("Respuesta de registro:", { data, error });

      if (error) {
        console.log("Error de registro:", error.message);
        
        if (error.message.includes('User already registered') || 
            error.message.includes('Email address is already registered') ||
            error.message.includes('A user with this email address has already been registered') ||
            error.message.includes('Email address already registered')) {
          throw new Error(`El correo ${form.email} ya está registrado. ¿Ya tienes cuenta?`);
        }
        
        // Otros errores
        if (error.message.includes('Invalid email')) {
          throw new Error('El formato del correo electrónico no es válido.');
        }
        if (error.message.includes('Password should be at least')) {
          throw new Error('La contraseña debe tener al menos 6 caracteres.');
        }
        if (error.message.includes('Email rate limit exceeded')) {
          throw new Error('Se han enviado demasiados emails. Espera unos minutos antes de intentar de nuevo.');
        }
        if (error.message.includes('Signup is disabled')) {
          throw new Error('El registro de nuevos usuarios está temporalmente deshabilitado.');
        }
        
        throw new Error(error.message || "Error al registrar. Intenta de nuevo.");
      }

      // ✅ Registro exitoso
      if (data.user) {
        console.log("Usuario creado exitosamente:", data.user);
        
        if (!data.user.email_confirmed_at) {
          setSuccessMessage("¡Registro exitoso! Por favor, revisa tu correo electrónico para confirmar tu cuenta.");
          toast.success("¡Cuenta creada exitosamente! Revisa tu email.");
        } else {
          setSuccessMessage("¡Registro exitoso! Tu cuenta ha sido creada y confirmada.");
          toast.success("¡Cuenta creada y confirmada exitosamente!");
        }
      } else {
        throw new Error("No se pudo crear la cuenta. Intenta de nuevo.");
      }

    } catch (err) {
      console.error("Error durante el registro:", err);
      
      const errorMessage = err.message || "Error al registrar. Intenta de nuevo.";
      toast.error(errorMessage);
      
      if (err.message.includes('ya está registrado')) {
        setEmailError(err.message);
        setTimeout(() => {
          document.getElementById('email')?.focus();
        }, 100);
      }
      
    } finally {
      setLoading(false);
    }
  };

  // Si el registro fue exitoso, mostrar mensaje de confirmación
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
                onChange={(e) => {
                  handleChange(e);
                  setEmailError(""); // Limpiar error al empezar a escribir
                }}
                className={`relative block w-full px-3 py-3 border placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-primary focus:border-primary ${
                  emailError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                }`}
                placeholder="Correo electrónico"
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
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
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
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
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

          {/* Requisitos de contraseña */}
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
              disabled={!isValid || loading}
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
        </form>
      </div>
    </div>
  );
};

export default Register;