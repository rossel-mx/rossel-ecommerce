/**
 * @file ContactPage.jsx
 * @description Página de contacto con un formulario funcional.
 * Esta versión final se conecta a la Supabase Edge Function 'send-contact-email'
 * para enviar los mensajes del formulario a tu correo de soporte y una
 * auto-respuesta de confirmación al cliente.
 *
 * @requires react
 * @requires react-hot-toast
 * @requires supabaseClient
 * @requires react-icons
 */
import React, { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { supabase } from '../services/supabaseClient'; // Importamos supabase para llamar a la función
import { FiMail, FiPhone, FiMapPin } from 'react-icons/fi';

const ContactPage = () => {
  console.log("LOG: [ContactPage] El componente se ha montado.");

  // --- ESTADOS ---
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- MANEJADORES DE EVENTOS ---

  /**
   * Actualiza el estado del formulario cada vez que el usuario escribe en un campo.
   * @param {React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>} e - El evento de cambio.
   */
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  /**
   * Se ejecuta al enviar el formulario.
   * Invoca la Edge Function 'send-contact-email' con los datos del formulario.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    console.log("LOG: [ContactPage] Formulario enviado. Invocando Edge Function con datos:", formData);
    
    try {
      // Invocamos nuestra Edge Function por su nombre.
      const { data, error } = await supabase.functions.invoke('send-contact-email', {
        body: formData, // Pasamos los datos del formulario en el cuerpo de la petición.
      });

      // Si la función devuelve un error, lo lanzamos para que lo capture el bloque catch.
      if (error) throw error;
      
      console.log("LOG: [ContactPage] Edge Function ejecutada exitosamente. Respuesta:", data);
      toast.success("¡Gracias! Te hemos enviado una confirmación a tu correo.");
      setFormData({ name: '', email: '', message: '' }); // Limpia el formulario tras el envío exitoso.

    } catch (error) {
      console.error("ERROR: [ContactPage] Error al invocar la Edge Function:", error);
      toast.error("Hubo un problema al enviar tu mensaje. Por favor, inténtalo de nuevo más tarde.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- RENDERIZADO DEL COMPONENTE ---
  return (
    <>
      <Toaster position="top-right" />
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-primary">Contáctanos</h1>
            <p className="mt-4 text-lg text-gray-600">¿Tienes alguna pregunta o comentario? ¡Nos encantaría saber de ti!</p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* --- Columna de Formulario --- */}
            <div className="bg-gray-50 p-8 rounded-lg shadow-md">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="text-sm font-medium text-gray-700">Tu Nombre</label>
                  <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 w-full p-2 border rounded-md" />
                </div>
                <div>
                  <label htmlFor="email" className="text-sm font-medium text-gray-700">Tu Correo Electrónico</label>
                  <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required className="mt-1 w-full p-2 border rounded-md" />
                </div>
                <div>
                  <label htmlFor="message" className="text-sm font-medium text-gray-700">Tu Mensaje</label>
                  <textarea name="message" id="message" rows="5" value={formData.message} onChange={handleChange} required className="mt-1 w-full p-2 border rounded-md"></textarea>
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full bg-primary text-white py-3 rounded-lg font-bold hover:bg-red-700 transition disabled:bg-gray-400">
                  {isSubmitting ? 'Enviando...' : 'Enviar Mensaje'}
                </button>
              </form>
            </div>

            {/* --- Columna de Información de Contacto --- */}
            <div className="flex flex-col justify-center">
              <div className="flex items-start mb-6">
                <FiMail className="text-primary text-2xl mr-4 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-lg">Correo de Soporte</h3>
                  <p className="text-gray-600">Para preguntas sobre pedidos, devoluciones y productos.</p>
                  <a href="mailto:soporte@shinerdev.com" className="text-primary hover:underline">soporte@shinerdev.com</a>
                </div>
              </div>
              <div className="flex items-start mb-6">
                <FiPhone className="text-primary text-2xl mr-4 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-lg">Teléfono / WhatsApp</h3>
                  <p className="text-gray-600">Para atención inmediata (Lun-Vie 9am-6pm).</p>
                  <a href="tel:+523312345678" className="text-primary hover:underline">+52 (33) 1234 5678</a>
                </div>
              </div>
              <div className="flex items-start">
                <FiMapPin className="text-primary text-2xl mr-4 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-lg">Nuestra Tienda</h3>
                  <p className="text-gray-600">Av. de las Rosas 123, Col. Chapalita</p>
                  <p className="text-gray-600">Guadalajara, Jalisco, México</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ContactPage;
