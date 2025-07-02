/**
 * @file useSKUValidation.js
 * @description Custom hook para manejar validación de SKUs
 */

import { useState } from 'react';
import { supabase } from '../../../../services/supabaseClient';
import toast from 'react-hot-toast';

export const useSKUValidation = () => {
  const [isValidating, setIsValidating] = useState(false);
  const [conflicts, setConflicts] = useState({
    internalDuplicates: [],
    dbConflicts: []
  });

  /**
   * Detecta SKUs duplicados dentro del mismo array de productos
   */
  const detectInternalDuplicates = (products) => {
    console.log('LOG: [SKUValidation] Detectando duplicados internos...');
    
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
    
    console.log(`LOG: [SKUValidation] Duplicados internos encontrados: ${duplicates.length}`);
    return duplicates;
  };

  /**
   * Valida SKUs contra la base de datos
   */
  const validateAgainstDatabase = async (skuList) => {
    console.log(`LOG: [SKUValidation] Validando ${skuList.length} SKUs contra BD...`);
    
    try {
      const { data, error } = await supabase
        .from('products')
        .select('sku, name, id')
        .in('sku', skuList);
      
      if (error) throw error;
      
      console.log(`LOG: [SKUValidation] SKUs existentes en BD: ${data.length}`);
      return data || [];
      
    } catch (error) {
      console.error('ERROR: [SKUValidation] Error validando contra BD:', error);
      throw new Error(`Error al validar SKUs: ${error.message}`);
    }
  };

  /**
   * Realiza validación completa de SKUs
   */
  const validateSKUs = async (products) => {
    console.log('LOG: [SKUValidation] Iniciando validación completa...');
    setIsValidating(true);
    
    try {
      // 1. Detectar duplicados internos
      const internalDuplicates = detectInternalDuplicates(products);
      
      // 2. Validar contra base de datos
      const skuList = products.map(p => p.sku);
      const existingProducts = await validateAgainstDatabase(skuList);
      
      // 3. Mapear conflictos con BD
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
      
      const newConflicts = { internalDuplicates, dbConflicts };
      setConflicts(newConflicts);
      
      const hasConflicts = internalDuplicates.length > 0 || dbConflicts.length > 0;
      
      if (hasConflicts) {
        const totalConflicts = internalDuplicates.length + dbConflicts.length;
        toast.error(`❌ Se encontraron ${totalConflicts} conflictos de SKU`);
      } else {
        toast.success('✅ Validación completada - No hay conflictos de SKU');
      }
      
      console.log('LOG: [SKUValidation] Validación completada:', {
        internalDuplicates: internalDuplicates.length,
        dbConflicts: dbConflicts.length,
        hasConflicts
      });
      
      return !hasConflicts; // true si puede continuar
      
    } catch (error) {
      console.error('ERROR: [SKUValidation] Error en validación:', error);
      toast.error(`Error al validar SKUs: ${error.message}`);
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  /**
   * Reset del estado de validación
   */
  const resetValidation = () => {
    setConflicts({ internalDuplicates: [], dbConflicts: [] });
    setIsValidating(false);
  };

  return {
    isValidating,
    conflicts,
    validateSKUs,
    resetValidation,
    hasConflicts: conflicts.internalDuplicates.length > 0 || conflicts.dbConflicts.length > 0
  };
};