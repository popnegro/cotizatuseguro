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
  { id: "auto", title: "Autos", desc: "Cobertura para tu auto ante responsabilidad civil, robo, da\u00f1os o todo riesgo.", shortDesc: "Responsabilidad civil, robo y da\u00f1os.", icon: "\ud83d\ude98" },
  { id: "moto", title: "Motos", desc: "Protecci\u00f3n para tu moto o ciclomotor con auxilio mec\u00e1nico y respaldo.", shortDesc: "Auxilio mec\u00e1nico y respaldo.", icon: "\ud83c\udfcd\ufe0f" },
  { id: "hogar", title: "Hogar", desc: "Respaldo ante incendio, robo de contenidos, da\u00f1os por agua y responsabilidad civil.", shortDesc: "Incendio, robo y da\u00f1os en el hogar.", icon: "\ud83c\udfe1" },
  { id: "consorcio", title: "Consorcio", desc: "Protecci\u00f3n integral para consorcios, administraciones y espacios comunes.", shortDesc: "Edificios y espacios comunes.", icon: "\ud83c\udfe2" },
  { id: "bicicletas", title: "Bicicleta", desc: "Cuid\u00e1 tu bicicleta frente a robo en v\u00eda p\u00fablica y accidentes en traslados.", shortDesc: "Robo y accidentes en traslados.", icon: "\ud83d\udeb2" },
  { id: "caucion_alquiler", title: "Cauci\u00f3n alquiler", desc: "Garant\u00eda de cauci\u00f3n para alquilar vivienda o comercio sin avales propietarios.", shortDesc: "Garant\u00eda para alquilar vivienda o comercio.", icon: "\ud83d\udd11" }
];

const companies = [
  "Triunfo",
  "Mercantil Andina",
  "Allianz",
  "Sancor",
  "San Crist\u00f3bal",
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
    if (!form.privacyAccepted) { setError("Le\u00e9 la informaci\u00f3n de privacidad y confirm\u00e1 para continuar."); return; }
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
      if (!response.ok) throw new Error(data.error || "No pudimos registrar tu solicitud. Intent\u00e1 nuevamente.");
      track("generate_lead", { insurance_product: form.product, event_id: data.requestId || "" });
      const number = process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER;
      if (!number) {
        setSuccess("Solicitud registrada correctamente. WhatsApp todav\u00eda no est\u00e1 configurado; el equipo debe completar ese paso para continuar.");
        return;
      }
      setSuccess("Solicitud registrada. Ahora pod\u00e9s continuar por WhatsApp.");
      const label = products.find((item) => item.id === form.product)?.title || form.product;
      const detailLabels: Record<string, string> = {
        make: "Marca", model: "Modelo", year: "A\u00f1o", homeSqm: "Superficie cubierta (m\u00b2)",
        location: "Ubicaci\u00f3n", occupancy: "Tipo de vivienda",
        constructionMaterial: "Material de construcci\u00f3n", activity: "Actividad",
        wheelSize: "Rodado", bikeMaterial: "Material de la bicicleta",
        insuredAmount: "Suma asegurada (ARS)", monthlyRent: "Alquiler mensual (ARS)",
        contractDuration: "Duraci\u00f3n del contrato (meses)"
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
        .map(([key, value]) => `\u2022 ${detailLabels[key] || key}: ${value}`);
      const messageLines = [
        "Hola, quiero continuar con mi solicitud de cotizaci\u00f3n de seguro.",
        "",
        "DATOS DE LA SOLICITUD",
        `N.\u00ba de solicitud: ${data.requestId}`,
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
      setError(err instanceof Error ? err.message : "Ocurri\u00f3 un error inesperado. Intent\u00e1 nuevamente.");
    } finally { setBusy(false); }
  }

  return (
    <>
      <header className="site-header"><div className="container header-inner">
        <a className="brand" href="#" aria-label="Agust\u00edn Montes, inicio"><span className="brand-mark" aria-hidden="true">\ud83d\udee1</span><span className="brand-copy">COTIZA TU SEGURO<small>AGUST\u00cdN MONTES \u00b7 PRODUCTOR ASESOR</small></span></a>
        <nav className="main-nav" aria-label="Navegaci\u00f3n principal">
          <a href="#seguros">Coberturas</a><a href="#aseguradoras">Respaldo</a><a href="#como-funciona">C\u00f3mo funciona</a><a href="#faq">Preguntas frecuentes</a>
        </nav>
        <div className="header-actions">
          <a className="header-cta" href="#cotizar" onClick={() => track("cta_click", { cta_location: "header" })}>Solicitar cotizaci\u00f3n <span aria-hidden="true">\u2192</span></a>
          <button
            type="button"
            className={`menu-toggle${menuOpen ? " is-open" : ""}`}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "Cerrar men\u00fa" : "Abrir men\u00fa"}
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
          <nav className="mobile-nav" aria-label="Men\u00fa m\u00f3vil">
            <a href="#seguros" onClick={() => setMenuOpen(false)}>Coberturas</a>
            <a href="#aseguradoras" onClick={() => setMenuOpen(false)}>Respaldo</a>
            <a href="#como-funciona" onClick={() => setMenuOpen(false)}>C\u00f3mo funciona</a>
            <a href="#faq" onClick={() => setMenuOpen(false)}>Preguntas frecuentes</a>
            <a className="mobile-nav-cta" href="#cotizar" onClick={() => { setMenuOpen(false); track("cta_click", { cta_location: "mobile_nav" }); }}>Solicitar cotizaci\u00f3n</a>
          </nav>
        </div>
      )}
      </header>

      <main>
        <section className="hero"><div className="container hero-grid">
          <div>
            <span className="eyebrow">Productor asesor \u00b7 Mendoza</span>
            <h1>Tu tranquilidad empieza con la cobertura adecuada.</h1>
            <p className="lead">Cotiz\u00e1 con un Productor Asesor de Seguros. Complet\u00e1s unos datos y segu\u00eds la consulta por WhatsApp: sin precio autom\u00e1tico en el sitio, con atenci\u00f3n personalizada seg\u00fan tu riesgo.</p>
            <div className="hero-actions"><a className="button" href="#cotizar" onClick={() => track("cta_click", { cta_location: "hero" })}>Solicitar cotizaci\u00f3n <span aria-hidden="true">\u2192</span></a><a className="secondary" href="#seguros">Ver coberturas</a></div>
            <ul className="trustline trust-list"><li>Asesor PAS</li><li>Cotizaci\u00f3n por WhatsApp</li><li>Sin tarifa autom\u00e1tica en web</li></ul>
          </div>
          <div className="hero-card"><div className="hero-card-top"><strong>\u00bfQu\u00e9 cobertura necesit\u00e1s?</strong><p>Eleg\u00ed un seguro y complet\u00e1 los datos b\u00e1sicos para cotizar.</p></div>
            <div className="product-grid">{products.map((p) => <button className={`product-link${form.product === p.id ? " is-selected" : ""}`} key={p.id} onClick={() => chooseProduct(p.id)} type="button" aria-pressed={form.product === p.id}><span className="product-icon" aria-hidden="true">{p.icon}</span><strong>{p.title}</strong><span>{p.shortDesc}</span></button>)}</div>
          </div>
        </div></section>

        <section className="section" id="seguros"><div className="container">
          <div className="section-intro"><span className="eyebrow">Coberturas disponibles</span><h2>Protecci\u00f3n dise\u00f1ada para tus necesidades</h2><p>Seleccion\u00e1 el seguro que te interesa para precargar el formulario con la informaci\u00f3n correspondiente.</p></div>
          <div className="coverage-grid">{products.map((p, index) => <article className="coverage-card" key={p.id}>
            <div className="coverage-card-top"><span className="product-icon" aria-hidden="true">{p.icon}</span><span className="coverage-category">{["VEH\u00cdCULOS","VEH\u00cdCULOS","VIVIENDA","EDIFICIOS","MOVILIDAD","GARANT\u00cdAS"][index]}</span></div>
            <h3>{p.title}</h3><p>{p.desc}</p><button className="coverage-action" type="button" onClick={() => chooseProduct(p.id)}>Cotizar {p.title.toLowerCase()} <span aria-hidden="true">\u2192</span></button>
          </article>)}</div>
        </div></section>

        <section className="section assurance-section" id="aseguradoras"><div className="container">
          <div className="section-intro"><span className="eyebrow">Solvencia y trayectoria</span><h2>Compa\u00f1\u00edas con las que trabajo</h2><p>Cotizamos y gestionamos con aseguradoras de primera l\u00ednea. Seg\u00fan el producto y el perfil del riesgo, evaluamos alternativas entre estas compa\u00f1\u00edas y otras habilitadas.</p></div>
          <ul className="company-strip" aria-label="Compa\u00f1\u00edas aseguradoras">
            {companies.map((name) => (
              <li className="company-chip" key={name}>{name}</li>
            ))}
          </ul>
          <div className="assurance-grid">
            <article className="assurance-card"><span aria-hidden="true">\ud83c\udfe2</span><h3>Opciones reales</h3><p>Triunfo, Mercantil Andina, Allianz, Sancor, San Crist\u00f3bal, Galicia y Rivadavia, entre otras habilitadas seg\u00fan el riesgo.</p></article>
            <article className="assurance-card"><span aria-hidden="true">\ud83d\uddfa\ufe0f</span><h3>Alcance nacional</h3><p>Atenci\u00f3n desde Mendoza para consultas de seguros en Argentina, de acuerdo con las condiciones de cada cobertura.</p></article>
            <article className="assurance-card"><span aria-hidden="true">\u26a1</span><h3>Gesti\u00f3n \u00e1gil</h3><p>Un canal directo para organizar la solicitud, resolver dudas y acompa\u00f1ar los siguientes pasos.</p></article>
            <article className="assurance-card"><span aria-hidden="true">\ud83e\udd1d</span><h3>Trato personalizado</h3><p>Seguimiento humano por WhatsApp, sin perder el contexto de tu solicitud.</p></article>
          </div>
        </div></section>

        <section className="section section-soft" id="cotizar"><div className="container quote-layout">
          <aside className="quote-aside"><span className="eyebrow">Solicitud de cotizaci\u00f3n</span><h2>Empecemos por lo importante.</h2><p>Complet\u00e1 estos datos y registraremos tu solicitud para continuar la consulta por WhatsApp.</p><ul><li>Datos iniciales, sin documentaci\u00f3n innecesaria.</li><li>Producto identificado desde el inicio.</li><li>Seguimiento comercial de tu solicitud.</li></ul></aside>
          <div className="quote-card"><span className="eyebrow">Formulario de cotizaci\u00f3n</span><h2>\u00bfQu\u00e9 necesit\u00e1s asegurar?</h2><p className="help">Los campos con * son obligatorios para procesar la solicitud.</p>
            {error && <div className="form-error" role="alert">{error}</div>}{success && <div className="form-success" role="status">{success}</div>}
            <form onSubmit={submit}>
              <div aria-hidden="true" className="honeypot-field"><label htmlFor="website">Dej\u00e1 este campo vac\u00edo</label><input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" /></div>
              <div className="form-grid">
                <div className="field field-full"><label htmlFor="product">Tipo de seguro *</label><select id="product" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value as Product })}>{products.map((p) => <option value={p.id} key={p.id}>{p.title}</option>)}</select></div>
                <div className="field"><label htmlFor="name">Nombre y apellido *</label><input id="name" name="name" autoComplete="name" required minLength={2} pattern=".*\\s+.*" title="Ingres\u00e1 nombre y apellido" maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="field"><label htmlFor="phone">WhatsApp *</label><input id="phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" required minLength={8} maxLength={30} placeholder="C\u00f3digo de \u00e1rea + n\u00famero" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="field"><label htmlFor="email">Email *</label><input id="email" name="email" type="email" autoComplete="email" required maxLength={254} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="field"><label htmlFor="province">Provincia *</label><input id="province" name="province" autoComplete="address-level1" required maxLength={100} value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} /></div>
                {(form.product === "auto" || form.product === "moto") && <>
                  <div className="field"><label htmlFor="make">Marca *</label><input id="make" required maxLength={80} value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} /></div>
                  <div className="field"><label htmlFor="model">Modelo *</label><input id="model" required maxLength={80} value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
                  <div className="field"><label htmlFor="year">A\u00f1o *</label><input id="year" required type="number" min="1900" max={new Date().getFullYear()+1} value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></div>
                </>}
                {form.product === "hogar" && <>
                  <div className="field"><label htmlFor="homeSqm">Metros cuadrados cubiertos *</label><input id="homeSqm" required type="number" min="1" step="1" value={form.homeSqm} onChange={(e) => setForm({ ...form, homeSqm: e.target.value })} /></div>
                  <div className="field"><label htmlFor="location">Ubicaci\u00f3n *</label><input id="location" required maxLength={160} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
                  <div className="field"><label htmlFor="occupancy">La vivienda es *</label><select id="occupancy" required value={form.occupancy} onChange={(e) => setForm({ ...form, occupancy: e.target.value })}><option value="">Seleccion\u00e1 una opci\u00f3n</option><option value="propia">Propia</option><option value="alquiler">Alquiler</option></select></div>
                </>}
                {form.product === "consorcio" && <>
                  <div className="field"><label htmlFor="homeSqm">Metros cuadrados cubiertos *</label><input id="homeSqm" required type="number" min="1" step="1" value={form.homeSqm} onChange={(e) => setForm({ ...form, homeSqm: e.target.value })} /></div>
                  <div className="field"><label htmlFor="location">Ubicaci\u00f3n *</label><input id="location" required maxLength={160} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
                  <div className="field"><label htmlFor="constructionMaterial">Material de construcci\u00f3n *</label><input id="constructionMaterial" required maxLength={100} value={form.constructionMaterial} onChange={(e) => setForm({ ...form, constructionMaterial: e.target.value })} /></div>
                  <div className="field"><label htmlFor="activity">Actividad *</label><input id="activity" required maxLength={120} value={form.activity} onChange={(e) => setForm({ ...form, activity: e.target.value })} /></div>
                </>}
                {form.product === "bicicletas" && <>
                  <div className="field"><label htmlFor="make">Marca *</label><input id="make" required maxLength={80} value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} /></div>
                  <div className="field"><label htmlFor="model">Modelo *</label><input id="model" required maxLength={80} value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
                  <div className="field"><label htmlFor="year">A\u00f1o *</label><input id="year" required type="number" min="1900" max={new Date().getFullYear()+1} value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></div>
                  <div className="field"><label htmlFor="wheelSize">Rodado *</label><input id="wheelSize" required maxLength={30} placeholder="Ej. 29\u201d" value={form.wheelSize} onChange={(e) => setForm({ ...form, wheelSize: e.target.value })} /></div>
                  <div className="field"><label htmlFor="bikeMaterial">Material *</label><input id="bikeMaterial" required maxLength={80} value={form.bikeMaterial} onChange={(e) => setForm({ ...form, bikeMaterial: e.target.value })} /></div>
                  <div className="field"><label htmlFor="insuredAmount">Suma asegurada (ARS) *</label><input id="insuredAmount" required type="number" min="1" step="0.01" value={form.insuredAmount} onChange={(e) => setForm({ ...form, insuredAmount: e.target.value })} /></div>
                </>}
                {form.product === "caucion_alquiler" && <>
                  <div className="field"><label htmlFor="monthlyRent">Alquiler mensual (ARS) *</label><input id="monthlyRent" required type="number" min="1" step="0.01" value={form.monthlyRent} onChange={(e) => setForm({ ...form, monthlyRent: e.target.value })} /></div>
                  <div className="field"><label htmlFor="contractDuration">Duraci\u00f3n del contrato (meses) *</label><input id="contractDuration" required type="number" min="1" max="120" step="1" value={form.contractDuration} onChange={(e) => setForm({ ...form, contractDuration: e.target.value })} /></div>
                </>}
              </div>
              <label className="consent-row"><input type="checkbox" checked={form.privacyAccepted} onChange={(e) => setForm({ ...form, privacyAccepted: e.target.checked })} required /><span>Le\u00ed la <a href="/privacidad" target="_blank" rel="noreferrer">pol\u00edtica de privacidad</a> y solicito que utilicen estos datos para gestionar mi cotizaci\u00f3n.</span></label>
              <button className="button button-wide" type="submit" disabled={busy}>{busy ? "Registrando solicitud\u2026" : "Registrar y continuar por WhatsApp"} <span aria-hidden="true">\u2192</span></button>
              <p className="privacy-note">Tu solicitud se registra antes de abrir WhatsApp. La apertura de WhatsApp no significa que el mensaje haya sido enviado.</p>
            </form>
          </div>
        </div></section>

        <section className="section" id="como-funciona"><div className="container"><div className="section-intro"><span className="eyebrow">Paso a paso</span><h2>Solicit\u00e1 tu cotizaci\u00f3n en minutos</h2><p>Complet\u00e1 los datos b\u00e1sicos. Registramos tu solicitud para continuar el asesoramiento por WhatsApp.</p></div><div className="steps">
          <article className="step"><div className="step-number">1</div><h3>Eleg\u00ed tu cobertura</h3><p>Indic\u00e1 qu\u00e9 quer\u00e9s asegurar y compart\u00ed los datos iniciales.</p></article>
          <article className="step"><div className="step-number">2</div><h3>Registramos tu solicitud</h3><p>La consulta queda identificada para darle seguimiento comercial.</p></article>
          <article className="step"><div className="step-number">3</div><h3>Continu\u00e1 por WhatsApp</h3><p>Se abre una conversaci\u00f3n para avanzar con el asesoramiento.</p></article>
        </div></div></section>

        <section className="section section-soft" id="faq"><div className="container"><div className="section-intro"><span className="eyebrow">Dudas habituales</span><h2>Preguntas frecuentes</h2><p>Respuestas claras sobre el proceso de cotizaci\u00f3n y asesoramiento.</p></div><div className="faq-list">
          <details className="faq" open><summary>\u00bfC\u00f3mo solicito una cotizaci\u00f3n?</summary><p>Complet\u00e1s el formulario con los datos iniciales de tu cobertura y contacto. Al enviar, el sistema registra tu solicitud y te ofrece continuar por WhatsApp.</p></details>
          <details className="faq"><summary>\u00bfLa cotizaci\u00f3n es autom\u00e1tica o personalizada?</summary><p>El formulario inicia el proceso; no emite una p\u00f3liza ni confirma una tarifa autom\u00e1tica. La propuesta depende del producto y de la evaluaci\u00f3n correspondiente.</p></details>
          <details className="faq"><summary>\u00bfPor qu\u00e9 el contacto contin\u00faa por WhatsApp?</summary><p>WhatsApp permite continuar la conversaci\u00f3n directamente con el asesor. La apertura de la aplicaci\u00f3n no confirma que el mensaje se haya enviado.</p></details>
          <details className="faq"><summary>\u00bfQu\u00e9 informaci\u00f3n necesito para cotizar?</summary><p>Los datos iniciales solicitados en el formulario. Cualquier documentaci\u00f3n adicional se evaluar\u00e1 si resulta necesaria.</p></details>
          <details className="faq"><summary>\u00bfPuedo consultar por m\u00e1s de un seguro?</summary><p>S\u00ed. Pod\u00e9s generar una solicitud por cada producto para mantener cada consulta identificada.</p></details>
          <details className="faq"><summary>\u00bfC\u00f3mo se tratan mis datos personales?</summary><p>Consult\u00e1 la <a href="/privacidad">pol\u00edtica de privacidad</a> antes de enviar tus datos. La solicitud se procesa para gestionar la cotizaci\u00f3n.</p></details>
        </div></div></section>
      </main>

      <footer className="site-footer"><div className="container footer-layout">
        <div className="footer-about"><a className="brand footer-brand" href="#"><span className="brand-mark" aria-hidden="true">\ud83d\udee1</span><span className="brand-copy">COTIZA TU SEGURO<small>AGUST\u00cdN MONTES \u00b7 PRODUCTOR ASESOR</small></span></a><p>Asesoramiento personalizado en seguros patrimoniales y de personas, con atenci\u00f3n en Mendoza.</p><p className="ssn-note">Productor Asesor de Seguros \u00b7 Consult\u00e1 la informaci\u00f3n de matr\u00edcula y habilitaci\u00f3n antes de contratar.</p></div>
        <div className="footer-column"><strong>Coberturas</strong>{products.map((p) => <a key={p.id} href="#cotizar" onClick={() => chooseProduct(p.id)}>{p.title}</a>)}</div>
        <div className="footer-column"><strong>Navegaci\u00f3n</strong><a href="#seguros">Coberturas</a><a href="#aseguradoras">Respaldo asegurador</a><a href="#como-funciona">C\u00f3mo funciona</a><a href="#faq">Preguntas frecuentes</a><a href="/privacidad">Pol\u00edtica de privacidad</a></div>
      </div><div className="container footer-bottom"><span>\u00a9 {new Date().getFullYear()} Agust\u00edn Montes \u00b7 Mendoza, Argentina</span><a href="/privacidad">T\u00e9rminos y privacidad</a></div></footer>

      <a className="floating-cta" href="#cotizar" onClick={() => track("cta_click", { cta_location: "floating_cta" })}><span aria-hidden="true">\u2193</span> Ir a cotizar</a>

      {consent === "unknown" && showConsent && (
        <aside className="consent-banner" aria-label="Preferencias de privacidad">
          <p>Usamos medici\u00f3n del sitio. Las etiquetas solo se activan si acept\u00e1s. <a href="/privacidad">M\u00e1s info</a>.</p>
          <div className="consent-actions">
            <button type="button" onClick={() => acceptConsent("rejected")}>Rechazar</button>
            <button className="accept" type="button" onClick={() => acceptConsent("accepted")}>Aceptar</button>
          </div>
        </aside>
      )}
    </>
  );
}
