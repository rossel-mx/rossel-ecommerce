/**
 * @file /supabase/functions/upload-direct-webp/index.ts
 * @description Edge Function para subir imágenes ya procesadas (WebP) directamente a Cloudinary
 * sin aplicar transformaciones. Ideal para imágenes que ya vienen optimizadas desde scripts Python.
 * 
 * CARACTERÍSTICAS:
 * - ✅ Upload directo sin transformaciones (no consume tokens de transformación)
 * - ✅ Preserva formato WebP optimizado
 * - ✅ URLs limpias sin parámetros de transformación
 * - ✅ Logging completo para debugging
 * - ✅ Validación de formato y tamaño
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * Función auxiliar para generar un hash SHA-1 para la firma.
 * @param {string} data - La cadena de texto a hashear.
 * @returns {string} - El hash en formato hexadecimal.
 */
async function sha1(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest("SHA-1", encoder.encode(data));
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Convierte un File/Blob a base64 para envío a Cloudinary
 * @param {File} file - El archivo a convertir
 * @returns {string} - String base64 del archivo
 */
async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  bytes.forEach((byte) => binary += String.fromCharCode(byte));
  return btoa(binary);
}

console.log("LOG: Función 'upload-direct-webp' v1.0 inicializada.");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log("LOG: [Upload Direct] Iniciando proceso de upload directo...");

  try {
    // --- VALIDACIÓN DE VARIABLES DE ENTORNO ---
    const apiSecret = Deno.env.get("CLOUDINARY_API_SECRET");
    const apiKey = Deno.env.get("CLOUDINARY_API_KEY");
    const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME");

    if (!apiSecret || !apiKey || !cloudName) {
      throw new Error("Variables de Cloudinary no configuradas en el servidor.");
    }

    console.log("LOG: [Upload Direct] Variables de entorno validadas correctamente");

    // --- PROCESAMIENTO DEL REQUEST ---
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      throw new Error("No se proporcionó ningún archivo en el campo 'file'");
    }

    console.log("LOG: [Upload Direct] Archivo recibido:", {
      name: file.name,
      type: file.type,
      size: `${Math.round(file.size / 1024)} KB`
    });

    // --- VALIDACIONES DEL ARCHIVO ---
    
    // Validar que sea WebP
    if (!file.name.toLowerCase().endsWith('.webp') && !file.type.includes('webp')) {
      console.warn("WARN: [Upload Direct] Archivo no es WebP:", file.type);
      throw new Error("Este endpoint solo acepta archivos WebP pre-procesados");
    }

    // Validar tamaño (máximo 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error(`Archivo demasiado grande: ${Math.round(file.size / 1024 / 1024)}MB. Máximo permitido: 10MB`);
    }

    console.log("LOG: [Upload Direct] Archivo WebP validado correctamente");

    // --- PREPARACIÓN PARA CLOUDINARY ---
    const timestamp = Math.round(Date.now() / 1000);
    
    // Generar public_id único basado en timestamp y nombre de archivo
    const fileNameWithoutExt = file.name.replace(/\.webp$/i, '');
    const publicId = `${fileNameWithoutExt}_${timestamp}`;
    
    console.log("LOG: [Upload Direct] Public ID generado:", publicId);

    // --- GENERACIÓN DE FIRMA ---
    // Para upload directo sin transformaciones, la firma es más simple
    const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = await sha1(stringToSign);

    console.log("LOG: [Upload Direct] Firma generada para upload directo");
    console.log("LOG: [Upload Direct] String firmado: public_id=" + publicId + "&timestamp=" + timestamp + "[SECRET]");

    // --- CONVERSIÓN DE ARCHIVO ---
    const base64File = await fileToBase64(file);
    const dataURI = `data:${file.type};base64,${base64File}`;

    console.log("LOG: [Upload Direct] Archivo convertido a base64, tamaño:", Math.round(base64File.length / 1024), "KB");

    // --- UPLOAD A CLOUDINARY ---
    const uploadData = new FormData();
    uploadData.append('file', dataURI);
    uploadData.append('api_key', apiKey);
    uploadData.append('timestamp', timestamp.toString());
    uploadData.append('signature', signature);
    uploadData.append('public_id', publicId);
    // ✅ CLAVE: NO incluimos 'eager' para evitar transformaciones

    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    
    console.log("LOG: [Upload Direct] Enviando a Cloudinary sin transformaciones...");

    const uploadResponse = await fetch(cloudinaryUrl, {
      method: 'POST',
      body: uploadData
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("ERROR: [Upload Direct] Error HTTP de Cloudinary:", uploadResponse.status, errorText);
      throw new Error(`Error de Cloudinary: ${uploadResponse.status} - ${errorText}`);
    }

    const uploadResult = await uploadResponse.json();

    // --- VALIDACIÓN DE RESPUESTA ---
    if (uploadResult.error) {
      console.error("ERROR: [Upload Direct] Error en respuesta de Cloudinary:", uploadResult.error);
      throw new Error(`Error de Cloudinary: ${uploadResult.error.message}`);
    }

    if (!uploadResult.secure_url) {
      console.error("ERROR: [Upload Direct] Respuesta de Cloudinary sin URL:", uploadResult);
      throw new Error("Cloudinary no retornó una URL válida");
    }

    // --- LOGGING DE ÉXITO ---
    const processingTime = Date.now() - startTime;
    console.log("LOG: [Upload Direct] ✅ Upload exitoso:", {
      public_id: uploadResult.public_id,
      secure_url: uploadResult.secure_url,
      format: uploadResult.format,
      width: uploadResult.width,
      height: uploadResult.height,
      bytes: uploadResult.bytes,
      processing_time_ms: processingTime
    });

    // --- RESPUESTA EXITOSA ---
    return new Response(JSON.stringify({
      success: true,
      data: {
        secure_url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
        format: uploadResult.format,
        width: uploadResult.width,
        height: uploadResult.height,
        bytes: uploadResult.bytes,
        upload_type: 'direct_webp',
        processing_time_ms: processingTime
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("ERROR: [Upload Direct] Error en el proceso:", error.message);
    console.error("ERROR: [Upload Direct] Tiempo antes del error:", processingTime, "ms");
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      processing_time_ms: processingTime
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});