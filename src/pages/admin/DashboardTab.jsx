/**
 * @file DashboardTab.jsx
 * @description Dashboard principal del panel de administración.
 * Esta versión está completamente reconstruida para funcionar con la nueva arquitectura de
 * productos y variantes. Muestra métricas clave y gráficos analíticos para una
 * visión completa del negocio, utilizando la librería 'recharts'.
 *
 * @requires react
 * @requires recharts
 * @requires supabaseClient
 * @requires react-hot-toast
 */
import { useEffect, useState } from "react";
import { supabase } from "../../services/supabaseClient";
import toast from "react-hot-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// --- Sub-componente para las tarjetas de KPIs (Indicadores Clave) ---
const StatCard = ({ title, value, icon, color }) => (
  <div className="bg-white p-6 rounded-lg shadow-lg flex items-center space-x-4">
    <div className={`text-3xl p-3 rounded-full ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  </div>
);

// --- Colores para los gráficos de pastel/dona ---
const COLORS = ['#FFBB28', '#00C49F', '#0088FE', '#FF8042', '#AF19FF'];

const DashboardTab = () => {
  // --- ESTADOS ---
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --- LÓGICA DE DATOS ---
  useEffect(() => {
    const fetchAnalytics = async () => {
      console.log("LOG: [Dashboard] Iniciando carga de analíticas...");
      setLoading(true);
      try {
        // Llamamos a nuestra nueva y potente función RPC
        const { data, error: rpcError } = await supabase.rpc('get_full_dashboard_analytics');
        if (rpcError) throw rpcError;
        setAnalytics(data);
        console.log("LOG: [Dashboard] Analíticas cargadas exitosamente:", data);
      } catch (error) {
        console.error("ERROR: [Dashboard] Error al cargar analíticas:", error);
        setError("No se pudieron cargar las analíticas.");
        toast.error("No se pudieron cargar las analíticas.");
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  // --- FUNCIONES AUXILIARES ---
  const formatCurrency = (value) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value || 0);

  // --- RENDERIZADO CONDICIONAL ---
  if (loading) return <p className="text-center text-gray-500 p-10">Cargando dashboard...</p>;
  if (error) return <p className="text-center text-red-500 p-10">{error}</p>;
  if (!analytics) return <p className="text-center text-gray-500 p-10">No hay datos disponibles para mostrar.</p>;

  // --- RENDERIZADO PRINCIPAL ---
  return (
    <div className="space-y-8">
      {/* --- Fila de KPIs --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Ingresos (Órdenes Completadas)" value={formatCurrency(analytics.kpis.total_revenue)} icon={'💰'} color="bg-green-100 text-green-600" />
        <StatCard title="Total de Clientes" value={analytics.kpis.total_clients} icon={'👥'} color="bg-blue-100 text-blue-600" />
        <StatCard title="Total de Modelos" value={analytics.kpis.total_products} icon={'📦'} color="bg-indigo-100 text-indigo-600" />
        <StatCard title="Pedidos Pendientes" value={analytics.kpis.pending_orders} icon={'🔔'} color="bg-yellow-100 text-yellow-600" />
      </div>

      {/* --- Fila de Gráficos Principales --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Gráfico de Ventas Semanales */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-lg">
          <h3 className="font-bold text-lg mb-4">Ventas en los Últimos 7 Días</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.sales_by_day || []} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(date) => new Date(date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} />
              <YAxis tickFormatter={(value) => `$${value/1000}k`} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="total" fill="#B91C1C" name="Ventas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Gráfico de Estado de Órdenes */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="font-bold text-lg mb-4">Distribución de Órdenes</h3>
           <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={analytics.order_status_distribution || []} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label>
                {(analytics.order_status_distribution || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* --- Fila de Top Productos --- */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h3 className="font-bold text-lg mb-4">Top 5 Productos Más Vendidos (por unidades)</h3>
        <div className="space-y-4">
          {(analytics.top_products || []).length > 0 ? (
            analytics.top_products.map((product, index) => (
              <div key={index} className="flex items-center">
                <span className="font-bold text-primary w-6">#{index + 1}</span>
                <div className="flex-grow bg-gray-100 rounded-lg p-2">
                  <div className="flex justify-between">
                    <span className="font-semibold">{product.name}</span>
                    <span className="font-bold">{product.sold} uds.</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div className="bg-primary h-2 rounded-full" style={{ width: `${(product.sold / (analytics.top_products[0]?.sold || 1)) * 100}%` }}></div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 text-center">Aún no hay suficientes datos de ventas para mostrar los productos más vendidos.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardTab;
