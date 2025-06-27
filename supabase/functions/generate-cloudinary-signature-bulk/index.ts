/**
 * @file /supabase/functions/generate-cloudinary-signature-bulk/index.ts
 * @description Edge Function específica para CARGA MASIVA de Cloudinary.
 * 
 * DIFERENCIAS CON LA FUNCIÓN INDIVIDUAL:
 * - Sin transformaciones (eager) = 0 tokens de Cloudinary
 * - Solo folder + timestamp para imágenes ya procesadas
 * - Optimizada para cargas masivas rápidas
 * - Las imágenes vienen pre-procesadas del script Python
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * Genera hash SHA-1 para firma de Cloudinary
 */
async function sha1(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest("SHA-1", encoder.encode(data));
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

console.log("LOG: Edge Function 'generate-cloudinary-signature-bulk' v1.0 inicializada para carga masiva.");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Manejo de preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("LOG: [Bulk Signature] Iniciando generación de firma para carga masiva...");

    // Verificar que existe el secreto de Cloudinary
    const apiSecret = Deno.env.get("CLOUDINARY_API_SECRET");
    if (!apiSecret) {
      throw new Error("CLOUDINARY_API_SECRET no está configurado en las variables de entorno");
    }
    
    // PARÁMETROS PARA CARGA MASIVA (sin transformaciones)
    const timestamp = Math.round((new Date()).getTime() / 1000);
    const folder = "rossel/products";  // Carpeta específica para productos
    
    console.log("LOG: [Bulk Signature] Parámetros generados:", {
      timestamp,
      folder,
      // No incluimos eager (sin transformaciones)
    });

    // Construir cadena a firmar (orden alfabético de parámetros)
    // Para carga masiva: solo folder + timestamp
    const stringToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    
    console.log("LOG: [Bulk Signature] Cadena a firmar (sin secreto):", `folder=${folder}&timestamp=${timestamp}`);

    // Generar firma SHA-1
    const signature = await sha1(stringToSign);
    
    console.log("LOG: [Bulk Signature] Firma SHA-1 generada exitosamente:", signature);

    // Respuesta con todos los parámetros necesarios para el frontend
    const response = {
      signature,
      timestamp,
      folder,
      // Información adicional para debugging
      generated_at: new Date().toISOString(),
      function_version: "bulk-v1.0"
    };

    console.log("LOG: [Bulk Signature] Respuesta enviada al frontend:", response);

    return new Response(JSON.stringify(response), {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json" 
      },
      status: 200,
    });

  } catch (error) {
    console.error("ERROR: [Bulk Signature] Error al generar firma para carga masiva:", error);
    
    const errorResponse = {
      error: error.message,
      function: "generate-cloudinary-signature-bulk",
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(errorResponse), {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json" 
      },
      status: 500,
    });
  }
});

/**
 * NOTAS DE USO:
 * 
 * 1. Esta función está optimizada para carga masiva
 * 2. No incluye transformaciones (eager) = 0 tokens
 * 3. Las imágenes deben venir pre-procesadas
 * 4. Usar folder fijo: "rossel/products"
 * 
 * DIFERENCIAS CON generate-cloudinary-signature:
 * - Sin eager (transformaciones)
 * - Sin background removal automático
 * - Sin redimensionamiento automático
 * - Folder fijo en lugar de dinámico
 * 
 * FRONTEND USAGE:
 * const { data } = await supabase.functions.invoke('generate-cloudinary-signature-bulk');
 * // Usar data.signature, data.timestamp, data.folder
 */