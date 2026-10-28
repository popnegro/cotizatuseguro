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

const provinces = [
  "Buenos Aires", "CABA", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes",
  "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones",
  "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe",
  "Santiago del Estero", "Tierra del Fuego", "Tucumán"
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
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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

  function validateStep1(): boolean {
    const errors: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().split(/\s+/).length < 2) {
      errors.name = "Ingresá nombre y apellido.";
    }
    const digits = form.phone.replace(/\D/g, "");
    if (digits.length < 8) {
      errors.phone = "Ingresá un WhatsApp válido (código de área + número).";
    }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = "Ingresá un email válido.";
    }
    if (!form.province.trim()) {
      errors.province = "Seleccioná tu provincia.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function goToStep2() {
    setError("");
    if (!validateStep1()) {
      setError("Revisá los datos de contacto para continuar.");
      return;
    }
    setFormStep(2);
    track("form_step", { form_step: "2", insurance_product: form.product });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setSuccess("");
    if (formStep === 1) {
      goToStep2();
      return;
    }
    if (!form.privacyAccepted) {
      setFieldErrors((prev) => ({ ...prev, privacy: "Confirmá la política de privacidad." }));
      setError("Leé la información de privacidad y confirmá para continuar.");
      return;
    }
    setFieldErrors({});
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
        setSuccess("Recibimos tu solicitud. En breve te vamos a contactar para continuar con la cotización.");
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
      <a className="skip-link" href="#cotizar">Ir a cotizar</a>
      <header className="site-header"><div className="container header-inner">
        <a className="brand" href="#" aria-label="Agustín Montes, inicio"><span className="brand-mark" aria-hidden="true">🛡</span><span className="brand-copy">COTIZA TU SEGURO<small>AGUSTÍN MONTES · PRODUCTOR ASESOR</small></span></a>
        <nav className="main-nav" aria-label="Navegación principal">
          <a href="#seguros">Coberturas</a><a href="#aseguradoras">Respaldo</a><a href="#como-funciona">Cómo funciona</a><a href="#faq">Preguntas frecuentes</a>
        </nav>
        <div className="header-actions">
          <a className="header-cta" href="#cotizar" onClick={() => track("cta_click", { cta_location: "header" })}>Solicitar cotización <span aria-hidden="true">→</span></a>
          <button type="button" className={`menu-toggle${menuOpen ? " is-open" : ""}`} aria-expanded={menuOpen} aria-controls="mobile-nav" aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"} onClick={() => setMenuOpen((o) => !o)}>
            <span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" />
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
          <div className="hero-card"><div className="hero-card-top"><strong>Elegí un producto</strong><p>Seleccioná y saltás al formulario de cotización.</p></div>
            <div className="product-grid">{products.map((p) => <button className={`product-link${form.product === p.id ? " is-selected" : ""}`} key={p.id} onClick={() => chooseProduct(p.id)} type="button" aria-pressed={form.product === p.id}><span className="product-icon" aria-hidden="true">{p.icon}</span><strong>{p.title}</strong><span>{p.shortDesc}</span></button>)}</div>
          </div>
        </div></section>

        <section className="section" id="seguros"><div className="container">
          <div className="section-intro"><span className="eyebrow">Coberturas disponibles</span><h2>Qué podemos cotizar</h2><p>Elegí el producto y el formulario se precarga con los datos del riesgo que necesitamos para cotizar.</p></div>
          <div className="coverage-grid">{products.map((p, index) => <article className="coverage-card" key={p.id}>
            <div className="coverage-card-top"><span className="product-icon" aria-hidden="true">{p.icon}</span><span className="coverage-category">{["VEHÍCULOS","VEHÍCULOS","VIVIENDA","EDIFICIOS","MOVILIDAD","GARANTÍAS"][index]}</span></div>
            <h3>{p.title}</h3><p>{p.desc}</p><button className="coverage-action" type="button" onClick={() => chooseProduct(p.id)}>Cotizar {p.title.toLowerCase()} <span aria-hidden="true">→</span></button>
          </article>)}</div>
        </div></section>

        <section className="section assurance-section" id="aseguradoras"><div className="container">
          <div className="section-intro"><span className="eyebrow">Respaldo asegurador</span><h2>Compañías con las que trabajo</h2><p>Según el producto y el perfil del riesgo, evaluamos alternativas entre estas aseguradoras y otras habilitadas.</p></div>
          <ul className="company-strip" aria-label="Compañías aseguradoras">
            {companies.map((name) => (<li className="company-chip" key={name}>{name}</li>))}
          </ul>
          <div className="assurance-grid">
            <article className="assurance-card"><span aria-hidden="true">🏢</span><h3>Opciones reales</h3><p>Triunfo, Mercantil Andina, Allianz, Sancor, San Cristóbal, Galicia y Rivadavia, entre otras habilitadas según el riesgo.</p></article>
            <article className="assurance-card"><span aria-hidden="true">🗺️</span><h3>Alcance nacional</h3><p>Atención desde Mendoza para consultas de seguros en Argentina, de acuerdo con las condiciones de cada cobertura.</p></article>
            <article className="assurance-card"><span aria-hidden="true">⚡</span><h3>Gestión ágil</h3><p>Un canal directo para organizar la solicitud, resolver dudas y acompañar los siguientes pasos.</p></article>
            <article className="assurance-card"><span aria-hidden="true">🤝</span><h3>Trato personalizado</h3><p>Seguimiento humano por WhatsApp, sin perder el contexto de tu solicitud.</p></article>
          </div>
        </div></section>

        <section className="section section-soft" id="cotizar"><div className="container quote-layout">
          <aside className="quote-aside">
            <span className="eyebrow">Solicitud de cotización</span>
            <h2>Empecemos por lo importante.</h2>
            <p>Completá estos datos y registraremos tu solicitud para continuar la consulta por WhatsApp.</p>
            <ul>
              <li>Datos iniciales, sin documentación innecesaria.</li>
              <li>Producto identificado desde el inicio.</li>
              <li>Seguimiento comercial de tu solicitud.</li>
            </ul>
            <div className="quote-trust">
              <p><strong>Agustín Montes</strong> · Productor Asesor de Seguros</p>
              <p>Atención en Mendoza · Respuesta habitual en el día hábil</p>
              <p className="quote-trust-note">La cotización es personalizada: no hay precio automático en el sitio.</p>
            </div>
          </aside>
          <div className="quote-card">
            <span className="eyebrow">Formulario de cotización</span>
            <h2>¿Qué necesitás asegurar?</h2>
            <div className="form-stepper" aria-label="Progreso del formulario">
              <span className={formStep === 1 ? "step-pill is-active" : "step-pill is-done"}>1. Contacto</span>
              <span className="step-pill-sep" aria-hidden="true">→</span>
              <span className={formStep === 2 ? "step-pill is-active" : "step-pill"}>2. Detalle del riesgo</span>
            </div>
            <p className="help">{formStep === 1 ? "Paso 1 de 2 · Datos de contacto y tipo de seguro." : "Paso 2 de 2 · Detalle del riesgo y envío."}</p>
            {error && <div className="form-error" role="alert">{error}</div>}
            {success && <div className="form-success" role="status">{success}</div>}
            <form onSubmit={submit} noValidate>
              <div aria-hidden="true" className="honeypot-field"><label htmlFor="website">Dejá este campo vacío</label><input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" /></div>

              {formStep === 1 && (
              <div className="form-grid">
                <div className="field field-full">
                  <label htmlFor="product">Tipo de seguro *</label>
                  <select id="product" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value as Product })}>
                    {products.map((p) => <option value={p.id} key={p.id}>{p.title}</option>)}
                  </select>
                </div>
                <div className={"field" + (fieldErrors.name ? " has-error" : "")}>
                  <label htmlFor="name">Nombre y apellido *</label>
                  <input id="name" name="name" autoComplete="name" minLength={2} maxLength={100} value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setFieldErrors((prev) => { const n = { ...prev }; delete n.name; return n; }); }} aria-invalid={!!fieldErrors.name} aria-describedby={fieldErrors.name ? "err-name" : undefined} />
                  {fieldErrors.name && <span className="field-error" id="err-name" role="alert">{fieldErrors.name}</span>}
                </div>
                <div className={"field" + (fieldErrors.phone ? " has-error" : "")}>
                  <label htmlFor="phone">WhatsApp *</label>
                  <input id="phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" minLength={8} maxLength={30} placeholder="Ej. 261 555 1234" value={form.phone} onChange={(e) => { setForm({ ...form, phone: e.target.value }); setFieldErrors((prev) => { const n = { ...prev }; delete n.phone; return n; }); }} aria-invalid={!!fieldErrors.phone} aria-describedby={fieldErrors.phone ? "err-phone phone-hint" : "phone-hint"} />
                  <span className="field-hint" id="phone-hint">Código de área + número, sin 0 ni 15.</span>
                  {fieldErrors.phone && <span className="field-error" id="err-phone" role="alert">{fieldErrors.phone}</span>}
                </div>
                <div className={"field" + (fieldErrors.email ? " has-error" : "")}>
                  <label htmlFor="email">Email *</label>
                  <input id="email" name="email" type="email" autoComplete="email" maxLength={254} value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); setFieldErrors((prev) => { const n = { ...prev }; delete n.email; return n; }); }} aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? "err-email" : undefined} />
                  {fieldErrors.email && <span className="field-error" id="err-email" role="alert">{fieldErrors.email}</span>}
                </div>
                <div className={"field" + (fieldErrors.province ? " has-error" : "")}>
                  <label htmlFor="province">Provincia *</label>
                  <select id="province" name="province" autoComplete="address-level1" value={form.province} onChange={(e) => { setForm({ ...form, province: e.target.value }); setFieldErrors((prev) => { const n = { ...prev }; delete n.province; return n; }); }} aria-invalid={!!fieldErrors.province} aria-describedby={fieldErrors.province ? "err-province" : undefined}>
                    <option value="">Seleccioná tu provincia</option>
                    {provinces.map((prov) => <option key={prov} value={prov}>{prov}</option>)}
                  </select>
                  {fieldErrors.province && <span className="field-error" id="err-province" role="alert">{fieldErrors.province}</span>}
                </div>
              </div>
              )}

              {formStep === 2 && (
              <div className="form-grid">
                <div className="field field-full form-step-summary">
                  <p><strong>{products.find((p) => p.id === form.product)?.title}</strong> · {form.name} · {form.province}</p>
                  <button type="button" className="link-button" onClick={() => setFormStep(1)}>Editar contacto</button>
                </div>
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
                <div className={"field field-full" + (fieldErrors.privacy ? " has-error" : "")}>
                  <label className="consent-row">
                    <input type="checkbox" checked={form.privacyAccepted} onChange={(e) => { setForm({ ...form, privacyAccepted: e.target.checked }); setFieldErrors((prev) => { const n = { ...prev }; delete n.privacy; return n; }); }} />
                    <span>Leí la <a href="/privacidad" target="_blank" rel="noreferrer">política de privacidad</a> y solicito que utilicen estos datos para gestionar mi cotización.</span>
                  </label>
                  {fieldErrors.privacy && <span className="field-error" role="alert">{fieldErrors.privacy}</span>}
                </div>
              </div>
              )}

              {formStep === 1 ? (
                <button className="button button-wide" type="submit">Continuar <span aria-hidden="true">→</span></button>
              ) : (
                <button className="button button-wide" type="submit" disabled={busy}>{busy ? "Registrando solicitud…" : "Registrar y continuar por WhatsApp"} <span aria-hidden="true">→</span></button>
              )}
              <p className="privacy-note">{formStep === 1 ? "En el siguiente paso completás el detalle del riesgo." : "Tu solicitud se registra antes de abrir WhatsApp. La apertura de WhatsApp no significa que el mensaje haya sido enviado."}</p>
            </form>
          </div>
        </div></section>

        <section className="section" id="como-funciona"><div className="container"><div className="section-intro"><span className="eyebrow">Paso a paso</span><h2>De la solicitud a la cotización</h2><p>Un proceso corto: datos de contacto, detalle del riesgo y seguimiento por WhatsApp con un productor asesor.</p></div><div className="steps">
          <article className="step"><div className="step-number">1</div><h3>Contacto y producto</h3><p>Indicás qué querés asegurar y cómo contactarte.</p></article>
          <article className="step"><div className="step-number">2</div><h3>Detalle del riesgo</h3><p>Completás solo los datos necesarios para cotizar ese producto.</p></article>
          <article className="step"><div className="step-number">3</div><h3>Seguimiento por WhatsApp</h3><p>Registramos la solicitud y continuás con el asesoramiento personalizado.</p></article>
        </div></div></section>

        <section className="section section-soft" id="faq"><div className="container"><div className="section-intro"><span className="eyebrow">Dudas habituales</span><h2>Preguntas frecuentes</h2><p>Respuestas claras sobre el proceso de cotización y asesoramiento.</p></div><div className="faq-list">
          <details className="faq" open><summary>¿Cómo solicito una cotización?</summary><p>En dos pasos: primero tus datos de contacto y el tipo de seguro; después el detalle del riesgo. Al enviar, registramos la solicitud y podés continuar por WhatsApp.</p></details>
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
