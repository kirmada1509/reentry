import type { Metadata } from "next";
import "./registry-theme.css";

export const metadata: Metadata = {
  title: "ReEntry · A calmer return · Fictional preview",
};
export default function PreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-reentry-preview className="min-h-screen">
      {children}
    </div>
  );
}
