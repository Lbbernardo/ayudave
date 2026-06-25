import PublicLayout from "@/components/layout/PublicLayout";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import EmergencyNotice from "@/components/ui/EmergencyNotice";

export const metadata = {
  title: "Privacidad — AyudaVE",
};

export default function PrivacidadPage() {
  return (
    <PublicLayout>
      <PageHeader
        title="Política de privacidad"
        subtitle="Cómo tratamos tu información en AyudaVE."
        icon="🔒"
      />

      <div className="space-y-4">
        <Card>
          <h2 className="text-lg font-bold text-gray-900">
            Qué datos recopilamos
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
            <li>Nombre y datos de contacto que decides compartir.</li>
            <li>
              Detalles del reporte: tipo de ayuda, urgencia, descripción y número
              de personas afectadas.
            </li>
            <li>
              Ubicación (estado, ciudad, dirección y coordenadas) cuando la
              proporcionas o usas el botón &quot;Usar mi ubicación&quot;.
            </li>
            <li>
              Información de voluntarios y donaciones (habilidades, vehículo,
              disponibilidad, recursos ofrecidos).
            </li>
          </ul>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-gray-900">Para qué se usan</h2>
          <p className="mt-2 text-sm text-gray-700">
            Los datos se usan <strong>únicamente</strong> para la coordinación de
            ayuda humanitaria tras la emergencia: priorizar casos, asignar
            voluntarios, organizar donaciones y reunir a familiares. No se venden
            ni se usan con fines comerciales.
          </p>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-gray-900">
            Los teléfonos no se muestran públicamente
          </h2>
          <p className="mt-2 text-sm text-gray-700">
            En las páginas públicas (como el mapa o los listados) los números de
            teléfono <strong>nunca</strong> aparecen completos. Solo los
            coordinadores autorizados pueden ver los datos de contacto completos
            para gestionar la ayuda.
          </p>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-gray-900">
            Uso para coordinación humanitaria
          </h2>
          <p className="mt-2 text-sm text-gray-700">
            Al enviar un reporte aceptas que tu información pueda ser utilizada por
            organizaciones y voluntarios para coordinar la respuesta a la
            emergencia. Procuramos compartir el mínimo de datos necesarios.
          </p>
        </Card>

        <EmergencyNotice />
      </div>
    </PublicLayout>
  );
}
