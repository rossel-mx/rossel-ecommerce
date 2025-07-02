/**
 * @file excelProcessor.js
 * @description Utilidades para procesamiento inteligente de archivos Excel
 */

import * as XLSX from 'xlsx';

export const STANDARD_COLORS = [
  'Amarillo', 'Azul', 'Beige', 'Blanco', 'Cafe', 'Camel', 'Celeste', 'Gris', 
  'Kaki', 'Marino', 'Morado', 'Naranja', 'Negro', 'Rojo', 'Rosa', 'Tinto', 'Verde', 'Vino'
].sort();

export const EXCEL_HEADERS = [
  'SKU', 'Nombre', 'Descripción', 'Categoría', 'Color', 
  'Stock', 'Precio', 'Precio_Menudeo', 'Precio_Mayoreo', 'Imagenes'
];

export const TEMPLATE_DATA = [
  ['849', 'Bolsa Luna', 'Bolsa elegante de cuero sintético', 'Bolsa', 'Rojo', '10', '450', '650', '550', '849_rojo_1.webp,849_rojo_2.webp'],
  ['', '', '', '', 'Negro', '15', '450', '650', '550', '849_negro_1.webp,849_negro_2.webp'],
  ['', '', '', '', 'Azul', '8', '450', '650', '550', '849_azul_1.webp'],
  ['850', 'Mochila Star', 'Mochila escolar resistente', 'Mochila', 'Verde', '20', '380', '580', '480', '850_verde_1.webp,850_verde_2.webp'],
  ['', '', '', '', 'Negro', '12', '380', '580', '480', '850_negro_1.webp']
];

/**
 * Genera y descarga el template Excel
 */
export const generateExcelTemplate = () => {
  console.log('LOG: [ExcelProcessor] Generando template Excel...');
  
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
    
    console.log('LOG: [ExcelProcessor] Template generado exitosamente');
    return true;
    
  } catch (error) {
    console.error('ERROR: [ExcelProcessor] Error generando template:', error);
    throw new Error(`Error al generar template: ${error.message}`);
  }
};

/**
 * Valida los datos de una variante
 */
const validateVariant = (row, rowNum, lastProductData) => {
  const errors = [];
  
  const color = row.Color?.toString().trim();
  const stock = parseInt(row.Stock) || 0;
  const precio = parseFloat(row.Precio) || 0;
  const precio_menudeo = parseFloat(row.Precio_Menudeo) || 0;
  const precio_mayoreo = parseFloat(row.Precio_Mayoreo) || 0;
  const imagenes = row.Imagenes?.toString().trim() || '';
  
  // Validaciones básicas
  if (!color) {
    errors.push(`Fila ${rowNum}: Color es requerido`);
    return { errors, variant: null };
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
  
  // Procesar imágenes
  const imageList = imagenes ? imagenes.split(',').map(img => img.trim()).filter(img => img) : [];
  
  // Validar nomenclatura de imágenes
  imageList.forEach(imageName => {
    const expectedPrefix = `${lastProductData.sku}_${color.toLowerCase()}_`;
    if (!imageName.toLowerCase().startsWith(expectedPrefix)) {
      errors.push(`Fila ${rowNum}: Imagen "${imageName}" no sigue nomenclatura "${expectedPrefix}X.webp"`);
    }
    if (!imageName.toLowerCase().endsWith('.webp')) {
      errors.push(`Fila ${rowNum}: Imagen "${imageName}" debe tener extensión .webp`);
    }
  });
  
  const variant = {
    color,
    stock,
    precio,
    precio_menudeo,
    precio_mayoreo,
    imageNames: imageList
  };
  
  return { errors, variant };
};

/**
 * Procesa el Excel con lógica inteligente para productos y variantes
 */
export const processIntelligentExcel = (data) => {
  console.log('LOG: [ExcelProcessor] Procesando Excel con lógica inteligente...');
  console.log('LOG: [ExcelProcessor] Filas recibidas:', data.length);
  
  const products = {};
  const errors = [];
  let lastProductData = {}; // Cache del último producto válido
  
  try {
    data.forEach((row, index) => {
      const rowNum = index + 2; // +2 porque Excel empieza en 1 y tenemos header
      
      console.log(`LOG: [ExcelProcessor] Procesando fila ${rowNum}:`, row);
      
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
          console.log(`LOG: [ExcelProcessor] Producto creado: ${lastProductData.sku} - ${lastProductData.name}`);
        }
      }
      
      // Validar que tenemos datos de producto (de cache o actual)
      if (!lastProductData.sku) {
        errors.push(`Fila ${rowNum}: No se puede determinar el SKU del producto`);
        return;
      }
      
      // Procesar variante
      const { errors: variantErrors, variant } = validateVariant(row, rowNum, lastProductData);
      errors.push(...variantErrors);
      
      if (!variant) return; // Si no se pudo crear la variante, continuar
      
      // Verificar que no hay variante duplicada del mismo color
      const existingVariant = products[lastProductData.sku].variants.find(v => v.color === variant.color);
      if (existingVariant) {
        errors.push(`Fila ${rowNum}: Ya existe variante de color "${variant.color}" para producto ${lastProductData.sku}`);
        return;
      }
      
      // Agregar variante
      products[lastProductData.sku].variants.push(variant);
      console.log(`LOG: [ExcelProcessor] Variante agregada: ${lastProductData.sku} - ${variant.color}`);
    });
    
    const productList = Object.values(products);
    console.log(`LOG: [ExcelProcessor] Procesamiento completado: ${productList.length} productos, ${errors.length} errores`);
    
    return { products: productList, errors };
    
  } catch (error) {
    console.error('ERROR: [ExcelProcessor] Error crítico:', error);
    return { 
      products: [], 
      errors: [`Error crítico al procesar Excel: ${error.message}`] 
    };
  }
};

/**
 * Procesa archivo Excel y retorna datos parseados
 */
export const parseExcelFile = async (file) => {
  console.log('LOG: [ExcelProcessor] Parseando archivo Excel:', file.name);
  
  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    console.log('LOG: [ExcelProcessor] Excel parseado:', jsonData.length, 'filas');
    
    return processIntelligentExcel(jsonData);
    
  } catch (error) {
    console.error('ERROR: [ExcelProcessor] Error parseando Excel:', error);
    throw new Error(`Error al procesar Excel: ${error.message}`);
  }
};