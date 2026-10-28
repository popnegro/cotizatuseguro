import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Cotizá tu seguro con Agustín Montes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", background: "linear-gradient(135deg, #102a43 0%, #17466a 100%)", color: "#ffffff", fontFamily: "Arial, sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 54, height: 54, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", background: "#b9e4d0", color: "#102a43", fontSize: 30, fontWeight: 800 }}>AM</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 22, fontWeight: 700 }}>AGUSTÍN MONTES</span>
            <span style={{ fontSize: 16, color: "#c8d8e5" }}>Productor asesor de seguros · Mendoza</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 980 }}>
          <span style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>Cotizá tu seguro</span>
          <span style={{ fontSize: 29, color: "#dce9f2", lineHeight: 1.3 }}>Asesoramiento personalizado para proteger lo que importa.</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {["Autos", "Motos", "Hogar", "Consorcio", "Bicicletas", "Caución de alquiler"].map((label) => (
            <div key={label} style={{ display: "flex", padding: "10px 16px", borderRadius: 999, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.3)", color: "#ffffff", fontSize: 18 }}>{label}</div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
