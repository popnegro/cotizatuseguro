"use client";

import { FormEvent, useEffect, useState } from "react";

type Product = "auto" | "moto" | "hogar" | "consorcio" | "bicicletas" | "caucion_alquiler";
type FormState = {
  name: string; email: string; phone: string; province: string; product: Product;
  make: string; model: string; year: string; homeSqm: string; location: string; occupancy: string;
  constructionMaterial: string; activity: string; wheelSize: string; bikeMaterial: string;
  insuredAmount: string; monthlyRent: string; contractDuration: string; privacyAccepted: boolean;
};
const products: { id: Product; title: string; desc: string; icon: string }[] = [
  { id: "auto", title: "Autos", desc: "Protección para tu vehículo", icon: "🚘" },
  { id: "moto", title: "Motos", desc: "Movete con respaldo", icon: "🏍️" },
  { id: "hogar", title: "Hogar", desc: "Protegé tu casa y tus cosas", icon: "🏡" },
  { id: "consorcio", title: "Consorcio", desc: "Protección para edificios", icon: "🏢" },
  { id: "bicicletas", title: "Bicicleta", desc: "Cuidá tu bicicleta", icon: "🚲" },
  { id: "caucion_alquiler", title: "Caución alquiler", desc: "Garantía para alquilar", icon: "🔑" }
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
    const saved = window.localStorage.getItem("analytics-consent");
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
    window.localStorage.setItem("analytics-consent", value);
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
      const response = await fetch("/api/leads", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
          attribution: Object.fromEntries(["utm_source","utm_medium","utm_campaign","utm_content","utm_term","gclid","fbclid"].map((key) => [key, new URLSearchParams(window.location.search).get(key) || ""]))
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
      const message = encodeURIComponent(`Hola, quiero solicitar una cotización de seguro para ${label.toLowerCase()}. Mi número de solicitud es ${data.requestId}.`);
      await trackAndWait("whatsapp_click", { insurance_product: form.product });
      window.location.href = `https://wa.me/${number.replace(/[^0-9]/g, "")}?text=${message}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado. Intentá nuevamente.");
    } finally { setBusy(false); }
  }

  return (
    <>
      <header className="site-header"><div className="container header-inner">
        <a className="brand" href="#" aria-label="Agustín Montes, inicio">AGUSTÍN MONTES<small>PRODUCTOR DE SEGUROS · MENDOZA</small></a>
        <a className="header-cta" href="#cotizar" onClick={() => track("cta_click", { cta_location: "header" })}>Cotizar por WhatsApp <span aria-hidden="true">↗</span></a>
      </div></header>

      <main>
        <section className="hero"><div className="container hero-grid">
          <div>
            <span className="eyebrow">Seguros con asesoramiento personalizado</span>
            <h1>Tu tranquilidad empieza con una buena cobertura.</h1>
            <p className="lead">Encontrá la protección que necesitás para tu vehículo, tu hogar o tu comercio. Contame qué querés asegurar y te ayudo a cotizar.</p>
            <div className="hero-actions"><a className="button" href="#cotizar" onClick={() => track("cta_click", { cta_location: "hero" })}>Quiero cotizar <span aria-hidden="true">→</span></a><a className="secondary" href="#seguros">Ver seguros</a></div>
            <p className="trustline">Asesoramiento personal · Atención por WhatsApp · Mendoza</p>
          </div>
          <div className="hero-card"><div className="hero-card-top"><strong>¿Qué querés asegurar?</strong><p>Elegí una opción para empezar tu cotización.</p></div>
            <div className="product-grid">{products.map((p) => <button className="product-link" key={p.id} onClick={() => chooseProduct(p.id)} type="button"><span className="product-icon" aria-hidden="true">{p.icon}</span><strong>{p.title}</strong><span>{p.desc}</span></button>)}</div>
          </div>
        </div></section>

        <section className="section" id="seguros"><div className="container">
          <div className="section-intro"><span className="eyebrow">Coberturas</span><h2>Una cotización pensada para vos</h2><p>Seleccioná el tipo de seguro. Te pediremos solo la información inicial necesaria para orientar tu consulta.</p></div>
          <div className="product-grid">{products.map((p) => <button className="product-link" key={p.id} onClick={() => chooseProduct(p.id)} type="button"><span className="product-icon" aria-hidden="true">{p.icon}</span><strong>{p.title}</strong><span>{p.desc}</span></button>)}</div>
        </div></section>

        <section className="section section-soft" id="cotizar"><div className="container quote-layout">
          <aside className="quote-aside"><span className="eyebrow">Solicitud de cotización</span><h2>Empecemos por lo importante.</h2><p>Completá estos datos y registraremos tu solicitud para continuar la consulta por WhatsApp.</p><ul><li>Datos iniciales, sin documentación innecesaria.</li><li>Producto identificado desde el inicio.</li><li>Seguimiento comercial de tu solicitud.</li></ul></aside>
          <div className="quote-card"><h2>¿Qué necesitás asegurar?</h2><p className="help">Los campos con * son obligatorios.</p>
            {error && <div className="form-error" role="alert">{error}</div>}{success && <div className="form-success" role="status">{success}</div>}
            <form onSubmit={submit}>
              <div className="form-grid">
                <div className="field field-full"><label htmlFor="product">Tipo de seguro *</label><select id="product" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value as Product })}>{products.map((p) => <option value={p.id} key={p.id}>{p.title}</option>)}</select></div>
                <div className="field"><label htmlFor="name">Nombre y apellido *</label><input id="name" name="name" autoComplete="name" required minLength={2} pattern=".*\s+.*" title="Ingresá nombre y apellido" maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
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

        <section className="section"><div className="container"><div className="section-intro"><span className="eyebrow">Cómo funciona</span><h2>Simple, claro y personal</h2></div><div className="steps">
          <article className="step"><div className="step-number">1</div><h3>Elegí tu cobertura</h3><p>Indicá qué querés asegurar y compartí los datos iniciales.</p></article>
          <article className="step"><div className="step-number">2</div><h3>Registramos tu solicitud</h3><p>La consulta queda identificada para darle seguimiento comercial.</p></article>
          <article className="step"><div className="step-number">3</div><h3>Continuá por WhatsApp</h3><p>Se abre una conversación para avanzar con el asesoramiento.</p></article>
        </div></div></section>

        <section className="section section-soft"><div className="container"><div className="section-intro"><span className="eyebrow">Preguntas frecuentes</span><h2>Antes de solicitar tu cotización</h2></div><div className="faq-list">
          <article className="faq"><h3>¿Puedo consultar por más de un seguro?</h3><p>Sí. Podés enviar una solicitud por cada producto para mantener el seguimiento organizado.</p></article>
          <article className="faq"><h3>¿La cotización es automática?</h3><p>No. La solicitud inicia el proceso de asesoramiento; las condiciones dependen del producto y de la evaluación correspondiente.</p></article>
          <article className="faq"><h3>¿Cómo continúo la consulta?</h3><p>Después de registrar la solicitud, la landing te ofrece continuar por WhatsApp.</p></article>
          <article className="faq"><h3>¿Qué datos necesito?</h3><p>Solo los datos iniciales del formulario. La documentación adicional se evaluará si resulta necesaria.</p></article>
        </div></div></section>
      </main>

      <footer className="site-footer"><div className="container footer-inner"><span>© {new Date().getFullYear()} Agustín Montes · Productor de Seguros</span><div className="footer-links"><a href="/privacidad">Privacidad</a><a href="#cotizar">Solicitar cotización</a></div></div></footer>

      {consent === "unknown" && <aside className="consent-banner" aria-label="Preferencias de privacidad"><p>Usamos tecnologías de medición para comprender el rendimiento del sitio. Las etiquetas analíticas y publicitarias solo se activan después de tu elección. <a href="/privacidad">Más información</a>.</p><div className="consent-actions"><button type="button" onClick={() => acceptConsent("rejected")}>Rechazar</button><button className="accept" type="button" onClick={() => acceptConsent("accepted")}>Aceptar medición</button></div></aside>}
    </>
  );
}