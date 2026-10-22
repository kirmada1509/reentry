import { createRoot } from "react-dom/client";
import "../../../src/app/globals.css";
import CapturePage from "./page";

// The shared registry theme expects this font token. Next supplies Geist on
// the web; extension pages have no Next font loader and use its system fallback.
document.documentElement.style.setProperty(
  "--font-sans",
  "ui-sans-serif, system-ui, sans-serif",
);

createRoot(document.getElementById("root")!).render(<CapturePage />);
