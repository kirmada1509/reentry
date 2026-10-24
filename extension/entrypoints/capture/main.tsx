import { createRoot } from "react-dom/client";
import "../entry.css";
import CapturePage from "./page";

// The shared registry theme expects this font token. Next supplies Geist on
// the web; extension pages have no Next font loader and use its system fallback.
document.documentElement.style.setProperty(
  "--font-sans",
  "ui-sans-serif, system-ui, sans-serif",
);

if (new URL(location.href).searchParams.get("manual") !== "1") {
  location.replace("companion.html");
} else {
  createRoot(document.getElementById("root")!).render(<CapturePage />);
}
