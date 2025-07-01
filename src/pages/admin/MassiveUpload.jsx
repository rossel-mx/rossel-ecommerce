/**
 * @file MassiveUpload.jsx - CON PROTECCIÓN SKU AVANZADA
 * @description Componente para carga masiva de productos e imágenes mediante Excel + ZIP.
 * 
 * FLUJO COMPLETO:
 * 1. Usuario descarga template Excel
 * 2. Usuario llena Excel con productos/variantes (Excel inteligente)
 * 3. Usuario procesa imágenes con Python (renombrado automático)
 * 4. Usuario sube Excel + ZIP con imágenes procesadas
 * 5. 🔥 NUEVA: Pre-validación completa de SKUs (duplicados internos + BD)
 * 6. 🔥 NUEVA: Modal de resolución de conflictos si hay duplicados
 * 7. Sistema hace match automático y sube todo sin transformaciones
 * 
 * CARACTERÍSTICAS:
 * - ✅ Template Excel inteligente con cache de datos
 * - ✅ Validación completa de datos y nomenclatura
 * - 🔥 NUEVA: Protección total contra SKU duplicados
 * - 🔥 NUEVA: Modal elegante de resolución de conflictos
 * - 🔥 NUEVA: Opciones inteligentes de resolución automática
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
  FiInfo,
  FiAlertTriangle,
  FiX,
  FiEdit3,
  FiTrash2,
  FiRefreshCw,
  FiSkipForward
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
  ['849', 'Bolsa Luna', 'Bolsa elegante de cuero sintético', 'Bolsa', 'Rojo', '10', '450', '650', '550', '849_rojo_1.webp,849_rojo_2.webp'],
  ['', '', '', '', 'Negro', '15', '450', '650', '550', '849_negro_1.webp,849_negro_2.webp'],
  ['', '', '', '', 'Azul', '8', '450', '650', '550', '849_azul_1.webp'],
  ['850', 'Mochila Star', 'Mochila escolar resistente', 'Mochila', 'Verde', '20', '380', '580', '480', '850_verde_1.webp,850_verde_2.webp'],
  ['', '', '', '', 'Negro', '12', '380', '580', '480', '850_negro_1.webp']
];

// 🔥 NUEVAS: Funciones utilitarias para validación SKU
const validateSKUList = async (skuList) => {
  console.log(`LOG: [MassiveUpload] Validando ${skuList.length} SKUs contra la base de datos...`);
  
  try {
    const { data, error } = await supabase
      .from('products')
      .select('sku, name, id')
      .in('sku', skuList);
    
    if (error) throw error;
    
    console.log(`LOG: [MassiveUpload] Encontrados ${data.length} SKUs existentes en BD`);
    return data || [];
    
  } catch (error) {
    console.error('ERROR: [MassiveUpload] Error al validar SKUs:', error);
    throw new Error(`Error al validar SKUs: ${error.message}`);
  }
};

const detectDuplicateSKUs = (products) => {
  console.log('LOG: [MassiveUpload] Detectando SKUs duplicados internamente...');
  
  const skuCount = {};
  const duplicates = [];
  
  products.forEach((product, index) => {
    const sku = product.sku;
    if (skuCount[sku]) {
      duplicates.push({
        sku,
        rows: [skuCount[sku].index, index],
        names: [skuCount[sku].name, product.name]
      });
    } else {
      skuCount[sku] = { index, name: product.name };
    }
  });
  
  console.log(`LOG: [MassiveUpload] Encontrados ${duplicates.length} SKUs duplicados internamente`);
  return duplicates;
};
// 🔥 NUEVO: Modal de Resolución de Conflictos
const ConflictResolutionModal = ({ 
  isOpen, 
  onClose, 
  conflicts, 
  onResolve,
  isResolving 
}) => {
  const [resolutions, setResolutions] = useState({});
  const [newSKUs, setNewSKUs] = useState({});

  if (!isOpen) return null;

  const handleResolutionChange = (conflictId, resolution) => {
    setResolutions(prev => ({
      ...prev,
      [conflictId]: resolution
    }));
  };

  const handleSKUChange = (conflictId, newSKU) => {
    setNewSKUs(prev => ({
      ...prev,
      [conflictId]: newSKU
    }));
  };

  const canResolve = () => {
    return conflicts.dbConflicts.every(conflict => 
      resolutions[conflict.sku] && 
      (resolutions[conflict.sku] !== 'edit' || newSKUs[conflict.sku]?.trim())
    );
  };

  const handleResolve = () => {
    if (!canResolve()) {
      toast.error('Por favor resuelve todos los conflictos antes de continuar');
      return;
    }
    
    onResolve({ resolutions, newSKUs });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-xl">
                <FiAlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Conflictos de SKU Detectados</h2>
                <p className="text-red-100">Se encontraron problemas que requieren tu atención</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isResolving}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          
          {/* Duplicados internos */}
          {conflicts.internalDuplicates.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FiFileText className="w-5 h-5 text-orange-500" />
                Duplicados dentro del archivo ({conflicts.internalDuplicates.length})
              </h3>
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
                <p className="text-orange-800 text-sm mb-3">
                  <strong>⚠️ Problema:</strong> Los siguientes SKUs aparecen múltiples veces en tu archivo Excel.
                </p>
                <p className="text-orange-700 text-sm">
                  <strong>💡 Solución:</strong> Edita tu archivo Excel y elimina las filas duplicadas, luego vuelve a subirlo.
                </p>
              </div>
              
              <div className="space-y-3">
                {conflicts.internalDuplicates.map((dup, index) => (
                  <div key={index} className="bg-white border border-orange-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-800">SKU: {dup.sku}</h4>
                        <p className="text-sm text-gray-600">
                          Aparece en filas: {dup.rows.map(r => r + 2).join(', ')}
                        </p>
                        <p className="text-sm text-gray-600">
                          Nombres: {dup.names.join(' / ')}
                        </p>
                      </div>
                      <div className="text-orange-600">
                        <FiAlertCircle className="w-6 h-6" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conflictos con BD */}
          {conflicts.dbConflicts.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FiAlertTriangle className="w-5 h-5 text-red-500" />
                SKUs ya existentes en la base de datos ({conflicts.dbConflicts.length})
              </h3>
              
              <div className="space-y-4">
                {conflicts.dbConflicts.map((conflict, index) => (
                  <div key={conflict.sku} className="bg-white border border-red-200 rounded-xl p-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      
                      {/* Información del conflicto */}
                      <div>
                        <h4 className="font-bold text-lg text-gray-800 mb-3">SKU: {conflict.sku}</h4>
                        <div className="space-y-2 text-sm">
                          <div className="bg-red-50 p-3 rounded-lg">
                            <p className="font-medium text-red-800">📂 En la base de datos:</p>
                            <p className="text-red-700">"{conflict.existingName}"</p>
                          </div>
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <p className="font-medium text-blue-800">📄 En tu archivo:</p>
                            <p className="text-blue-700">"{conflict.fileName}" (fila {conflict.fileRow + 2})</p>
                          </div>
                        </div>
                      </div>

                      {/* Opciones de resolución */}
                      <div>
                        <h5 className="font-semibold text-gray-700 mb-3">¿Cómo resolver?</h5>
                        <div className="space-y-3">
                          
                          <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input
                              type="radio"
                              name={`resolution-${conflict.sku}`}
                              value="skip"
                              onChange={() => handleResolutionChange(conflict.sku, 'skip')}
                              className="mt-1"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <FiSkipForward className="w-4 h-4 text-gray-500" />
                                <span className="font-medium text-gray-800">Omitir</span>
                              </div>
                              <p className="text-sm text-gray-600">No subir este producto del archivo</p>
                            </div>
                          </label>

                          <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input
                              type="radio"
                              name={`resolution-${conflict.sku}`}
                              value="replace"
                              onChange={() => handleResolutionChange(conflict.sku, 'replace')}
                              className="mt-1"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <FiRefreshCw className="w-4 h-4 text-orange-500" />
                                <span className="font-medium text-gray-800">Reemplazar</span>
                              </div>
                              <p className="text-sm text-gray-600">Actualizar el producto existente con los nuevos datos</p>
                            </div>
                          </label>

                          <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input
                              type="radio"
                              name={`resolution-${conflict.sku}`}
                              value="edit"
                              onChange={() => handleResolutionChange(conflict.sku, 'edit')}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <FiEdit3 className="w-4 h-4 text-blue-500" />
                                <span className="font-medium text-gray-800">Cambiar SKU</span>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">Asignar un nuevo SKU a este producto</p>
                              {resolutions[conflict.sku] === 'edit' && (
                                <input
                                  type="text"
                                  placeholder={`Nuevo SKU (ej: ${conflict.sku}-2)`}
                                  value={newSKUs[conflict.sku] || ''}
                                  onChange={(e) => handleSKUChange(conflict.sku, e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              )}
                            </div>
                          </label>

                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {conflicts.internalDuplicates.length > 0 
                ? "⚠️ Primero debes corregir tu archivo Excel para continuar"
                : canResolve() 
                  ? "✅ Todos los conflictos han sido resueltos"
                  : "🔧 Selecciona una opción para cada conflicto"
              }
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isResolving}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              
              <button
                onClick={handleResolve}
                disabled={conflicts.internalDuplicates.length > 0 || !canResolve() || isResolving}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isResolving ? (
                  <>
                    <FiLoader className="w-4 h-4 animate-spin" />
                    Aplicando...
                  </>
                ) : (
                  <>
                    <FiCheckCircle className="w-4 h-4" />
                    Continuar con Resoluciones
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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

  // 🔥 NUEVOS ESTADOS: Para validación y conflictos SKU
  const [isValidatingSKU, setIsValidatingSKU] = useState(false);
  const [skuConflicts, setSkuConflicts] = useState({ internalDuplicates: [], dbConflicts: [] });
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [isResolvingConflicts, setIsResolvingConflicts] = useState(false);

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

  // --- 5. 🔥 NUEVA: VALIDACIÓN COMPLETA SKU ---
  const performSKUValidation = async (products) => {
    console.log('LOG: [MassiveUpload] Iniciando validación completa de SKUs...');
    setIsValidatingSKU(true);
    
    try {
      // 1. Detectar duplicados internos
      const internalDuplicates = detectDuplicateSKUs(products);
      
      // 2. Validar contra base de datos
      const skuList = products.map(p => p.sku);
      const existingProducts = await validateSKUList(skuList);
      
      // 3. Crear lista de conflictos con BD
      const dbConflicts = existingProducts.map(existing => {
        const fileProduct = products.find(p => p.sku === existing.sku);
        const fileIndex = products.indexOf(fileProduct);
        return {
          sku: existing.sku,
          existingName: existing.name,
          existingId: existing.id,
          fileName: fileProduct.name,
          fileRow: fileIndex
        };
      });
      
      const conflicts = { internalDuplicates, dbConflicts };
      setSkuConflicts(conflicts);
      
      console.log('LOG: [MassiveUpload] Validación SKU completada:', {
        internalDuplicates: internalDuplicates.length,
        dbConflicts: dbConflicts.length
      });
      
      // 4. Mostrar modal si hay conflictos
      if (internalDuplicates.length > 0 || dbConflicts.length > 0) {
        setShowConflictModal(true);
        toast.error(`Se encontraron ${internalDuplicates.length + dbConflicts.length} conflictos de SKU`);
        return false; // No continuar
      } else {
        toast.success('✅ Validación SKU completada - No hay conflictos');
        return true; // Puede continuar
      }
      
    } catch (error) {
      
	  console.error('ERROR: [MassiveUpload] Error en validación SKU:', error);
      toast.error(`Error al validar SKUs: ${error.message}`);
      return false;
    } finally {
      setIsValidatingSKU(false);
    }
  };

  // --- 6. 🔥 NUEVA: RESOLVER CONFLICTOS ---
  const handleConflictResolution = async ({ resolutions, newSKUs }) => {
    console.log('LOG: [MassiveUpload] Aplicando resoluciones de conflictos...', { resolutions, newSKUs });
    setIsResolvingConflicts(true);
    
    try {
      // Aplicar resoluciones al parsedData
      const updatedProducts = parsedData.filter(product => {
        const resolution = resolutions[product.sku];
        
        if (resolution === 'skip') {
          console.log(`LOG: [MassiveUpload] Omitiendo producto: ${product.sku}`);
          return false; // Eliminar del procesamiento
        }
        
        if (resolution === 'edit') {
          const newSKU = newSKUs[product.sku];
          if (newSKU && newSKU.trim()) {
            console.log(`LOG: [MassiveUpload] Cambiando SKU: ${product.sku} → ${newSKU}`);
            product.sku = newSKU.trim();
            // También actualizar las referencias de imágenes
            product.variants.forEach(variant => {
              variant.imageNames = variant.imageNames.map(imageName => {
                const parts = imageName.split('_');
                if (parts.length >= 3) {
                  parts[0] = newSKU.trim();
                  return parts.join('_');
                }
                return imageName;
              });
            });
          }
        }
        
        // Para 'replace' mantenemos el producto tal como está
        return true; // Mantener en el procesamiento
      });
      
      // Actualizar parsedData
      setParsedData(updatedProducts);
      
      // Re-validar para asegurar que no hay nuevos conflictos
      const canContinue = await performSKUValidation(updatedProducts);
      
      if (canContinue) {
        setShowConflictModal(false);
        toast.success('✅ Conflictos resueltos exitosamente');
      }
      
    } catch (error) {
      console.error('ERROR: [MassiveUpload] Error al resolver conflictos:', error);
      toast.error(`Error al resolver conflictos: ${error.message}`);
    } finally {
      setIsResolvingConflicts(false);
    }
  };

  // --- 7. MANEJADORES DE ARCHIVOS ---
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
      
      setValidationErrors(errors);
      
      if (errors.length === 0 && products.length > 0) {
        // 🔥 NUEVA: Realizar validación SKU automáticamente
        setParsedData(products);
        toast.success(`Excel procesado: ${products.length} productos encontrados`);
      } else if (errors.length > 0) {
        setParsedData(null);
        toast.error(`Excel procesado con ${errors.length} errores - revisar detalles`);
      } else {
        setParsedData(null);
        toast.error('No se encontraron productos válidos en el Excel');
      }
      
    } catch (error) {
      console.error('ERROR: [MassiveUpload] Error al procesar Excel:', error);
      toast.error('Error al procesar el archivo Excel');
      setValidationErrors([`Error al leer archivo: ${error.message}`]);
      setParsedData(null);
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

  // --- 8. VALIDADOR CRUZADO ---
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

  // --- 9. 🔥 ACTUALIZADO: PREPARAR PARA PREVIEW CON VALIDACIÓN SKU ---
  const prepareForPreview = async () => {
    if (!parsedData || validationErrors.length > 0) {
      toast.error('Corrija los errores de Excel antes de continuar');
      return;
    }
    
    // Realizar validación SKU antes de continuar al preview
    const skuValidationPassed = await performSKUValidation(parsedData);
    
    if (skuValidationPassed) {
      setStep(3); // Ir a preview solo si no hay conflictos SKU
    }
    // Si hay conflictos, el modal se muestra automáticamente
  };

  // --- 10. FUNCIONES DE NAVEGACIÓN ---
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
    
    // 🔥 NUEVOS: Resetear estados SKU
    setIsValidatingSKU(false);
    setSkuConflicts({ internalDuplicates: [], dbConflicts: [] });
    setShowConflictModal(false);
    setIsResolvingConflicts(false);
    
    // Limpiar inputs
    if (excelInputRef.current) excelInputRef.current.value = '';
    if (zipInputRef.current) zipInputRef.current.value = '';
  };

  const canProceedToPreview = () => {
    return excelFile && zipFile && parsedData && validationErrors.length === 0;
  };
  // --- 11. PROCESADOR PRINCIPAL ---
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
        productsUpdated: 0,
        errors: []
      };
      
      for (const [index, product] of parsedData.entries()) {
        try {
          // 🔥 NUEVA: Verificar si necesitamos reemplazar producto existente
          const shouldReplace = skuConflicts.dbConflicts.some(conflict => 
            conflict.sku === product.sku
          );
          
          if (shouldReplace) {
            // Actualizar producto existente
            console.log(`LOG: [MassiveUpload] Actualizando producto existente: ${product.sku}`);
            
            // Obtener ID del producto existente
            const { data: existingProduct, error: findError } = await supabase
              .from('products')
              .select('id')
              .eq('sku', product.sku)
              .single();
            
            if (findError) throw findError;
            
            // Actualizar datos base del producto
            const { error: updateError } = await supabase
              .from('products')
              .update({
                name: product.name,
                description: product.description,
                category: product.category
              })
              .eq('id', existingProduct.id);
            
            if (updateError) throw updateError;
            
            // Eliminar variantes existentes
            const { error: deleteVariantsError } = await supabase
              .from('product_variants')
              .delete()
              .eq('product_id', existingProduct.id);
            
            if (deleteVariantsError) throw deleteVariantsError;
            
            // Insertar nuevas variantes
            const variantInserts = product.variants.map(variant => ({
              product_id: existingProduct.id,
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
            
            results.productsUpdated++;
            results.variantsCreated += variantInserts.length;
            console.log(`LOG: [MassiveUpload] Producto ${product.sku} actualizado con ${variantInserts.length} variantes`);
            
          } else {
            // Crear nuevo producto
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
          }
          
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
        toast.success(`¡Carga masiva completada! ${results.productsCreated} productos creados, ${results.productsUpdated} actualizados, ${results.variantsCreated} variantes procesadas`);
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
  // --- 12. RENDERIZADO ---
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">📦 Carga Masiva de Productos</h1>
        <p className="text-gray-600">
          Sistema inteligente para cargar múltiples productos con sus variantes e imágenes
        </p>
        {/* 🔥 NUEVO: Indicador de protección SKU */}
        <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full text-green-800 text-sm font-medium">
          <FiCheckCircle className="w-4 h-4" />
          🛡️ Protección SKU activada - Detección automática de duplicados
        </div>
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
              ) : step === num && (isProcessing || isValidatingSKU) ? (
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

          {/* 🔥 NUEVA: Sección de protección SKU */}
          <div className="mt-8 bg-green-50 p-6 rounded-lg border border-green-200">
            <h3 className="font-bold text-green-800 mb-4 flex items-center gap-2">
              🛡️ Protección Automática contra SKU Duplicados
            </h3>
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div>
                <h4 className="font-medium text-green-800 mb-2">🔍 Detección Automática:</h4>
                <ul className="text-green-700 space-y-1">
                  <li>• Duplicados dentro de tu archivo Excel</li>
                  <li>• SKUs ya existentes en la base de datos</li>
                  <li>• Validación en tiempo real antes de procesar</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-green-800 mb-2">⚡ Resolución Inteligente:</h4>
                <ul className="text-green-700 space-y-1">
                  <li>• Omitir productos duplicados</li>
                  <li>• Reemplazar productos existentes</li>
                  <li>• Cambiar SKU automáticamente</li>
                  <li>• Modal elegante para decidir</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Ejemplo visual - Tabla del template */}
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
                    {parsedData && (
                      <p className="text-green-600 text-xs">
                        {parsedData.length} productos encontrados
                      </p>
                    )}
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

          {/* 🔥 NUEVO: Estado de validación SKU */}
          {isValidatingSKU && (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <FiLoader className="w-5 h-5 text-blue-600 animate-spin" />
                <div>
                  <h3 className="font-medium text-blue-800">🔍 Validando SKUs...</h3>
                  <p className="text-blue-600 text-sm">
                    Verificando duplicados internos y contra la base de datos
                  </p>
                </div>
              </div>
            </div>
          )}

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
              onClick={prepareForPreview}
              disabled={!canProceedToPreview() || isValidatingSKU}
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-red-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isValidatingSKU ? (
                <>
                  <FiLoader className="w-4 h-4 animate-spin" />
                  Validando SKUs...
                </>
              ) : (
                <>
                  🛡️ Validar y Revisar Datos →
                </>
              )}
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

          {/* 🔥 NUEVO: Indicador de validación SKU completada */}
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <FiCheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <h3 className="font-medium text-green-800">✅ Validación SKU Completada</h3>
                <p className="text-green-600 text-sm">
                  No se encontraron conflictos de SKU. Todos los productos están listos para procesar.
                </p>
              </div>
            </div>
          </div>

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
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-green-700 font-medium">Productos creados:</span>
                    <span className="ml-2 text-green-800">{processedResults.productsCreated}</span>
                  </div>
                  <div>
                    <span className="text-green-700 font-medium">Productos actualizados:</span>
                    <span className="ml-2 text-green-800">{processedResults.productsUpdated}</span>
                  </div>
                  <div>
                    <span className="text-green-700 font-medium">Variantes procesadas:</span>
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

      {/* 🔥 NUEVO: Modal de Resolución de Conflictos */}
      <ConflictResolutionModal
        isOpen={showConflictModal}
        onClose={() => setShowConflictModal(false)}
        conflicts={skuConflicts}
        onResolve={handleConflictResolution}
        isResolving={isResolvingConflicts}
      />
    </div>
  );
};

export default MassiveUpload;