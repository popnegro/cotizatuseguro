"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

type Product = "auto" | "moto" | "hogar" | "consorcio" | "bicicletas" | "caucion_alquiler";
type FormState = {
  name: string; email: string; phone: string; province: string; product: Product;
  make: string; model: string; year: string; homeSqm: string; location: string; occupancy: string;
  constructionMaterial: string; activity: string; wheelSize: string; bikeMaterial: string;
  insuredAmount: string; monthlyRent: string; contractDuration: string; privacyAccepted: boolean;
};

interface LandingPageProps {
  initialProduct?: string;
  searchParams?: Record<string, string | string[] | undefined>;
}

const products: { id: Product; title: string; category: string; desc: string; icon: string; imageUrl: string }[] = [
  {
    id: "auto",
    title: "Autos",
    category: "Vehículos",
    desc: "Cobertura para tu auto ante responsabilidad civil, robo, daños o todo riesgo.",
    icon: "🚘",
    imageUrl: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "moto",
    title: "Motos",
    category: "Vehículos",
    desc: "Protección para tu moto o ciclomotor con auxilio mecánico y respaldo.",
    icon: "🏍️",
    imageUrl: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "hogar",
    title: "Hogar",
    category: "Vivienda",
    desc: "Respaldo ante incendio, robo de contenidos, daños por agua y responsabilidad civil.",
    icon: "🏡",
    imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "consorcio",
    title: "Consorcio",
    category: "Edificios",
    desc: "Protección integral para consorcios, administraciones y espacios comunes.",
    icon: "🏢",
    imageUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "bicicletas",
    title: "Bicicleta",
    category: "Movilidad",
    desc: "Cuidá tu bicicleta frente a robo en vía pública y accidentes en traslados.",
    icon: "🚲",
    imageUrl: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "caucion_alquiler",
    title: "Caución alquiler",
    category: "Garantías",
    desc: "Garantía de caución para alquilar vivienda o comercio sin avales propietarios.",
    icon: "🔑",
    imageUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80"
  }
];

const initialForm: FormState = {
  name: "", email: "", phone: "", province: "", product: "auto", make: "", model: "", year: "",
  homeSqm: "", location: "", occupancy: "", constructionMaterial: "", activity: "", wheelSize: "",
  bikeMaterial: "", insuredAmount: "", monthlyRent: "", contractDuration: "", privacyAccepted: false
};

function track(event: string, params: Record<string, string> = {}) {
  if (typeof window === "undefined" || window.localStorage.getItem("analytics-consent") !== "accepted") return;
  const w = window as Window & { dataLayer?: Record<string, unknown>[]; fbq?: (...args: unknown[]) => void };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({ event, ...params });
  const mapped: Record<string, string> = { insurance_product_select: "ViewContent", generate_lead: "Lead", whatsapp_click: "Contact" };
  if (mapped[event] && w.fbq) w.fbq("track", mapped[event], event === "insurance_product_select" ? { content_name: params.insurance_product || "seguro" } : {});
}

export default function LandingPage({ initialProduct, searchParams }: LandingPageProps) {
  const validInitialProduct = initialProduct && ["auto", "moto", "hogar", "consorcio", "bicicletas", "caucion_alquiler"].includes(initialProduct)
    ? (initialProduct as Product)
    : "auto";

  const [form, setForm] = useState<FormState>(() => ({
    ...initialForm,
    product: validInitialProduct
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [consent, setConsent] = useState<"unknown" | "accepted" | "rejected">("unknown");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("analytics-consent");
    if (saved === "accepted" || saved === "rejected") setConsent(saved);
  }, []);

  useEffect(() => {
    if (consent === "accepted" && process.env.NEXT_PUBLIC_META_PIXEL_ID && !document.getElementById("meta-pixel-loader")) {
      const w = window as Window & { fbq?: (...args: unknown[]) => void };
      if (!w.fbq) {
        const f = function (...args: unknown[]) { const q = f as typeof f & { queue?: unknown[] }; (q.queue = q.queue || []).push(args); } as (...args: unknown[]) => void;
        w.fbq = f as unknown as (...args: unknown[]) => void;
      }
      w.fbq("init", process.env.NEXT_PUBLIC_META_PIXEL_ID);
      w.fbq("track", "PageView");
      const pixel = document.createElement("script");
      pixel.id = "meta-pixel-loader";
      pixel.async = true;
      pixel.src = "https://connect.facebook.net/en_US/fbevents.js";
      document.head.appendChild(pixel);
    }
  }, [consent]);

  useEffect(() => {
    if (consent !== "accepted") return;

    const ga4Id = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
    if (ga4Id && !document.getElementById("ga4-loader")) {
      const w = window as Window & {
        dataLayer?: unknown[];
        gtag?: (...args: unknown[]) => void;
      };
      w.dataLayer = w.dataLayer || [];
      w.gtag = w.gtag || function (...args: unknown[]) { w.dataLayer?.push(args); };
      w.gtag("js", new Date());
      w.gtag("config", ga4Id);
      const ga4Script = document.createElement("script");
      ga4Script.id = "ga4-loader";
      ga4Script.async = true;
      ga4Script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4Id)}`;
      document.head.appendChild(ga4Script);
    }

    if (process.env.NEXT_PUBLIC_GTM_ID && !document.getElementById("gtm-loader")) {
      const w = window as Window & { dataLayer?: Record<string, unknown>[] };
      w.dataLayer = w.dataLayer || [];
      w.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
      const script = document.createElement("script");
      script.id = "gtm-loader";
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(process.env.NEXT_PUBLIC_GTM_ID)}`;
      document.head.appendChild(script);
    }
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
          attribution: Object.fromEntries(
            ["utm_source","utm_medium","utm_campaign","utm_content","utm_term","gclid","fbclid"].map((key) => {
              const fromSearch = typeof searchParams?.[key] === "string" ? searchParams[key] : "";
              const fromLocation = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get(key) || "" : "";
              return [key, fromSearch || fromLocation];
            })
          )
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
      track("whatsapp_click", { insurance_product: form.product });
      window.location.href = `https://wa.me/${number.replace(/[^0-9]/g, "")}?text=${message}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado. Intentá nuevamente.");
    } finally { setBusy(false); }
  }

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER?.replace(/[^0-9]/g, "");
  const defaultWhatsAppUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Hola, quiero solicitar asesoramiento para una cotización de seguros.")}`
    : "#cotizar";

  return (
    <>
      {/* =====================================================================
          A. NAVBAR INSTITUCIONAL
          ===================================================================== */}
      <header className="site-header">
        <div className="container header-inner">
          <Link className="brand-wrapper" href="/" aria-label="Cotiza Tu Seguro - Agustín Montes, inicio">
            <span className="brand-logo-mark" aria-hidden="true">🛡️</span>
            <span className="brand-text">
              <span className="brand-title">COTIZA TU SEGURO</span>
              <span className="brand-subtitle">AGUSTÍN MONTES · PRODUCTOR ASESOR</span>
            </span>
          </Link>

          <nav className="nav-desktop" aria-label="Navegación principal">
            <a className="nav-link" href="#seguros">Coberturas</a>
            <a className="nav-link" href="#aseguradoras">Respaldo</a>
            <a className="nav-link" href="#como-funciona">Cómo funciona</a>
            <a className="nav-link" href="#faq">Preguntas frecuentes</a>
          </nav>

          <div className="nav-actions">
            <a
              className="header-cta"
              href="#cotizar"
              onClick={() => {
                setMobileMenuOpen(false);
                track("cta_click", { cta_location: "header" });
              }}
            >
              Solicitar cotización <span aria-hidden="true">→</span>
            </a>

            <button
              className="menu-toggle"
              type="button"
              aria-label={mobileMenuOpen ? "Cerrar menú de navegación" : "Abrir menú de navegación"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-drawer"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span aria-hidden="true">{mobileMenuOpen ? "✕" : "☰"}</span>
            </button>
          </div>
        </div>

        {/* Menú móvil desplegable */}
        <div
          id="mobile-nav-drawer"
          className={`mobile-menu-drawer ${mobileMenuOpen ? "is-open" : ""}`}
          aria-hidden={!mobileMenuOpen}
        >
          <a className="mobile-nav-link" href="#seguros" onClick={() => setMobileMenuOpen(false)}>Coberturas</a>
          <a className="mobile-nav-link" href="#aseguradoras" onClick={() => setMobileMenuOpen(false)}>Respaldo</a>
          <a className="mobile-nav-link" href="#como-funciona" onClick={() => setMobileMenuOpen(false)}>Cómo funciona</a>
          <a className="mobile-nav-link" href="#faq" onClick={() => setMobileMenuOpen(false)}>Preguntas frecuentes</a>
          <a
            className="header-cta"
            href="#cotizar"
            style={{ width: "100%", marginTop: "8px" }}
            onClick={() => {
              setMobileMenuOpen(false);
              track("cta_click", { cta_location: "header_mobile" });
            }}
          >
            Solicitar cotización <span aria-hidden="true">→</span>
          </a>
        </div>
      </header>

      <main>
        {/* ===================================================================
            B. HERO INSTITUCIONAL
            =================================================================== */}
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <span className="eyebrow">
                <span aria-hidden="true">📍</span> Asesoramiento profesional · Mendoza
              </span>
              <h1>Tu tranquilidad empieza con la cobertura adecuada.</h1>
              <p className="lead">
                Protegé tu vehículo, tu hogar o tu actividad comercial con el respaldo de un productor asesor. Cotizaciones claras, atención personalizada y seguimiento directo por WhatsApp.
              </p>
              
              <div className="hero-actions">
                <a
                  className="button"
                  href="#cotizar"
                  onClick={() => track("cta_click", { cta_location: "hero" })}
                >
                  Solicitar cotización <span aria-hidden="true">→</span>
                </a>
                <a className="secondary" href="#seguros">
                  Ver coberturas
                </a>
              </div>

              <div className="trust-badges">
                <div className="trust-badge-item">
                  <span aria-hidden="true">✓</span>
                  <span>Atención personalizada</span>
                </div>
                <div className="trust-badge-item">
                  <span aria-hidden="true">✓</span>
                  <span>Gestión directa por WhatsApp</span>
                </div>
                <div className="trust-badge-item">
                  <span aria-hidden="true">✓</span>
                  <span>Productor matriculado</span>
                </div>
              </div>
            </div>

            <div className="hero-card">
              <div className="hero-card-header">
                <strong>¿Qué cobertura necesitás?</strong>
                <p>Elegí un seguro y completá los datos básicos para cotizar.</p>
              </div>
              <div className="hero-quick-grid">
                {products.map((p) => {
                  const isSelected = form.product === p.id;
                  return (
                    <button
                      className={`quick-product-btn ${isSelected ? "is-active" : ""}`}
                      key={`hero-${p.id}`}
                      onClick={() => chooseProduct(p.id)}
                      type="button"
                    >
                      <span className="quick-product-icon" aria-hidden="true">{p.icon}</span>
                      <strong>{p.title}</strong>
                      <span>{p.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            C. COBERTURAS — CARDS DE PRODUCTOS
            =================================================================== */}
        <section className="section" id="seguros">
          <div className="container">
            <div className="section-intro">
              <span className="eyebrow">Coberturas disponibles</span>
              <h2>Protección diseñada para tus necesidades</h2>
              <p>Seleccioná el seguro que te interesa para precargar el formulario con la información correspondiente.</p>
            </div>

            <div className="coberturas-grid">
              {products.map((p) => {
                const isSelected = form.product === p.id;
                return (
                  <article
                    className={`cobertura-card ${isSelected ? "is-selected" : ""}`}
                    key={p.id}
                  >
                    <div className="cobertura-bg-image-wrapper">
                      <Image
                        src={p.imageUrl}
                        alt={`Seguro de ${p.title}`}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        referrerPolicy="no-referrer"
                        style={{ objectFit: "cover" }}
                      />
                    </div>
                    <div className="cobertura-overlay" aria-hidden="true" />

                    <div className="cobertura-content">
                      <div className="cobertura-card-top">
                        <div className="cobertura-top-row">
                          <div className="cobertura-icon-badge" aria-hidden="true">{p.icon}</div>
                          <div>
                            <span className="cobertura-category-tag">{p.category}</span>
                            {isSelected && <span className="cobertura-selected-badge">Activo</span>}
                          </div>
                        </div>
                        <h3>{p.title}</h3>
                        <p className="cobertura-desc">{p.desc}</p>
                      </div>

                      <div className="cobertura-card-footer">
                        <button
                          className="card-cta-btn"
                          onClick={() => chooseProduct(p.id)}
                          type="button"
                        >
                          <span>{isSelected ? "Seleccionado para cotizar" : `Cotizar ${p.title.toLowerCase()}`}</span>
                          <span aria-hidden="true">→</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===================================================================
            E. SECCIÓN ASEGURADORAS — RESPALDO INSTITUCIONAL
            =================================================================== */}
        <section className="insurers-section" id="aseguradoras">
          <div className="container">
            <div className="insurers-header">
              <span className="eyebrow">Solvencia y trayectoria</span>
              <h2>Respaldo en las mejores compañías aseguradoras</h2>
              <p>
                Operamos con entidades aseguradoras autorizadas por la Superintendencia de Seguros de la Nación (SSN) para garantizarte máxima solidez ante siniestros.
              </p>
            </div>

            <div className="insurers-grid">
              <div className="insurer-feature-card">
                <span className="insurer-feature-icon" aria-hidden="true">🏢</span>
                <strong>Compañías de 1ª Línea</strong>
                <span>Comparamos opciones entre aseguradoras de primer nivel para tu tranquilidad.</span>
              </div>
              <div className="insurer-feature-card">
                <span className="insurer-feature-icon" aria-hidden="true">🗺️</span>
                <strong>Alcance Nacional</strong>
                <span>Auxilio mecánico y cobertura en toda la República Argentina y países limítrofes.</span>
              </div>
              <div className="insurer-feature-card">
                <span className="insurer-feature-icon" aria-hidden="true">⚡</span>
                <strong>Gestión Ágil</strong>
                <span>Asistencia y acompañamiento profesional directo ante siniestros o trámites.</span>
              </div>
              <div className="insurer-feature-card">
                <span className="insurer-feature-icon" aria-hidden="true">🤝</span>
                <strong>Trato Personalizado</strong>
                <span>Atención humana y seguimiento constante vía WhatsApp sin esperas telefónicas.</span>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            D. SOLICITUD DE COTIZACIÓN
            =================================================================== */}
        <section className="section section-soft" id="cotizar">
          <div className="container quote-layout">
            <aside className="quote-aside">
              <span className="eyebrow">Paso a paso</span>
              <h2>Solicitá tu cotización en minutos.</h2>
              <p>Completá los datos básicos del formulario. Registraremos tu solicitud para brindarte una propuesta adaptada a tus necesidades por WhatsApp.</p>
              <ul className="quote-aside-features">
                <li><span aria-hidden="true">✓</span> <span>Datos iniciales sin documentación engorrosa.</span></li>
                <li><span aria-hidden="true">✓</span> <span>Identificación comercial desde el inicio.</span></li>
                <li><span aria-hidden="true">✓</span> <span>Seguimiento directo con un productor asesor.</span></li>
              </ul>
            </aside>

            <div className="quote-card">
              <div className="quote-card-header">
                <span className="quote-step-pill">Formulario de cotización</span>
                <h2>¿Qué necesitás asegurar?</h2>
                <p className="help">Los campos con * son obligatorios para procesar la cotización.</p>
              </div>

              {error && <div className="form-error" role="alert">{error}</div>}
              {success && <div className="form-success" role="status">{success}</div>}

              <form onSubmit={submit}>
                {/* Bloque 1: Tipo de Seguro */}
                <div className="form-section-block">
                  <div className="form-block-header">
                    <span className="form-block-badge">1</span>
                    <h3>Cobertura seleccionada</h3>
                  </div>
                  <div className="field field-full">
                    <label htmlFor="product">Tipo de seguro *</label>
                    <select
                      id="product"
                      value={form.product}
                      onChange={(e) => setForm({ ...form, product: e.target.value as Product })}
                    >
                      {products.map((p) => (
                        <option value={p.id} key={p.id}>{p.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Bloque 2: Datos de Contacto */}
                <div className="form-section-block">
                  <div className="form-block-header">
                    <span className="form-block-badge">2</span>
                    <h3>Datos de contacto</h3>
                  </div>
                  <div className="form-grid">
                    <div className="field">
                      <label htmlFor="name">Nombre y apellido *</label>
                      <input
                        id="name"
                        name="name"
                        autoComplete="name"
                        required
                        minLength={2}
                        pattern=".*\s+.*"
                        title="Ingresá nombre y apellido"
                        maxLength={100}
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="phone">WhatsApp *</label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        inputMode="tel"
                        required
                        minLength={8}
                        maxLength={30}
                        placeholder="Código de área + número"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="email">Email *</label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        maxLength={254}
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="province">Provincia *</label>
                      <input
                        id="province"
                        name="province"
                        autoComplete="address-level1"
                        required
                        maxLength={100}
                        value={form.province}
                        onChange={(e) => setForm({ ...form, province: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Bloque 3: Datos Específicos del Producto */}
                <div className="form-section-block">
                  <div className="form-block-header">
                    <span className="form-block-badge">3</span>
                    <h3>Detalles de {products.find(p => p.id === form.product)?.title || "la cobertura"}</h3>
                  </div>

                  <div className="form-grid">
                    {(form.product === "auto" || form.product === "moto") && (
                      <>
                        <div className="field">
                          <label htmlFor="make">Marca *</label>
                          <input
                            id="make"
                            required
                            maxLength={80}
                            value={form.make}
                            onChange={(e) => setForm({ ...form, make: e.target.value })}
                          />
                        </div>
                        <div className="field">
                          <label htmlFor="model">Modelo *</label>
                          <input
                            id="model"
                            required
                            maxLength={80}
                            value={form.model}
                            onChange={(e) => setForm({ ...form, model: e.target.value })}
                          />
                        </div>
                        <div className="field">
                          <label htmlFor="year">Año *</label>
                          <input
                            id="year"
                            required
                            type="number"
                            min="1900"
                            max={new Date().getFullYear() + 1}
                            value={form.year}
                            onChange={(e) => setForm({ ...form, year: e.target.value })}
                          />
                        </div>
                      </>
                    )}

                    {form.product === "hogar" && (
                      <>
                        <div className="field">
                          <label htmlFor="homeSqm">Metros cuadrados cubiertos *</label>
                          <input
                            id="homeSqm"
                            required
                            type="number"
                            min="1"
                            step="1"
                            value={form.homeSqm}
                            onChange={(e) => setForm({ ...form, homeSqm: e.target.value })}
                          />
                        </div>
                        <div className="field">
                          <label htmlFor="location">Ubicación / Localidad *</label>
                          <input
                            id="location"
                            required
                            maxLength={160}
                            value={form.location}
                            onChange={(e) => setForm({ ...form, location: e.target.value })}
                          />
                        </div>
                        <div className="field">
                          <label htmlFor="occupancy">La vivienda es *</label>
                          <select
                            id="occupancy"
                            required
                            value={form.occupancy}
                            onChange={(e) => setForm({ ...form, occupancy: e.target.value })}
                          >
                            <option value="">Seleccioná una opción</option>
                            <option value="propia">Propia</option>
                            <option value="alquiler">Alquiler</option>
                          </select>
                        </div>
                      </>
                    )}

                    {form.product === "consorcio" && (
                      <>
                        <div className="field">
                          <label htmlFor="homeSqm">Metros cuadrados cubiertos *</label>
                          <input
                            id="homeSqm"
                            required
                            type="number"
                            min="1"
                            step="1"
                            value={form.homeSqm}
                            onChange={(e) => setForm({ ...form, homeSqm: e.target.value })}
                          />
                        </div>
                        <div className="field">
                          <label htmlFor="location">Ubicación / Localidad *</label>
                          <input
                            id="location"
                            required
                            maxLength={160}
                            value={form.location}
                            onChange={(e) => setForm({ ...form, location: e.target.value })}
                          />
                        </div>
                        <div className="field">
                          <label htmlFor="constructionMaterial">Material de construcción *</label>
                          <input
                            id="constructionMaterial"
                            required
                            maxLength={100}
                            value={form.constructionMaterial}
                            onChange={(e) => setForm({ ...form, constructionMaterial: e.target.value })}
                          />
                        </div>
                        <div className="field">
                          <label htmlFor="activity">Actividad del inmueble *</label>
                          <input
                            id="activity"
                            required
                            maxLength={120}
                            value={form.activity}
                            onChange={(e) => setForm({ ...form, activity: e.target.value })}
                          />
                        </div>
                      </>
                    )}

                    {form.product === "bicicletas" && (
                      <>
                        <div className="field">
                          <label htmlFor="make">Marca *</label>
                          <input
                            id="make"
                            required
                            maxLength={80}
                            value={form.make}
                            onChange={(e) => setForm({ ...form, make: e.target.value })}
                          />
                        </div>
                        <div className="field">
                          <label htmlFor="model">Modelo *</label>
                          <input
                            id="model"
                            required
                            maxLength={80}
                            value={form.model}
                            onChange={(e) => setForm({ ...form, model: e.target.value })}
                          />
                        </div>
                        <div className="field">
                          <label htmlFor="year">Año *</label>
                          <input
                            id="year"
                            required
                            type="number"
                            min="1900"
                            max={new Date().getFullYear() + 1}
                            value={form.year}
                            onChange={(e) => setForm({ ...form, year: e.target.value })}
                          />
                        </div>
                        <div className="field">
                          <label htmlFor="wheelSize">Rodado *</label>
                          <input
                            id="wheelSize"
                            required
                            maxLength={30}
                            placeholder="Ej. 29”"
                            value={form.wheelSize}
                            onChange={(e) => setForm({ ...form, wheelSize: e.target.value })}
                          />
                        </div>
                        <div className="field">
                          <label htmlFor="bikeMaterial">Material *</label>
                          <input
                            id="bikeMaterial"
                            required
                            maxLength={80}
                            value={form.bikeMaterial}
                            onChange={(e) => setForm({ ...form, bikeMaterial: e.target.value })}
                          />
                        </div>
                        <div className="field">
                          <label htmlFor="insuredAmount">Suma asegurada (ARS) *</label>
                          <input
                            id="insuredAmount"
                            required
                            type="number"
                            min="1"
                            step="0.01"
                            value={form.insuredAmount}
                            onChange={(e) => setForm({ ...form, insuredAmount: e.target.value })}
                          />
                        </div>
                      </>
                    )}

                    {form.product === "caucion_alquiler" && (
                      <>
                        <div className="field">
                          <label htmlFor="monthlyRent">Alquiler mensual (ARS) *</label>
                          <input
                            id="monthlyRent"
                            required
                            type="number"
                            min="1"
                            step="0.01"
                            value={form.monthlyRent}
                            onChange={(e) => setForm({ ...form, monthlyRent: e.target.value })}
                          />
                        </div>
                        <div className="field">
                          <label htmlFor="contractDuration">Duración del contrato (meses) *</label>
                          <input
                            id="contractDuration"
                            required
                            type="number"
                            min="1"
                            max="120"
                            step="1"
                            value={form.contractDuration}
                            onChange={(e) => setForm({ ...form, contractDuration: e.target.value })}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Bloque 4: Confirmación y Consentimiento */}
                <label className="consent-row">
                  <input
                    type="checkbox"
                    checked={form.privacyAccepted}
                    onChange={(e) => setForm({ ...form, privacyAccepted: e.target.checked })}
                    required
                  />
                  <span>
                    Leí la <Link href="/privacidad" target="_blank" rel="noreferrer">política de privacidad</Link> y solicito que utilicen estos datos para gestionar mi cotización.
                  </span>
                </label>

                <button className="button button-wide" type="submit" disabled={busy}>
                  {busy ? "Registrando solicitud…" : "Registrar y continuar por WhatsApp"} <span aria-hidden="true">→</span>
                </button>
                <p className="privacy-note">
                  Tu solicitud se registra antes de abrir WhatsApp. La apertura de la aplicación no confirma el envío automático del mensaje.
                </p>
              </form>
            </div>
          </div>
        </section>

        {/* ===================================================================
            CÓMO FUNCIONA
            =================================================================== */}
        <section className="section" id="como-funciona">
          <div className="container">
            <div className="section-intro">
              <span className="eyebrow">Proceso ágil</span>
              <h2>Simple, claro y sin vueltas</h2>
              <p>Así gestionamos tu cotización para que encuentres la póliza adecuada.</p>
            </div>
            <div className="steps">
              <article className="step">
                <div className="step-number" aria-hidden="true">1</div>
                <h3>Elegí tu cobertura</h3>
                <p>Indicá qué querés asegurar y completá los datos básicos del formulario.</p>
              </article>
              <article className="step">
                <div className="step-number" aria-hidden="true">2</div>
                <h3>Registramos tu solicitud</h3>
                <p>Tu consulta genera un número de solicitud comercial para dar seguimiento.</p>
              </article>
              <article className="step">
                <div className="step-number" aria-hidden="true">3</div>
                <h3>Continuá por WhatsApp</h3>
                <p>Te contactamos de manera directa para evaluar las mejores opciones del mercado.</p>
              </article>
            </div>
          </div>
        </section>

        {/* ===================================================================
            PREGUNTAS FRECUENTES
            =================================================================== */}
        <section className="section section-soft" id="faq">
          <div className="container">
            <div className="section-intro">
              <span className="eyebrow">Dudas habituales</span>
              <h2>Preguntas frecuentes</h2>
              <p>Respuestas claras sobre el proceso de cotización y asesoramiento.</p>
            </div>

            <div className="faq-accordion-list">
              <details className="faq-accordion-item" open>
                <summary className="faq-summary">
                  <span>¿Cómo solicito una cotización?</span>
                  <span className="faq-summary-indicator" aria-hidden="true">+</span>
                </summary>
                <div className="faq-answer">
                  Completás el formulario con los datos iniciales de tu cobertura y datos de contacto. Al enviar, el sistema genera tu número de solicitud y te ofrece continuar la conversación por WhatsApp con Agustín Montes para enviarte la propuesta personalizada.
                </div>
              </details>

              <details className="faq-accordion-item">
                <summary className="faq-summary">
                  <span>¿La cotización es automática o personalizada?</span>
                  <span className="faq-summary-indicator" aria-hidden="true">+</span>
                </summary>
                <div className="faq-answer">
                  Es 100% personalizada. Evaluamos tu perfil, uso del vehículo o características del inmueble para recomendarte las opciones con mejor relación costo-beneficio del mercado asegurador argentino.
                </div>
              </details>

              <details className="faq-accordion-item">
                <summary className="faq-summary">
                  <span>¿Por qué el contacto continúa por WhatsApp?</span>
                  <span className="faq-summary-indicator" aria-hidden="true">+</span>
                </summary>
                <div className="faq-answer">
                  WhatsApp permite una comunicación ágil, directa y transparente, sin correos que van a spam ni llamadas invasivas. Podés consultar dudas, comparar propuestas y enviar fotos o documentación cuando vos lo dispongas.
                </div>
              </details>

              <details className="faq-accordion-item">
                <summary className="faq-summary">
                  <span>¿Qué información o documentación necesito para cotizar?</span>
                  <span className="faq-summary-indicator" aria-hidden="true">+</span>
                </summary>
                <div className="faq-answer">
                  Para la cotización inicial solo necesitás los datos solicitados en el formulario (ej. marca, modelo y año en vehículos, o metros cuadrados en hogar). La documentación definitiva (cédula, fotos del vehículo) solo se solicitará al momento de confirmar la emisión de la póliza.
                </div>
              </details>

              <details className="faq-accordion-item">
                <summary className="faq-summary">
                  <span>¿Puedo consultar por más de un seguro en simultáneo?</span>
                  <span className="faq-summary-indicator" aria-hidden="true">+</span>
                </summary>
                <div className="faq-answer">
                  Sí. Podés enviar una solicitud por cada tipología que desees o plantear tus consultas combinadas (por ejemplo, auto y hogar) directamente durante la charla de asesoramiento por WhatsApp.
                </div>
              </details>

              <details className="faq-accordion-item">
                <summary className="faq-summary">
                  <span>¿Cómo se tratan mis datos personales?</span>
                  <span className="faq-summary-indicator" aria-hidden="true">+</span>
                </summary>
                <div className="faq-answer">
                  Tus datos se utilizan con el único propósito de elaborar la cotización solicitada y brindar el seguimiento comercial correspondiente, conforme a las buenas prácticas y legislación argentina de protección de datos. Para más detalles, podés revisar nuestra política de privacidad.
                </div>
              </details>
            </div>
          </div>
        </section>
      </main>

      {/* =====================================================================
          G. FOOTER INSTITUCIONAL
          ===================================================================== */}
      <footer className="site-footer">
        <div className="container">
          <div className="footer-top">
            <div className="footer-brand">
              <strong>COTIZA TU SEGURO</strong>
              <p>Asesoramiento personalizado en seguros patrimoniales y de personas. Productor Asesor Matriculado con atención en Mendoza y cobertura en toda la República Argentina.</p>
              <small style={{ color: "#94a3b8" }}>Superintendencia de Seguros de la Nación (SSN)</small>
            </div>

            <div className="footer-col">
              <h4>Coberturas</h4>
              <ul className="footer-nav-list">
                {products.map(p => (
                  <li key={`footer-${p.id}`}>
                    <a
                      href="#cotizar"
                      onClick={() => chooseProduct(p.id)}
                    >
                      Seguros de {p.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="footer-col">
              <h4>Navegación</h4>
              <ul className="footer-nav-list">
                <li><a href="#seguros">Coberturas</a></li>
                <li><a href="#aseguradoras">Respaldo asegurador</a></li>
                <li><a href="#como-funciona">Cómo funciona</a></li>
                <li><a href="#faq">Preguntas frecuentes</a></li>
                <li><a href="#cotizar">Solicitar cotización</a></li>
                <li><Link href="/privacidad">Política de privacidad</Link></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} Agustín Montes · Productor Asesor de Seguros · Mendoza, Argentina</span>
            <div>
              <Link href="/privacidad" style={{ color: "#94a3b8", textDecoration: "underline" }}>
                Términos y Privacidad
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* =====================================================================
          H. WIDGET FLOTANTE DE WHATSAPP
          ===================================================================== */}
      <a
        className="whatsapp-floating-widget"
        href={defaultWhatsAppUrl}
        target={whatsappNumber ? "_blank" : undefined}
        rel={whatsappNumber ? "noreferrer" : undefined}
        aria-label="Contactar a Agustín Montes por WhatsApp para asesoramiento en seguros"
        onClick={() => {
          track("whatsapp_click", { insurance_product: form.product, cta_location: "floating_widget" });
        }}
      >
        <span className="whatsapp-floating-icon" aria-hidden="true">💬</span>
        <span className="whatsapp-label">Cotizá por WhatsApp</span>
      </a>

      {/* Banner de consentimiento */}
      {consent === "unknown" && (
        <aside className="consent-banner" aria-label="Preferencias de privacidad">
          <p>
            Usamos tecnologías de medición para evaluar el rendimiento del sitio. Las etiquetas analíticas y publicitarias solo se activan con tu consentimiento. <Link href="/privacidad">Más información</Link>.
          </p>
          <div className="consent-actions">
            <button type="button" onClick={() => acceptConsent("rejected")}>
              Rechazar
            </button>
            <button className="accept" type="button" onClick={() => acceptConsent("accepted")}>
              Aceptar medición
            </button>
          </div>
        </aside>
      )}
    </>
  );
}
