/**
 * @file constants/index.js
 * @description Constantes centralizadas para el sistema de carga masiva
 */

// --- CONFIGURACIÓN CLOUDINARY ---
export const CLOUDINARY_CONFIG = {
  CLOUD_NAME: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
  API_KEY: import.meta.env.VITE_CLOUDINARY_API_KEY,
  FOLDER: 'rossel/products',
  UPLOAD_ENDPOINT: (cloudName) => `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`
};

// --- COLORES ESTÁNDAR (32 colores completos) ---
export const STANDARD_COLORS = [
  'Amarillo', 'Azul', 'Beige', 'Blanco', 'Cafe', 'Camel', 'Celeste', 'Gris', 
  'Kaki', 'Marino', 'Morado', 'Naranja', 'Negro', 'Rojo', 'Rosa', 'Tinto', 'Verde', 'Vino',
  // Colores adicionales para completar los 32
  'Aqua', 'Coral', 'Dorado', 'Fucsia', 'Lavanda', 'Lima', 'Magenta', 'Menta',
  'Oliva', 'Plateado', 'Salmon', 'Turquesa', 'Violeta', 'Crema', 'Bronce', 'Perla'
].sort();

// --- CONFIGURACIÓN EXCEL ---
export const EXCEL_CONFIG = {
  HEADERS: [
    'SKU', 'Nombre', 'Descripción', 'Categoría', 'Color', 
    'Stock', 'Precio', 'Precio_Menudeo', 'Precio_Mayoreo', 'Imagenes'
  ],
  
  TEMPLATE_FILENAME: 'rossel_productos_template.xlsx',
  
  COLUMN_WIDTHS: [
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
  ],
  
  TEMPLATE_DATA: [
    ['849', 'Bolsa Luna', 'Bolsa elegante de cuero sintético', 'Bolsa', 'Rojo', '10', '450', '650', '550', '849_rojo_1.webp,849_rojo_2.webp'],
    ['', '', '', '', 'Negro', '15', '450', '650', '550', '849_negro_1.webp,849_negro_2.webp'],
    ['', '', '', '', 'Azul', '8', '450', '650', '550', '849_azul_1.webp'],
    ['850', 'Mochila Star', 'Mochila escolar resistente', 'Mochila', 'Verde', '20', '380', '580', '480', '850_verde_1.webp,850_verde_2.webp'],
    ['', '', '', '', 'Negro', '12', '380', '580', '480', '850_negro_1.webp']
  ]
};

// --- CONFIGURACIÓN DE PROCESAMIENTO ---
export const PROCESSING_CONFIG = {
  // Tamaño de lote para subida de imágenes
  IMAGE_BATCH_SIZE: 5,
  
  // Extensiones de imagen permitidas
  ALLOWED_IMAGE_EXTENSIONS: ['.webp'],
  
  // Tamaño máximo de archivo ZIP (50MB)
  MAX_ZIP_SIZE: 50 * 1024 * 1024,
  
  // Tamaño máximo de archivo Excel (10MB)
  MAX_EXCEL_SIZE: 10 * 1024 * 1024,
  
  // Tiempo máximo de espera para validación SKU (30 segundos)
  SKU_VALIDATION_TIMEOUT: 30000
};

// --- MENSAJES DEL SISTEMA ---
export const SYSTEM_MESSAGES = {
  SUCCESS: {
    TEMPLATE_DOWNLOADED: 'Template Excel descargado exitosamente',
    EXCEL_PROCESSED: (count) => `Excel procesado: ${count} productos encontrados`,
    ZIP_PROCESSED: (count) => `ZIP procesado: ${count} imágenes encontradas`,
    SKU_VALIDATION_PASSED: '✅ Validación SKU completada - No hay conflictos',
    UPLOAD_COMPLETED: (created, variants) => 
      `¡Carga masiva completada! ${created} productos creados, ${variants} variantes procesadas`
  },
  
  ERROR: {
    TEMPLATE_GENERATION: 'Error al generar el template Excel',
    EXCEL_PROCESSING: 'Error al procesar el archivo Excel',
    ZIP_PROCESSING: 'Error al procesar el archivo ZIP',
    SKU_CONFLICTS: (count) => `❌ Se encontraron ${count} conflictos de SKU`,
    UPLOAD_FAILED: 'Error crítico en el procesamiento',
    VALIDATION_FAILED: 'Corrija los errores antes de continuar'
  },
  
  WARNING: {
    UNUSED_IMAGES: (count) => `${count} imágenes no utilizadas encontradas`,
    LARGE_FILE: 'El archivo es muy grande, puede tardar en procesarse'
  }
};

// --- CONFIGURACIÓN UI ---
export const UI_CONFIG = {
  STEPS: [
    { id: 1, title: 'Instrucciones', description: 'Conoce el proceso' },
    { id: 2, title: 'Subir Archivos', description: 'Excel y ZIP' },
    { id: 3, title: 'Revisar Datos', description: 'Verificar información' },
    { id: 4, title: 'Procesar', description: 'Carga masiva' }
  ],
  
  PROGRESS: {
    IMAGES_WEIGHT: 50, // 50% del progreso para imágenes
    DATABASE_WEIGHT: 50 // 50% del progreso para base de datos
  }
};

// --- VALIDACIONES ---
export const VALIDATION_RULES = {
  SKU: {
    REQUIRED: true,
    MIN_LENGTH: 1,
    MAX_LENGTH: 50,
    PATTERN: /^[a-zA-Z0-9_-]+$/ // Solo alfanuméricos, guiones y guiones bajos
  },
  
  PRODUCT_NAME: {
    REQUIRED: true,
    MIN_LENGTH: 3,
    MAX_LENGTH: 200
  },
  
  CATEGORY: {
    REQUIRED: true,
    MIN_LENGTH: 2,
    MAX_LENGTH: 100
  },
  
  COLOR: {
    REQUIRED: true,
    ALLOWED_VALUES: STANDARD_COLORS
  },
  
  STOCK: {
    MIN_VALUE: 0,
    MAX_VALUE: 999999
  },
  
  PRICE: {
    MIN_VALUE: 0.01,
    MAX_VALUE: 999999.99
  },
  
  IMAGE_NAMING: {
    // Patrón: SKU_color_numero.webp
    PATTERN: /^[a-zA-Z0-9_-]+_[a-z]+_\d+\.webp$/i,
    EXTENSION: '.webp'
  }
};

// --- CONFIGURACIÓN BASE DE DATOS ---
export const DATABASE_CONFIG = {
  TABLES: {
    PRODUCTS: 'products',
    PRODUCT_VARIANTS: 'product_variants'
  },
  
  BATCH_SIZE: 50, // Tamaño de lote para inserciones masivas
  
  TIMEOUT: 30000 // 30 segundos timeout para operaciones
};