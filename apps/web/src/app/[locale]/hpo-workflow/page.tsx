import { ProductPage } from "@/components/lumina/product-page";

export default function HpoWorkflowPage() {
  return (
    <ProductPage
      title="HPO Review Workflow"
      subtitle="Lumina suggests phenotype terms, but the doctor approves, rejects, or edits them before scoring."
      image="/lumina/doctor-referral.avif"
      imagePosition="center 10%"
      cards={[
        { title: "Source evidence labels", text: "Each term shows whether it came from notes, photos, labs, or genetic context." },
        { title: "Clinician approval queue", text: "Suggestions stay pending until reviewed by the doctor." },
        { title: "Scoring gate", text: "Only approved HPO terms can contribute to the scorecard." },
      ]}
    />
  );
}
