/**
 * Supabase Edge Function: send-order-confirmation (VERSIÓN CORREGIDA)
 * ------------------------------------------------
 * Versión simplificada que corrige los problemas de template
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

console.log("🚀 Función 'send-order-confirmation' inicializada - VERSIÓN CORREGIDA");

// Plantilla HTML ultra-compatible para Outlook
const getEmailTemplate = (order: any) => {
  // Formatear fecha
  const orderDate = new Date().toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Formatear items del pedido de forma segura
  let orderItemsHtml = '';
  if (order.items && order.items.length > 0) {
    orderItemsHtml = order.items.map((item: any) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="font-weight: 600; color: #374151;">${item.product_name || 'Producto'}</td>
              <td style="text-align: center; width: 60px;">
                <span style="background-color: #ddd6fe; color: #5b21b6; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; white-space: nowrap;">${item.quantity}x</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `).join('');
  } else {
    orderItemsHtml = `
      <tr>
        <td style="padding: 20px; text-align: center; color: #6b7280;">
          Productos del pedido
        </td>
      </tr>
    `;
  }

  // Formatear total de forma segura
  const totalAmount = order.total_amount ? `${order.total_amount.toFixed(2)} MXN` : '$0.00 MXN';

  // Template HTML ultra-compatible
  return `
<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Confirmación de pedido - Rossel</title>
    <!--[if gte mso 9]>
    <xml>
        <o:OfficeDocumentSettings>
            <o:AllowPNG/>
            <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
    </xml>
    <![endif]-->
    <style type="text/css">
        #outlook a { padding: 0; }
        body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
        
        body {
            margin: 0 !important;
            padding: 0 !important;
            background-color: #f8f9fa !important;
            font-family: Arial, sans-serif !important;
            width: 100% !important;
            min-width: 100% !important;
        }
        
        .email-wrapper { background-color: #f8f9fa; padding: 20px 0; }
        .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; }
        
        .header-table { background-color: #CD919E; width: 100%; }
        .header-content { padding: 40px 30px; text-align: center; }
        .logo-container { margin: 0 auto 20px auto; width: 80px; height: 80px; background-color: rgba(255, 255, 255, 0.15); border-radius: 20px; }
        .success-icon { width: 40px; height: 40px; background-color: #22C55E; border-radius: 50%; margin: 20px auto; color: #ffffff; font-size: 18px; font-weight: bold; text-align: center; line-height: 40px; display: table-cell; vertical-align: middle; }
        .header-title { color: #ffffff !important; font-size: 28px !important; font-weight: bold !important; margin: 0 0 8px 0 !important; }
        .header-subtitle { color: #ffffff !important; font-size: 16px !important; margin: 0 !important; opacity: 0.9; }
        
        .content-table { width: 100%; background-color: #ffffff; }
        .content-padding { padding: 40px 30px; }
        
        .success-message { background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 25px; margin-bottom: 35px; text-align: center; }
        .success-title { color: #15803d !important; font-size: 24px !important; font-weight: bold !important; margin: 0 0 12px 0 !important; }
        .success-text { color: #166534 !important; font-size: 16px !important; line-height: 1.8 !important; margin: 0 !important; }
        
        .order-info { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; margin: 25px 0; }
        .order-header { padding-bottom: 15px; border-bottom: 2px solid #e2e8f0; margin-bottom: 20px; }
        .order-number { font-size: 18px !important; font-weight: bold !important; color: #1e293b !important; }
        .order-date { font-size: 14px !important; color: #64748b !important; background-color: #e2e8f0 !important; padding: 4px 12px !important; border-radius: 20px !important; }
        
        .order-total { background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 12px; padding: 20px; margin-top: 20px; text-align: center; }
        .total-label { font-size: 16px !important; color: #92400e !important; margin-bottom: 8px !important; }
        .total-amount { font-size: 28px !important; font-weight: bold !important; color: #92400e !important; }
        
        .next-steps { background-color: #eff6ff; border: 1px solid #93c5fd; border-radius: 12px; padding: 25px; margin: 30px 0; }
        .next-steps-title { color: #1e40af !important; font-size: 18px !important; font-weight: bold !important; margin: 0 0 15px 0 !important; }
        .next-steps-list { color: #1e40af !important; font-size: 14px !important; margin: 0 0 0 20px !important; padding: 0 !important; }
        .next-steps-item { margin-bottom: 8px !important; }
        
        .footer-table { background-color: #f8fafc; border-top: 1px solid #e2e8f0; width: 100%; }
        .footer-content { padding: 30px; text-align: center; }
        .footer-text { color: #64748b !important; font-size: 14px !important; margin: 0 0 8px 0 !important; }
        .company-info { font-weight: bold !important; color: #1e293b !important; }
        
        @media only screen and (max-width: 600px) {
            .email-container { margin: 0 !important; border-radius: 0 !important; width: 100% !important; }
            .header-content, .content-padding, .footer-content { padding: 25px 20px !important; }
            .header-title { font-size: 24px !important; }
            .success-title { font-size: 20px !important; }
        }
    </style>
    <!--[if gte mso 9]>
    <style type="text/css">
        .header-table { background-color: #CD919E !important; }
        .success-message { background-color: #f0fdf4 !important; }
        .order-info { background-color: #f8fafc !important; }
        .order-total { background-color: #fef3c7 !important; }
        .next-steps { background-color: #eff6ff !important; }
    </style>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: Arial, sans-serif;">
    <!--[if mso | IE]>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8f9fa;">
        <tr><td>
    <![endif]-->
    
    <div class="email-wrapper">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto;">
            <tr>
                <td>
                    <div class="email-container">
                        
                        <!-- Header -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" class="header-table">
                            <tr>
                                <td class="header-content">
                                    <div class="logo-container">
                                        <div class="success-icon">✓</div>
                                    </div>
                                    <h1 class="header-title">¡Pedido Confirmado!</h1>
                                    <p class="header-subtitle">Rossel - Tu tienda de moda y estilo</p>
                                </td>
                            </tr>
                        </table>
                        
                        <!-- Contenido principal -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" class="content-table">
                            <tr>
                                <td class="content-padding">
                                    
                                    <!-- Mensaje de éxito -->
                                    <div class="success-message">
                                        <h2 class="success-title">¡Gracias por tu compra, ${order.customer_name || 'Cliente'}!</h2>
                                        <p class="success-text">Hemos recibido tu pedido y ya lo estamos preparando con mucho cuidado. Te mantendremos informado sobre el estado de tu envío.</p>
                                    </div>
                                    
                                    <!-- Información del pedido -->
                                    <div class="order-info">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="order-header">
                                            <tr>
                                                <td class="order-number">Pedido #${order.id}</td>
                                                <td style="text-align: right;">
                                                    <span class="order-date">${orderDate}</span>
                                                </td>
                                            </tr>
                                        </table>
                                        
                                        <h3 style="color: #374151; margin-bottom: 15px; font-weight: bold;">📦 Artículos en tu pedido:</h3>
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            ${orderItemsHtml}
                                        </table>
                                        
                                        <div class="order-total">
                                            <div class="total-label">Total del pedido:</div>
                                            <div class="total-amount">${totalAmount}</div>
                                        </div>
                                    </div>
                                    
                                    <!-- Próximos pasos -->
                                    <div class="next-steps">
                                        <h3 class="next-steps-title">🚚 ¿Qué sigue ahora?</h3>
                                        <ul class="next-steps-list">
                                            <li class="next-steps-item">Procesaremos tu pedido en las próximas 24 horas</li>
                                            <li class="next-steps-item">Te enviaremos un email cuando tu pedido sea despachado</li>
                                            <li class="next-steps-item">Recibirás un número de seguimiento para rastrear tu envío</li>
                                            <li class="next-steps-item">Tu pedido llegará en 3-5 días hábiles</li>
                                        </ul>
                                    </div>
                                    
                                    <p style="text-align: center; margin-top: 30px; color: #64748b; font-size: 14px; line-height: 1.6;">
                                        <strong>¡Gracias por confiar en Rossel!</strong><br>
                                        Esperamos que disfrutes mucho tu nueva compra.
                                    </p>
                                    
                                </td>
                            </tr>
                        </table>
                        
                        <!-- Footer -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" class="footer-table">
                            <tr>
                                <td class="footer-content">
                                    <p class="footer-text company-info">Rossel - Tu tienda de confianza</p>
                                    <p class="footer-text">Zapopan, Jalisco, México</p>
                                    <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
                                        Este email fue enviado porque realizaste una compra en nuestra tienda.<br>
                                        Si tienes alguna duda, responde a este email.
                                    </p>
                                </td>
                            </tr>
                        </table>
                        
                    </div>
                </td>
            </tr>
        </table>
    </div>
    
    <!--[if mso | IE]>
        </td></tr>
    </table>
    <![endif]-->
</body>
</html>`;
};

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
    
    console.log("✅ RESEND_API_KEY encontrada");

    // 2. INICIALIZAR RESEND
    console.log("🔧 Inicializando Resend...");
    const resend = new Resend(RESEND_API_KEY);
    console.log("✅ Resend inicializada");

    // 3. PROCESAR PAYLOAD
    console.log("📦 Procesando payload...");
    const requestBody = await req.json();
    console.log("📋 Request body:", JSON.stringify(requestBody, null, 2));

    const { order } = requestBody;

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
      html: getEmailTemplate(order),
    };

    console.log("📧 Email preparado para:", order.customer_email);

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
      debug: "Email moderno enviado correctamente"
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