/**
 * @file /supabase/functions/generate-cloudinary-signature/index.ts
 * @description Edge Function segura para generar una firma digital para Cloudinary.
 * Esta versión definitiva y robusta genera todos los parámetros (timestamp, transformaciones)
 * del lado del servidor para garantizar que la firma sea siempre válida, y los devuelve
 * todos juntos al frontend.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

async function sha1(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest("SHA-1", encoder.encode(data));
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

console.log("LOG: Función 'generate-cloudinary-signature' v6.0 (Final y Centralizada) inicializada.");

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
    if (!apiSecret) throw new Error("CLOUDINARY_API_SECRET no está configurado.");
    
    // 1. --- LÓGICA CENTRALIZADA ---
    // La función ahora define y controla las transformaciones.
    const timestamp = Math.round((new Date()).getTime() / 1000);
    const eager = "e_background_removal/w_1080,h_1350,c_pad,b_auto/f_auto,q_auto";
    
    // 2. Construimos la cadena a firmar con los parámetros en orden alfabético.
    const stringToSign = `eager=${eager}&timestamp=${timestamp}${apiSecret}`;
    
    console.log("LOG: [Signature] Cadena a firmar (sin secreto):", `eager=${eager}&timestamp=${timestamp}`);

    // 3. Generamos la firma SHA-1.
    const signature = await sha1(stringToSign);
    
    console.log("LOG: [Signature] Firma SHA-1 generada:", signature);

    // 4. Devolvemos un objeto con TODOS los datos que el frontend necesita.
    return new Response(JSON.stringify({ signature, timestamp, eager }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("ERROR: [Signature] Error al generar la firma:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
