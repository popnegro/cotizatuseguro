import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidad | CotizaTuSeguro",
  description:
    "Política de privacidad sobre la recopilación, el uso y la protección de los datos personales en CotizaTuSeguro.",
  alternates: { canonical: "/privacidad" },
  openGraph: {
    title: "Política de Privacidad | CotizaTuSeguro",
    description:
      "Información sobre el tratamiento de datos personales en CotizaTuSeguro.",
    type: "website",
    locale: "es_AR",
    url: "https://cotizatuseguro.com.ar/privacidad",
  },
};

const sections = [
  {
    title: "1. Responsable del tratamiento de los datos",
    paragraphs: [
      "El responsable del tratamiento de tus datos personales es el titular de la Plataforma CotizaTuSeguro.",
      "Domicilio: Av. San Martín Sur 6996, M5505 Luján de Cuyo, Mendoza",
      "Correo electrónico: agusmontespas@gmail.com",
    ],
  },
  {
    title: "2. Datos personales que recopilamos",
    paragraphs: [
      "Podemos recopilar las siguientes categorías de datos:",
      "Datos que nos proporcionas directamente:",
    ],
    lists: [
      [
        "Datos de identificación y contacto: nombre completo, correo electrónico, número de teléfono, código postal o localidad.",
        "Datos del vehículo o bien a asegurar: marca, modelo, año, versión, uso del vehículo, entre otros.",
        "Datos necesarios para la cotización: edad del conductor, historial de siniestralidad (si se solicita), tipo de cobertura deseada.",
        "Cualquier otra información que nos facilites voluntariamente a través de formularios, chat o correo electrónico.",
      ],
    ],
    after: [
      "Datos que recopilamos automáticamente:",
    ],
    listsAfter: [
      [
        "Datos de navegación e identificadores técnicos: dirección IP, tipo de navegador, dispositivo, sistema operativo, páginas visitadas, tiempo de permanencia y cookies.",
        "Datos de uso de la Plataforma para mejorar la experiencia del usuario.",
      ],
    ],
    end: [
      "No recopilamos datos sensibles (como datos de salud, ideología, religión u origen racial) salvo que sean estrictamente necesarios y con tu consentimiento explícito.",
    ],
  },
  {
    title: "3. Finalidades del tratamiento",
    paragraphs: [
      "Utilizamos tus datos personales para las siguientes finalidades:",
    ],
    lists: [
      [
        "Generar cotizaciones de seguros personalizadas.",
        "Contactarte para enviarte las cotizaciones, aclarar dudas o dar seguimiento a tu solicitud.",
        "Gestionar la relación comercial y, en su caso, facilitar la contratación del seguro con las aseguradoras correspondientes.",
        "Mejorar nuestros servicios, analizar el uso de la Plataforma y realizar estudios estadísticos (de forma agregada y anonimizada cuando sea posible).",
        "Cumplir con obligaciones legales y regulatorias aplicables.",
        "Enviar comunicaciones comerciales o informativas sobre productos y servicios relacionados, siempre que hayas dado tu consentimiento o exista una base legal que lo permita. Podrás oponerte en cualquier momento.",
      ],
    ],
  },
  {
    title: "4. Base legal del tratamiento",
    paragraphs: ["El tratamiento de tus datos se fundamenta en:"],
    lists: [
      [
        "La ejecución de medidas precontractuales a tu solicitud (generación de cotizaciones).",
        "Tu consentimiento (cuando sea requerido, por ejemplo para comunicaciones comerciales o cookies no esenciales).",
        "El cumplimiento de obligaciones legales.",
        "Nuestro interés legítimo en mejorar la Plataforma y prevenir fraudes, siempre que no prevalezcan tus derechos y libertades.",
      ],
    ],
  },
  {
    title: "5. Compartir datos con terceros",
    paragraphs: ["Podemos compartir tus datos personales con:"],
    lists: [
      [
        "Compañías aseguradoras y intermediarios de seguros para poder generarte cotizaciones y gestionar eventuales contrataciones.",
        "Proveedores de servicios tecnológicos (hosting, herramientas de análisis, envío de correos, pasarelas de pago, etc.) que actúan como encargados del tratamiento bajo contratos que garantizan la confidencialidad y seguridad.",
        "Autoridades competentes cuando exista una obligación legal o requerimiento judicial.",
      ],
    ],
    end: [
      "No vendemos ni alquilamos tus datos personales a terceros con fines comerciales ajenos a la prestación de nuestros servicios.",
    ],
  },
  {
    title: "6. Transferencias internacionales",
    paragraphs: [
      "En caso de que alguno de nuestros proveedores se encuentre fuera de tu país de residencia, nos aseguraremos de que existan garantías adecuadas (cláusulas contractuales tipo, decisiones de adecuación u otros mecanismos válidos) para proteger tus datos.",
    ],
  },
  {
    title: "7. Conservación de los datos",
    paragraphs: [
      "Conservaremos tus datos personales durante el tiempo necesario para cumplir con las finalidades descritas y, posteriormente, durante los plazos legalmente exigidos para atender posibles responsabilidades o reclamaciones. Una vez finalizados dichos plazos, procederemos a su eliminación o anonimización segura.",
    ],
  },
  {
    title: "8. Cookies y tecnologías similares",
    paragraphs: [
      "Utilizamos cookies propias y de terceros para el funcionamiento técnico de la Plataforma, análisis de uso y, en su caso, publicidad. Puedes configurar tus preferencias de cookies a través del banner de consentimiento o de la configuración de tu navegador. Para más información, consulta nuestra Política de Cookies (si existe una sección específica).",
    ],
  },
  {
    title: "9. Derechos de los usuarios",
    paragraphs: [
      "De acuerdo con la legislación aplicable en materia de protección de datos (incluyendo, según corresponda, la normativa local de tu país), tienes derecho a:",
    ],
    lists: [
      [
        "Acceder a tus datos personales.",
        "Rectificar datos inexactos o incompletos.",
        "Solicitar la supresión de tus datos (“derecho al olvido”).",
        "Oponerte al tratamiento.",
        "Solicitar la limitación del tratamiento.",
        "Portabilidad de los datos.",
        "Retirar el consentimiento en cualquier momento (sin afectar la licitud del tratamiento previo).",
        "Presentar una reclamación ante la autoridad de control competente.",
      ],
    ],
    end: [
      "Para ejercer cualquiera de estos derechos, envíanos una solicitud a agusmontespas@gmail.com adjuntando una copia de tu documento de identidad o medio equivalente que permita verificarte.",
    ],
  },
  {
    title: "10. Seguridad de la información",
    paragraphs: [
      "Implementamos medidas técnicas y organizativas adecuadas para proteger tus datos personales contra el acceso no autorizado, pérdida, alteración o destrucción. Sin embargo, ningún sistema es 100 % seguro; por ello, te recomendamos también adoptar buenas prácticas de seguridad (no compartir contraseñas, utilizar conexiones seguras, etc.).",
    ],
  },
  {
    title: "11. Menores de edad",
    paragraphs: [
      "Nuestros servicios no están dirigidos a menores de 18 años. No recopilamos intencionadamente datos de menores. Si detectamos que hemos recibido datos de un menor sin el consentimiento parental correspondiente, procederemos a eliminarlos.",
    ],
  },
  {
    title: "12. Modificaciones a esta Política",
    paragraphs: [
      "Podemos actualizar esta Política de Privacidad en cualquier momento. La versión vigente será siempre la publicada en esta página, con indicación de la fecha de la última actualización. Te recomendamos revisarla periódicamente. El uso continuado de la Plataforma después de cualquier cambio implica la aceptación de la nueva versión.",
    ],
  },
  {
    title: "13. Contacto",
    paragraphs: [
      "Si tienes dudas, comentarios o deseas ejercer tus derechos en relación con esta Política de Privacidad, puedes contactarnos en:",
      "Correo: agusmontespas@gmail.com",
      "Domicilio: Av. San Martín Sur 6996, M5505 Luján de Cuyo, Mendoza",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="section">
      <article
        className="container privacy-policy"
        style={{ maxWidth: 820, lineHeight: 1.75 }}
      >
        <Link href="/">← Volver a la landing</Link>
        <h1 style={{ fontSize: "clamp(2rem,5vw,3.2rem)", marginTop: 24 }}>
          Política de Privacidad
        </h1>
        <p><strong>Última actualización:</strong> Octubre de 2026</p>
        <p>
          En CotizaTuSeguro (en adelante, “nosotros”, “nuestro” o “la
          Plataforma”), accesible a través de https://cotizatuseguro.com.ar/,
          nos comprometemos a proteger la privacidad y los datos personales de
          nuestros usuarios. Esta Política de Privacidad describe cómo
          recopilamos, utilizamos, almacenamos, compartimos y protegemos tu
          información personal cuando utilizas nuestros servicios de cotización
          de seguros.
        </p>
        <p>
          Al utilizar nuestra Plataforma, aceptas las prácticas descritas en
          esta Política. Si no estás de acuerdo, te pedimos que no utilices
          nuestros servicios.
        </p>

        {sections.map((section) => (
          <section key={section.title} style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: "1.35rem", marginBottom: 12 }}>
              {section.title}
            </h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.lists?.map((items, index) => (
              <ul key={index}>
                {items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            ))}
            {section.after?.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.listsAfter?.map((items, index) => (
              <ul key={index}>
                {items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            ))}
            {section.end?.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
        ))}
      </article>
    </main>
  );
}
