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

const companies = [
  "Triunfo",
  "Mercantil Andina",
  "Allianz",
  "Sancor",
  "San Cristóbal",
  "Galicia",
  "Rivadavia"
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem("analytics-consent");
    } catch {
    }
    if (saved === "accepted" || saved === "rejected") setConsent(saved);
    const params = new URLSearchParams(window.location.search);
    const p = params.get("producto");
    if (p && ["auto", "moto", "hogar", "consorcio", "bicicletas", "caucion_alquiler"].includes(p)) {
      setForm((current) => ({ ...current, product: p as Product }));
    }
  }, []);

  useEffect(() => {
    if (consent !== "unknown") {
      setShowConsent(false);
      return;
    }
    const id = window.setTimeout(() => setShowConsent(true), 1800);
    return () => window.clearTimeout(id);
  }, [consent]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  useEffect(() => {
    if (consent !== "accepted") return;
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
      const message = encodeURIComponent(messageLines.join("\n"));
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
        <div className="header-actions">
          <a className="header-cta" href="#cotizar" onClick={() => track("cta_click", { cta_location: "header" })}>Solicitar cotización <span aria-hidden="true">→</span></a>
          <button
            type="button"
            className={`menu-toggle${menuOpen ? " is-open" : ""}`}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="mobile-nav-panel" id="mobile-nav">
          <nav className="mobile-nav" aria-label="Menú móvil">
            <a href="#seguros" onClick={() => setMenuOpen(false)}>Coberturas</a>
            <a href="#aseguradoras" onClick={() => setMenuOpen(false)}>Respaldo</a>
            <a href="#como-funciona" onClick={() => setMenuOpen(false)}>Cómo funciona</a>
            <a href="#faq" onClick={() => setMenuOpen(false)}>Preguntas frecuentes</a>
            <a className="mobile-nav-cta" href="#cotizar" onClick={() => { setMenuOpen(false); track("cta_click", { cta_location: "mobile_nav" }); }}>Solicitar cotización</a>
          </nav>
        </div>
      )}
      </header>

      <main>
        <section className="hero"><div className="container hero-grid">
          <div>
            <span className="eyebrow">Productor asesor · Mendoza</span>
            <h1>Tu tranquilidad empieza con la cobertura adecuada.</h1>
            <p className="lead">Cotizá con un Productor Asesor de Seguros. Completás unos datos y seguís la consulta por WhatsApp: sin precio automático en el sitio, con atención personalizada según tu riesgo.</p>
            <div className="hero-actions"><a className="button" href="#cotizar" onClick={() => track("cta_click", { cta_location: "hero" })}>Solicitar cotización <span aria-hidden="true">→</span></a><a className="secondary" href="#seguros">Ver coberturas</a></div>
            <ul className="trustline trust-list"><li>Asesor PAS</li><li>Cotización por WhatsApp</li><li>Sin tarifa automática en web</li></ul>
          </div>
          <div className="hero-card"><div className="hero-card-top"><strong>¿Qué cobertura necesitás?</strong><p>Elegí un seguro y completá los datos básicos para cotizar.</p></div>
            <div className="product-grid">{products.map((p) => <button className={`product-link${form.product === p.id ? " is-selected" : ""}`} key={p.id} onClick={() => chooseProduct(p.id)} type="button" aria-pressed={form.product === p.id}><span className="product-icon" aria-hidden="true">{p.icon}</span><strong>{p.title}</strong><span>{p.shortDesc}</span></button>)}</div>
          </div>
        </div></section>

        <section className="section" id="seguros"><div className="container">
          <div className="section-intro"><span className="eyebrow">Coberturas disponibles</span><h2>Protección diseñada para tus necesidades</h2><p>Seleccioná el seguro que te interesa para precargar el formulario con la información correspondiente.</p></div>
          <div className="coverage-grid">{products.map((p, index) => <article className="coverage-card" key={p.id}>
            <div className="coverage-card-top"><span className="product-icon" aria-hidden="true">{p.icon}</span><span className="coverage-category">{["VEHÍCULOS","VEHÍCULOS","VIVIENDA","EDIFICIOS","MOVILIDAD","GARANTÍAS"][index]}</span></div>
            <h3>{p.title}</h3><p>{p.desc}</p><button className="coverage-action" type="button" onClick={() => chooseProduct(p.id)}>Cotizar {p.title.toLowerCase()} <span aria-hidden="true">→</span></button>
          </article>)}</div>
        </div></section>

        <section className="section assurance-section" id="aseguradoras"><div className="container">
          <div className="section-intro"><span className="eyebrow">Solvencia y trayectoria</span><h2>Compañías con las que trabajo</h2><p>Cotizamos y gestionamos con aseguradoras de primera línea. Según el producto y el perfil del riesgo, evaluamos alternativas entre estas compañías y otras habilitadas.</p></div>
          <ul className="company-strip" aria-label="Compañías aseguradoras">
            {companies.map((name) => (
              <li className="company-chip" key={name}>{name}</li>
            ))}
          </ul>
          <div className="assurance-grid">
            <article className="assurance-card"><span aria-hidden="true">🏢</span><h3>Opciones reales</h3><p>Triunfo, Mercantil Andina, Allianz, Sancor, San Cristóbal, Galicia y Rivadavia, entre otras habilitadas según el riesgo.</p></article>
            <article className="assurance-card"><span aria-hidden="true">🗺️</span><h3>Alcance nacional</h3><p>Atención desde Mendoza para consultas de seguros en Argentina, de acuerdo con las condiciones de cada cobertura.</p></article>
            <article className="assurance-card"><span aria-hidden="true">⚡</span><h3>Gestión ágil</h3><p>Un canal directo para organizar la solicitud, resolver dudas y acompañar los siguientes pasos.</p></article>
            <article className="assurance-card"><span aria-hidden="true">🤝</span><h3>Trato personalizado</h3><p>Seguimiento humano por WhatsApp, sin perder el contexto de tu solicitud.</p></article>
          </div>
        </div></section>

        <section className="section section-soft" id="cotizar"><div className="container quote-layout">
          <aside className="quote-aside"><span className="eyebrow">Solicitud de cotización</span><h2>Empecemos por lo importante.</h2><p>Completá estos datos y registraremos tu solicitud para continuar la consulta por WhatsApp.</p><ul><li>Datos iniciales, sin documentación innecesaria.</li><li>Producto identificado desde el inicio.</li><li>Seguimiento comercial de tu solicitud.</li></ul></aside>
          <div className="quote-card"><span className="eyebrow">Formulario de cotización</span><h2>¿Qué necesitás asegurar?</h2><p className="help">Los campos con * son obligatorios para procesar la solicitud.</p>
            {error && <div className="form-error" role="alert">{error}</div>}{success && <div className="form-success" role="status">{success}</div>}
            <form onSubmit={submit}>
              <div aria-hidden="true" className="honeypot-field"><label htmlFor="website">Dejá este campo vacío</label><input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" /></div>
              <div className="form-grid">
                <div className="field field-full"><label htmlFor="product">Tipo de seguro *</label><select id="product" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value as Product })}>{products.map((p) => <option value={p.id} key={p.id}>{p.title}</option>)}</select></div>
                <div className="field"><label htmlFor="name">Nombre y apellido *</label><input id="name" name="name" autoComplete="name" required minLength={2} pattern=".*\\s+.*" title="Ingresá nombre y apellido" maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="field"><label htmlFor="phone">WhatsApp *</label><input id="phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" required minLength={8} maxLength={30} placeholder="Código de área + número" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="field"><label htmlFor="email">Email *</label><input id="email" name="email" type="email" autoComplete="email" required maxLength={254} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="field"><label htmlFor="province">Provincia *</label><input id="province" name="province" autoComplete="address-level1" required maxLength={100} value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} /></div>
                {(form.product === "auto" || form.product === "moto") && <>
                  <div className="field"><label htmlFor="make">Marca *</label><input id="make" required maxLength={80} value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} /></div>
                  <div className="field"><label htmlFor="model">Modelo *</label><input id="model" required maxLength={80} value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
                  <div className="field"><label htmlFor="year">Año *</label><input id="year" required type="number" min="1900" max={new Date().getFullYear()+1} value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></div>
                </>}
                {form.product === "hogar" && <>
                  <div className="field"><label htmlFor="homeSqm">Metros cuadrados cubiertos *</label><input id="homeSqm" required type="number" min="1" step="1" value={form.homeSqm} onChange={(e) => setForm({ ...form, homeSqm: e.target.value })} /></div>
                  <div className="field"><label htmlFor="location">Ubicación *</label><input id="location" required maxLength={160} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
                  <div className="field"><label htmlFor="occupancy">La vivienda es *</label><select id="occupancy" required value={form.occupancy} onChange={(e) => setForm({ ...form, occupancy: e.target.value })}><option value="">Seleccioná una opción</option><option value="propia">Propia</option><option value="alquiler">Alquiler</option></select></div>
                </>}
                {form.product === "consorcio" && <>
                  <div className="field"><label htmlFor="homeSqm">Metros cuadrados cubiertos *</label><input id="homeSqm" required type="number" min="1" step="1" value={form.homeSqm} onChange={(e) => setForm({ ...form, homeSqm: e.target.value })} /></div>
                  <div className="field"><label htmlFor="location">Ubicación *</label><input id="location" required maxLength={160} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
                  <div className="field"><label htmlFor="constructionMaterial">Material de construcción *</label><input id="constructionMaterial" required maxLength={100} value={form.constructionMaterial} onChange={(e) => setForm({ ...form, constructionMaterial: e.target.value })} /></div>
                  <div className="field"><label htmlFor="activity">Actividad *</label><input id="activity" required maxLength={120} value={form.activity} onChange={(e) => setForm({ ...form, activity: e.target.value })} /></div>
                </>}
                {form.product === "bicicletas" && <>
                  <div className="field"><label htmlFor="make">Marca *</label><input id="make" required maxLength={80} value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} /></div>
                  <div className="field"><label htmlFor="model">Modelo *</label><input id="model" required maxLength={80} value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
                  <div className="field"><label htmlFor="year">Año *</label><input id="year" required type="number" min="1900" max={new Date().getFullYear()+1} value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></div>
                  <div className="field"><label htmlFor="wheelSize">Rodado *</label><input id="wheelSize" required maxLength={30} placeholder="Ej. 29”" value={form.wheelSize} onChange={(e) => setForm({ ...form, wheelSize: e.target.value })} /></div>
                  <div className="field"><label htmlFor="bikeMaterial">Material *</label><input id="bikeMaterial" required maxLength={80} value={form.bikeMaterial} onChange={(e) => setForm({ ...form, bikeMaterial: e.target.value })} /></div>
                  <div className="field"><label htmlFor="insuredAmount">Suma asegurada (ARS) *</label><input id="insuredAmount" required type="number" min="1" step="0.01" value={form.insuredAmount} onChange={(e) => setForm({ ...form, insuredAmount: e.target.value })} /></div>
                </>}
                {form.product === "caucion_alquiler" && <>
                  <div className="field"><label htmlFor="monthlyRent">Alquiler mensual (ARS) *</label><input id="monthlyRent" required type="number" min="1" step="0.01" value={form.monthlyRent} onChange={(e) => setForm({ ...form, monthlyRent: e.target.value })} /></div>
                  <div className="field"><label htmlFor="contractDuration">Duración del contrato (meses) *</label><input id="contractDuration" required type="number" min="1" max="120" step="1" value={form.contractDuration} onChange={(e) => setForm({ ...form, contractDuration: e.target.value })} /></div>
                </>}
              </div>
              <label className="consent-row"><input type="checkbox" checked={form.privacyAccepted} onChange={(e) => setForm({ ...form, privacyAccepted: e.target.checked })} required /><span>Leí la <a href="/privacidad" target="_blank" rel="noreferrer">política de privacidad</a> y solicito que utilicen estos datos para gestionar mi cotización.</span></label>
              <button className="button button-wide" type="submit" disabled={busy}>{busy ? "Registrando solicitud…" : "Registrar y continuar por WhatsApp"} <span aria-hidden="true">→</span></button>
              <p className="privacy-note">Tu solicitud se registra antes de abrir WhatsApp. La apertura de WhatsApp no significa que el mensaje haya sido enviado.</p>
            </form>
          </div>
        </div></section>

        <section className="section" id="como-funciona"><div className="container"><div className="section-intro"><span className="eyebrow">Paso a paso</span><h2>Solicitá tu cotización en minutos</h2><p>Completá los datos básicos. Registramos tu solicitud para continuar el asesoramiento por WhatsApp.</p></div><div className="steps">
          <article className="step"><div className="step-number">1</div><h3>Elegí tu cobertura</h3><p>Indicá qué querés asegurar y compartí los datos iniciales.</p></article>
          <article className="step"><div className="step-number">2</div><h3>Registramos tu solicitud</h3><p>La consulta queda identificada para darle seguimiento comercial.</p></article>
          <article className="step"><div className="step-number">3</div><h3>Continuá por WhatsApp</h3><p>Se abre una conversación para avanzar con el asesoramiento.</p></article>
        </div></div></section>

        <section className="section section-soft" id="faq"><div className="container"><div className="section-intro"><span className="eyebrow">Dudas habituales</span><h2>Preguntas frecuentes</h2><p>Respuestas claras sobre el proceso de cotización y asesoramiento.</p></div><div className="faq-list">
          <details className="faq" open><summary>¿Cómo solicito una cotización?</summary><p>Completás el formulario con los datos iniciales de tu cobertura y contacto. Al enviar, el sistema registra tu solicitud y te ofrece continuar por WhatsApp.</p></details>
          <details className="faq"><summary>¿La cotización es automática o personalizada?</summary><p>El formulario inicia el proceso; no emite una póliza ni confirma una tarifa automática. La propuesta depende del producto y de la evaluación correspondiente.</p></details>
          <details className="faq"><summary>¿Por qué el contacto continúa por WhatsApp?</summary><p>WhatsApp permite continuar la conversación directamente con el asesor. La apertura de la aplicación no confirma que el mensaje se haya enviado.</p></details>
          <details className="faq"><summary>¿Qué información necesito para cotizar?</summary><p>Los datos iniciales solicitados en el formulario. Cualquier documentación adicional se evaluará si resulta necesaria.</p></details>
          <details className="faq"><summary>¿Puedo consultar por más de un seguro?</summary><p>Sí. Podés generar una solicitud por cada producto para mantener cada consulta identificada.</p></details>
          <details className="faq"><summary>¿Cómo se tratan mis datos personales?</summary><p>Consultá la <a href="/privacidad">política de privacidad</a> antes de enviar tus datos. La solicitud se procesa para gestionar la cotización.</p></details>
        </div></div></section>
      </main>

      <footer className="site-footer"><div className="container footer-layout">
        <div className="footer-about"><a className="brand footer-brand" href="#"><span className="brand-mark" aria-hidden="true">🛡</span><span className="brand-copy">COTIZA TU SEGURO<small>AGUSTÍN MONTES · PRODUCTOR ASESOR</small></span></a><p>Asesoramiento personalizado en seguros patrimoniales y de personas, con atención en Mendoza.</p><p className="ssn-note">Productor Asesor de Seguros · Consultá la información de matrícula y habilitación antes de contratar.</p></div>
        <div className="footer-column"><strong>Coberturas</strong>{products.map((p) => <a key={p.id} href="#cotizar" onClick={() => chooseProduct(p.id)}>{p.title}</a>)}</div>
        <div className="footer-column"><strong>Navegación</strong><a href="#seguros">Coberturas</a><a href="#aseguradoras">Respaldo asegurador</a><a href="#como-funciona">Cómo funciona</a><a href="#faq">Preguntas frecuentes</a><a href="/privacidad">Política de privacidad</a></div>
      </div><div className="container footer-bottom"><span>© {new Date().getFullYear()} Agustín Montes · Mendoza, Argentina</span><a href="/privacidad">Términos y privacidad</a></div></footer>

      <a className="floating-cta" href="#cotizar" onClick={() => track("cta_click", { cta_location: "floating_cta" })}><span aria-hidden="true">↓</span> Ir a cotizar</a>

      {consent === "unknown" && showConsent && (
        <aside className="consent-banner" aria-label="Preferencias de privacidad">
          <p>Usamos medición del sitio. Las etiquetas solo se activan si aceptás. <a href="/privacidad">Más info</a>.</p>
          <div className="consent-actions">
            <button type="button" onClick={() => acceptConsent("rejected")}>Rechazar</button>
            <button className="accept" type="button" onClick={() => acceptConsent("accepted")}>Aceptar</button>
          </div>
        </aside>
      )}
    </>
  );
}
