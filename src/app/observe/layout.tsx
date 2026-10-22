import "../preview/registry-theme.css";
export default function ObservationLayout({
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
