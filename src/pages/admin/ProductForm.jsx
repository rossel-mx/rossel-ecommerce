/**
 * @file ProductForm.jsx - CON VALIDACIÓN SKU EN TIEMPO REAL
 * @description Formulario CRUD completo para la gestión de productos y sus variantes.
 * Maneja tanto creación como edición de productos existentes.
 * ✅ ACTUALIZADO: Ahora elimina imágenes huérfanas de Cloudinary durante edición.
 * 🆕 NUEVO: Selector de colores híbrido integrado con 32 colores estándar + autocompletado + corrección automática
 * 🔥 NUEVO: Validación SKU en tiempo real con indicadores visuales y prevención de duplicados
 *
 * @requires react
 * @requires supabaseClient
 * @requires react-hot-toast
 * @requires browser-image-compression
 * @requires react-icons
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import { FiX, FiPlus, FiXCircle, FiChevronDown, FiCheck, FiAlertTriangle, FiLoader, FiEdit3 } from 'react-icons/fi';
import imageCompression from 'browser-image-compression';

// --- 1. CONFIGURACIÓN CENTRALIZADA CON COLORES EXPANDIDOS ---

// ✅ NUEVA: Lista expandida de 32 colores estándar organizados
const standardColors = [
  // Básicos
  'Negro', 'Blanco', 'Gris', 'Beige', 'Crema', 'Marfil',
  // Cálidos
  'Rojo', 'Rosa', 'Coral', 'Naranja', 'Amarillo', 'Dorado', 'Cafe', 'Marrón', 'Camel', 'Tinto', 'Vino',
  // Fríos  
  'Azul', 'Marino', 'Celeste', 'Verde', 'Kaki', 'Morado', 'Violeta', 'Lila',
  // Metálicos/Especiales
  'Plateado', 'Bronce', 'Cobre',
  // Neutros modernos
  'Topo', 'Hueso', 'Arena', 'Tierra'
].sort();

// ✅ NUEVO: Mapeo de colores para autocompletado y corrección automática
const colorMapping = {
  // Variaciones de negro
  'negro': 'Negro', 'black': 'Negro', 'negra': 'Negro',
  // Variaciones de blanco
  'blanco': 'Blanco', 'white': 'Blanco', 'blanca': 'Blanco',
  // Variaciones de rojo
  'rojo': 'Rojo', 'red': 'Rojo', 'roja': 'Rojo', 'colorado': 'Rojo',
  // Variaciones de azul
  'azul': 'Azul', 'blue': 'Azul', 'navy': 'Marino', 'marino': 'Marino',
  // Variaciones de verde
  'verde': 'Verde', 'green': 'Verde', 'kaki': 'Kaki', 'oliva': 'Kaki',
  // Variaciones de amarillo
  'amarillo': 'Amarillo', 'yellow': 'Amarillo', 'dorado': 'Dorado', 'gold': 'Dorado',
  // Variaciones de rosa
  'rosa': 'Rosa', 'pink': 'Rosa', 'rosado': 'Rosa', 'coral': 'Coral',
  // Variaciones de morado
  'morado': 'Morado', 'purple': 'Morado', 'violeta': 'Violeta', 'lila': 'Lila',
  // Variaciones de naranja
  'naranja': 'Naranja', 'orange': 'Naranja',
  // Variaciones de gris
  'gris': 'Gris', 'gray': 'Gris', 'grey': 'Gris', 'plateado': 'Plateado', 'silver': 'Plateado',
  // Variaciones de café/marrón
  'cafe': 'Cafe', 'coffee': 'Cafe', 'marron': 'Marrón', 'brown': 'Marrón', 'camel': 'Camel',
  // Variaciones de beige
  'beige': 'Beige', 'crema': 'Crema', 'cream': 'Crema', 'hueso': 'Hueso', 'marfil': 'Marfil',
  // Otros
  'tinto': 'Tinto', 'vino': 'Vino', 'wine': 'Vino', 'celeste': 'Celeste', 'topo': 'Topo',
  'arena': 'Arena', 'tierra': 'Tierra', 'bronce': 'Bronce', 'bronze': 'Bronce', 'cobre': 'Cobre'
};

// ✅ NUEVO: Colores organizados por categorías para el selector visual
const colorCategories = {
  basicos: ['Negro', 'Blanco', 'Gris', 'Beige', 'Crema', 'Marfil'],
  calidos: ['Rojo', 'Rosa', 'Coral', 'Naranja', 'Amarillo', 'Dorado', 'Cafe', 'Marrón', 'Camel', 'Tinto', 'Vino'],
  frios: ['Azul', 'Marino', 'Celeste', 'Verde', 'Kaki', 'Morado', 'Violeta', 'Lila'],
  metalicos: ['Plateado', 'Dorado', 'Bronce', 'Cobre'],
  neutros: ['Topo', 'Hueso', 'Arena', 'Tierra']
};

const categoryLabels = {
  basicos: 'Básicos',
  calidos: 'Cálidos', 
  frios: 'Fríos',
  metalicos: 'Metálicos',
  neutros: 'Neutros'
};

// ✅ NUEVO: Utilidades de color integradas
const ColorUtils = {
  isValidColor: (color) => standardColors.includes(color),
  
  normalizeColor: (input) => {
    const normalized = input.toLowerCase();
    return colorMapping[normalized] || input;
  },
  
  getSuggestions: (input) => {
    if (!input) return [];
    return standardColors.filter(color =>
      color.toLowerCase().includes(input.toLowerCase())
    ).slice(0, 5);
  },

  getColorPreview: (colorName) => {
    const colorMap = {
      'Negro': '#000000', 'Blanco': '#FFFFFF', 'Gris': '#808080', 'Beige': '#F5F5DC',
      'Rojo': '#FF0000', 'Rosa': '#FFC0CB', 'Azul': '#0000FF', 'Verde': '#008000',
      'Amarillo': '#FFFF00', 'Naranja': '#FFA500', 'Morado': '#800080', 'Dorado': '#FFD700',
      'Plateado': '#C0C0C0', 'Marino': '#000080', 'Cafe': '#8B4513', 'Marrón': '#A52A2A',
      'Crema': '#F5F5DC', 'Coral': '#FF7F50', 'Celeste': '#87CEEB', 'Kaki': '#F0E68C',
      'Violeta': '#8A2BE2', 'Lila': '#DDA0DD', 'Bronce': '#CD7F32', 'Cobre': '#B87333',
      'Tinto': '#722F37', 'Vino': '#722F37', 'Camel': '#C19A6B', 'Topo': '#8B7765',
      'Hueso': '#F9F6EE', 'Arena': '#C2B280', 'Tierra': '#8B4513'
    };
    return colorMap[colorName] || '#CCCCCC';
  }
};

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

// 🔥 NUEVA: Función para validar SKU en tiempo real
const validateSKU = async (sku, currentProductId = null) => {
  console.log(`LOG: [SKU Validation] Validando SKU: "${sku}", producto actual: ${currentProductId}`);
  
  // Validaciones básicas
  if (!sku || !sku.trim()) {
    return { isValid: false, status: 'empty', message: 'SKU requerido' };
  }
  
  const trimmedSku = sku.trim();
  
  // Validar formato básico (opcional - puedes agregar regex aquí)
  if (trimmedSku.length < 2) {
    return { isValid: false, status: 'invalid', message: 'SKU debe tener al menos 2 caracteres' };
  }
  
  try {
    // Verificar en la base de datos
    const { data, error } = await supabase
      .from('products')
      .select('id, name, sku')
      .eq('sku', trimmedSku)
      .maybeSingle();
    
    if (error) {
      console.error("ERROR: [SKU Validation] Error al consultar BD:", error);
      return { isValid: false, status: 'error', message: 'Error al validar SKU' };
    }
    
    // Si existe y no es el producto actual (para modo edición)
    if (data && data.id !== currentProductId) {
      console.log(`LOG: [SKU Validation] SKU duplicado encontrado:`, data);
      return { 
        isValid: false, 
        status: 'duplicate',
        message: `Ya existe en "${data.name}"`,
        conflictProduct: data
      };
    }
    
    // SKU válido
    console.log(`LOG: [SKU Validation] SKU "${trimmedSku}" disponible`);
    return { isValid: true, status: 'available', message: 'Disponible' };
    
  } catch (error) {
    console.error("ERROR: [SKU Validation] Error en validación:", error);
    return { isValid: false, status: 'error', message: 'Error de conexión' };
  }
};

const ProductForm = ({ onFormSubmit, editingProduct }) => {
  // --- 2. ESTADOS DEL COMPONENTE ---
  const [product, setProduct] = useState(INITIAL_PRODUCT_STATE);
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // ✅ NUEVO: Estado para trackear imágenes originales
  const [originalImageUrls, setOriginalImageUrls] = useState([]);
  
  // 🆕 NUEVOS ESTADOS: Para el selector de colores híbrido
  const [colorDropdownStates, setColorDropdownStates] = useState({});
  const [colorSuggestions, setColorSuggestions] = useState({});
  
  // 🔥 NUEVOS ESTADOS: Para validación SKU en tiempo real
  const [skuValidation, setSkuValidation] = useState({ 
    isValid: false, 
    status: 'empty', 
    message: '', 
    conflictProduct: null 
  });
  const [isValidatingSku, setIsValidatingSku] = useState(false);
  const [skuValidationDebounce, setSkuValidationDebounce] = useState(null);
  
  const fileInputRefs = useRef([]);
  const colorDropdownRefs = useRef({});

  // --- 3. EFECTOS DE REACT ---

  useEffect(() => {
    console.log("LOG: [ProductForm] Verificando configuración de Cloudinary...");
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY) {
      console.error("ERROR CRÍTICO: Variables VITE_CLOUDINARY... no definidas. Revisa .env.local y REINICIA el servidor.");
      toast.error("Error de configuración: Cloudinary no está configurado.");
    }
  }, []);

  // 🆕 NUEVO: Efecto para manejar clics fuera de los dropdowns de color
  useEffect(() => {
    const handleClickOutside = (event) => {
      Object.keys(colorDropdownRefs.current).forEach(variantIndex => {
        const ref = colorDropdownRefs.current[variantIndex];
        if (ref && !ref.contains(event.target)) {
          setColorDropdownStates(prev => ({
            ...prev,
            [variantIndex]: { ...prev[variantIndex], showDropdown: false, showSuggestions: false }
          }));
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 🔥 NUEVO: Efecto para validación SKU con debounce
  useEffect(() => {
    // Limpiar timeout anterior
    if (skuValidationDebounce) {
      clearTimeout(skuValidationDebounce);
    }
    
    // Si no hay SKU, resetear validación
    if (!product.sku || !product.sku.trim()) {
      setSkuValidation({ isValid: false, status: 'empty', message: 'SKU requerido', conflictProduct: null });
      setIsValidatingSku(false);
      return;
    }
    
    // Configurar nuevo debounce
    setIsValidatingSku(true);
    const timeoutId = setTimeout(async () => {
      console.log(`LOG: [ProductForm] Ejecutando validación SKU con debounce para: "${product.sku}"`);
      
      try {
        const validation = await validateSKU(product.sku, isEditMode ? product.id : null);
        setSkuValidation(validation);
        console.log(`LOG: [ProductForm] Resultado validación SKU:`, validation);
      } catch (error) {
        console.error("ERROR: [ProductForm] Error en validación SKU:", error);
        setSkuValidation({ 
          isValid: false, 
          status: 'error', 
          message: 'Error al validar', 
          conflictProduct: null 
        });
      } finally {
        setIsValidatingSku(false);
      }
    }, 500); // Debounce de 500ms
    
    setSkuValidationDebounce(timeoutId);
    
    // Cleanup
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [product.sku, isEditMode, product.id]);

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

      // 🆕 NUEVO: Inicializar estados de color para cada variante
      const colorStates = {};
      formattedVariants.forEach((variant, index) => {
        colorStates[index] = {
          showDropdown: false,
          showSuggestions: false,
          selectedCategory: 'basicos'
        };
      });
      setColorDropdownStates(colorStates);
      setColorSuggestions({});

      // 🔥 NUEVO: Inicializar validación SKU para modo edición
      setSkuValidation({ isValid: true, status: 'current', message: 'SKU actual', conflictProduct: null });

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
    
    // 🆕 NUEVO: Resetear estados de colores
    setColorDropdownStates({});
    setColorSuggestions({});
    
    // 🔥 NUEVO: Resetear validación SKU
    setSkuValidation({ isValid: false, status: 'empty', message: '', conflictProduct: null });
    setIsValidatingSku(false);
    if (skuValidationDebounce) {
      clearTimeout(skuValidationDebounce);
      setSkuValidationDebounce(null);
    }
    
    // Limpiar todos los inputs de archivo
    fileInputRefs.current.forEach(ref => {
      if (ref) {
        ref.value = "";
      }
    });
    
    // Limpiar el array de referencias
    fileInputRefs.current = [];
    colorDropdownRefs.current = {};
    
    console.log("LOG: [ProductForm] Formulario reseteado completamente.");
  };

  // --- 6. 🆕 NUEVOS MANEJADORES PARA EL SELECTOR DE COLORES HÍBRIDO ---

  const initializeColorState = (variantIndex) => {
    if (!colorDropdownStates[variantIndex]) {
      setColorDropdownStates(prev => ({
        ...prev,
        [variantIndex]: {
          showDropdown: false,
          showSuggestions: false,
          selectedCategory: 'basicos'
        }
      }));
    }
  };

  const handleColorInputChange = (variantIndex, inputValue) => {
    console.log(`LOG: [ProductForm] Cambio en color de variante ${variantIndex}: ${inputValue}`);
    
    // Inicializar estado si no existe
    initializeColorState(variantIndex);
    
    // Actualizar el valor del color en la variante
    const updatedVariants = [...product.variants];
    updatedVariants[variantIndex].color = inputValue;
    setProduct(prev => ({ ...prev, variants: updatedVariants }));
    
    if (inputValue.trim() === '') {
      setColorSuggestions(prev => ({ ...prev, [variantIndex]: [] }));
      setColorDropdownStates(prev => ({
        ...prev,
        [variantIndex]: { ...prev[variantIndex], showSuggestions: false }
      }));
      return;
    }

    // 1. NORMALIZACIÓN AUTOMÁTICA
    const normalized = ColorUtils.normalizeColor(inputValue);
    
    // Si se normalizó (ej: "red" → "Rojo"), actualizar el input después de un delay
    if (normalized !== inputValue && ColorUtils.isValidColor(normalized)) {
      setTimeout(() => {
        const updatedVariants = [...product.variants];
        updatedVariants[variantIndex].color = normalized;
        setProduct(prev => ({ ...prev, variants: updatedVariants }));
        
        // Limpiar sugerencias después de normalización
        setColorSuggestions(prev => ({ ...prev, [variantIndex]: [] }));
        setColorDropdownStates(prev => ({
          ...prev,
          [variantIndex]: { ...prev[variantIndex], showSuggestions: false }
        }));
      }, 100);
      return;
    }

    // 2. GENERAR SUGERENCIAS
    const suggestions = ColorUtils.getSuggestions(inputValue);
    setColorSuggestions(prev => ({ ...prev, [variantIndex]: suggestions }));
    setColorDropdownStates(prev => ({
      ...prev,
      [variantIndex]: { ...prev[variantIndex], showSuggestions: suggestions.length > 0 }
    }));
  };

  const selectColorSuggestion = (variantIndex, color) => {
    console.log(`LOG: [ProductForm] Seleccionando sugerencia de color: ${color} para variante ${variantIndex}`);
    
    const updatedVariants = [...product.variants];
    updatedVariants[variantIndex].color = color;
    setProduct(prev => ({ ...prev, variants: updatedVariants }));
    
    setColorSuggestions(prev => ({ ...prev, [variantIndex]: [] }));
    setColorDropdownStates(prev => ({
      ...prev,
      [variantIndex]: { ...prev[variantIndex], showSuggestions: false }
    }));
  };

  const selectColorFromDropdown = (variantIndex, color) => {
    console.log(`LOG: [ProductForm] Seleccionando color del dropdown: ${color} para variante ${variantIndex}`);
    
    const updatedVariants = [...product.variants];
    updatedVariants[variantIndex].color = color;
    setProduct(prev => ({ ...prev, variants: updatedVariants }));
    
    setColorDropdownStates(prev => ({
      ...prev,
      [variantIndex]: { 
        ...prev[variantIndex], 
        showDropdown: false, 
        showSuggestions: false 
      }
    }));
  };

  const toggleColorDropdown = (variantIndex) => {
    initializeColorState(variantIndex);
    
    setColorDropdownStates(prev => ({
      ...prev,
      [variantIndex]: { 
        ...prev[variantIndex], 
        showDropdown: !prev[variantIndex]?.showDropdown,
        showSuggestions: false
      }
    }));
  };

  const selectColorCategory = (variantIndex, category) => {
    setColorDropdownStates(prev => ({
      ...prev,
      [variantIndex]: { ...prev[variantIndex], selectedCategory: category }
    }));
  };

  // --- 7. MANEJADORES DE ESTADO Y EVENTOS ORIGINALES ---

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
    const newIndex = product.variants.length;
    
    setProduct(prev => ({
      ...prev,
      variants: [...prev.variants, { ...INITIAL_VARIANT_STATE, newImageFiles: [], webpFiles: [] }]
    }));
    
    // 🆕 NUEVO: Inicializar estado de color para la nueva variante
    setColorDropdownStates(prev => ({
      ...prev,
      [newIndex]: {
        showDropdown: false,
        showSuggestions: false,
        selectedCategory: 'basicos'
      }
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
    
    // 🆕 NUEVO: Limpiar estados de color
    setColorDropdownStates(prev => {
      const newStates = { ...prev };
      delete newStates[index];
      // Reindexar los estados restantes
      const reindexedStates = {};
      Object.keys(newStates).forEach(key => {
        const keyNum = parseInt(key);
        if (keyNum > index) {
          reindexedStates[keyNum - 1] = newStates[key];
        } else {
          reindexedStates[key] = newStates[key];
        }
      });
      return reindexedStates;
    });
    
    setColorSuggestions(prev => {
      const newSuggestions = { ...prev };
      delete newSuggestions[index];
      // Reindexar las sugerencias restantes
      const reindexedSuggestions = {};
      Object.keys(newSuggestions).forEach(key => {
        const keyNum = parseInt(key);
        if (keyNum > index) {
          reindexedSuggestions[keyNum - 1] = newSuggestions[key];
        } else {
          reindexedSuggestions[key] = newSuggestions[key];
        }
      });
      return reindexedSuggestions;
    });
    
    // Actualizar el array de referencias
    fileInputRefs.current = fileInputRefs.current.filter((_, i) => i !== index);
    
    // Limpiar referencia del dropdown de color
    delete colorDropdownRefs.current[index];
    
    console.log(`LOG: [ProductForm] Variante ${index} removida exitosamente.`);
  };

  const cancelEdit = () => {
    console.log("LOG: [ProductForm] Cancelando edición...");
    resetForm();
    onFormSubmit(); // Esto notificará al padre para limpiar editingProduct
  };

  // --- 8. ✅ NUEVA FUNCIÓN: DETECTAR Y ELIMINAR IMÁGENES HUÉRFANAS ---
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

  // --- 9. 🔥 NUEVO: FUNCIÓN PARA NAVEGAR AL PRODUCTO EN CONFLICTO ---
// 🔥 REEMPLAZAR ESTA FUNCIÓN:
const handleNavigateToConflict = () => {
  if (skuValidation.conflictProduct && onFormSubmit) {
    console.log(`LOG: [ProductForm] Navegando al producto en conflicto:`, skuValidation.conflictProduct);
    
    // 🔥 CAMBIAR: toast.info NO EXISTE, usar toast.success o toast
    toast.success(`🔍 Cargando producto: ${skuValidation.conflictProduct.name}`);
    
    // Emitir evento para que el padre maneje la navegación
    window.dispatchEvent(new CustomEvent('editProductBySku', { 
      detail: { productId: skuValidation.conflictProduct.id } 
    }));
  }
};

  // --- 10. LÓGICA DE ENVÍO Y GUARDADO ---

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 🔥 NUEVA VALIDACIÓN: Verificar SKU antes de continuar
    if (!skuValidation.isValid) {
      console.error("ERROR: [ProductForm] Intento de guardar con SKU inválido:", skuValidation);
      toast.error(`❌ No se puede guardar: ${skuValidation.message}`);
      
      // Hacer scroll al campo SKU si hay error
      const skuInput = document.querySelector('input[name="sku"]');
      if (skuInput) {
        skuInput.focus();
        skuInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
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
      
      // 🔥 MANEJO MEJORADO DE ERRORES DE SKU DUPLICADO
      if (error.message.includes('duplicate key') || error.code === '23505' || error.message.includes('sku')) {
        console.error("ERROR: [ProductForm] Error de SKU duplicado detectado:", error);
        toast.error(`❌ El SKU "${product.sku}" ya está en uso. Por favor verifica y usa uno diferente.`);
        
        // Forzar re-validación del SKU
        setSkuValidation({ 
          isValid: false, 
          status: 'duplicate', 
          message: 'SKU duplicado detectado', 
          conflictProduct: null 
        });
      } else {
        toast.error(`❌ Error: ${error.message}`);
      }
      
      console.error("ERROR: [ProductForm] Error fatal al guardar/actualizar producto:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- 11. 🔥 NUEVO: COMPONENTE DEL INDICADOR DE VALIDACIÓN SKU ---
  const renderSKUValidationIndicator = () => {
    const getIndicatorContent = () => {
      if (isValidatingSku) {
        return {
          icon: <FiLoader className="w-4 h-4 animate-spin" />,
          text: 'Verificando...',
          className: 'text-blue-600 bg-blue-50 border-blue-200'
        };
      }

      switch (skuValidation.status) {
        case 'empty':
          return {
            icon: <FiAlertTriangle className="w-4 h-4" />,
            text: 'SKU requerido',
            className: 'text-gray-500 bg-gray-50 border-gray-200'
          };
        
        case 'invalid':
          return {
            icon: <FiAlertTriangle className="w-4 h-4" />,
            text: skuValidation.message,
            className: 'text-red-600 bg-red-50 border-red-200'
          };
        
        case 'duplicate':
          return {
            icon: <FiAlertTriangle className="w-4 h-4" />,
            text: skuValidation.message,
            className: 'text-red-600 bg-red-50 border-red-200',
            showConflictButton: true
          };
        
        case 'available':
          return {
            icon: <FiCheck className="w-4 h-4" />,
            text: '✅ SKU disponible',
            className: 'text-green-600 bg-green-50 border-green-200'
          };
        
        case 'current':
          return {
            icon: <FiCheck className="w-4 h-4" />,
            text: '✅ SKU actual (sin cambios)',
            className: 'text-blue-600 bg-blue-50 border-blue-200'
          };
        
        case 'error':
          return {
            icon: <FiAlertTriangle className="w-4 h-4" />,
            text: 'Error al validar',
            className: 'text-red-600 bg-red-50 border-red-200'
          };
        
        default:
          return null;
      }
    };

    const indicator = getIndicatorContent();
    if (!indicator) return null;

    return (
      <div className={`mt-2 flex items-center justify-between px-3 py-2 rounded-lg border text-sm font-medium ${indicator.className}`}>
        <div className="flex items-center gap-2">
          {indicator.icon}
          <span>{indicator.text}</span>
        </div>
        
        {indicator.showConflictButton && skuValidation.conflictProduct && (
          <button
            type="button"
            onClick={handleNavigateToConflict}
            className="ml-2 px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs rounded-md border border-red-300 transition-colors flex items-center gap-1"
          >
            <FiEdit3 className="w-3 h-3" />
            Editar "{skuValidation.conflictProduct.name}"
          </button>
        )}
      </div>
    );
  };

  // --- 12. 🆕 NUEVO: COMPONENTE DEL SELECTOR DE COLOR HÍBRIDO ---
  const renderColorSelector = (variant, index) => {
    const currentState = colorDropdownStates[index] || { 
      showDropdown: false, 
      showSuggestions: false, 
      selectedCategory: 'basicos' 
    };
    const suggestions = colorSuggestions[index] || [];
    const isValid = ColorUtils.isValidColor(variant.color);

    return (
      <div className="relative" ref={el => colorDropdownRefs.current[index] = el}>
        {/* INPUT PRINCIPAL CON BOTÓN */}
        <div className="flex">
          <input
            type="text"
            value={variant.color}
            onChange={(e) => handleColorInputChange(index, e.target.value)}
            onFocus={() => {
              initializeColorState(index);
              if (suggestions.length > 0) {
                setColorDropdownStates(prev => ({
                  ...prev,
                  [index]: { ...prev[index], showSuggestions: true }
                }));
              }
            }}
            placeholder="Escribe o selecciona un color..."
            required
            className={`flex-1 border p-2 rounded-l-lg focus:outline-none focus:ring-2 ${
              variant.color 
                ? (isValid 
                    ? 'border-green-300 focus:ring-green-500' 
                    : 'border-red-300 focus:ring-red-500')
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          <button
            type="button"
            onClick={() => toggleColorDropdown(index)}
            className="px-3 py-2 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
          >
            🎨 <FiChevronDown className="ml-1" />
          </button>
        </div>

        {/* INDICADOR DE VALIDACIÓN */}
        {variant.color && (
          <div className="mt-1 text-sm flex items-center">
            {isValid ? (
              <span className="text-green-600 flex items-center">
                ✅ Color válido
                <div 
                  className="ml-2 w-4 h-4 rounded border border-gray-300"
                  style={{ backgroundColor: ColorUtils.getColorPreview(variant.color) }}
                ></div>
              </span>
            ) : (
              <span className="text-red-600">❌ Color no estándar</span>
            )}
          </div>
        )}

        {/* SUGERENCIAS DE AUTOCOMPLETADO */}
        {currentState.showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg mt-1 shadow-lg z-20">
            <div className="p-2 text-sm text-gray-600 border-b">💡 Sugerencias:</div>
            {suggestions.map((suggestion, i) => (
              <div
                key={i}
                onClick={() => selectColorSuggestion(index, suggestion)}
                className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between"
              >
                <span>{suggestion}</span>
                <div 
                  className="w-4 h-4 rounded border border-gray-300"
                  style={{ backgroundColor: ColorUtils.getColorPreview(suggestion) }}
                ></div>
              </div>
            ))}
          </div>
        )}

        {/* DROPDOWN VISUAL CON CATEGORÍAS */}
        {currentState.showDropdown && (
          <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg mt-1 shadow-lg z-10">
            {/* PESTAÑAS DE CATEGORÍAS */}
            <div className="flex border-b border-gray-200 bg-gray-50 rounded-t-lg">
              {Object.keys(colorCategories).map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => selectColorCategory(index, category)}
                  className={`flex-1 px-2 py-2 text-xs font-medium transition-colors ${
                    currentState.selectedCategory === category
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  {categoryLabels[category]}
                </button>
              ))}
            </div>

            {/* GRID DE COLORES */}
            <div className="p-3 max-h-48 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                {colorCategories[currentState.selectedCategory].map((color) => (
                  <div
                    key={color}
                    onClick={() => selectColorFromDropdown(index, color)}
                    className={`p-2 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors flex items-center space-x-2 ${
                      variant.color === color ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div 
                      className="w-4 h-4 rounded border border-gray-300 flex-shrink-0"
                      style={{ backgroundColor: ColorUtils.getColorPreview(color) }}
                    ></div>
                    <span className="text-sm font-medium">{color}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* PIE DEL DROPDOWN */}
            <div className="px-3 py-2 bg-gray-50 border-t text-xs text-gray-600 rounded-b-lg">
              {colorCategories[currentState.selectedCategory].length} colores disponibles
            </div>
          </div>
        )}
      </div>
    );
  };

  // --- 13. RENDERIZADO DEL FORMULARIO ---
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* 🔥 CAMPO SKU CON VALIDACIÓN EN TIEMPO REAL - 2 columnas */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SKU del Modelo <span className="text-red-500">*</span>
            </label>
            <input 
              name="sku" 
              value={product.sku} 
              onChange={handleProductChange} 
              placeholder="Ej: 849, BOL-2024-001" 
              required 
              className={`w-full border-2 p-3 rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                skuValidation.isValid 
                  ? 'border-green-300 focus:ring-green-500 focus:border-green-500' 
                  : skuValidation.status === 'duplicate'
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : skuValidation.status === 'empty'
                      ? 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                      : 'border-red-300 focus:ring-red-500 focus:border-red-500'
              }`}
            />
            {/* Indicador de validación SKU */}
            {renderSKUValidationIndicator()}
          </div>
          
          {/* Nombre del Modelo - 2 columnas */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Modelo <span className="text-red-500">*</span>
            </label>
            <input 
              name="name" 
              value={product.name} 
              onChange={handleProductChange} 
              placeholder="Ej. Bolsa Horizon" 
              required 
              className="w-full border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
            />
          </div>
          
          {/* Categoría - 1 columna */}
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoría <span className="text-red-500">*</span>
            </label>
            <input 
              name="category" 
              value={product.category} 
              onChange={handleProductChange} 
              placeholder="Bolsa" 
              required 
              className="w-full border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
            />
          </div>
        </div>
        <textarea 
          name="description" 
          value={product.description} 
          onChange={handleProductChange} 
          placeholder="Descripción general del producto" 
          className="w-full mt-4 border p-2 rounded" 
        />
      </fieldset>

      {/* 🆕 NUEVO: Información sobre colores mejorados */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 mb-2">🎨 Selector de Colores Mejorado</h3>
        <div className="text-sm text-blue-700 space-y-1">
          <div><strong>32 colores estándar:</strong> Negro, Blanco, Rojo, Azul, Verde, Dorado, Plateado, etc.</div>
          <div><strong>Autocompletado:</strong> Escribe "ro" y verás sugerencias como "Rojo", "Rosa"</div>
          <div><strong>Corrección automática:</strong> "red" → "Rojo", "blue" → "Azul", "black" → "Negro"</div>
          <div><strong>Selector visual:</strong> Usa el botón 🎨 para navegar por categorías</div>
        </div>
      </div>

      {/* 🔥 NUEVA: Información sobre validación SKU */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-medium text-green-800 mb-2">🛡️ Validación SKU en Tiempo Real</h3>
        <div className="text-sm text-green-700 space-y-1">
          <div><strong>Detección instantánea:</strong> Verifica duplicados mientras escribes</div>
          <div><strong>Prevención de errores:</strong> No podrás guardar con SKU duplicado</div>
          <div><strong>Navegación rápida:</strong> Ve directamente al producto que usa un SKU</div>
          <div><strong>Feedback visual:</strong> Indicadores claros de disponibilidad</div>
        </div>
      </div>

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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {/* LADO IZQUIERDO: Selector de Color */}
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">
                 Color <span className="text-red-500">*</span>
               </label>
               {renderColorSelector(variant, index)}
             </div>
             
             {/* LADO DERECHO: Grid de 4 campos iguales */}
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                 <input 
                   type="number" 
                   name="stock" 
                   value={variant.stock} 
                   onChange={(e) => handleVariantChange(index, e)} 
                   placeholder="Stock" 
                   required 
                   className="w-full border p-2 rounded"
                 />
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Costo ($)</label>
                 <input 
                   type="number" 
                   step="0.01" 
                   name="price" 
                   value={variant.price} 
                   onChange={(e) => handleVariantChange(index, e)} 
                   placeholder="Costo ($)" 
                   required 
                   className="w-full border p-2 rounded"
                 />
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Precio Menudeo ($)</label>
                 <input 
                   type="number" 
                   step="0.01" 
                   name="price_menudeo" 
                   value={variant.price_menudeo} 
                   onChange={(e) => handleVariantChange(index, e)} 
                   placeholder="Precio Menudeo ($)" 
                   required 
                   className="w-full border p-2 rounded"
                 />
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Precio Mayoreo ($)</label>
                 <input 
                   type="number" 
                   step="0.01" 
                   name="price_mayoreo" 
                   value={variant.price_mayoreo} 
                   onChange={(e) => handleVariantChange(index, e)} 
                   placeholder="Precio Mayoreo ($)" 
                   required 
                   className="w-full border p-2 rounded"
                 />
               </div>
             </div>
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
      
      <div className="flex justify-between items-end border-t pt-6 mt-6">
        {/* Botón de resetear a la izquierda */}
        <button 
          type="button" 
          onClick={resetForm}
          className="bg-gray-500 text-white font-medium px-4 py-2 rounded-lg hover:bg-gray-600 transition flex items-center gap-2"
        >
          <FiX size={16} />
          Limpiar Formulario
        </button>
        
        {/* Botón de guardar a la derecha - 🔥 CON VALIDACIÓN SKU */}
        <button 
          type="submit" 
          disabled={loading || !skuValidation.isValid || isValidatingSku} 
          className={`font-bold px-6 py-3 rounded-lg transition flex items-center gap-2 ${
            loading || !skuValidation.isValid || isValidatingSku
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
              : 'bg-primary text-white hover:bg-red-700'
          }`}
        >
          {loading ? (
            <>
              <FiLoader className="w-4 h-4 animate-spin" />
              {isEditMode ? 'Actualizando...' : 'Guardando...'}
            </>
          ) : isValidatingSku ? (
            <>
              <FiLoader className="w-4 h-4 animate-spin" />
              Verificando SKU...
            </>
          ) : !skuValidation.isValid ? (
            <>
              <FiAlertTriangle className="w-4 h-4" />
              SKU Inválido
            </>
          ) : (
            <>
              <FiCheck className="w-4 h-4" />
              {isEditMode ? 'Actualizar Producto' : 'Guardar Producto y Variantes'}
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default ProductForm;