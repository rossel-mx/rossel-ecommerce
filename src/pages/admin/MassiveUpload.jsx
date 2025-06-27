/**
 * @file MassiveUpload.jsx
 * @description Componente para carga masiva de productos e imágenes mediante Excel + ZIP.
 * 
 * FLUJO COMPLETO:
 * 1. Usuario descarga template Excel
 * 2. Usuario llena Excel con productos/variantes (Excel inteligente)
 * 3. Usuario procesa imágenes con Python (renombrado automático)
 * 4. Usuario sube Excel + ZIP con imágenes procesadas
 * 5. Sistema hace match automático y sube todo sin transformaciones
 * 
 * CARACTERÍSTICAS:
 * - ✅ Template Excel inteligente con cache de datos
 * - ✅ Validación completa de datos y nomenclatura
 * - ✅ Preview de productos/variantes antes de subir
 * - ✅ Carga directa a Cloudinary (0 tokens)
 * - ✅ Inserción batch a Supabase
 * - ✅ Manejo de errores robusto
 * - ✅ Progress tracking en tiempo real
 * 
 * @requires react
 * @requires supabaseClient  
 * @requires react-hot-toast
 * @requires xlsx (para generar/leer Excel)
 * @requires jszip (para manejar ZIP de imágenes)
 * @requires react-icons
 */

import { useState, useRef } from 'react';
import { supabase } from '../../services/supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import { 
  FiDownload, 
  FiUpload, 
  FiFileText, 
  FiImage, 
  FiCheckCircle, 
  FiAlertCircle,
  FiPlay,
  FiLoader,
  FiInfo
} from 'react-icons/fi';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

// --- 1. CONFIGURACIÓN Y CONSTANTES ---

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = import.meta.env.VITE_CLOUDINARY_API_KEY;

const STANDARD_COLORS = [
  'Amarillo', 'Azul', 'Beige', 'Blanco', 'Cafe', 'Camel', 'Celeste', 'Gris', 
  'Kaki', 'Marino', 'Morado', 'Naranja', 'Negro', 'Rojo', 'Rosa', 'Tinto', 'Verde', 'Vino'
].sort();

const EXCEL_HEADERS = [
  'SKU', 'Nombre', 'Descripción', 'Categoría', 'Color', 
  'Stock', 'Precio', 'Precio_Menudeo', 'Precio_Mayoreo', 'Imagenes'
];

const TEMPLATE_DATA = [
  ['849', 'Bolsa Luna', 'Bolsa elegante de cuero sintético', 'Bolsas', 'Rojo', '10', '450', '650', '550', '849_rojo_1.webp,849_rojo_2.webp'],
  ['', '', '', '', 'Negro', '15', '450', '650', '550', '849_negro_1.webp,849_negro_2.webp'],
  ['', '', '', '', 'Azul', '8', '450', '650', '550', '849_azul_1.webp'],
  ['850', 'Mochila Star', 'Mochila escolar resistente', 'Mochilas', 'Verde', '20', '380', '580', '480', '850_verde_1.webp,850_verde_2.webp'],
  ['', '', '', '', 'Negro', '12', '380', '580', '480', '850_negro_1.webp']
];

const MassiveUpload = ({ onUploadSuccess }) => {
  // --- 2. ESTADOS DEL COMPONENTE ---
  const [step, setStep] = useState(1); // 1: Instrucciones, 2: Upload, 3: Preview, 4: Processing
  const [excelFile, setExcelFile] = useState(null);
  const [zipFile, setZipFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [imageFiles, setImageFiles] = useState({});
  const [validationErrors, setValidationErrors] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedResults, setProcessedResults] = useState(null);

  // Referencias para inputs de archivos
  const excelInputRef = useRef(null);
  const zipInputRef = useRef(null);

  // --- 3. GENERADOR DE TEMPLATE EXCEL ---
  const generateExcelTemplate = () => {
    console.log('LOG: [MassiveUpload] Generando template Excel...');
    
    try {
      // Crear workbook y worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([EXCEL_HEADERS, ...TEMPLATE_DATA]);
      
      // Configurar anchos de columnas
      const colWidths = [
        { wch: 8 },   // SKU
        { wch: 20 },  // Nombre
        { wch: 30 },  // Descripción
        { wch: 12 },  // Categoría
        { wch: 10 },  // Color
        { wch: 8 },   // Stock
        { wch: 10 },  // Precio
        { wch: 12 },  // Precio_Menudeo
        { wch: 12 },  // Precio_Mayoreo
        { wch: 40 }   // Imagenes
      ];
      ws['!cols'] = colWidths;

      // Agregar hoja al workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Productos');
      
      // Descargar archivo
      XLSX.writeFile(wb, 'rossel_productos_template.xlsx');
      
      console.log('LOG: [MassiveUpload] Template Excel generado y descargado exitosamente');
      toast.success('Template Excel descargado exitosamente');
      
    } catch (error) {
      console.error('ERROR: [MassiveUpload] Error al generar template:', error);
      toast.error('Error al generar el template Excel');
    }
  };

  // --- 4. PROCESADOR INTELIGENTE DE EXCEL ---
  const processIntelligentExcel = (data) => {
    console.log('LOG: [MassiveUpload] Procesando Excel con lógica inteligente...');
    console.log('LOG: [MassiveUpload] Datos recibidos:', data);
    
    const products = {};
    const errors = [];
    let lastProductData = {}; // Cache del último producto válido
    
    try {
      data.forEach((row, index) => {
        const rowNum = index + 2; // +2 porque Excel empieza en 1 y tenemos header
        
        console.log(`LOG: [MassiveUpload] Procesando fila ${rowNum}:`, row);
        
        // Si hay SKU, actualizar cache de producto
        if (row.SKU && row.SKU.toString().trim()) {
          lastProductData = {
            sku: row.SKU.toString().trim(),
            name: row.Nombre?.toString().trim() || '',
            description: row.Descripción?.toString().trim() || '',
            category: row.Categoría?.toString().trim() || ''
          };
          
          // Validar datos base del producto
          if (!lastProductData.name) {
            errors.push(`Fila ${rowNum}: Nombre del producto es requerido cuando se especifica SKU`);
          }
          if (!lastProductData.category) {
            errors.push(`Fila ${rowNum}: Categoría es requerida cuando se especifica SKU`);
          }
          
          // Crear producto si no existe
          if (!products[lastProductData.sku]) {
            products[lastProductData.sku] = {
              ...lastProductData,
              variants: []
            };
            console.log(`LOG: [MassiveUpload] Producto creado: ${lastProductData.sku} - ${lastProductData.name}`);
          }
        }
        
        // Validar que tenemos datos de producto (de cache o actual)
        if (!lastProductData.sku) {
          errors.push(`Fila ${rowNum}: No se puede determinar el SKU del producto (debe especificarse en esta fila o una anterior)`);
          return;
        }
        
        // Procesar variante
        const color = row.Color?.toString().trim();
        const stock = parseInt(row.Stock) || 0;
        const precio = parseFloat(row.Precio) || 0;
        const precio_menudeo = parseFloat(row.Precio_Menudeo) || 0;
        const precio_mayoreo = parseFloat(row.Precio_Mayoreo) || 0;
        const imagenes = row.Imagenes?.toString().trim() || '';
        
        // Validaciones de variante
        if (!color) {
          errors.push(`Fila ${rowNum}: Color es requerido`);
          return;
        }
        
        if (!STANDARD_COLORS.includes(color)) {
          errors.push(`Fila ${rowNum}: Color "${color}" no está en la lista estándar`);
        }
        
        if (stock < 0) {
          errors.push(`Fila ${rowNum}: Stock no puede ser negativo`);
        }
        
        if (precio <= 0 || precio_menudeo <= 0 || precio_mayoreo <= 0) {
          errors.push(`Fila ${rowNum}: Todos los precios deben ser mayores a 0`);
        }
        
        // Verificar que no hay variante duplicada del mismo color
        const existingVariant = products[lastProductData.sku].variants.find(v => v.color === color);
        if (existingVariant) {
          errors.push(`Fila ${rowNum}: Ya existe una variante de color "${color}" para el producto ${lastProductData.sku}`);
          return;
        }
        
        // Procesar lista de imágenes
        const imageList = imagenes ? imagenes.split(',').map(img => img.trim()).filter(img => img) : [];
        
        // Validar nomenclatura de imágenes
        imageList.forEach(imageName => {
          const expectedPrefix = `${lastProductData.sku}_${color.toLowerCase()}_`;
          if (!imageName.toLowerCase().startsWith(expectedPrefix)) {
            errors.push(`Fila ${rowNum}: Imagen "${imageName}" no sigue la nomenclatura esperada "${expectedPrefix}X.webp"`);
          }
          if (!imageName.toLowerCase().endsWith('.webp')) {
            errors.push(`Fila ${rowNum}: Imagen "${imageName}" debe tener extensión .webp`);
          }
        });
        
        // Agregar variante
        products[lastProductData.sku].variants.push({
          color,
          stock,
          precio,
          precio_menudeo,
          precio_mayoreo,
          imageNames: imageList
        });
        
        console.log(`LOG: [MassiveUpload] Variante agregada: ${lastProductData.sku} - ${color}`);
      });
      
      const productList = Object.values(products);
      console.log(`LOG: [MassiveUpload] Procesamiento completado: ${productList.length} productos, ${errors.length} errores`);
      
      return { products: productList, errors };
      
    } catch (error) {
      console.error('ERROR: [MassiveUpload] Error en procesamiento de Excel:', error);
      return { products: [], errors: [`Error crítico al procesar Excel: ${error.message}`] };
    }
  };

  // --- 5. MANEJADORES DE ARCHIVOS ---
  const handleExcelUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log('LOG: [MassiveUpload] Procesando archivo Excel:', file.name);
    setExcelFile(file);
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      console.log('LOG: [MassiveUpload] Excel parseado, datos extraídos:', jsonData.length, 'filas');
      
      const { products, errors } = processIntelligentExcel(jsonData);
      
      setParsedData(products);
      setValidationErrors(errors);
      
      if (errors.length === 0) {
        toast.success(`Excel procesado: ${products.length} productos válidos`);
      } else {
        toast.error(`Excel procesado con ${errors.length} errores - revisar detalles`);
      }
      
    } catch (error) {
      console.error('ERROR: [MassiveUpload] Error al procesar Excel:', error);
      toast.error('Error al procesar el archivo Excel');
      setValidationErrors([`Error al leer archivo: ${error.message}`]);
    }
  };

  const handleZipUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log('LOG: [MassiveUpload] Procesando archivo ZIP:', file.name);
    setZipFile(file);
    
    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);
      const imageFiles = {};
      
      console.log('LOG: [MassiveUpload] Extrayendo archivos del ZIP...');
      
      for (const [filename, zipEntry] of Object.entries(contents.files)) {
        if (!zipEntry.dir && filename.toLowerCase().endsWith('.webp')) {
          const imageData = await zipEntry.async('blob');
          const cleanFilename = filename.split('/').pop(); // Remover carpetas si las hay
          imageFiles[cleanFilename] = imageData;
          console.log(`LOG: [MassiveUpload] Imagen extraída: ${cleanFilename} (${(imageData.size / 1024).toFixed(1)}KB)`);
        }
      }
      
      setImageFiles(imageFiles);
      
      const imageCount = Object.keys(imageFiles).length;
      console.log(`LOG: [MassiveUpload] ZIP procesado: ${imageCount} imágenes extraídas`);
      toast.success(`ZIP procesado: ${imageCount} imágenes encontradas`);
      
    } catch (error) {
      console.error('ERROR: [MassiveUpload] Error al procesar ZIP:', error);
      toast.error('Error al procesar el archivo ZIP');
    }
  };

  // --- 6. VALIDADOR CRUZADO ---
  const validateCrossReferences = () => {
    if (!parsedData || !imageFiles) return [];
    
    console.log('LOG: [MassiveUpload] Validando referencias cruzadas entre Excel e imágenes...');
    
    const errors = [];
    const availableImages = Object.keys(imageFiles);
    const requiredImages = new Set();
    
    // Recopilar todas las imágenes requeridas
    parsedData.forEach(product => {
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
    
    // Verificar imágenes no utilizadas (advertencia)
    const unusedImages = availableImages.filter(imageName => !requiredImages.has(imageName));
    if (unusedImages.length > 0) {
      console.log('WARN: [MassiveUpload] Imágenes no utilizadas:', unusedImages);
      // No es error crítico, solo log de advertencia
    }
    
    console.log(`LOG: [MassiveUpload] Validación cruzada completada: ${errors.length} errores, ${unusedImages.length} imágenes no utilizadas`);
    
    return errors;
  };

  // --- 7. PROCESADOR PRINCIPAL ---
  const processUpload = async () => {
    if (!parsedData || !imageFiles || validationErrors.length > 0) {
      toast.error('Corrija los errores antes de continuar');
      return;
    }
    
    const crossErrors = validateCrossReferences();
    if (crossErrors.length > 0) {
      setValidationErrors(prev => [...prev, ...crossErrors]);
      toast.error('Hay problemas con las referencias de imágenes');
      return;
    }
    
    setIsProcessing(true);
    setStep(4);
    setUploadProgress(0);
    
    console.log('LOG: [MassiveUpload] Iniciando procesamiento masivo...');
    
    try {
      // Paso 1: Subir todas las imágenes a Cloudinary (sin transformaciones)
      console.log('LOG: [MassiveUpload] Paso 1: Subiendo imágenes a Cloudinary...');
      
      const imageUrls = {};
      const totalImages = Object.keys(imageFiles).length;
      let uploadedImages = 0;
      
      // Obtener firma para Cloudinary
      const { data: signatureData, error: signatureError } = await supabase.functions.invoke('generate-cloudinary-signature-bulk');
      if (signatureError) throw signatureError;
      
      const { signature, timestamp } = signatureData;
      
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
          setUploadProgress(Math.round((uploadedImages / totalImages) * 50)); // 50% para imágenes
          
          console.log(`LOG: [MassiveUpload] Imagen subida: ${filename} -> ${result.secure_url}`);
          return { filename, url: result.secure_url };
        });
        
        const batchResults = await Promise.all(uploadPromises);
        batchResults.forEach(({ filename, url }) => {
          imageUrls[filename] = url;
        });
      }
      
      console.log(`LOG: [MassiveUpload] Todas las imágenes subidas: ${Object.keys(imageUrls).length}`);
      
      // Paso 2: Insertar productos y variantes en Supabase
      console.log('LOG: [MassiveUpload] Paso 2: Insertando productos en Supabase...');
      
      const results = {
        productsCreated: 0,
        variantsCreated: 0,
        errors: []
      };
      
      for (const [index, product] of parsedData.entries()) {
        try {
          // Insertar producto base
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
          console.log(`LOG: [MassiveUpload] Producto creado: ${product.sku} (ID: ${productData.id})`);
          
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
          console.log(`LOG: [MassiveUpload] ${variantInserts.length} variantes creadas para producto ${product.sku}`);
          
        } catch (error) {
          console.error(`ERROR: [MassiveUpload] Error procesando producto ${product.sku}:`, error);
          results.errors.push(`Error en producto ${product.sku}: ${error.message}`);
        }
        
        // Actualizar progreso (50% restante para base de datos)
        setUploadProgress(50 + Math.round(((index + 1) / parsedData.length) * 50));
      }
      
      console.log('LOG: [MassiveUpload] Procesamiento completado:', results);
      setProcessedResults(results);
      
      if (results.errors.length === 0) {
        toast.success(`¡Carga masiva completada! ${results.productsCreated} productos y ${results.variantsCreated} variantes creadas`);
      } else {
        toast.error(`Carga completada con ${results.errors.length} errores`);
      }
      
      // Notificar al componente padre
      onUploadSuccess?.();
      
    } catch (error) {
      console.error('ERROR: [MassiveUpload] Error crítico en procesamiento:', error);
      toast.error(`Error crítico: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- 8. FUNCIONES DE NAVEGACIÓN ---
  const resetUpload = () => {
    console.log('LOG: [MassiveUpload] Reseteando componente...');
    
    setStep(1);
    setExcelFile(null);
    setZipFile(null);
    setParsedData(null);
    setImageFiles({});
    setValidationErrors([]);
    setUploadProgress(0);
    setProcessedResults(null);
    
    // Limpiar inputs
    if (excelInputRef.current) excelInputRef.current.value = '';
    if (zipInputRef.current) zipInputRef.current.value = '';
  };

  const canProceedToPreview = () => {
    return excelFile && zipFile && parsedData && validationErrors.length === 0;
  };

  // --- 9. RENDERIZADO ---
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">📦 Carga Masiva de Productos</h1>
        <p className="text-gray-600">
          Sistema inteligente para cargar múltiples productos con sus variantes e imágenes
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        {[
          { num: 1, title: 'Instrucciones', icon: FiInfo },
          { num: 2, title: 'Subir Archivos', icon: FiUpload },
          { num: 3, title: 'Revisar Datos', icon: FiCheckCircle },
          { num: 4, title: 'Procesar', icon: FiPlay }
        ].map(({ num, title, icon: Icon }) => (
          <div key={num} className="flex items-center">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
              step >= num 
                ? 'bg-primary text-white border-primary' 
                : 'bg-gray-100 text-gray-400 border-gray-300'
            }`}>
              {step > num ? (
                <FiCheckCircle className="w-5 h-5" />
              ) : step === num && isProcessing ? (
                <FiLoader className="w-5 h-5 animate-spin" />
              ) : (
                <Icon className="w-5 h-5" />
              )}
            </div>
            <span className={`ml-2 text-sm font-medium ${
              step >= num ? 'text-primary' : 'text-gray-500'
            }`}>
              {title}
            </span>
            {num < 4 && <div className="w-8 h-0.5 bg-gray-300 mx-4" />}
          </div>
        ))}
      </div>

      {/* Step 1: Instrucciones */}
      {step === 1 && (
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-primary mb-6 flex items-center">
            <FiInfo className="mr-3" />
            Instrucciones para Carga Masiva
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Paso 1: Template */}
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-bold text-blue-800 mb-2">📋 Paso 1: Descargar Template</h3>
                <p className="text-blue-700 text-sm mb-3">
                  Descarga el template Excel con el formato correcto y ejemplos incluidos.
                </p>
                <button
                  onClick={generateExcelTemplate}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                >
                  <FiDownload /> Descargar Template Excel
                </button>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="font-bold text-green-800 mb-2">🐍 Paso 2: Procesar Imágenes</h3>
                <p className="text-green-700 text-sm mb-2">
                  Usa nuestro script Python para procesar las imágenes:
                </p>
                <ul className="text-green-700 text-xs space-y-1">
                  <li>• Redimensionar y optimizar calidad</li>
                  <li>• Convertir a formato WebP</li>
                  <li>• Renombrar según nomenclatura: SKU_color_número.webp</li>
                  <li>• Ejemplo: 849_rojo_1.webp, 849_rojo_2.webp</li>
                </ul>
              </div>
            </div>

            {/* Paso 2: Llenar datos */}
            <div className="space-y-4">
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h3 className="font-bold text-yellow-800 mb-2">✏️ Paso 3: Llenar Excel</h3>
                <p className="text-yellow-700 text-sm mb-2">
                  El Excel es <strong>inteligente</strong>. Reglas:
                </p>
                <ul className="text-yellow-700 text-xs space-y-1">
                  <li>• <strong>Primera fila de producto:</strong> Llena SKU, Nombre, Descripción, Categoría</li>
                  <li>• <strong>Variantes del mismo producto:</strong> Deja celdas base vacías, solo llena Color, Stock, Precios, Imágenes</li>
                  <li>• <strong>Sistema detecta automáticamente:</strong> Nuevo SKU = nuevo producto</li>
                </ul>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h3 className="font-bold text-purple-800 mb-2">📁 Paso 4: Crear ZIP</h3>
                <p className="text-purple-700 text-sm mb-2">
                  Comprime todas las imágenes procesadas en un archivo ZIP.
                </p>
                <ul className="text-purple-700 text-xs space-y-1">
                  <li>• Todas las imágenes en la raíz del ZIP (no en carpetas)</li>
                  <li>• Solo archivos .webp procesados por Python</li>
                  <li>• Nombres exactos como aparecen en el Excel</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Ejemplo visual */}
          <div className="mt-8 bg-gray-50 p-6 rounded-lg">
            <h3 className="font-bold text-gray-800 mb-4">📋 Ejemplo de Excel Inteligente:</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs border border-gray-300">
                <thead className="bg-gray-200">
                  <tr>
                    {EXCEL_HEADERS.map(header => (
                      <th key={header} className="border border-gray-300 px-2 py-1 text-left">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TEMPLATE_DATA.map((row, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="border border-gray-300 px-2 py-1">
                          {cell || <span className="text-gray-400 italic">vacío</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              💡 <strong>Nota:</strong> Las celdas vacías usan los valores del producto anterior (Excel inteligente)
            </p>
          </div>

          <div className="flex justify-center mt-8">
            <button
              onClick={() => setStep(2)}
              className="bg-primary text-white px-8 py-3 rounded-lg hover:bg-red-700 transition flex items-center gap-2 font-medium"
            >
              Continuar a Subir Archivos <FiUpload />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Upload Files */}
      {step === 2 && (
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-primary mb-6 flex items-center">
            <FiUpload className="mr-3" />
            Subir Archivos
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Excel Upload */}
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition">
                <FiFileText className="mx-auto text-4xl text-gray-400 mb-4" />
                <h3 className="font-bold text-gray-700 mb-2">Excel con Productos</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Sube el archivo Excel con los datos de productos y variantes
                </p>
                <input
                  ref={excelInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelUpload}
                  className="hidden"
                />
                <button
                  onClick={() => excelInputRef.current?.click()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Seleccionar Excel
                </button>
                {excelFile && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                    <p className="text-green-800 text-sm">✅ {excelFile.name}</p>
                  </div>
                )}
              </div>
            </div>

            {/* ZIP Upload */}
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition">
                <FiImage className="mx-auto text-4xl text-gray-400 mb-4" />
                <h3 className="font-bold text-gray-700 mb-2">ZIP con Imágenes</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Sube el archivo ZIP con todas las imágenes procesadas
                </p>
                <input
                  ref={zipInputRef}
                  type="file"
                  accept=".zip"
                  onChange={handleZipUpload}
                  className="hidden"
                />
                <button
                  onClick={() => zipInputRef.current?.click()}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
                >
                  Seleccionar ZIP
                </button>
                {zipFile && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                    <p className="text-green-800 text-sm">✅ {zipFile.name}</p>
                    <p className="text-green-600 text-xs">
                      {Object.keys(imageFiles).length} imágenes encontradas
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-bold text-red-800 mb-3 flex items-center">
                <FiAlertCircle className="mr-2" />
                Errores de Validación ({validationErrors.length})
              </h3>
              <div className="max-h-40 overflow-y-auto">
                {validationErrors.map((error, index) => (
                  <p key={index} className="text-red-700 text-sm mb-1">
                    • {error}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between mt-8">
            <button
              onClick={() => setStep(1)}
              className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition"
            >
              ← Volver
            </button>
            
            <button
              onClick={() => setStep(3)}
              disabled={!canProceedToPreview()}
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-red-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Revisar Datos →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 3 && parsedData && (
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-primary mb-6 flex items-center">
            <FiCheckCircle className="mr-3" />
            Revisar Datos ({parsedData.length} productos)
          </h2>

          <div className="space-y-6">
            {parsedData.map((product, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-bold text-lg text-gray-800 mb-2">
                  {product.sku} - {product.name}
                </h3>
                <p className="text-gray-600 text-sm mb-3">{product.description}</p>
                <p className="text-gray-500 text-xs mb-4">Categoría: {product.category}</p>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {product.variants.map((variant, vIndex) => (
                    <div key={vIndex} className="bg-gray-50 p-3 rounded border">
                      <h4 className="font-medium text-gray-800">{variant.color}</h4>
                      <p className="text-sm text-gray-600">Stock: {variant.stock}</p>
                      <p className="text-sm text-gray-600">
                        Precios: ${variant.precio} / ${variant.precio_menudeo} / ${variant.precio_mayoreo}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Imágenes: {variant.imageNames.length} archivo(s)
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {variant.imageNames.map((imageName, imgIndex) => (
                          <span 
                            key={imgIndex}
                            className={`text-xs px-2 py-1 rounded ${
                              imageFiles[imageName] 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {imageName}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-8 bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-bold text-blue-800 mb-2">📊 Resumen de Carga</h3>
            <div className="grid md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-blue-700 font-medium">Productos:</span>
                <span className="ml-2 text-blue-800">{parsedData.length}</span>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Variantes:</span>
                <span className="ml-2 text-blue-800">
                  {parsedData.reduce((sum, p) => sum + p.variants.length, 0)}
                </span>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Imágenes requeridas:</span>
                <span className="ml-2 text-blue-800">
                  {parsedData.reduce((sum, p) => 
                    sum + p.variants.reduce((vSum, v) => vSum + v.imageNames.length, 0), 0
                  )}
                </span>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Imágenes disponibles:</span>
                <span className="ml-2 text-blue-800">{Object.keys(imageFiles).length}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between mt-8">
            <button
              onClick={() => setStep(2)}
              className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition"
            >
              ← Modificar Archivos
            </button>
            
            <button
              onClick={processUpload}
              disabled={validationErrors.length > 0 || validateCrossReferences().length > 0}
              className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center gap-2"
            >
              <FiPlay /> Procesar Carga Masiva
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Processing */}
      {step === 4 && (
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-primary mb-6 flex items-center">
            <FiLoader className="mr-3 animate-spin" />
            Procesando Carga Masiva
          </h2>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progreso general</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-primary h-3 rounded-full transition-all duration-500"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>

          {/* Current Status */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
            <p className="text-blue-800 font-medium">
              {uploadProgress < 50 
                ? '☁️ Subiendo imágenes a Cloudinary...' 
                : '💾 Guardando productos en base de datos...'}
            </p>
            <p className="text-blue-600 text-sm mt-1">
              Por favor espera, este proceso puede tomar varios minutos
            </p>
          </div>

          {/* Results */}
          {processedResults && (
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="font-bold text-green-800 mb-2">✅ Carga Completada</h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-green-700 font-medium">Productos creados:</span>
                    <span className="ml-2 text-green-800">{processedResults.productsCreated}</span>
                  </div>
                  <div>
                    <span className="text-green-700 font-medium">Variantes creadas:</span>
                    <span className="ml-2 text-green-800">{processedResults.variantsCreated}</span>
                  </div>
                </div>
              </div>

              {processedResults.errors.length > 0 && (
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <h3 className="font-bold text-red-800 mb-2">⚠️ Errores ({processedResults.errors.length})</h3>
                  <div className="max-h-32 overflow-y-auto">
                    {processedResults.errors.map((error, index) => (
                      <p key={index} className="text-red-700 text-sm mb-1">• {error}</p>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-center mt-8">
                <button
                  onClick={resetUpload}
                  className="bg-primary text-white px-8 py-3 rounded-lg hover:bg-red-700 transition font-medium"
                >
                  Realizar Nueva Carga
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MassiveUpload;