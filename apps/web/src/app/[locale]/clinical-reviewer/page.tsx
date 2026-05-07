import { ProductPage } from "@/components/lumina/product-page";

export default function ClinicalReviewerPage() {
  return (
    <ProductPage
      title="Lumina Clinical Reviewer"
      subtitle="Review notes, photos, labs, and genetic evidence in one clinician-controlled workspace."
      image="/lumina/doctor-hero.avif"
      imagePosition="center 14%"
      cards={[
        { title: "Multimodal evidence intake", text: "Collect every case signal before HPO approval and scoring." },
        { title: "Accept or reject every AI suggestion", text: "Clinicians stay in control of the phenotype set used downstream." },
        { title: "Complete audit trail before scoring", text: "Each accepted term remains traceable to its source evidence." },
      ]}
    />
  );
}
