/**
 * @file zipProcessor.js
 * @description Utilidades específicas para manejo de archivos ZIP
 */

import JSZip from 'jszip';

/**
 * Extrae y procesa imágenes de un archivo ZIP
 * @param {File} zipFile - Archivo ZIP a procesar
 * @returns {Promise<Object>} Objeto con las imágenes extraídas
 */
export const extractImagesFromZip = async (zipFile) => {
  console.log('LOG: [ZipProcessor] Procesando archivo ZIP:', zipFile.name);
  
  try {
    const zip = new JSZip();
    const contents = await zip.loadAsync(zipFile);
    const imageFiles = {};
    
    console.log('LOG: [ZipProcessor] Extrayendo archivos del ZIP...');
    
    // Estadísticas para log
    let totalFiles = 0;
    let imageCount = 0;
    let skippedFiles = 0;
    
    for (const [filename, zipEntry] of Object.entries(contents.files)) {
      totalFiles++;
      
      // Solo procesar archivos (no directorios)
      if (zipEntry.dir) {
        continue;
      }
      
      // Solo procesar archivos .webp
      if (!filename.toLowerCase().endsWith('.webp')) {
        skippedFiles++;
        console.log(`LOG: [ZipProcessor] Archivo omitido (no .webp): ${filename}`);
        continue;
      }
      
      try {
        const imageData = await zipEntry.async('blob');
        const cleanFilename = filename.split('/').pop(); // Remover carpetas si las hay
        
        // Validar que el blob tenga contenido
        if (imageData.size === 0) {
          console.warn(`WARN: [ZipProcessor] Archivo vacío: ${cleanFilename}`);
          continue;
        }
        
        imageFiles[cleanFilename] = imageData;
        imageCount++;
        
        console.log(`LOG: [ZipProcessor] Imagen extraída: ${cleanFilename} (${(imageData.size / 1024).toFixed(1)}KB)`);
        
      } catch (error) {
        console.error(`ERROR: [ZipProcessor] Error extrayendo ${filename}:`, error);
        skippedFiles++;
      }
    }
    
    console.log(`LOG: [ZipProcessor] Procesamiento completado:`, {
      totalFiles,
      imageCount,
      skippedFiles,
      finalImages: Object.keys(imageFiles).length
    });
    
    return imageFiles;
    
  } catch (error) {
    console.error('ERROR: [ZipProcessor] Error procesando ZIP:', error);
    throw new Error(`Error al procesar ZIP: ${error.message}`);
  }
};

/**
 * Valida la estructura de un archivo ZIP antes de procesarlo
 * @param {File} zipFile - Archivo ZIP a validar
 * @returns {Promise<Object>} Resultado de la validación
 */
export const validateZipStructure = async (zipFile) => {
  console.log('LOG: [ZipProcessor] Validando estructura del ZIP...');
  
  try {
    const zip = new JSZip();
    const contents = await zip.loadAsync(zipFile);
    
    const validation = {
      isValid: true,
      warnings: [],
      errors: [],
      stats: {
        totalFiles: 0,
        webpFiles: 0,
        otherFiles: 0,
        directories: 0,
        filesInSubdirs: 0
      }
    };
    
    for (const [filename, zipEntry] of Object.entries(contents.files)) {
      validation.stats.totalFiles++;
      
      if (zipEntry.dir) {
        validation.stats.directories++;
        continue;
      }
      
      // Verificar si está en subdirectorio
      if (filename.includes('/')) {
        validation.stats.filesInSubdirs++;
        validation.warnings.push(`Archivo en subdirectorio: ${filename} (se moverá a la raíz)`);
      }
      
      // Verificar extensión
      if (filename.toLowerCase().endsWith('.webp')) {
        validation.stats.webpFiles++;
      } else {
        validation.stats.otherFiles++;
        validation.warnings.push(`Archivo no .webp será omitido: ${filename}`);
      }
    }
    
    // Validaciones críticas
    if (validation.stats.webpFiles === 0) {
      validation.isValid = false;
      validation.errors.push('No se encontraron archivos .webp en el ZIP');
    }
    
    if (validation.stats.totalFiles === 0) {
      validation.isValid = false;
      validation.errors.push('El archivo ZIP está vacío');
    }
    
    console.log('LOG: [ZipProcessor] Validación completada:', validation);
    return validation;
    
  } catch (error) {
    console.error('ERROR: [ZipProcessor] Error validando ZIP:', error);
    return {
      isValid: false,
      errors: [`Error al leer ZIP: ${error.message}`],
      warnings: [],
      stats: {}
    };
  }
};

/**
 * Obtiene información rápida de un ZIP sin extraer el contenido completo
 * @param {File} zipFile - Archivo ZIP a inspeccionar
 * @returns {Promise<Object>} Información básica del ZIP
 */
export const getZipInfo = async (zipFile) => {
  try {
    const zip = new JSZip();
    const contents = await zip.loadAsync(zipFile);
    
    const info = {
      totalEntries: Object.keys(contents.files).length,
      webpCount: 0,
      directories: 0,
      totalSize: zipFile.size,
      fileList: []
    };
    
    for (const [filename, zipEntry] of Object.entries(contents.files)) {
      if (zipEntry.dir) {
        info.directories++;
      } else {
        info.fileList.push(filename);
        if (filename.toLowerCase().endsWith('.webp')) {
          info.webpCount++;
        }
      }
    }
    
    return info;
    
  } catch (error) {
    console.error('ERROR: [ZipProcessor] Error obteniendo info del ZIP:', error);
    throw new Error(`Error al obtener información del ZIP: ${error.message}`);
  }
};