/**
 * @file useIntersectionObserver.js
 * @description Hook personalizado de React que detecta cuando un elemento es visible en la pantalla.
 * Utiliza la API Intersection Observer del navegador para un rendimiento óptimo.
 *
 * @param {object} options - Opciones de configuración para el observador (threshold, rootMargin).
 * @returns {Array} - Devuelve una referencia para el elemento a observar y un booleano que indica si es visible.
 */
import { useEffect, useState, useRef } from 'react';

export const useIntersectionObserver = (options) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      // Si el elemento es visible y aún no hemos activado la animación, la activamos.
      if (entry.isIntersecting) {
        setIsIntersecting(true);
        // Opcional: dejamos de observar después de la primera vez para no repetir la animación.
        observer.unobserve(entry.target);
      }
    }, options);

    const currentElement = elementRef.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    // Función de limpieza para desconectar el observador cuando el componente se desmonta.
    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
    };
  }, [options]);

  return [elementRef, isIntersecting];
};
