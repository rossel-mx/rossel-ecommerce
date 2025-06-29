/**
 * @file ProductForm.jsx
 * @description Formulario CRUD completo para la gestión de productos y sus variantes.
 * Maneja tanto creación como edición de productos existentes.
 * ✅ ACTUALIZADO: Ahora elimina imágenes huérfanas de Cloudinary durante edición.
 *
 * @requires react
 * @requires supabaseClient
 * @requires react-hot-toast
 * @requires browser-image-compression
 * @requires react-icons
 */
import { useState, useEffect, useRef } from "react";
import { supabase } from "../../services/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import { FiX, FiPlus, FiXCircle } from 'react-icons/fi';
import imageCompression from 'browser-image-compression';

// --- 1. CONFIGURACIÓN CENTRALIZADA ---

const standardColors = [
  'Amarillo', 'Azul', 'Beige', 'Blanco', 'Cafe', 'Camel', 'Celeste', 'Gris', 
  'Kaki', 'Marino', 'Morado', 'Naranja', 'Negro', 'Rojo', 'Rosa', 'Tinto', 'Verde', 'Vino'
].sort();

const INITIAL_VARIANT_STATE = {
  color: '', stock: 0, price: '', price_menudeo: '', price_mayoreo: '',
  image_urls: [], newImageFiles: [], webpFiles: [], // ✅ NUEVO: Array para WebP
};

const INITIAL_PRODUCT_STATE = {
  sku: '', name: '', description: '', category: '',
  variants: [{ ...INITIAL_VARIANT_STATE }]
};

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = import.meta.env.VITE_CLOUDINARY_API_KEY;

const ProductForm = ({ onFormSubmit, editingProduct }) => {
  // --- 2. ESTADOS DEL COMPONENTE ---
  const [product, setProduct] = useState(INITIAL_PRODUCT_STATE);
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // ✅ NUEVO: Estado para trackear imágenes originales
  const [originalImageUrls, setOriginalImageUrls] = useState([]);
  
  const fileInputRefs = useRef([]);

  // --- 3. EFECTOS DE REACT ---

  useEffect(() => {
    console.log("LOG: [ProductForm] Verificando configuración de Cloudinary...");
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY) {
      console.error("ERROR CRÍTICO: Variables VITE_CLOUDINARY... no definidas. Revisa .env.local y REINICIA el servidor.");
      toast.error("Error de configuración: Cloudinary no está configurado.");
    }
  }, []);

  // --- EFECTO PARA MANEJAR LA EDICIÓN ---
  useEffect(() => {
    if (editingProduct) {
      console.log("LOG: [ProductForm] Cargando producto para editar:", editingProduct);
      setIsEditMode(true);
      
      // ✅ NUEVO: Guardar URLs originales para comparar después
      const originalUrls = editingProduct.variants?.flatMap(v => v.image_urls || []) || [];
      setOriginalImageUrls(originalUrls);
      console.log("LOG: [ProductForm] URLs originales guardadas para tracking:", originalUrls);
      
      // Convertir las variantes del formato de la base de datos al formato del formulario
      const formattedVariants = editingProduct.variants?.map(variant => ({
        variant_id: variant.variant_id, // Preservamos el ID para la actualización
        color: variant.color || '',
        stock: variant.stock || 0,
        price: variant.price?.toString() || '',
        price_menudeo: variant.price_menudeo?.toString() || '',
        price_mayoreo: variant.price_mayoreo?.toString() || '',
        image_urls: variant.image_urls || [],
        newImageFiles: [],
        webpFiles: [] // ✅ NUEVO: Array para WebP en edición
      })) || [{ ...INITIAL_VARIANT_STATE }];

      setProduct({
        id: editingProduct.id, // Preservamos el ID del producto
        sku: editingProduct.sku || '',
        name: editingProduct.name || '',
        description: editingProduct.description || '',
        category: editingProduct.category || '',
        variants: formattedVariants
      });

      console.log("LOG: [ProductForm] Modo edición configurado correctamente para:", editingProduct.name);

    } else {
      // Si no hay producto para editar, resetear al modo creación
      if (isEditMode) {
        console.log("LOG: [ProductForm] Saliendo del modo edición, reseteando formulario...");
        resetForm();
      }
    }
  }, [editingProduct]);

  // --- 4. FUNCIÓN PARA LIMPIAR URLS DE OBJETOS ---
  const cleanupObjectUrls = (variants) => {
    console.log("LOG: [ProductForm] Limpiando URLs de objetos en memoria...");
    variants.forEach(variant => {
      variant.newImageFiles?.forEach(file => {
        if (file && typeof file === 'object' && file.constructor === File) {
          URL.revokeObjectURL(URL.createObjectURL(file));
        }
      });
    });
  };

  // --- 5. FUNCIÓN PARA RESETEAR FORMULARIO COMPLETAMENTE ---
  const resetForm = () => {
    console.log("LOG: [ProductForm] Iniciando reseteo completo del formulario...");
    
      // ✅ LIMPIAR URLS DE OBJETOS Y ARCHIVOS WEBP
      cleanupObjectUrls(product.variants);
      
      // 🆕 NUEVO: Limpiar archivos WebP temporales
      product.variants.forEach(variant => {
        if (variant.webpFiles) {
          variant.webpFiles.forEach(file => {
            if (file && typeof file === 'object' && file.constructor === File) {
              URL.revokeObjectURL(URL.createObjectURL(file));
            }
          });
        }
      });
    
    // Resetear el estado del producto
    setProduct({
      sku: '', 
      name: '', 
      description: '', 
      category: '',
      variants: [{ 
        color: '', 
        stock: 0, 
        price: '', 
        price_menudeo: '', 
        price_mayoreo: '',
        image_urls: [], 
        newImageFiles: [],
        webpFiles: [] // ✅ NUEVO: Array para WebP
      }]
    });
    
    setIsEditMode(false);
    
    // ✅ NUEVO: Limpiar URLs originales
    setOriginalImageUrls([]);
    
    // Limpiar todos los inputs de archivo
    fileInputRefs.current.forEach(ref => {
      if (ref) {
        ref.value = "";
      }
    });
    
    // Limpiar el array de referencias
    fileInputRefs.current = [];
    
    console.log("LOG: [ProductForm] Formulario reseteado completamente.");
  };

  // --- 6. MANEJADORES DE ESTADO Y EVENTOS ---

  const handleProductChange = (e) => {
    console.log(`LOG: [ProductForm] Cambio en campo del producto: ${e.target.name} = ${e.target.value}`);
    setProduct(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  
  const handleVariantChange = (index, e) => {
    console.log(`LOG: [ProductForm] Cambio en variante ${index}, campo: ${e.target.name} = ${e.target.value}`);
    const updatedVariants = [...product.variants];
    updatedVariants[index][e.target.name] = e.target.value;
    setProduct(prev => ({ ...prev, variants: updatedVariants }));
  };

  const handleFileChange = async (index, e) => {
    if (!e.target.files?.length) return;
    
    console.log(`LOG: [ProductForm] Procesando ${e.target.files.length} archivos para variante ${index}...`);
    toast.loading('Procesando imágenes...');
    
    try {
      const filesArray = Array.from(e.target.files);
      const newImageFiles = [];
      const webpFiles = [];
      
      // 🆕 NUEVO: Clasificar archivos SIN subir inmediatamente
      for (const file of filesArray) {
        console.log(`LOG: [ProductForm] Analizando archivo: ${file.name} (${file.type})`);
        
        if (file.name.toLowerCase().endsWith('.webp')) {
          // ✅ ARCHIVO WEBP - Guardar para upload posterior
          console.log(`LOG: [ProductForm] Archivo WebP detectado: ${file.name} - Guardado para upload al guardar producto`);
          
          // Validar tamaño del WebP (máximo 10MB)
          if (file.size > 10 * 1024 * 1024) {
            console.error(`ERROR: [ProductForm] Archivo WebP muy grande: ${Math.round(file.size / 1024 / 1024)}MB`);
            toast.error(`Archivo ${file.name} es muy grande (máximo 10MB)`);
            continue;
          }
          
          webpFiles.push(file);
          
        } else {
          // ✅ ARCHIVO NORMAL - Comprimir y guardar para upload posterior
          console.log(`LOG: [ProductForm] Archivo normal detectado: ${file.name} - Aplicando compresión`);
          
          const compressionOptions = { 
            maxSizeMB: 2, 
            maxWidthOrHeight: 1920, 
            useWebWorker: true 
          };
          
          console.log(`LOG: [ProductForm] Comprimiendo archivo: ${file.name}`);
          const compressedFile = await imageCompression(file, compressionOptions);
          console.log(`LOG: [ProductForm] Archivo comprimido: ${file.name} (${Math.round(file.size / 1024)}KB → ${Math.round(compressedFile.size / 1024)}KB)`);
          
          newImageFiles.push(compressedFile);
        }
      }
      
      // ✅ AGREGAR TODOS LOS ARCHIVOS A LOS ARRAYS TEMPORALES
      const updatedVariants = [...product.variants];
      if (newImageFiles.length > 0) {
        updatedVariants[index].newImageFiles.push(...newImageFiles);
        console.log(`LOG: [ProductForm] ${newImageFiles.length} archivos normales agregados a cola de upload`);
      }
      if (webpFiles.length > 0) {
        updatedVariants[index].webpFiles.push(...webpFiles);
        console.log(`LOG: [ProductForm] ${webpFiles.length} archivos WebP agregados a cola de upload`);
      }
      setProduct(prev => ({ ...prev, variants: updatedVariants }));
      
      toast.dismiss();
      
      // 🆕 TOAST INFORMATIVO
      const webpCount = webpFiles.length;
      const normalCount = newImageFiles.length;
      
      if (webpCount > 0 && normalCount > 0) {
        toast.success(`✅ ${webpCount} WebP + ${normalCount} imágenes preparadas para subir al guardar`);
      } else if (webpCount > 0) {
        toast.success(`✅ ${webpCount} archivos WebP preparados para upload directo`);
      } else {
        toast.success(`✅ ${normalCount} imágenes comprimidas y preparadas`);
      }
      
      console.log(`LOG: [ProductForm] Archivos preparados - WebP: ${webpCount}, Normales: ${normalCount}`);
      
    } catch (error) {
      console.error("ERROR: [ProductForm] Error al procesar imágenes:", error);
      toast.dismiss();
      toast.error(`Error al procesar imágenes: ${error.message}`);
    }
  };
  
  const handleRemoveNewImage = (variantIndex, fileToRemove) => {
    console.log(`LOG: [ProductForm] Removiendo imagen normal de variante ${variantIndex}...`);
    
    // Liberar la URL del objeto antes de removerlo
    URL.revokeObjectURL(URL.createObjectURL(fileToRemove));
    
    const updatedVariants = [...product.variants];
    updatedVariants[variantIndex].newImageFiles = updatedVariants[variantIndex].newImageFiles.filter(f => f !== fileToRemove);
    setProduct(prev => ({ ...prev, variants: updatedVariants }));
  };

  // ✅ NUEVA FUNCIÓN: Remover archivos WebP
  const handleRemoveWebPFile = (variantIndex, fileToRemove) => {
    console.log(`LOG: [ProductForm] Removiendo archivo WebP de variante ${variantIndex}...`);
    
    // Liberar la URL del objeto antes de removerlo
    URL.revokeObjectURL(URL.createObjectURL(fileToRemove));
    
    const updatedVariants = [...product.variants];
    updatedVariants[variantIndex].webpFiles = updatedVariants[variantIndex].webpFiles.filter(f => f !== fileToRemove);
    setProduct(prev => ({ ...prev, variants: updatedVariants }));
  };

  const handleRemoveExistingImage = (variantIndex, imageUrl) => {
    console.log(`LOG: [ProductForm] Marcando imagen existente para eliminar en variante ${variantIndex}:`, imageUrl);
    
    const updatedVariants = [...product.variants];
    updatedVariants[variantIndex].image_urls = updatedVariants[variantIndex].image_urls.filter(url => url !== imageUrl);
    setProduct(prev => ({ ...prev, variants: updatedVariants }));
    toast.success('Imagen marcada para eliminar');
  };

  const addVariant = () => {
    console.log("LOG: [ProductForm] Añadiendo nueva variante...");
    setProduct(prev => ({
      ...prev,
      variants: [...prev.variants, { ...INITIAL_VARIANT_STATE, newImageFiles: [], webpFiles: [] }]
    }));
  };

  const removeVariant = (index) => {
    if (product.variants.length <= 1) {
      toast.error("Debe haber al menos una variante de producto.");
      return;
    }
    
    console.log(`LOG: [ProductForm] Removiendo variante ${index}...`);
    
    // Limpiar URLs de objetos de la variante que se va a eliminar
    const variantToRemove = product.variants[index];
    variantToRemove.newImageFiles?.forEach(file => {
      if (file && typeof file === 'object' && file.constructor === File) {
        URL.revokeObjectURL(URL.createObjectURL(file));
      }
    });
    
    // Limpiar la referencia del input de archivo
    if (fileInputRefs.current[index]) {
      fileInputRefs.current[index].value = "";
    }
    
    const updatedVariants = product.variants.filter((_, i) => i !== index);
    setProduct(prev => ({ ...prev, variants: updatedVariants }));
    
    // Actualizar el array de referencias
    fileInputRefs.current = fileInputRefs.current.filter((_, i) => i !== index);
    
    console.log(`LOG: [ProductForm] Variante ${index} removida exitosamente.`);
  };

  const cancelEdit = () => {
    console.log("LOG: [ProductForm] Cancelando edición...");
    resetForm();
    onFormSubmit(); // Esto notificará al padre para limpiar editingProduct
  };

  // --- 7. ✅ NUEVA FUNCIÓN: DETECTAR Y ELIMINAR IMÁGENES HUÉRFANAS ---
  const cleanupOrphanedImages = async () => {
    if (!isEditMode || originalImageUrls.length === 0) {
      console.log("LOG: [ProductForm] No hay imágenes originales que limpiar.");
      return;
    }

    // Obtener todas las URLs actuales del producto
    const currentImageUrls = product.variants.flatMap(variant => variant.image_urls || []);
    
    // Detectar imágenes que estaban originalmente pero ya no están
    const orphanedImages = originalImageUrls.filter(originalUrl => 
      !currentImageUrls.includes(originalUrl)
    );

    if (orphanedImages.length === 0) {
      console.log("LOG: [ProductForm] No se detectaron imágenes huérfanas.");
      return;
    }

    console.log(`LOG: [ProductForm] Detectadas ${orphanedImages.length} imágenes huérfanas para eliminar:`, orphanedImages);

    try {
      // Eliminar imágenes huérfanas de Cloudinary
      const { data, error } = await supabase.functions.invoke('delete-cloudinary-images', {
        body: { imageUrls: orphanedImages }
      });

      if (error) {
        console.warn("WARN: [ProductForm] Error al eliminar imágenes de Cloudinary:", error);
        toast.error("Advertencia: No se pudieron eliminar algunas imágenes de Cloudinary");
      } else {
        console.log("LOG: [ProductForm] Imágenes huérfanas eliminadas exitosamente de Cloudinary:", data);
        console.log("LOG: [ProductForm] DETALLE de respuesta Cloudinary:", JSON.stringify(data, null, 2));
        
        // ✅ NUEVO: Verificar si realmente se eliminaron
        if (data.success && data.results) {
          data.results.forEach((result, index) => {
            console.log(`LOG: [ProductForm] Resultado ${index + 1}:`, result);
            if (result.result === 'ok') {
              console.log(`LOG: [ProductForm] ✅ Imagen ${index + 1} eliminada exitosamente`);
            } else if (result.result === 'not found') {
              console.log(`LOG: [ProductForm] ⚠️ Imagen ${index + 1} no encontrada (posiblemente ya eliminada)`);
            } else {
              console.log(`LOG: [ProductForm] ❌ Error en imagen ${index + 1}:`, result);
            }
          });
        }
        
        toast.success(`${orphanedImages.length} imágenes eliminadas de Cloudinary`);
      }
    } catch (error) {
      console.error("ERROR: [ProductForm] Error al invocar función de eliminación:", error);
      toast.error("Error al limpiar imágenes eliminadas");
    }
  };

  // --- 8. LÓGICA DE ENVÍO Y GUARDADO ---

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const actionText = isEditMode ? 'Actualizando' : 'Guardando';
    toast.loading(`${actionText} producto y variantes...`);
    console.log(`LOG: [ProductForm] Iniciando proceso de ${actionText.toLowerCase()} con datos:`, product);
    
    try {
      // --- SUBIDA A CLOUDINARY PARA NUEVAS IMÁGENES ---
      console.log("LOG: [ProductForm] Solicitando firma de Cloudinary...");
      const { data: signatureData, error: signatureError } = await supabase.functions.invoke('generate-cloudinary-signature');
      if (signatureError) throw signatureError;
      const { signature, timestamp, eager } = signatureData;
      
      console.log("LOG: [ProductForm] Firma de Cloudinary obtenida, procesando archivos...");
      
      for (const [variantIndex, variant] of product.variants.entries()) {
        console.log(`LOG: [ProductForm] Procesando variante ${variantIndex}:`, {
          webpFiles: variant.webpFiles?.length || 0,
          newImageFiles: variant.newImageFiles?.length || 0
        });
        
        // ✅ SUBIR ARCHIVOS WEBP DIRECTAMENTE (SIN TRANSFORMACIONES)
        if (variant.webpFiles && variant.webpFiles.length > 0) {
          console.log(`LOG: [ProductForm] Subiendo ${variant.webpFiles.length} archivos WebP directamente...`);
          
          for (const webpFile of variant.webpFiles) {
            console.log(`LOG: [ProductForm] Subiendo WebP: ${webpFile.name}`);
            
            const formData = new FormData();
            formData.append('file', webpFile);
            
            const { data: uploadResult, error: uploadError } = await supabase.functions.invoke('upload-direct-webp', {
              body: formData
            });
            
            if (uploadError) {
              console.error(`ERROR: [ProductForm] Error al subir WebP ${webpFile.name}:`, uploadError);
              throw new Error(`Error al subir ${webpFile.name}: ${uploadError.message}`);
            }
            
            if (!uploadResult.success) {
              console.error(`ERROR: [ProductForm] Upload WebP falló para ${webpFile.name}:`, uploadResult);
              throw new Error(`Upload falló para ${webpFile.name}: ${uploadResult.error}`);
            }
            
            console.log(`LOG: [ProductForm] ✅ WebP subido: ${webpFile.name} → ${uploadResult.data.secure_url}`);
            variant.image_urls.push(uploadResult.data.secure_url);
          }
        }
        
        // ✅ SUBIR ARCHIVOS NORMALES CON TRANSFORMACIONES
        if (variant.newImageFiles && variant.newImageFiles.length > 0) {
          console.log(`LOG: [ProductForm] Subiendo ${variant.newImageFiles.length} archivos normales con transformaciones...`);
          
          const uploadPromises = variant.newImageFiles.map(file => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('api_key', CLOUDINARY_API_KEY);
            formData.append('timestamp', timestamp);
            formData.append('eager', eager);
            formData.append('signature', signature);
            const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
            return fetch(cloudinaryUrl, { method: 'POST', body: formData }).then(res => res.json());
          });
          
          const uploadResults = await Promise.all(uploadPromises);
          const cloudinaryError = uploadResults.find(res => res.error);
          if (cloudinaryError) throw new Error(`Cloudinary Error: ${cloudinaryError.error.message}`);
          
          const newUrls = uploadResults.map(res => {
              if (res.eager && res.eager.length > 0 && res.eager[0].secure_url) {
                return res.eager[0].secure_url;
              }
              const transformationString = "e_background_removal/w_1080,h_1350,c_pad,b_auto/f_auto,q_auto";
              return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transformationString}/v${res.version}/${res.public_id}`;
          });
          variant.image_urls.push(...newUrls);
          
          console.log(`LOG: [ProductForm] ✅ ${newUrls.length} archivos normales subidos con transformaciones`);
        }
      }
      console.log(`LOG: [ProductForm] Todas las nuevas imágenes han sido subidas a Cloudinary.`);

      if (isEditMode) {
        // --- MODO EDICIÓN ---
        console.log(`LOG: [ProductForm] Actualizando producto existente ID: ${product.id}`);
        
        // Actualizar producto base
        const { error: productError } = await supabase
          .from('products')
          .update({
            sku: product.sku,
            name: product.name,
            description: product.description,
            category: product.category
          })
          .eq('id', product.id);
        if (productError) throw productError;

        console.log("LOG: [ProductForm] Producto base actualizado, procesando variantes...");

        // Actualizar variantes - necesitamos manejar las existentes y las nuevas
        for (const [variantIndex, variant] of product.variants.entries()) {
          const variantData = {
            product_id: product.id,
            color: variant.color,
            stock: parseInt(variant.stock, 10),
            price: parseFloat(variant.price),
            price_menudeo: parseFloat(variant.price_menudeo),
            price_mayoreo: parseFloat(variant.price_mayoreo),
            image_urls: variant.image_urls
          };

          if (variant.variant_id) {
            // Actualizar variante existente
            console.log(`LOG: [ProductForm] Actualizando variante existente ${variant.variant_id}...`);
            const { error: updateError } = await supabase
              .from('product_variants')
              .update(variantData)
              .eq('id', variant.variant_id);
            if (updateError) throw updateError;
          } else {
            // Insertar nueva variante
            console.log(`LOG: [ProductForm] Insertando nueva variante ${variantIndex}...`);
            const { error: insertError } = await supabase
              .from('product_variants')
              .insert(variantData);
            if (insertError) throw insertError;
          }
        }

        // ✅ NUEVO: LIMPIAR IMÁGENES HUÉRFANAS DESPUÉS DE ACTUALIZAR BD
        console.log("LOG: [ProductForm] Base de datos actualizada, limpiando imágenes huérfanas...");
        await cleanupOrphanedImages();

        console.log("LOG: [ProductForm] Producto actualizado exitosamente.");
        toast.dismiss();
        toast.success("¡Producto actualizado con éxito!");

      } else {
        // --- MODO CREACIÓN (código original) ---
        console.log("LOG: [ProductForm] Creando nuevo producto...");
        
        const { data: productData, error: productError } = await supabase
          .from('products').insert({
            sku: product.sku, name: product.name, description: product.description, category: product.category
          }).select().single();
        if (productError) throw productError;

        console.log(`LOG: [ProductForm] Producto creado con ID: ${productData.id}, insertando variantes...`);

        const variantsToInsert = product.variants.map(variant => ({
          product_id: productData.id, color: variant.color, stock: parseInt(variant.stock, 10),
          price: parseFloat(variant.price), price_menudeo: parseFloat(variant.price_menudeo),
          price_mayoreo: parseFloat(variant.price_mayoreo), image_urls: variant.image_urls
        }));
        
        const { error: variantsError } = await supabase.from('product_variants').insert(variantsToInsert);
        if (variantsError) throw variantsError;
        
        console.log("LOG: [ProductForm] Producto y variantes guardados exitosamente.");
        toast.dismiss();
        toast.success("¡Producto y variantes guardados con éxito!");
      }

      // --- FINALIZACIÓN Y LIMPIEZA ROBUSTA ---
      console.log("LOG: [ProductForm] Proceso completado exitosamente, reseteando formulario...");
      resetForm();
      onFormSubmit();

    } catch (error) {
      toast.dismiss();
      toast.error(error.message);
      console.error("ERROR: [ProductForm] Error fatal al guardar/actualizar producto:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- 9. RENDERIZADO DEL FORMULARIO ---
  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-6">
      <Toaster position="top-right" />
      
      {/* Indicador de modo */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-primary">
          {isEditMode ? `Editando: ${product.name}` : 'Nuevo Producto'}
        </h2>
        {isEditMode && (
          <button 
            type="button" 
            onClick={cancelEdit}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition"
          >
            Cancelar Edición
          </button>
        )}
      </div>

      <fieldset className="p-4 border rounded-lg">
        <legend className="text-lg font-bold text-primary px-2">Datos del Producto Base</legend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input 
            name="sku" 
            value={product.sku} 
            onChange={handleProductChange} 
            placeholder="SKU del Modelo (ej. 849)" 
            required 
            className="border p-2 rounded" 
          />
          <input 
            name="name" 
            value={product.name} 
            onChange={handleProductChange} 
            placeholder="Nombre del Modelo (ej. Bolsa Horizon)" 
            required 
            className="border p-2 rounded" 
          />
          <input 
            name="category" 
            value={product.category} 
            onChange={handleProductChange} 
            placeholder="Categoría (ej. Bolsas)" 
            required 
            className="border p-2 rounded" 
          />
        </div>
        <textarea 
          name="description" 
          value={product.description} 
          onChange={handleProductChange} 
          placeholder="Descripción general del producto" 
          className="w-full mt-4 border p-2 rounded" 
        />
      </fieldset>

      {product.variants.map((variant, index) => (
        <fieldset key={index} className="p-4 border-2 border-dashed rounded-lg relative pt-6">
          <legend className="font-semibold text-gray-700 px-2">
            Variante de Color #{index + 1} {variant.variant_id && `(ID: ${variant.variant_id})`}
          </legend>
          {product.variants.length > 1 && (
            <button 
              type="button" 
              onClick={() => removeVariant(index)} 
              className="absolute top-2 right-2 text-red-500 hover:text-red-700"
            >
              <FiX size={20} title="Eliminar esta variante" />
            </button>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
             <select 
               name="color" 
               value={variant.color} 
               onChange={(e) => handleVariantChange(index, e)} 
               className="border p-2 rounded bg-white" 
               required
             >
                <option value="" disabled>— Color —</option>
                {standardColors.map(color => (<option key={color} value={color}>{color}</option>))}
             </select>
             <input 
               type="number" 
               name="stock" 
               value={variant.stock} 
               onChange={(e) => handleVariantChange(index, e)} 
               placeholder="Stock" 
               required 
               className="border p-2 rounded"
             />
             <input 
               type="number" 
               step="0.01" 
               name="price" 
               value={variant.price} 
               onChange={(e) => handleVariantChange(index, e)} 
               placeholder="Costo ($)" 
               required 
               className="border p-2 rounded"
             />
             <input 
               type="number" 
               step="0.01" 
               name="price_menudeo" 
               value={variant.price_menudeo} 
               onChange={(e) => handleVariantChange(index, e)} 
               placeholder="Precio Menudeo ($)" 
               required 
               className="border p-2 rounded"
             />
             <input 
               type="number" 
               step="0.01" 
               name="price_mayoreo" 
               value={variant.price_mayoreo} 
               onChange={(e) => handleVariantChange(index, e)} 
               placeholder="Precio Mayoreo ($)" 
               required 
               className="border p-2 rounded"
             />
          </div>
          
          <div className="mt-4">
             <label className="text-sm font-medium">Imágenes para esta variante</label>
             <input 
               type="file" 
               ref={el => fileInputRefs.current[index] = el}
               onChange={(e) => handleFileChange(index, e)} 
               multiple 
               className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-red-700"
             />
          </div>
          
          {/* Vista previa de imágenes existentes */}
          {variant.image_urls && variant.image_urls.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-gray-600 mb-2">Imágenes actuales:</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {variant.image_urls.map((url, i) => (
                  <div key={i} className="relative group aspect-square">
                    <img 
                      src={url} 
                      className="w-full h-full object-cover rounded-md"
                      alt={`Existing ${i + 1}`}
                    />
                    <button 
                      type="button" 
                      onClick={() => handleRemoveExistingImage(index, url)} 
                      className="absolute -top-2 -right-2 bg-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <FiXCircle className="text-red-500"/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Vista previa de nuevas imágenes normales */}
          {variant.newImageFiles && variant.newImageFiles.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-gray-600 mb-2">Imágenes normales a subir:</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {variant.newImageFiles.map((file, i) => (
                  <div key={i} className="relative group aspect-square">
                    <img 
                      src={URL.createObjectURL(file)} 
                      className="w-full h-full object-cover rounded-md"
                      alt={`New preview ${i + 1}`}
                    />
                    <button 
                      type="button" 
                      onClick={() => handleRemoveNewImage(index, file)} 
                      className="absolute -top-2 -right-2 bg-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <FiXCircle className="text-red-500"/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ✅ NUEVO: Vista previa de archivos WebP */}
          {variant.webpFiles && variant.webpFiles.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-gray-600 mb-2">Archivos WebP a subir (directo):</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {variant.webpFiles.map((file, i) => (
                  <div key={i} className="relative group aspect-square border-2 border-green-200 rounded-md">
                    <img 
                      src={URL.createObjectURL(file)} 
                      className="w-full h-full object-cover rounded-md"
                      alt={`WebP preview ${i + 1}`}
                    />
                    <div className="absolute top-1 left-1 bg-green-500 text-white text-xs px-1 py-0.5 rounded">
                      WebP
                    </div>
                    <button 
                      type="button" 
                      onClick={() => handleRemoveWebPFile(index, file)} 
                      className="absolute -top-2 -right-2 bg-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <FiXCircle className="text-red-500"/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </fieldset>
      ))}
      
      <div className="flex gap-4 mt-4">
        <button 
          type="button" 
          onClick={addVariant} 
          className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-primary text-primary rounded-lg hover:bg-pink-50"
        >
          <FiPlus /> Añadir Variante
        </button>
      </div>
      
      <div className="flex justify-end border-t pt-6 mt-6">
        <button 
          type="submit" 
          disabled={loading} 
          className="bg-primary text-white font-bold px-6 py-3 rounded-lg hover:bg-red-700 transition disabled:bg-gray-400"
        >
          {loading ? (isEditMode ? 'Actualizando...' : 'Guardando...') : (isEditMode ? 'Actualizar Producto' : 'Guardar Producto y Variantes')}
        </button>
      </div>
    </form>
  );
};

export default ProductForm;