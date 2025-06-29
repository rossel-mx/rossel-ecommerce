/**
 * @file /supabase/functions/delete-cloudinary-images/index.ts
 * @description Edge Function segura para eliminar una o más imágenes de Cloudinary.
 * ✅ VERSIÓN CORREGIDA: Ahora usa el formato correcto para el API Destroy de Cloudinary
 * y incluye invalidación de CDN para eliminación completa.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * Función auxiliar para generar un hash SHA-1.
 * @param {string} data - La cadena de texto a hashear.
 * @returns {string} - El hash en formato hexadecimal.
 */
async function sha1(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest("SHA-1", encoder.encode(data));
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Extrae el public_id de una URL de Cloudinary.
 * ✅ CORREGIDO: Ahora remueve correctamente la extensión del archivo
 * @param {string} url - La URL de la imagen de Cloudinary.
 * @returns {string | null} - El public_id extraído SIN extensión.
 */
function extractPublicIdFromUrl(url: string): string | null {
  try {
    console.log(`LOG: [Delete Fn] Procesando URL: ${url}`);
    
    // ✅ REGEX CORREGIDO: Extraer todo después de /upload/ hasta antes de la extensión
    const regex = /\/upload\/(?:v\d+\/)?(?:.*?\/)?([^\/]+)\.[^.\/]+$/;
    const match = url.match(regex);
    
    if (match && match[1]) {
      const publicId = match[1];
      console.log(`LOG: [Delete Fn] Public ID extraído: "${publicId}"`);
      return publicId;
    }
    
    // ✅ FALLBACK: Si el regex no funciona, extraer manualmente
    const urlParts = url.split('/');
    const lastPart = urlParts[urlParts.length - 1];
    const publicIdWithoutExtension = lastPart.replace(/\.[^.]+$/, '');
    
    console.log(`LOG: [Delete Fn] Fallback - Public ID extraído: "${publicIdWithoutExtension}"`);
    return publicIdWithoutExtension;
    
  } catch (error) {
    console.error(`ERROR: [Delete Fn] Error extrayendo public_id de URL ${url}:`, error);
    return null;
  }
}

console.log("LOG: Función 'delete-cloudinary-images' v4.0 (CORREGIDA) inicializada.");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiSecret = Deno.env.get("CLOUDINARY_API_SECRET");
    const apiKey = Deno.env.get("CLOUDINARY_API_KEY");
    const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME");

    if (!apiSecret || !apiKey || !cloudName) {
      throw new Error("Variables de Cloudinary no configuradas en el servidor.");
    }

    const { imageUrls } = await req.json();
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      throw new Error("Se requiere un arreglo de URLs de imágenes ('imageUrls').");
    }

    const publicIds = imageUrls.map(extractPublicIdFromUrl).filter(Boolean) as string[];
    if (publicIds.length === 0) {
      throw new Error("No se pudieron extraer public_ids válidos de las URLs.");
    }

    console.log(`LOG: [Delete Fn] Public IDs a eliminar:`, publicIds);

    // ✅ CORREGIDO: Usar URLSearchParams en lugar de FormData
    const deletePromises = publicIds.map(async (publicId) => {
      const timestamp = Math.round(Date.now() / 1000);
      
      // ✅ CORREGIDO: Incluir invalidate en la firma
      const stringToSign = `invalidate=true&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
      const signature = await sha1(stringToSign);

      // ✅ CORREGIDO: Usar URLSearchParams para application/x-www-form-urlencoded
      const body = new URLSearchParams({
        'public_id': publicId,
        'api_key': apiKey,
        'timestamp': timestamp.toString(),
        'signature': signature,
        'invalidate': 'true'  // ✅ CRÍTICO: Esto limpia el cache del CDN
      });

      const deleteUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`;
      
      console.log(`LOG: [Delete Fn] Eliminando public_id: ${publicId}`);
      console.log(`LOG: [Delete Fn] String to sign: invalidate=true&public_id=${publicId}&timestamp=${timestamp}[SECRET]`);
      
      // ✅ CORREGIDO: Headers y body correctos para Destroy API
      const response = await fetch(deleteUrl, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });
      
      const result = await response.json();
      console.log(`LOG: [Delete Fn] Respuesta para ${publicId}:`, result);
      
      return result;
    });

    const results = await Promise.all(deletePromises);
    console.log("LOG: [Delete Fn] Resultados finales de la API de Cloudinary:", results);

    // ✅ MEJORADO: Verificar si hubo errores en alguna eliminación
    const errors = results.filter(result => result.error);
    const successes = results.filter(result => result.result === 'ok');

    if (errors.length > 0) {
      console.warn("WARN: [Delete Fn] Algunas eliminaciones fallaron:", errors);
    }

    console.log(`LOG: [Delete Fn] Eliminaciones exitosas: ${successes.length}/${results.length}`);

    return new Response(JSON.stringify({ 
      success: errors.length === 0, 
      results,
      summary: {
        total: results.length,
        successful: successes.length,
        failed: errors.length
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("ERROR: [Delete Fn] Error en la función:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});