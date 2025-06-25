/**
 * @file PrivacyPolicyPage.jsx
 * @description Página informativa que detalla el Aviso de Privacidad y el uso de cookies.
 * Incluye secciones específicas sobre la recolección de datos, su uso y los derechos del usuario.
 */
import React from 'react';

// Reutilizamos el sub-componente de sección para mantener la consistencia visual
const PolicySection = ({ title, children }) => (
  <div className="mb-8">
    <h2 className="text-2xl font-bold text-primary mb-4 pb-2 border-b-2 border-pink-200">{title}</h2>
    <div className="prose prose-lg max-w-none text-gray-700">
      {children}
    </div>
  </div>
);

const PrivacyPolicyPage = () => {
  console.log("LOG: [PrivacyPolicyPage] El componente se ha montado.");
  const lastUpdated = "22 de Junio de 2025";

  return (
    <div className="bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-800 mb-2">Aviso de Privacidad</h1>
          <p className="text-sm text-gray-500">Última actualización: {lastUpdated}</p>
        </div>
        
        <div className="mt-12">
          <PolicySection title="1. ¿Quiénes somos?">
            <p>Rossel ("nosotros", "nuestro") con domicilio en Guadalajara, Jalisco, México, es el responsable del tratamiento de sus datos personales. Este Aviso de Privacidad describe cómo recopilamos, usamos y protegemos su información.</p>
          </PolicySection>

          <PolicySection title="2. ¿Qué información recopilamos?">
            <p>Recopilamos la siguiente información para poder ofrecerle nuestros servicios:</p>
            <ul>
              <li><strong>Datos de Identificación:</strong> Nombre, correo electrónico, dirección de envío y facturación, número de teléfono.</li>
              <li><strong>Datos de Transacción:</strong> Detalles de los productos comprados, historial de pedidos, información de pago procesada por nuestras pasarelas seguras.</li>
              <li><strong>Datos de Navegación (Cookies):</strong> Información sobre cómo interactúa con nuestro sitio web, como las páginas visitadas y el tiempo de permanencia.</li>
            </ul>
          </PolicySection>

          <PolicySection title="3. Uso de Cookies y Tecnologías de Seguimiento">
            <p><strong>¡IMPORTANTE!</strong> Como has mencionado, esta sección es crucial.</p>
            <p>Utilizamos cookies y tecnologías similares para mejorar su experiencia de compra y para analizar el rendimiento de nuestro sitio. Las cookies son pequeños archivos de texto que se almacenan en su dispositivo.</p>
            <ul>
              <li><strong>Cookies Esenciales:</strong> Son necesarias para el funcionamiento básico de la tienda, como mantener los productos en su carrito de compras y procesar el checkout.</li>
              <li><strong>Cookies de Rendimiento y Análisis:</strong> Utilizamos servicios de terceros, como <strong>Google Analytics</strong>, para recopilar datos anónimos sobre el tráfico y el comportamiento de los usuarios. Esta información nos ayuda a entender cómo se usa nuestra tienda y a realizar mejoras. No recopilamos información personal identificable a través de estas cookies.</li>
            </ul>
            <p>Usted puede gestionar o deshabilitar las cookies a través de la configuración de su navegador web en cualquier momento.</p>
          </PolicySection>
          
          <PolicySection title="4. ¿Para qué usamos sus datos?">
            <p>Su información se utiliza para los siguientes fines:</p>
            <ul>
              <li>Procesar y enviar sus pedidos.</li>
              <li>Comunicarnos con usted sobre el estado de sus compras.</li>
              <li>Brindar soporte al cliente.</li>
              <li>Mejorar y personalizar su experiencia en nuestra tienda.</li>
              <li>Cumplir con nuestras obligaciones legales y fiscales.</li>
            </ul>
          </PolicySection>

          <PolicySection title="5. Derechos ARCO (Acceso, Rectificación, Cancelación y Oposición)">
            <p>Usted tiene derecho a acceder a sus datos personales, rectificarlos si son inexactos, cancelarlos cuando considere que no se requieren para las finalidades señaladas o oponerse a su tratamiento. Puede ejercer estos derechos a través de la sección "Mi Cuenta" o contactándonos directamente.</p>
          </PolicySection>
          
           <PolicySection title="6. Contacto">
            <p>Si tiene alguna pregunta sobre este aviso de privacidad, puede contactarnos en <a href="mailto:privacidad@shinerdev.com" className="text-primary hover:underline">privacidad@shinerdev.com</a>.</p>
          </PolicySection>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;