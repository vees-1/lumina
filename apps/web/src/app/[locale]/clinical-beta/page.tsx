import { ProductPage } from "@/components/lumina/product-page";

export default function ClinicalBetaPage() {
  return (
    <ProductPage
      title="Clinical Beta"
      subtitle="The Lumina beta focuses on the in-clinic workflow: evidence intake, doctor HPO approval, rare disease scoring, and referral output."
      image="/lumina/doctor-review-1473042992.webp"
      imagePosition="center 18%"
      cards={[
        { title: "Evidence intake", text: "Collect clinical notes, patient photos, lab reports, and genetic evidence in one workspace." },
        { title: "Clinician approval", text: "Suggestions stay pending until reviewed, edited, accepted, or rejected by the doctor." },
        { title: "Scorecard generation", text: "Approved HPO terms drive the scorecard and referral workflow after case review." },
      ]}
    />
  );
}
