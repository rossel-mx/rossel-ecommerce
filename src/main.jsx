import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom"; // ✅ Importar BrowserRouter
import { UserProvider } from "./context/UserContext";
import { CartProvider } from "./context/CartContext";
import { AnalyticsProvider } from "./context/AnalyticsProvider"; // 📊 NUEVA IMPORTACIÓN
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter> {/* ✅ Envuelve todo dentro del router */}
      <UserProvider>
        <CartProvider>
          <AnalyticsProvider>
          <App />
          </AnalyticsProvider>
        </CartProvider>
      </UserProvider>
    </BrowserRouter>
  </React.StrictMode>
);
