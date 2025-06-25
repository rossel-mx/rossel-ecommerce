/**
 * @file /supabase/functions/delete-cloudinary-images/index.ts
 * @description Edge Function segura para eliminar una o más imágenes de Cloudinary.
 * Esta versión definitiva y robusta asegura que no haya errores de sintaxis y maneja
 * la eliminación de imágenes usando la API de Administración de Cloudinary de forma segura.
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
 * @param {string} url - La URL de la imagen de Cloudinary.
 * @returns {string | null} - El public_id extraído.
 */
function extractPublicIdFromUrl(url: string): string | null {
  try {
    // Este regex busca el ID público, incluso si hay transformaciones en la URL.
    const regex = /\/upload\/(?:v\d+\/|.*\/)?([^\/]+(?:\/[^\/]+)*?)(?:\.[^.\/]+)?$/;
    const match = url.match(regex);
    return match && match[1] ? match[1] : null;
  } catch {
    return null;
  }
}

console.log("LOG: Función 'delete-cloudinary-images' v3.0 (Corregida) inicializada.");

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

    // Creamos una promesa de eliminación para cada public_id.
    const deletePromises = publicIds.map(async (publicId) => {
      const timestamp = Math.round(Date.now() / 1000);
      const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
      const signature = await sha1(stringToSign);

      const formData = new FormData();
      formData.append('public_id', publicId);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);

      const deleteUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`;
      
      const response = await fetch(deleteUrl, { method: 'POST', body: formData });
      return response.json();
    });

    const results = await Promise.all(deletePromises);
    console.log("LOG: [Delete Fn] Resultados de la API de Cloudinary:", results);

    return new Response(JSON.stringify({ success: true, results }), {
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
