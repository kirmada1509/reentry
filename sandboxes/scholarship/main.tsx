import { createRoot } from "react-dom/client";
import "./entry.css";
import ScholarshipPortal from "./page";

document.documentElement.style.setProperty(
  "--font-sans",
  "ui-sans-serif, system-ui, sans-serif",
);
createRoot(document.getElementById("root")!).render(<ScholarshipPortal />);
