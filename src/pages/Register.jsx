import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
// 1. Importamos el cliente de Supabase y quitamos la importación de API
import { supabase } from "../services/supabaseClient";

const Register = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [matchError, setMatchError] = useState("");
  const [isValid, setIsValid] = useState(false);
  // 2. Cambiamos el estado de éxito y añadimos estados de error y carga
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // La lógica de validación en tiempo real se queda igual, ¡está perfecta!
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
    const noErrors = /^(?=.*[A-Z])(?=.*\d).{6,}$/.test(form.password) && form.password === form.confirmPassword;
    setIsValid(noErrors);
  }, [form.password, form.confirmPassword]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // 3. Aquí viene la nueva lógica de handleSubmit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.name, // Pasamos el nombre aquí
          },
        },
      });

      if (error) {
        throw error;
      }

      // 4. Mostramos un mensaje pidiendo que confirmen su email.
      setSuccessMessage("¡Registro exitoso! Por favor, revisa tu correo electrónico para confirmar tu cuenta.");

    } catch (err) {
      // 5. Un manejo de errores más específico de Supabase
      setErrorMessage(err.message || "Error al registrar. Intenta con otro correo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-lightpink px-4">
      <h2 className="text-3xl font-bold text-primary mb-6">Crear cuenta</h2>

      {/* 6. Adaptamos los mensajes de éxito y error */}
      {successMessage && (
        <div className="bg-green-500 text-white text-center py-2 px-4 rounded mb-4">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="bg-red-500 text-white text-center py-2 px-4 rounded mb-4">
          {errorMessage}
        </div>
      )}

      {/* Si el registro fue exitoso, no tiene sentido mostrar el formulario de nuevo */}
      {!successMessage && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm">
          {/* ...El resto del formulario es idéntico... */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Nombre completo</label>
            <input
              type="text"
              name="name"
              placeholder="Ej. Mariana López"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border rounded-lg mt-1 focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Correo electrónico</label>
            <input
              type="email"
              name="email"
              placeholder="Ej. mariana@rossel.com"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border rounded-lg mt-1 focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700">Contraseña</label>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Ej. Rossel123"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border rounded-lg mt-1 focus:ring-2 focus:ring-primary"
            />
            {passwordError && (
              <p className="text-red-600 text-xs mt-1">{passwordError}</p>
            )}
          </div>
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700">Confirmar contraseña</label>
            <input
              type={showPassword ? "text" : "password"}
              name="confirmPassword"
              placeholder="Repite la contraseña"
              value={form.confirmPassword}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border rounded-lg mt-1 focus:ring-2 focus:ring-primary"
            />
            {matchError && (
              <p className="text-red-600 text-xs mt-1">{matchError}</p>
            )}
          </div>
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="showPassword"
              className="mr-2"
              checked={showPassword}
              onChange={() => setShowPassword(!showPassword)}
            />
            <label htmlFor="showPassword" className="text-sm text-gray-700">
              Mostrar contraseña
            </label>
          </div>
          <button
            type="submit"
            disabled={!isValid || loading}
            className={`w-full py-2 rounded-lg transition text-white ${
              isValid && !loading ? "bg-primary hover:bg-red-700" : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            {loading ? "Registrando..." : "Registrarse"}
          </button>
          <p className="text-sm mt-4 text-center">
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Inicia sesión
            </Link>
          </p>
        </form>
      )}
    </div>
  );
};

export default Register;