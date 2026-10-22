import { createRoot } from "react-dom/client";
import "../entry.css";
import "../../../src/app/preview/registry-theme.css";
import CompanionPage from "./page";

document.documentElement.style.setProperty(
  "--font-sans",
  "ui-sans-serif, system-ui, sans-serif",
);
createRoot(document.getElementById("root")!).render(<CompanionPage />);
