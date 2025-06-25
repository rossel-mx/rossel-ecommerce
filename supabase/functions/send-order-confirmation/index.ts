/**
 * Supabase Edge Function: send-order-confirmation (DEBUG VERSION)
 * ------------------------------------------------
 * Versión con debug mejorado para identificar el problema
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

console.log("🚀 Función 'send-order-confirmation' inicializada - VERSIÓN DEBUG");

serve(async (req) => {
  console.log(`📨 Petición recibida: ${req.method}`);

  if (req.method === "OPTIONS") {
    console.log("✅ Respondiendo a OPTIONS");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. VERIFICAR VARIABLES DE ENTORNO
    console.log("🔍 Verificando variables de entorno...");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    
    if (!RESEND_API_KEY) {
      console.error("❌ RESEND_API_KEY no está configurada");
      throw new Error("RESEND_API_KEY no está configurada en las variables de entorno");
    }
    
    console.log("✅ RESEND_API_KEY encontrada:", RESEND_API_KEY.substring(0, 10) + "...");

    // 2. INICIALIZAR RESEND
    console.log("🔧 Inicializando Resend...");
    const resend = new Resend(RESEND_API_KEY);
    console.log("✅ Resend inicializada");

    // 3. PROCESAR PAYLOAD
    console.log("📦 Procesando payload...");
    const requestBody = await req.json();
    console.log("📋 Request body completo:", JSON.stringify(requestBody, null, 2));

    const { order } = requestBody;
    console.log("🛍️ Objeto order:", JSON.stringify(order, null, 2));

    // 4. VALIDAR DATOS
    if (!order) {
      console.error("❌ No se encontró el objeto 'order' en el payload");
      throw new Error("No se encontró el objeto 'order' en el payload");
    }

    if (!order.id) {
      console.error("❌ order.id no está presente");
      throw new Error("order.id es requerido");
    }

    if (!order.customer_email) {
      console.error("❌ order.customer_email no está presente");
      throw new Error("order.customer_email es requerido");
    }

    console.log(`✅ Datos validados para orden #${order.id} - email: ${order.customer_email}`);

    // 5. PREPARAR EMAIL
    console.log("📧 Preparando email...");
    const emailData = {
      from: "Rossel Tienda <ventas@shinerdev.com>",
      to: [order.customer_email],
      subject: `✅ Confirmación de tu pedido en Rossel #${order.id}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #B91C1C;">¡Gracias por tu compra, ${order.customer_name || 'Cliente'}!</h2>
          <p>Hemos recibido tu pedido con el número <strong>#${order.id}</strong> y ya lo estamos preparando para ti.</p>
          <p>Recibirás otra notificación cuando tu pedido sea enviado.</p>
          <hr style="border: 0; border-top: 1px solid #eee;">
          <h3>Resumen del pedido:</h3>
          <ul>
            ${order.items ? order.items.map(item => `<li>(${item.quantity}x) ${item.product_name}</li>`).join('') : '<li>Productos del pedido</li>'}
          </ul>
          <p style="font-size: 1.2em;"><strong>Total: $${order.total_amount ? order.total_amount.toFixed(2) : '0.00'} MXN</strong></p>
          <hr style="border: 0; border-top: 1px solid #eee;">
          <p style="font-size: 0.9em; color: #777;">Si tienes alguna pregunta, no dudes en contactarnos.</p>
          <p>¡Gracias por confiar en Rossel!</p>
        </div>
      `,
    };

    console.log("📧 Email preparado:", JSON.stringify({
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject
    }, null, 2));

    // 6. ENVIAR EMAIL
    console.log("🚀 Enviando email...");
    const { data, error } = await resend.emails.send(emailData);

    if (error) {
      console.error("❌ Error de Resend:", JSON.stringify(error, null, 2));
      throw new Error(`Error de Resend: ${JSON.stringify(error)}`);
    }

    console.log("✅ Email enviado exitosamente!");
    console.log("📧 Resend response:", JSON.stringify(data, null, 2));

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: data?.id,
      debug: "Email enviado correctamente"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("💥 ERROR DETALLADO:", error);
    console.error("💥 Error message:", error.message);
    console.error("💥 Error stack:", error.stack);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      debug: "Error capturado en edge function"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});