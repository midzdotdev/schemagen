import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { HydrationGate } from "./components/shell/HydrationGate";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("root element not found");

createRoot(root).render(
  <StrictMode>
    <HydrationGate>
      <App />
    </HydrationGate>
  </StrictMode>,
);
