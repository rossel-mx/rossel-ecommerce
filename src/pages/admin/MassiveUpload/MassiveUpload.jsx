/**
 * @file MassiveUpload.jsx - VERSIÓN REFACTORIZADA
 * @description Componente principal para carga masiva de productos e imágenes
 * 
 * MEJORAS EN ESTA VERSIÓN:
 * - ✅ Código separado en módulos especializados
 * - ✅ Custom hook para validación SKU
 * - ✅ Modal simplificado (solo informa conflictos)
 * - ✅ Utilidades separadas para Excel y procesamiento
 * - ✅ Mejor organización y mantenibilidad
 * - ✅ Misma funcionalidad, mejor arquitectura
 * 
 * @requires react
 * @requires ./hooks/useSKUValidation
 * @requires ./utils/excelProcessor
 * @requires ./utils/uploadProcessor
 * @requires ./components/SimpleConflictModal
 */

import { useState, useRef } from 'react';
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

// Hooks y utilidades personalizadas
import { useSKUValidation } from './Hooks/useSKUValidation';
import { 
  generateExcelTemplate, 
  parseExcelFile, 
  EXCEL_HEADERS, 
  TEMPLATE_DATA 
} from './utils/excelProcessor';
import { 
  processZipFile, 
  processMassiveUpload 
} from './utils/uploadProcessor';
import SimpleConflictModal from './components/SimpleConflictModal';

const MassiveUpload = ({ onUploadSuccess }) => {
  // --- ESTADOS PRINCIPALES ---
  const [step, setStep] = useState(1); // 1: Instrucciones, 2: Upload, 3: Preview, 4: Processing
  const [excelFile, setExcelFile] = useState(null);
  const [zipFile, setZipFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [imageFiles, setImageFiles] = useState({});
  const [validationErrors, setValidationErrors] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedResults, setProcessedResults] = useState(null);
  const [showConflictModal, setShowConflictModal] = useState(false);

  // Custom hook para validación SKU
  const { isValidating, conflicts, validateSKUs, resetValidation, hasConflicts } = useSKUValidation();

  // Referencias para inputs de archivos
  const excelInputRef = useRef(null);
  const zipInputRef = useRef(null);

  // --- MANEJADORES DE ARCHIVOS ---
  const handleExcelUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log('LOG: [MassiveUpload] Procesando archivo Excel:', file.name);
    setExcelFile(file);
    
    try {
      const { products, errors } = await parseExcelFile(file);
      
      setValidationErrors(errors);
      
      if (errors.length === 0 && products.length > 0) {
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
      console.error('ERROR: [MassiveUpload] Error procesando Excel:', error);
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
      const extractedImages = await processZipFile(file);
      setImageFiles(extractedImages);
      
      const imageCount = Object.keys(extractedImages).length;
      toast.success(`ZIP procesado: ${imageCount} imágenes encontradas`);
      
    } catch (error) {
      console.error('ERROR: [MassiveUpload] Error procesando ZIP:', error);
      toast.error('Error al procesar el archivo ZIP');
    }
  };

  // --- FUNCIONES DE NAVEGACIÓN ---
  const handleGenerateTemplate = () => {
    try {
      generateExcelTemplate();
      toast.success('Template Excel descargado exitosamente');
    } catch (error) {
      toast.error('Error al generar el template Excel');
    }
  };

  const prepareForPreview = async () => {
    if (!parsedData || validationErrors.length > 0) {
      toast.error('Corrija los errores de Excel antes de continuar');
      return;
    }
    
    // Realizar validación SKU
    const skuValidationPassed = await validateSKUs(parsedData);
    
    if (skuValidationPassed) {
      setStep(3); // Ir a preview
    } else {
      setShowConflictModal(true); // Mostrar modal de conflictos
    }
  };

  const processUpload = async () => {
    if (!parsedData || !imageFiles || validationErrors.length > 0) {
      toast.error('Corrija los errores antes de continuar');
      return;
    }
    
    setIsProcessing(true);
    setStep(4);
    setUploadProgress(0);
    
    try {
      const results = await processMassiveUpload(parsedData, imageFiles, setUploadProgress);
      
      setProcessedResults(results);
      
      if (results.errors.length === 0) {
        toast.success(`¡Carga masiva completada! ${results.productsCreated} productos creados, ${results.variantsCreated} variantes procesadas`);
      } else {
        toast.error(`Carga completada con ${results.errors.length} errores`);
      }
      
      // Notificar al componente padre
      onUploadSuccess?.();
      
    } catch (error) {
      console.error('ERROR: [MassiveUpload] Error crítico:', error);
      toast.error(`Error crítico: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

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
    setShowConflictModal(false);
    
    // Reset validación SKU
    resetValidation();
    
    // Limpiar inputs
    if (excelInputRef.current) excelInputRef.current.value = '';
    if (zipInputRef.current) zipInputRef.current.value = '';
  };

  // --- UTILIDADES ---
  const canProceedToPreview = () => {
    return excelFile && zipFile && parsedData && validationErrors.length === 0;
  };

  // --- RENDERIZADO ---
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">📦 Carga Masiva de Productos</h1>
        <p className="text-gray-600">
          Sistema inteligente para cargar múltiples productos con sus variantes e imágenes
        </p>
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
              ) : step === num && (isProcessing || isValidating) ? (
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
                  onClick={handleGenerateTemplate}
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

          {/* Protección SKU */}
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
                <h4 className="font-medium text-green-800 mb-2">⚡ Sistema Simplificado:</h4>
                <ul className="text-green-700 space-y-1">
                  <li>• Te informa qué SKUs están ocupados</li>
                  <li>• Te pide corregir tu Excel</li>
                  <li>• Sin opciones complicadas</li>
                  <li>• Proceso más claro y directo</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Ejemplo Excel */}
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

          {/* Estado de validación SKU */}
          {isValidating && (
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
              disabled={!canProceedToPreview() || isValidating}
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-red-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isValidating ? (
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

          {/* Indicador de validación SKU completada */}
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
              disabled={validationErrors.length > 0}
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

      {/* Modal de Conflictos Simplificado */}
      <SimpleConflictModal
        isOpen={showConflictModal}
        onClose={() => setShowConflictModal(false)}
        conflicts={conflicts}
      />
    </div>
  );
};

export default MassiveUpload;