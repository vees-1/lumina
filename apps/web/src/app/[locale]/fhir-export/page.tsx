import { ProductPage } from "@/components/lumina/product-page";

export default function FhirExportPage() {
  return (
    <ProductPage
      title="FHIR Export"
      subtitle="Export accepted case evidence into interoperable clinical payloads for handoff systems."
      image="/lumina/doctor-referral.avif"
      imagePosition="center 10%"
      cards={[
        { title: "DiagnosticReport preview", text: "Package accepted findings into a structured clinical report." },
        { title: "Observation bundle mapping", text: "Map approved terms and evidence to portable clinical resources." },
        { title: "Downloadable JSON", text: "Keep exports available after clinician approval." },
      ]}
    />
  );
}
