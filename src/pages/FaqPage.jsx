/**
 * @file FaqPage.jsx
 * @description Página de Preguntas Frecuentes (FAQ).
 * Utiliza un diseño de acordeón para presentar la información de forma clara y concisa,
 * mejorando la experiencia del usuario al buscar respuestas a dudas comunes.
 */
import React from 'react';

/**
 * @name FaqItem
 * @description Un sub-componente reutilizable para cada par de pregunta y respuesta.
 * Utiliza las etiquetas nativas <details> y <summary> para un efecto de acordeón
 * accesible y sin necesidad de JavaScript adicional.
 * @param {{ question: string, children: React.ReactNode }} props
 */
const FaqItem = ({ question, children }) => (
  <details className="border-b-2 border-gray-200 py-4 group">
    <summary className="font-semibold text-lg cursor-pointer flex justify-between items-center group-hover:text-primary">
      {question}
      <span className="text-primary transform transition-transform duration-300 group-open:rotate-180">
        ▼
      </span>
    </summary>
    <div className="prose pt-4 text-gray-700">
      {children}
    </div>
  </details>
);

const FaqPage = () => {
  console.log("LOG: [FaqPage] El componente se ha montado.");

  return (
    <div className="bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-800 mb-4">Preguntas Frecuentes</h1>
          <p className="text-lg text-gray-600">¿Tienes dudas? Aquí resolvemos las más comunes.</p>
        </div>

        <div className="mt-12">
          <FaqItem question="¿Cómo puedo rastrear mi pedido?">
            <p>Una vez que tu pedido haya sido enviado, recibirás un correo electrónico de confirmación que incluirá tu número de seguimiento (guía). Puedes usar ese número en el sitio web de la paquetería correspondiente para ver el estado de tu envío en tiempo real.</p>
          </FaqItem>

          <FaqItem question="¿Cuáles son los costos y tiempos de envío?">
            <p>El costo de envío se calcula automáticamente durante el proceso de checkout. Ofrecemos envío gratuito en compras superiores a $1,500 MXN. El tiempo de entrega estándar es de 3 a 7 días hábiles. Puedes ver más detalles en nuestra <a href="/envios" className="text-primary hover:underline">Política de Envíos</a>.</p>
          </FaqItem>

          <FaqItem question="¿Qué métodos de pago aceptan?">
            <p>Aceptamos la mayoría de las tarjetas de crédito y débito (Visa, Mastercard, American Express), así como pagos seguros a través de PayPal. Todos los pagos son procesados a través de pasarelas seguras y encriptadas.</p>
          </FaqItem>
          
          <FaqItem question="¿Puedo hacer cambios o devoluciones?">
            <p>¡Claro que sí! Tienes hasta 15 días para solicitar un cambio o devolución. El producto debe estar en perfectas condiciones y con su empaque original. Por favor, consulta nuestra <a href="/envios" className="text-primary hover:underline">Política de Devoluciones</a> para conocer el proceso completo.</p>
          </FaqItem>

          <FaqItem question="¿De qué materiales están hechos los productos?">
            <p>Nos enorgullecemos de usar materiales de alta calidad. La mayoría de nuestros bolsos están hechos de cuero sintético de primera calidad (también conocido como piel vegana) o textiles duraderos. Puedes encontrar los detalles específicos de los materiales en la descripción de cada producto.</p>
          </FaqItem>
        </div>
      </div>
    </div>
  );
};

export default FaqPage;
