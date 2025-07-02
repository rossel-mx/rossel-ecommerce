/**
 * @file Footer.jsx
 * @description Pie de página completo y profesional para la tienda Rossel.
 * Esta versión final incluye:
 * - Un diseño multi-columna para una navegación clara.
 * - Enlaces a páginas importantes de la tienda, ayuda y empresa.
 * - Iconos de redes sociales.
 * - Logos de métodos de pago para generar confianza.
 * - Un crédito de desarrollo para "ShinerDev".
 * - Documentación y logs para facilitar el mantenimiento.
 */
import React from 'react';
import { Link } from 'react-router-dom';
// Importamos los íconos que usaremos de la librería 'react-icons'
import { FaFacebookF, FaInstagram, FaTiktok } from 'react-icons/fa';
import { FaCcVisa, FaCcMastercard, FaCcAmex, FaCcPaypal } from 'react-icons/fa';

const Footer = () => {
  console.log("LOG: [Footer] El componente se ha montado.");

  return (
    <footer className="bg-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Contenedor principal del grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

          {/* Columna 1: Logo y Slogan */}
          <div className="space-y-4">
            <Link to="/" className="inline-block">
              <img src="/rossel-logo.webp" alt="Rossel Logo" className="h-14" />
            </Link>
            <p className="text-sm text-gray-400">
              Diseños que cuentan tu historia, estilo que te acompaña a cada paso.
            </p>
          </div>

          {/* Columna 2: Navegación de la Tienda */}
          <div>
            <h3 className="text-sm font-semibold tracking-wider uppercase">Tienda</h3>
            <ul className="mt-4 space-y-2">
              <li><Link to="/products" className="text-gray-400 hover:text-white transition">Bolsas</Link></li>
              <li><Link to="/products" className="text-gray-400 hover:text-white transition">Mochilas</Link></li>
              <li><Link to="/products" className="text-gray-400 hover:text-white transition">Carteras</Link></li>
              <li><Link to="/products" className="text-gray-400 hover:text-white transition">Novedades</Link></li>
            </ul>
          </div>

          {/* Columna 3: Soporte y Ayuda */}
          <div>
            <h3 className="text-sm font-semibold tracking-wider uppercase">Soporte</h3>
            <ul className="mt-4 space-y-2">
              <li><Link to="/contacto" className="text-gray-400 hover:text-white transition">Contacto</Link></li>
              <li><Link to="/faq" className="text-gray-400 hover:text-white transition">Preguntas Frecuentes</Link></li>
              <li><Link to="/envios" className="text-gray-400 hover:text-white transition">Envíos y Devoluciones</Link></li>
              <li><Link to="/privacidad" className="text-gray-400 hover:text-white transition">Aviso de Privacidad</Link></li>
            </ul>
          </div>

          {/* Columna 4: Redes Sociales */}
          <div>
            <h3 className="text-sm font-semibold tracking-wider uppercase">Síguenos</h3>
            <div className="flex mt-4 space-x-6">
              <a href="#" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition">
                <FaFacebookF size={24} />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition">
                <FaInstagram size={24} />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition">
                <FaTiktok size={24} />
              </a>
            </div>
          </div>

        </div>

        {/* --- Barra Inferior --- */}
        <div className="mt-12 border-t border-gray-700 pt-8 flex flex-col md:flex-row items-center justify-between">
          <div className="flex space-x-4 mb-4 md:mb-0">
            {/* Íconos de métodos de pago para generar confianza */}
            <FaCcVisa size={32} />
            <FaCcMastercard size={32} />
            <FaCcAmex size={32} />
            <FaCcPaypal size={32} />
          </div>
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} Rossel. Todos los derechos reservados.
          </p>
          <p className="text-xs text-gray-500 mt-4 md:mt-0">
            Hecho con ❤️ por <a href="https://shinerdev.com" target="_blank" rel="noopener noreferrer" className="hover:text-white font-semibold">ShinerDev</a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
