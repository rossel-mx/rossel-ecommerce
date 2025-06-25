import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
// 1. Ya no importamos 'API', no es necesario.
import { useUser } from "../context/UserContext";
import toast, { Toaster } from "react-hot-toast";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useUser();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  // Opcional: estado de carga para deshabilitar el botón mientras se procesa
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // 2. La lógica ahora es mucho más limpia.
    try {
      // 3. Llamamos a la función 'login' del contexto, que ahora se comunica con Supabase.
      const { error } = await login({
        email: form.email,
        password: form.password,
      });

      // 4. Si Supabase devuelve un error, lo lanzamos para que lo capture el bloque catch.
      if (error) {
        throw error;
      }

      // 5. Si no hay error, el listener onAuthStateChange ya hizo su trabajo.
      //    Simplemente mostramos la notificación de éxito y redirigimos.
      toast.success("Inicio de sesión exitoso ✅");

      setTimeout(() => {
        navigate("/");
      }, 1200);

    } catch (err) {
      // 6. Mostramos el mensaje de error que nos da Supabase.
      setError(err.message || "Error al iniciar sesión. Inténtalo nuevamente.");
    } finally {
      // 7. Nos aseguramos de que el estado de carga siempre se desactive.
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-lightpink px-4">
      <Toaster position="top-right" />
      <h2 className="text-3xl font-bold text-primary mb-6">Iniciar sesión</h2>
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm"
      >
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        {/* ... El resto de tu formulario JSX no necesita cambios ... */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Correo electrónico
          </label>
          <input
            type="email"
            name="email"
            placeholder="Ej. usuario@rossel.com"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border rounded-lg mt-1 focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Contraseña
          </label>
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Tu contraseña"
            value={form.password}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border rounded-lg mt-1 focus:ring-2 focus:ring-primary"
          />
          <div className="flex items-center mt-2">
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
        </div>
        <button
          type="submit"
          disabled={loading} // Opcional: deshabilita el botón durante la carga
          className="w-full py-2 mt-2 rounded-lg bg-primary text-white hover:bg-red-700 transition disabled:bg-gray-400"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
        <p className="text-sm mt-4 text-center">
          ¿Aún no tienes cuenta?{" "}
          <Link to="/register" className="text-primary hover:underline">
            Regístrate
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Login;