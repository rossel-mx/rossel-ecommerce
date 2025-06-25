/**
 * Supabase Edge Function: send-order-confirmation
 * ------------------------------------------------
 * Esta función se encarga de enviar un correo de confirmación de pedido
 * utilizando el servicio de Resend.
 *
 * Se invoca desde el frontend después de que un pedido se ha creado
 * exitosamente en la base de datos.
 */

// Importación para levantar el servidor de la función.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// Importación de la librería de Resend, usando un especificador NPM para Deno.
import { Resend } from "npm:resend";

// --- 1. CONFIGURACIÓN INICIAL ---

// Definimos las cabeceras CORS en una constante para reutilizarlas.
// Esto es crucial para permitir que nuestra app de React (en otro dominio) llame a esta función.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Obtenemos la API key de Resend desde los secretos de Supabase.
// Es la forma segura de manejar claves, nunca se exponen en el código.
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const resend = new Resend(RESEND_API_KEY);

console.info("LOG: Función 'send-order-confirmation' inicializada correctamente.");

// --- 2. SERVIDOR DE LA FUNCIÓN ---

serve(async (req) => {
  // Log para cada nueva petición que llega a la función.
  console.info(`LOG: Recibida petición con método: ${req.method}`);

  // Manejo de la petición de "pre-vuelo" (preflight) OPTIONS para CORS.
  // El navegador envía esta petición automáticamente antes de la petición POST real.
  if (req.method === "OPTIONS") {
    console.info("LOG: Respondiendo a petición OPTIONS de pre-vuelo.");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // --- 3. PROCESAMIENTO DE LA PETICIÓN ---
    
    // Obtenemos los datos que nos envía el frontend (el objeto 'order').
    const { order } = await req.json();

    // Log para depurar el payload (los datos) que recibimos.
    console.log("LOG: Payload recibido del frontend:", order);

    // Verificación para asegurar que recibimos los datos necesarios.
    if (!order || !order.id || !order.customer_email) {
      throw new Error("Datos del pedido incompletos o inválidos.");
    }

    console.info(`LOG: Intentando enviar email para el pedido #${order.id} a ${order.customer_email}...`);

    // --- 4. ENVÍO DEL CORREO CON RESEND ---
    const { data, error } = await resend.emails.send({
      // Usamos el dominio que verificaste en Resend.
      from: "Rossel Tienda <ventas@shinerdev.com>", 
      to: [order.customer_email],
      subject: `✅ Confirmación de tu pedido en Rossel #${order.id}`,
      // El cuerpo del correo en formato HTML.
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #B91C1C;">¡Gracias por tu compra, ${order.customer_name}!</h2>
          <p>Hemos recibido tu pedido con el número <strong>#${order.id}</strong> y ya lo estamos preparando para ti.</p>
          <p>Recibirás otra notificación cuando tu pedido sea enviado.</p>
          <hr style="border: 0; border-top: 1px solid #eee;">
          <h3>Resumen del pedido:</h3>
          <ul>
            ${order.items.map(item => `<li>(${item.quantity}x) ${item.product_name}</li>`).join('')}
          </ul>
          <p style="font-size: 1.2em;"><strong>Total: $${order.total_amount.toFixed(2)} MXN</strong></p>
          <hr style="border: 0; border-top: 1px solid #eee;">
          <p style="font-size: 0.9em; color: #777;">Si tienes alguna pregunta, no dudes en contactarnos.</p>
          <p>¡Gracias por confiar en Rossel!</p>
        </div>
      `,
    });

    // Si Resend devuelve un error, lo lanzamos para que lo capture el bloque catch.
    if (error) {
      throw error;
    }
    
    console.info(`LOG: Email para el pedido #${order.id} enviado exitosamente. ID de Resend: ${data.id}`);

    // --- 5. RESPUESTA DE ÉXITO ---
    // Devolvemos una respuesta exitosa al frontend, incluyendo las cabeceras CORS.
    return new Response(JSON.stringify({ success: true, messageId: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    // --- 6. MANEJO DE ERRORES ---
    // Si algo sale mal en cualquier punto del 'try', lo capturamos aquí.
    console.error("ERROR DETALLADO EN LA EDGE FUNCTION:", error);
    
    // Devolvemos una respuesta de error al frontend, incluyendo las cabeceras CORS.
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500, // Usamos 500 para un error inesperado del servidor.
    });
  }
});