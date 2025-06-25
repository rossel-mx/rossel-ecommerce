/**
 * @file Cart.jsx
 * @description Página del carrito de compras.
 * Esta versión está completamente reconstruida para funcionar con la nueva arquitectura
 * de productos y variantes. Muestra cada variante (ej. mismo producto, diferente color)
 * como un artículo separado y utiliza la lógica actualizada del CartContext.
 *
 * @requires react
 * @requires react-router-dom
 * @requires ../context/CartContext
 * @requires react-hot-toast
 */
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import toast from "react-hot-toast";

const Cart = () => {
  // 1. --- OBTENEMOS EL ESTADO Y LAS FUNCIONES DEL CONTEXTO ---
  // Estas funciones ya están adaptadas para trabajar con IDs de variantes.
  const { cart, removeFromCart, updateQuantity, getTotal, clearCart } = useCart();

  console.log("LOG: [Cart] Renderizando componente. Contenido del carrito:", cart);

  // 2. --- MANEJADORES DE EVENTOS ---
  /**
   * Maneja el vaciado completo del carrito, con una confirmación previa.
   */
  const handleClearCart = () => {
    // Usamos window.confirm para una confirmación simple y nativa.
    if (window.confirm("¿Estás seguro de que quieres vaciar tu carrito por completo?")) {
      console.log("LOG: [Cart] Usuario confirmó vaciar el carrito.");
      clearCart();
      toast.success("Tu carrito ha sido vaciado.");
    } else {
      console.log("LOG: [Cart] El usuario canceló la operación de vaciar el carrito.");
    }
  };
  
  // 3. --- FUNCIONES AUXILIARES ---
  const formatCurrency = (amount) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);

  // 4. --- RENDERIZADO CONDICIONAL: CARRITO VACÍO ---
  if (cart.length === 0) {
    return (
      <div className="bg-lightpink min-h-[calc(100vh-10rem)] flex flex-col items-center justify-center text-center p-6">
        <h2 className="text-3xl text-primary font-bold mb-4">Tu carrito está vacío 🛒</h2>
        <p className="text-gray-600 mb-6">Parece que aún no has agregado nada. ¡Explora nuestros productos!</p>
        <Link to="/products" className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-red-700 transition">
          Ver productos
        </Link>
      </div>
    );
  }

  // 5. --- RENDERIZADO PRINCIPAL: CARRITO CON PRODUCTOS ---
  return (
    <div className="bg-lightpink min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl text-primary font-bold mb-6">Tu Carrito de Compras</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* --- Columna Izquierda: Lista de Productos --- */}
          <div className="lg:col-span-2 space-y-4">
            {cart.map((item) => {
              // Lógica para determinar el precio según la cantidad de ESTA variante.
              const isMayoreo = item.quantity > 3;
              const price = isMayoreo ? item.price_mayoreo : item.price_menudeo;
              const imageUrl = item.image_urls && item.image_urls.length > 0 ? item.image_urls[0] : '/rossel-placeholder.webp';

              return (
                // --- Tarjeta para cada artículo del carrito ---
                <div key={item.id} className="bg-white rounded-lg shadow p-4 flex flex-col sm:flex-row items-center gap-4 animate-fade-in">
                  <img src={imageUrl} alt={item.name} className="w-24 h-24 object-cover rounded-md" />
                  
                  <div className="flex-grow text-center sm:text-left">
                    {/* ¡AQUÍ ESTÁ LA MEJORA! Mostramos el nombre del producto y el color de la variante */}
                    <h2 className="font-bold text-lg text-primary">{item.name}</h2>
                    <p className="text-sm text-gray-500 font-semibold">{item.color}</p>
                    <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700 text-sm font-semibold mt-1">
                      Eliminar
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* Stepper de Cantidad */}
                    <div className="flex items-center border rounded-md">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="px-3 py-1 text-lg font-bold hover:bg-gray-100 rounded-l-md">-</button>
                      <span className="px-4 py-1 font-semibold">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-3 py-1 text-lg font-bold hover:bg-gray-100 rounded-r-md">+</button>
                    </div>

                    {/* Precio y etiqueta de mayoreo/menudeo */}
                    <div className="flex flex-col items-end w-32">
                      <p className="font-bold text-lg">{formatCurrency(price * item.quantity)}</p>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        isMayoreo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {isMayoreo ? 'Precio Mayoreo' : 'Precio Menudeo'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
             {/* Botón para vaciar todo el carrito */}
            <div className="flex justify-end pt-4">
                <button onClick={handleClearCart} className="text-sm text-gray-600 hover:text-red-600 font-semibold">
                  Vaciar Carrito
                </button>
            </div>
          </div>
          
          {/* --- Columna Derecha: Resumen del Pedido --- */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-24">
              <h2 className="text-xl font-bold border-b pb-4 mb-4">Resumen del pedido</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold">{formatCurrency(getTotal())}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Envío</span>
                  <span className="text-sm">Se calculará en el checkout</span>
                </div>
              </div>
              <div className="border-t mt-4 pt-4">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatCurrency(getTotal())}</span>
                </div>
              </div>
              <Link
                to="/checkout"
                className="block text-center w-full mt-6 bg-primary text-white py-3 rounded-lg text-lg font-bold hover:bg-red-700 transition"
              >
                Proceder al Pago
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
