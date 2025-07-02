/**
 * @file uploadProcessor.js
 * @description Utilidades para procesamiento de carga masiva
 */

import { supabase } from '../../../../services/supabaseClient';
import JSZip from 'jszip';

/**
 * Procesa archivo ZIP y extrae imágenes
 */
export const processZipFile = async (file) => {
  console.log('LOG: [UploadProcessor] Procesando archivo ZIP:', file.name);
  
  try {
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);
    const imageFiles = {};
    
    console.log('LOG: [UploadProcessor] Extrayendo archivos del ZIP...');
    
    for (const [filename, zipEntry] of Object.entries(contents.files)) {
      if (!zipEntry.dir && filename.toLowerCase().endsWith('.webp')) {
        const imageData = await zipEntry.async('blob');
        const cleanFilename = filename.split('/').pop(); // Remover carpetas si las hay
        imageFiles[cleanFilename] = imageData;
        console.log(`LOG: [UploadProcessor] Imagen extraída: ${cleanFilename} (${(imageData.size / 1024).toFixed(1)}KB)`);
      }
    }
    
    console.log(`LOG: [UploadProcessor] ZIP procesado: ${Object.keys(imageFiles).length} imágenes`);
    return imageFiles;
    
  } catch (error) {
    console.error('ERROR: [UploadProcessor] Error procesando ZIP:', error);
    throw new Error(`Error al procesar ZIP: ${error.message}`);
  }
};

/**
 * Valida referencias cruzadas entre productos e imágenes
 */
export const validateCrossReferences = (products, imageFiles) => {
  if (!products || !imageFiles) return [];
  
  console.log('LOG: [UploadProcessor] Validando referencias cruzadas...');
  
  const errors = [];
  const availableImages = Object.keys(imageFiles);
  const requiredImages = new Set();
  
  // Recopilar todas las imágenes requeridas
  products.forEach(product => {
    product.variants.forEach(variant => {
      variant.imageNames.forEach(imageName => {
        requiredImages.add(imageName);
      });
    });
  });
  
  // Verificar que todas las imágenes requeridas estén disponibles
  requiredImages.forEach(imageName => {
    if (!availableImages.includes(imageName)) {
      errors.push(`Imagen faltante: ${imageName} (especificada en Excel pero no encontrada en ZIP)`);
    }
  });
  
  // Log de imágenes no utilizadas (solo informativo)
  const unusedImages = availableImages.filter(imageName => !requiredImages.has(imageName));
  if (unusedImages.length > 0) {
    console.log('WARN: [UploadProcessor] Imágenes no utilizadas:', unusedImages);
  }
  
  console.log(`LOG: [UploadProcessor] Validación cruzada: ${errors.length} errores, ${unusedImages.length} no utilizadas`);
  
  return errors;
};

/**
 * Sube imágenes a Cloudinary en lotes
 */
export const uploadImagesToCloudinary = async (imageFiles, onProgress) => {
  console.log('LOG: [UploadProcessor] Iniciando carga a Cloudinary...');
  
  const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const CLOUDINARY_API_KEY = import.meta.env.VITE_CLOUDINARY_API_KEY;
  
  try {
    // Obtener firma para Cloudinary
    const { data: signatureData, error: signatureError } = await supabase.functions.invoke('generate-cloudinary-signature-bulk');
    if (signatureError) throw signatureError;
    
    const { signature, timestamp } = signatureData;
    
    const imageUrls = {};
    const totalImages = Object.keys(imageFiles).length;
    let uploadedImages = 0;
    
    // Subir imágenes en lotes para evitar sobrecarga
    const batchSize = 5;
    const imageBatches = [];
    const imageEntries = Object.entries(imageFiles);
    
    for (let i = 0; i < imageEntries.length; i += batchSize) {
      imageBatches.push(imageEntries.slice(i, i + batchSize));
    }
    
    for (const batch of imageBatches) {
      const uploadPromises = batch.map(async ([filename, blob]) => {
        const formData = new FormData();
        formData.append('file', blob);
        formData.append('api_key', CLOUDINARY_API_KEY);
        formData.append('timestamp', timestamp);
        formData.append('signature', signature);
        formData.append('folder', 'rossel/products');
        
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body: formData
        });
        
        const result = await response.json();
        if (result.error) throw new Error(`Error subiendo ${filename}: ${result.error.message}`);
        
        uploadedImages++;
        onProgress?.(Math.round((uploadedImages / totalImages) * 50)); // 50% para imágenes
        
        console.log(`LOG: [UploadProcessor] Imagen subida: ${filename} -> ${result.secure_url}`);
        return { filename, url: result.secure_url };
      });
      
      const batchResults = await Promise.all(uploadPromises);
      batchResults.forEach(({ filename, url }) => {
        imageUrls[filename] = url;
      });
    }
    
    console.log(`LOG: [UploadProcessor] Todas las imágenes subidas: ${Object.keys(imageUrls).length}`);
    return imageUrls;
    
  } catch (error) {
    console.error('ERROR: [UploadProcessor] Error subiendo imágenes:', error);
    throw new Error(`Error al subir imágenes: ${error.message}`);
  }
};

/**
 * Inserta productos y variantes en Supabase
 */
export const insertProductsToDatabase = async (products, imageUrls, onProgress) => {
  console.log('LOG: [UploadProcessor] Insertando productos en Supabase...');
  
  const results = {
    productsCreated: 0,
    variantsCreated: 0,
    errors: []
  };
  
  try {
    for (const [index, product] of products.entries()) {
      try {
        // Crear producto
        const { data: productData, error: productError } = await supabase
          .from('products')
          .insert({
            sku: product.sku,
            name: product.name,
            description: product.description,
            category: product.category
          })
          .select()
          .single();
        
        if (productError) throw productError;
        
        results.productsCreated++;
        console.log(`LOG: [UploadProcessor] Producto creado: ${product.sku} (ID: ${productData.id})`);
        
        // Insertar variantes
        const variantInserts = product.variants.map(variant => ({
          product_id: productData.id,
          color: variant.color,
          stock: variant.stock,
          price: variant.precio,
          price_menudeo: variant.precio_menudeo,
          price_mayoreo: variant.precio_mayoreo,
          image_urls: variant.imageNames.map(imageName => imageUrls[imageName]).filter(url => url)
        }));
        
        const { error: variantsError } = await supabase
          .from('product_variants')
          .insert(variantInserts);
        
        if (variantsError) throw variantsError;
        
        results.variantsCreated += variantInserts.length;
        console.log(`LOG: [UploadProcessor] ${variantInserts.length} variantes creadas para producto ${product.sku}`);
        
      } catch (error) {
        console.error(`ERROR: [UploadProcessor] Error procesando producto ${product.sku}:`, error);
        results.errors.push(`Error en producto ${product.sku}: ${error.message}`);
      }
      
      // Actualizar progreso (50% restante para base de datos)
      onProgress?.(50 + Math.round(((index + 1) / products.length) * 50));
    }
    
    console.log('LOG: [UploadProcessor] Inserción completada:', results);
    return results;
    
  } catch (error) {
    console.error('ERROR: [UploadProcessor] Error crítico en inserción:', error);
    throw new Error(`Error crítico: ${error.message}`);
  }
};

/**
 * Procesa la carga masiva completa
 */
export const processMassiveUpload = async (products, imageFiles, onProgress) => {
  console.log('LOG: [UploadProcessor] Iniciando procesamiento masivo...');
  
  try {
    // Validar referencias cruzadas
    const crossErrors = validateCrossReferences(products, imageFiles);
    if (crossErrors.length > 0) {
      throw new Error(`Problemas con referencias de imágenes: ${crossErrors.join(', ')}`);
    }
    
    // Paso 1: Subir imágenes
    console.log('LOG: [UploadProcessor] Paso 1: Subiendo imágenes...');
    const imageUrls = await uploadImagesToCloudinary(imageFiles, onProgress);
    
    // Paso 2: Insertar productos
    console.log('LOG: [UploadProcessor] Paso 2: Insertando productos...');
    const results = await insertProductsToDatabase(products, imageUrls, onProgress);
    
    console.log('LOG: [UploadProcessor] Procesamiento completado exitosamente');
    return results;
    
  } catch (error) {
    console.error('ERROR: [UploadProcessor] Error en procesamiento masivo:', error);
    throw error;
  }
};