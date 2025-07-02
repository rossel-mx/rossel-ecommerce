/**
 * @file SimpleConflictModal.jsx
 * @description Modal simplificado que solo informa sobre conflictos SKU
 * y pide al usuario que corrija su Excel
 */

import { FiAlertTriangle, FiX, FiFileText, FiDatabase, FiEdit3 } from 'react-icons/fi';

const SimpleConflictModal = ({ isOpen, onClose, conflicts }) => {
  if (!isOpen) return null;

  const { internalDuplicates, dbConflicts } = conflicts;
  const totalConflicts = internalDuplicates.length + dbConflicts.length;

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
                <p className="text-red-100">
                  Se encontraron {totalConflicts} conflictos que debes corregir en tu Excel
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          
          {/* Mensaje principal */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold text-orange-800 mb-3 flex items-center gap-2">
              <FiEdit3 className="w-5 h-5" />
              Acción Requerida
            </h3>
            <p className="text-orange-700 mb-3">
              Para continuar con la carga masiva, debes corregir tu archivo Excel eliminando o modificando los SKUs conflictivos que se muestran a continuación.
            </p>
            <p className="text-orange-700 font-medium">
              💡 <strong>Recomendación:</strong> Descarga nuevamente el template si tienes dudas sobre el formato correcto.
            </p>
          </div>

          {/* Duplicados internos */}
          {internalDuplicates.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FiFileText className="w-5 h-5 text-orange-500" />
                SKUs Duplicados en tu Excel ({internalDuplicates.length})
              </h3>
              
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
                <p className="text-orange-800 text-sm mb-2">
                  <strong>❌ Problema:</strong> Los siguientes SKUs aparecen múltiples veces en tu archivo.
                </p>
                <p className="text-orange-700 text-sm">
                  <strong>✅ Solución:</strong> Elimina las filas duplicadas o cambia los SKUs para que sean únicos.
                </p>
              </div>
              
              <div className="space-y-3">
                {internalDuplicates.map((dup, index) => (
                  <div key={index} className="bg-white border border-orange-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-gray-800">SKU: {dup.sku}</h4>
                        <p className="text-sm text-gray-600">
                          📍 Aparece en filas: {dup.rows.map(r => r + 2).join(', ')}
                        </p>
                        <p className="text-sm text-gray-600">
                          📝 Nombres: {dup.names.join(' / ')}
                        </p>
                      </div>
                      <div className="text-orange-600">
                        <FiAlertTriangle className="w-6 h-6" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conflictos con BD */}
          {dbConflicts.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FiDatabase className="w-5 h-5 text-red-500" />
                SKUs ya Existentes en la Base de Datos ({dbConflicts.length})
              </h3>
              
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <p className="text-red-800 text-sm mb-2">
                  <strong>❌ Problema:</strong> Los siguientes SKUs ya existen en el sistema.
                </p>
                <p className="text-red-700 text-sm">
                  <strong>✅ Solución:</strong> Cambia los SKUs en tu Excel o elimina esas filas si no quieres crear productos nuevos.
                </p>
              </div>
              
              <div className="space-y-4">
                {dbConflicts.map((conflict, index) => (
                  <div key={conflict.sku} className="bg-white border border-red-200 rounded-xl p-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      
                      {/* Información del conflicto */}
                      <div>
                        <h4 className="font-bold text-lg text-gray-800 mb-3">SKU: {conflict.sku}</h4>
                        <div className="space-y-2 text-sm">
                          <div className="bg-red-50 p-3 rounded-lg">
                            <p className="font-medium text-red-800">🗄️ En la base de datos:</p>
                            <p className="text-red-700">"{conflict.existingName}"</p>
                          </div>
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <p className="font-medium text-blue-800">📄 En tu archivo Excel:</p>
                            <p className="text-blue-700">"{conflict.fileName}" (fila {conflict.fileRow + 2})</p>
                          </div>
                        </div>
                      </div>

                      {/* Sugerencias */}
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <h5 className="font-semibold text-gray-700 mb-2">💡 Sugerencias:</h5>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• Cambiar SKU: {conflict.sku}-2, {conflict.sku}-nuevo</li>
                          <li>• Usar sufijo: {conflict.sku}-v2, {conflict.sku}-alt</li>
                          <li>• Eliminar la fila si es duplicado no deseado</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instrucciones finales */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="font-bold text-blue-800 mb-3">📋 Pasos para Continuar:</h3>
            <ol className="text-blue-700 space-y-2">
              <li><strong>1.</strong> Abre tu archivo Excel</li>
              <li><strong>2.</strong> Corrige los SKUs conflictivos mostrados arriba</li>
              <li><strong>3.</strong> Guarda el archivo</li>
              <li><strong>4.</strong> Vuelve a subir el archivo corregido</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              ⚠️ No se puede continuar hasta que corrijas tu archivo Excel
            </div>
            
            <button
              onClick={onClose}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <FiEdit3 className="w-4 h-4" />
              Entendido - Voy a Corregir mi Excel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleConflictModal;