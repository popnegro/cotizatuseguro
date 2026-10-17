import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de privacidad | Agustín Montes",
  description: "Información sobre el uso de datos en las solicitudes de cotización de seguros."
};

export default function PrivacyPage() {
  return <main className="section"><div className="container" style={{ maxWidth: 820 }}>
    <Link href="/">← Volver a la landing</Link>
    <h1 style={{ fontSize: "clamp(2rem,5vw,3.2rem)" }}>Política de privacidad</h1>
    <p>Esta página contiene información inicial sobre el tratamiento de los datos enviados a través del formulario de cotización. Debe revisarse y completarse con los datos del responsable antes de publicar la landing o activar campañas.</p>
    <h2>Datos recopilados</h2><p>Podemos solicitar nombre, teléfono, localidad y datos generales del producto que se desea asegurar, con la finalidad de registrar y gestionar la solicitud de cotización.</p>
    <h2>Finalidad y canal de contacto</h2><p>Los datos se utilizan para gestionar la solicitud y dar seguimiento comercial a través de WhatsApp. El formulario no constituye una cotización automática ni garantiza la contratación de una cobertura.</p>
    <h2>Gestión de solicitudes</h2><p>La solicitud puede registrarse en HubSpot para organizar el seguimiento. Los servicios de analítica y publicidad solo deben activarse conforme a las preferencias de consentimiento y a la configuración aplicable.</p>
    <h2>Conservación y derechos</h2><p>Antes del lanzamiento, el responsable debe completar la identidad y los datos de contacto pertinentes, los plazos de conservación, el procedimiento para ejercer derechos y la información legal aplicable en Argentina.</p>
    <p><strong>Importante:</strong> este texto es un borrador operativo y no reemplaza una revisión legal ni está listo para considerarse una política definitiva.</p>
  </div></main>;
}
