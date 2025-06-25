/**
 * @file useScrollPosition.js
 * @description Un hook personalizado de React que devuelve la posición vertical (Y) del scroll de la página.
 * Es eficiente porque solo actualiza el estado cuando el usuario realmente hace scroll.
 */
import { useState, useEffect } from 'react';

export const useScrollPosition = () => {
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    const updatePosition = () => {
      setScrollPosition(window.pageYOffset);
    };

    // Añadimos un 'listener' al evento de scroll de la ventana
    window.addEventListener('scroll', updatePosition);

    // Llamamos una vez al inicio por si la página no carga en la posición 0
    updatePosition();

    // Función de limpieza: es crucial quitar el listener cuando el componente se desmonta
    return () => window.removeEventListener('scroll', updatePosition);
  }, []);

  return scrollPosition;
};