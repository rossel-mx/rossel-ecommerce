/**
 * Supabase Edge Function: send-order-confirmation (VERSIÓN MODERNA)
 * ------------------------------------------------
 * Versión con plantilla HTML moderna y profesional
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

console.log("🚀 Función 'send-order-confirmation' inicializada - VERSIÓN MODERNA");

// Plantilla HTML moderna para el email
const getEmailTemplate = (order: any) => {
  // Formatear fecha
  const orderDate = new Date().toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Formatear items del pedido
  const orderItems = order.items && order.items.length > 0 
    ? order.items.map((item: any) => `
        <div class="item">
          <div class="item-info">
            <div class="item-name">${item.product_name || 'Producto'}</div>
            <div class="item-details">${item.color ? `Color: ${item.color}` : ''}</div>
          </div>
          <div class="item-quantity">${item.quantity}x</div>
          <div class="item-price">$${(item.price * item.quantity).toFixed(2)}</div>
        </div>
      `).join('')
    : `<div class="item">
         <div class="item-info">
           <div class="item-name">Productos del pedido</div>
           <div class="item-details">Ver detalles en tu cuenta</div>
         </div>
       </div>`;

  // Formatear total
  const totalAmount = order.total_amount 
    ? `$${order.total_amount.toFixed(2)} MXN`
    : '$0.00 MXN';

  // Template completo con las variables reemplazadas
  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmación de pedido - Rossel</title>
    <style>
        /* Reset básico */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8f9fa;
        }
        
        /* Container principal */
        .email-container {
            max-width: 650px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }
        
        /* Header con gradiente */
        .header {
            background: linear-gradient(135deg, #CD919E 0%, #B91C1C 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
            position: relative;
        }
        
        .logo {
            width: 80px;
            height: 80px;
            margin: 0 auto 20px;
            background: rgba(255, 255, 255, 0.15);
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            position: relative;
            z-index: 1;
        }
        
        .success-icon {
            width: 40px;
            height: 40px;
            background: #22C55E;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 20px;
            font-weight: bold;
        }
        
        .header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            position: relative;
            z-index: 1;
        }
        
        .header p {
            font-size: 16px;
            opacity: 0.9;
            font-weight: 300;
            position: relative;
            z-index: 1;
        }
        
        /* Contenido principal */
        .content {
            padding: 40px 30px;
        }
        
        .success-message {
            text-align: center;
            margin-bottom: 35px;
            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
            border-radius: 12px;
            padding: 25px;
            border: 1px solid #bbf7d0;
        }
        
        .success-message h2 {
            font-size: 24px;
            color: #15803d;
            margin-bottom: 12px;
            font-weight: 600;
        }
        
        .success-message p {
            font-size: 16px;
            color: #166534;
            line-height: 1.8;
        }
        
        /* Información del pedido */
        .order-info {
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            border: 1px solid #e2e8f0;
        }
        
        .order-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #e2e8f0;
        }
        
        .order-number {
            font-size: 18px;
            font-weight: 700;
            color: #1e293b;
        }
        
        .order-date {
            font-size: 14px;
            color: #64748b;
            background: #e2e8f0;
            padding: 4px 12px;
            border-radius: 20px;
        }
        
        /* Items del pedido */
        .order-items {
            margin: 20px 0;
        }
        
        .order-items h3 {
            font-size: 16px;
            color: #374151;
            margin-bottom: 15px;
            font-weight: 600;
        }
        
        .item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #f1f5f9;
        }
        
        .item:last-child {
            border-bottom: none;
        }
        
        .item-info {
            flex-grow: 1;
        }
        
        .item-name {
            font-weight: 600;
            color: #374151;
            margin-bottom: 2px;
        }
        
        .item-details {
            font-size: 14px;
            color: #6b7280;
        }
        
        .item-quantity {
            background: #ddd6fe;
            color: #5b21b6;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            margin: 0 15px;
        }
        
        .item-price {
            font-weight: 700;
            color: #1e293b;
            font-size: 16px;
        }
        
        /* Total */
        .order-total {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border-radius: 12px;
            padding: 20px;
            margin-top: 20px;
            text-align: center;
            border: 1px solid #f59e0b;
        }
        
        .total-label {
            font-size: 16px;
            color: #92400e;
            margin-bottom: 8px;
            font-weight: 500;
        }
        
        .total-amount {
            font-size: 28px;
            font-weight: 800;
            color: #92400e;
            text-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
        
        /* Próximos pasos */
        .next-steps {
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            border-radius: 12px;
            padding: 25px;
            margin: 30px 0;
            border: 1px solid #93c5fd;
        }
        
        .next-steps h3 {
            color: #1e40af;
            font-size: 18px;
            margin-bottom: 15px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .next-steps ul {
            list-style: none;
            padding: 0;
        }
        
        .next-steps li {
            padding: 8px 0;
            color: #1e40af;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .next-steps li::before {
            content: '✓';
            background: #22c55e;
            color: white;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
        }
        
        /* Información de contacto */
        .contact-info {
            background: #fefce8;
            border-left: 4px solid #eab308;
            padding: 20px;
            margin: 25px 0;
            border-radius: 0 8px 8px 0;
        }
        
        .contact-info h3 {
            color: #a16207;
            font-size: 16px;
            margin-bottom: 8px;
            font-weight: 600;
        }
        
        .contact-info p {
            color: #a16207;
            font-size: 14px;
            line-height: 1.6;
        }
        
        /* Footer */
        .footer {
            background: #f8fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
        
        .footer p {
            color: #64748b;
            font-size: 14px;
            margin-bottom: 8px;
        }
        
        .footer .company-info {
            font-weight: 600;
            color: #1e293b;
        }
        
        /* Responsive */
        @media (max-width: 600px) {
            .email-container {
                margin: 0;
                border-radius: 0;
            }
            
            .header, .content, .footer {
                padding: 25px 20px;
            }
            
            .order-header {
                flex-direction: column;
                gap: 10px;
                align-items: flex-start;
            }
            
            .item {
                flex-direction: column;
                align-items: flex-start;
                gap: 10px;
            }
            
            .item-quantity {
                margin: 0;
            }
            
            .total-amount {
                font-size: 24px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header -->
        <div class="header">
            <div class="logo">
                <div class="success-icon">✓</div>
            </div>
            <h1>¡Pedido Confirmado!</h1>
            <p>Tu compra ha sido procesada exitosamente</p>
        </div>
        
        <!-- Contenido principal -->
        <div class="content">
            <!-- Mensaje de éxito -->
            <div class="success-message">
                <h2>¡Gracias por tu compra, ${order.customer_name || 'Cliente'}!</h2>
                <p>
                    Hemos recibido tu pedido y ya lo estamos preparando con mucho cuidado. 
                    Te mantendremos informado sobre el estado de tu envío.
                </p>
            </div>
            
            <!-- Información del pedido -->
            <div class="order-info">
                <div class="order-header">
                    <div class="order-number">Pedido #${order.id}</div>
                    <div class="order-date">${orderDate}</div>
                </div>
                
                <!-- Items del pedido -->
                <div class="order-items">
                    <h3>📦 Artículos en tu pedido:</h3>
                    ${orderItems}
                </div>
                
                <!-- Total del pedido -->
                <div class="order-total">
                    <div class="total-label">Total del pedido:</div>
                    <div class="total-amount">${totalAmount}</div>
                </div>
            </div>
            
            <!-- Próximos pasos -->
            <div class="next-steps">
                <h3>🚚 ¿Qué sigue ahora?</h3>
                <ul>
                    <li>Procesaremos tu pedido en las próximas 24 horas</li>
                    <li>Te enviaremos un email cuando tu pedido sea despachado</li>
                    <li>Recibirás un número de seguimiento para rastrear tu envío</li>
                    <li>Tu pedido llegará en 3-5 días hábiles</li>
                </ul>
            </div>
            
            <!-- Información de contacto -->
            <div class="contact-info">
                <h3>💬 ¿Necesitas ayuda?</h3>
                <p>
                    Si tienes alguna pregunta sobre tu pedido o necesitas hacer algún cambio, 
                    no dudes en contactarnos. Nuestro equipo está aquí para ayudarte.
                </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
                <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
                    <strong>¡Gracias por confiar en Rossel!</strong><br>
                    Esperamos que disfrutes mucho tu nueva compra.
                </p>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <p class="company-info">Rossel - Tu tienda de moda y estilo</p>
            <p>Zapopan, Jalisco, México</p>
            
            <div style="background: #f1f5f9; border-radius: 8px; padding: 15px; margin-top: 20px;">
                <p style="color: #1e293b; font-weight: 600; margin-bottom: 5px;">
                    Síguenos en nuestras redes sociales
                </p>
            </div>
            
            <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
                Este email fue enviado porque realizaste una compra en nuestra tienda.<br>
                Si tienes alguna duda, responde a este email.
            </p>
        </div>
    </div>
</body>
</html>
  `;
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

    // 5. PREPARAR EMAIL CON PLANTILLA MODERNA
    console.log("📧 Preparando email con plantilla moderna...");
    const emailData = {
      from: "Rossel Tienda <ventas@shinerdev.com>",
      to: [order.customer_email],
      subject: `✅ Confirmación de tu pedido en Rossel #${order.id}`,
      html: getEmailTemplate(order),
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