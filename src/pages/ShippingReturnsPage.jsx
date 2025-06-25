/**
 * @file ShippingReturnsPage.jsx
 * @description Página informativa que detalla las políticas de envío y devoluciones de la tienda.
 */
import React from 'react';

// Sub-componente para cada sección de la política para mantener el código limpio
const PolicySection = ({ title, children }) => (
  <div className="mb-8">
    <h2 className="text-2xl font-bold text-primary mb-4 pb-2 border-b-2 border-pink-200">{title}</h2>
    <div className="prose prose-lg max-w-none text-gray-700">
      {children}
    </div>
  </div>
);

const ShippingReturnsPage = () => {
  console.log("LOG: [ShippingReturnsPage] El componente se ha montado.");

  return (
    <div className="bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-extrabold text-center text-gray-800 mb-12">Envíos y Devoluciones</h1>

        <PolicySection title="Política de Envíos">
          <p>
            ¡Queremos que recibas tus productos Rossel lo antes posible! Todos nuestros envíos se procesan con el mayor cuidado desde nuestro centro en Guadalajara, Jalisco.
          </p>
          <ul>
            <li><strong>Tiempos de Procesamiento:</strong> Los pedidos se procesan en un plazo de 1 a 2 días hábiles después de recibir la confirmación de pago.</li>
            <li><strong>Tiempos de Envío:</strong> El tiempo de entrega estándar es de 3 a 7 días hábiles, dependiendo de tu ubicación en México.</li>
            <li><strong>Costos de Envío:</strong> El costo de envío se calculará automáticamente en la pantalla de checkout basado en tu dirección. Ofrecemos envío gratuito en compras superiores a $1,500 MXN.</li>
            <li><strong>Seguimiento:</strong> Una vez que tu pedido sea enviado, recibirás un correo electrónico con el número de seguimiento para que puedas rastrear tu paquete en todo momento.</li>
          </ul>
        </PolicySection>

        <PolicySection title="Política de Devoluciones y Cambios">
          <p>
            Tu satisfacción es nuestra prioridad. Si no estás completamente satisfecha con tu compra, estamos aquí para ayudarte.
          </p>
          <ul>
            <li><strong>Plazo:</strong> Tienes hasta 15 días naturales a partir de la fecha en que recibiste tu pedido para solicitar una devolución o cambio.</li>
            <li><strong>Condiciones:</strong> El producto debe estar en su estado original, sin usar, con todas sus etiquetas y en su empaque original.</li>
            <li><strong>Proceso:</strong> Para iniciar una devolución, por favor contáctanos a nuestro correo de soporte <a href="mailto:soporte@rossel.com.mx" className="text-primary hover:underline">soporte@rossel.com.mx</a> con tu número de pedido y el motivo de la devolución.</li>
            <li><strong>Reembolsos:</strong> Una vez que recibamos e inspeccionemos el producto devuelto, procesaremos tu reembolso al método de pago original en un plazo de 5 a 7 días hábiles. Los costos de envío originales no son reembolsables.</li>
          </ul>
        </PolicySection>

        <PolicySection title="Preguntas">
          <p>
            Si tienes cualquier otra pregunta sobre nuestros envíos o devoluciones, no dudes en visitar nuestra sección de <a href="/faq" className="text-primary hover:underline">Preguntas Frecuentes</a> o <a href="/contacto" className="text-primary hover:underline">ponerte en contacto</a> con nuestro equipo de soporte.
          </p>
        </PolicySection>
      </div>
    </div>
  );
};

export default ShippingReturnsPage;
