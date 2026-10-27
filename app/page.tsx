"use client";

import { FormEvent, useEffect, useState } from "react";

type Product = "auto" | "moto" | "hogar" | "consorcio" | "bicicletas" | "caucion_alquiler";
type FormState = {
  name: string; email: string; phone: string; province: string; product: Product;
  make: string; model: string; year: string; homeSqm: string; location: string; occupancy: string;
  constructionMaterial: string; activity: string; wheelSize: string; bikeMaterial: string;
  insuredAmount: string; monthlyRent: string; contractDuration: string; privacyAccepted: boolean;
};
const products: { id: Product; title: string; desc: string; shortDesc: string; icon: string }[] = [
  { id: "auto", title: "Autos", desc: "Cobertura para tu auto ante responsabilidad civil, robo, daños o todo riesgo.", shortDesc: "Responsabilidad civil, robo y daños.", icon: "🚘" },
  { id: "moto", title: "Motos", desc: "Protección para tu moto o ciclomotor con auxilio mecánico y respaldo.", shortDesc: "Auxilio mecánico y respaldo.", icon: "🏍️" },
  { id: "hogar", title: "Hogar", desc: "Respaldo ante incendio, robo de contenidos, daños por agua y responsabilidad civil.", shortDesc: "Incendio, robo y daños en el hogar.", icon: "🏡" },
  { id: "consorcio", title: "Consorcio", desc: "Protección integral para consorcios, administraciones y espacios comunes.", shortDesc: "Edificios y espacios comunes.", icon: "🏢" },
  { id: "bicicletas", title: "Bicicleta", desc: "Cuidá tu bicicleta frente a robo en vía pública y accidentes en traslados.", shortDesc: "Robo y accidentes en traslados.", icon: "🚲" },
  { id: "caucion_alquiler", title: "Caución alquiler", desc: "Garantía de caución para alquilar vivienda o comercio sin avales propietarios.", shortDesc: "Garantía para alquilar vivienda o comercio.", icon: "🔑" }
];
const initialForm: FormState = {
  name: "", email: "", phone: "", province: "", product: "auto", make: "", model: "", year: "",
  homeSqm: "", location: "", occupancy: "", constructionMaterial: "", activity: "", wheelSize: "",
  bikeMaterial: "", insuredAmount: "", monthlyRent: "", contractDuration: "", privacyAccepted: false
};

function track(event: string, params: Record<string, string> = {}, eventCallback?: () => void) {
  if (typeof window === "undefined") {
    eventCallback?.();
    return;
  }
  let consentAccepted = false;
  try {
    consentAccepted = window.localStorage.getItem("analytics-consent") === "accepted";
  } catch {
    // Storage may be blocked; fail closed for analytics without blocking lead submission.
  }
  if (!consentAccepted) {
    eventCallback?.();
    return;
  }
  const w = window as Window & { dataLayer?: Record<string, unknown>[] };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({
    event,
    ...params,
    ...(eventCallback ? { eventCallback, eventTimeout: 1200 } : {})
  });
}

function trackAndWait(event: string, params: Record<string, string> = {}) {
  return new Promise<void>((resolve) => {
    let settled = false;
    const timeoutId = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve();
    }, 1200);
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      resolve();
    };
    track(event, params, finish);
  });
}

export default function Home() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [consent, setConsent] = useState<"unknown" | "accepted" | "rejected">("unknown");

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem("analytics-consent");
    } catch {
      // Keep consent unknown if storage is unavailable; no tags will load by default.
    }
    if (saved === "accepted" || saved === "rejected") setConsent(saved);
    const params = new URLSearchParams(window.location.search);
    const p = params.get("producto");
    if (p && ["auto", "moto", "hogar", "consorcio", "bicicletas", "caucion_alquiler"].includes(p)) {
      setForm((current) => ({ ...current, product: p as Product }));
    }
  }, []);

  useEffect(() => {
    if (consent !== "accepted") return;

    // GTM is the single browser-tag entry point. GA4 and Meta events are configured in the container.
    const gtmId = process.env.NEXT_PUBLIC_GTM_ID;
    if (!gtmId || document.getElementById("gtm-loader")) return;

    const w = window as Window & { dataLayer?: Record<string, unknown>[] };
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    const script = document.createElement("script");
    script.id = "gtm-loader";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`;
    document.head.appendChild(script);
  }, [consent]);

  function chooseProduct(product: Product) {
    setForm((current) => ({ ...current, product }));
    track("insurance_product_select", { insurance_product: product });
    document.getElementById("cotizar")?.scrollIntoView({ behavior: "smooth" });
  }

  function acceptConsent(value: "accepted" | "rejected") {
    try {
      window.localStorage.setItem("analytics-consent", value);
    } catch {
      // Honor the choice for this session even if it cannot be persisted.
    }
    setConsent(value);
    track("consent_choice", { consent_choice: value });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setSuccess("");
    if (!form.privacyAccepted) { setError("Leé la información de privacidad y confirmá para continuar."); return; }
    setBusy(true);
    track("form_submit", { insurance_product: form.product });
    try {
      const honeypot = new FormData(event.currentTarget).get("website");
      const response = await fetch("/api/leads", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website: typeof honeypot === "string" ? honeypot : "",
          name: form.name, email: form.email, phone: form.phone, province: form.province,
          city: form.product === "hogar" || form.product === "consorcio" ? form.location : "",
          product: form.product,
          details: form.product === "auto" || form.product === "moto"
            ? { make: form.make, model: form.model, year: form.year }
            : form.product === "hogar"
              ? { homeSqm: form.homeSqm, location: form.location, occupancy: form.occupancy }
              : form.product === "consorcio"
                ? { homeSqm: form.homeSqm, location: form.location, constructionMaterial: form.constructionMaterial, activity: form.activity }
                : form.product === "bicicletas"
                  ? { make: form.make, model: form.model, year: form.year, wheelSize: form.wheelSize, bikeMaterial: form.bikeMaterial, insuredAmount: form.insuredAmount }
                  : form.product === "caucion_alquiler"
                    ? { monthlyRent: form.monthlyRent, contractDuration: form.contractDuration }
                    : {},
          attribution: (() => {
            const params = new URLSearchParams(window.location.search);
            const entries: Record<string, string> = {};
            for (const key of ["utm_source","utm_medium","utm_campaign","utm_content","utm_term","gclid","fbclid"]) {
              entries[key] = params.get(key) || "";
            }
            try {
              const cookies = document.cookie.split(";").map((c) => c.trim());
              for (const name of ["_fbp", "_fbc"]) {
                const found = cookies.find((c) => c.startsWith(name + "="));
                if (found) entries[name] = decodeURIComponent(found.slice(name.length + 1));
              }
            } catch {
              // Cookie access may be blocked; CAPI still works without fbp/fbc.
            }
            return entries;
          })()
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No pudimos registrar tu solicitud. Intentá nuevamente.");
      track("generate_lead", { insurance_product: form.product, event_id: data.requestId || "" });
      const number = process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER;
      if (!number) {
        setSuccess("Solicitud registrada correctamente. WhatsApp todavía no está configurado; el equipo debe completar ese paso para continuar.");
        return;
      }
      setSuccess("Solicitud registrada. Ahora podés continuar por WhatsApp.");
      const label = products.find((item) => item.id === form.product)?.title || form.product;
      const detailLabels: Record<string, string> = {
        make: "Marca", model: "Modelo", year: "Año", homeSqm: "Superficie cubierta (m²)",
        location: "Ubicación", occupancy: "Tipo de vivienda",
        constructionMaterial: "Material de construcción", activity: "Actividad",
        wheelSize: "Rodado", bikeMaterial: "Material de la bicicleta",
        insuredAmount: "Suma asegurada (ARS)", monthlyRent: "Alquiler mensual (ARS)",
        contractDuration: "Duración del contrato (meses)"
      };
      const detailsByProduct =
        form.product === "auto" || form.product === "moto"
          ? { make: form.make, model: form.model, year: form.year }
          : form.product === "hogar"
            ? { homeSqm: form.homeSqm, location: form.location, occupancy: form.occupancy }
            : form.product === "consorcio"
              ? { homeSqm: form.homeSqm, location: form.location, constructionMaterial: form.constructionMaterial, activity: form.activity }
              : form.product === "bicicletas"
                ? { make: form.make, model: form.model, year: form.year, wheelSize: form.wheelSize, bikeMaterial: form.bikeMaterial, insuredAmount: form.insuredAmount }
                : form.product === "caucion_alquiler"
                  ? { monthlyRent: form.monthlyRent, contractDuration: form.contractDuration }
                  : {};
      const detailLines = Object.entries(detailsByProduct)
        .filter(([, value]) => String(value ?? "").trim() !== "")
        .map(([key, value]) => `• ${detailLabels[key] || key}: ${value}`);
      const messageLines = [
        "Hola, quiero continuar con mi solicitud de cotización de seguro.",
        "",
        "DATOS DE LA SOLICITUD",
        `N.º de solicitud: ${data.requestId}`,
        `Tipo de seguro: ${label}`,
        "",
        "DATOS DEL SOLICITANTE",
        `Nombre y apellido: ${form.name.trim()}`,
        `WhatsApp: ${form.phone.trim()}`,
        `Email: ${form.email.trim()}`,
        `Provincia: ${form.province.trim()}`,
        ...(detailLines.length ? ["", "DETALLES DEL RIESGO", ...detailLines] : [])
      ];
      const message = encodeURIComponent(messageLines.join("\\n"));
      await trackAndWait("whatsapp_click", { insurance_product: form.product });
      window.location.href = `https://wa.me/${number.replace(/[^0-9]/g, "")}?text=${message}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado. Intentá nuevamente.");
    } finally { setBusy(false); }
  }

  return (
    <>
      <header className="site-header"><div className="container header-inner">
        <a className="brand" href="#" aria-label="Agustín Montes, inicio"><span className="brand-mark" aria-hidden="true">🛡</span><span className="brand-copy">COTIZA TU SEGURO<small>AGUSTÍN MONTES · PRODUCTOR ASESOR</small></span></a>
        <nav className="main-nav" aria-label="Navegación principal">
          <a href="#seguros">Coberturas</a><a href="#aseguradoras">Respaldo</a><a href="#como-funciona">Cómo funciona</a><a href="#faq">Preguntas frecuentes</a>
        </nav>
        <a className="header-cta" href="#cotizar" onClick={() => track("cta_click", { cta_location: "header" })}>Solicitar cotización <span aria-hidden="true">→</span></a>
      </div></header>

      <main>
        <section className="hero"><div className="container hero-grid">
          <div>
            <span className="eyebrow">Asesoramiento profesional · Mendoza</span>
            <h1>Tu tranquilidad empieza con la cobertura adecuada.</h1>
            <p className="lead">Protegé tu vehículo, tu hogar o tu actividad comercial con el respaldo de un productor asesor. Cotizaciones claras, atención personalizada y seguimiento directo por WhatsApp.</p>
            <div className="hero-actions"><a className="button" href="#cotizar" onClick={() => track("cta_click", { cta_location: "hero" })}>Solicitar cotización <span aria-hidden="true">→</span></a><a className="secondary" href="#seguros">Ver coberturas</a></div>
            <ul className="trustline trust-list"><li>Atención personalizada</li><li>Gestión directa por WhatsApp</li><li>Productor matriculado</li></ul>
          </div>
          <div className="hero-card"><div className="hero-card-top"><strong>¿Qué cobertura necesitás?</strong><p>Elegí un seguro y completá los datos básicos para cotizar.</p></div>
            <div className="product-grid">{products.map((p) => <button className="product-link" key={p.id} onClick={() => chooseProduct(p.id)} type="button"><span className="product-icon" aria-hidden="true">{p.icon}</span><strong>{p.title}</strong><span>{p.shortDesc}</span></button>)}</div>
          </div>
        </div></section>

        {/* REMAINDER_OF_PAGE_FROM_MAIN - see note */}
      </main>
    </>
  );
}
