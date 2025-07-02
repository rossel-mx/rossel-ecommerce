/**
 * @file ScrollToTop.jsx
 * @description Componente que hace scroll al top automáticamente en cada cambio de ruta
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll al top cuando cambia la ruta
    window.scrollTo(0, 0);
    console.log(`LOG: [ScrollToTop] Scroll ejecutado para ruta: ${pathname}`);
  }, [pathname]);

  return null; // Este componente no renderiza nada
};

export default ScrollToTop;