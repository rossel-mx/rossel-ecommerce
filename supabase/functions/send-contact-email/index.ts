/**
 * @file /supabase/functions/send-contact-email/index.ts
 * @description Edge Function para procesar los envíos del formulario de contacto.
 * Envía una notificación al administrador y una auto-respuesta al cliente.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend";

// --- CONFIGURACIÓN ---
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const resend = new Resend(RESEND_API_KEY);
const YOUR_SUPPORT_EMAIL = "shinerpunk@gmail.com"; // El email donde recibirás los mensajes
const SENDER_EMAIL = "Rossel Contacto <contacto@shinerdev.com>"; // El remitente que verá el cliente

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

console.log("LOG: Función 'send-contact-email' inicializada.");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { name, email, message } = await req.json();
    console.log(`LOG: Recibido nuevo mensaje de contacto de: ${name} <${email}>`);

    if (!name || !email || !message) {
      throw new Error("Faltan campos en el formulario.");
    }

    // --- 1. Enviar el correo de notificación PARA TI ---
    console.log(`LOG: Enviando notificación a ${YOUR_SUPPORT_EMAIL}...`);
    await resend.emails.send({
      from: SENDER_EMAIL,
      to: [YOUR_SUPPORT_EMAIL],
      subject: `Nuevo Mensaje de Contacto de: ${name}`,
      html: `
        <p>Has recibido un nuevo mensaje desde el formulario de contacto de Rossel:</p>
        <ul>
          <li><strong>Nombre:</strong> ${name}</li>
          <li><strong>Email de Contacto:</strong> ${email}</li>
        </ul>
        <hr>
        <p><strong>Mensaje:</strong></p>
        <p>${message}</p>
      `,
    });

    // --- 2. Enviar el correo de auto-respuesta PARA EL CLIENTE ---
    console.log(`LOG: Enviando auto-respuesta a ${email}...`);
    await resend.emails.send({
      from: SENDER_EMAIL,
      to: [email],
      subject: "Hemos recibido tu mensaje | Rossel",
      html: `
        <h2>¡Hola, ${name}!</h2>
        <p>Gracias por ponerte en contacto con nosotros.</p>
        <p>Hemos recibido tu mensaje y nuestro equipo se pondrá en contacto contigo a la brevedad posible.</p>
        <p>Atentamente,<br>El equipo de Rossel</p>
      `,
    });

    console.log("LOG: Ambos correos de contacto enviados exitosamente.");
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("ERROR en la Edge Function 'send-contact-email':", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
