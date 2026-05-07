import { ProductPage } from "@/components/lumina/product-page";

export default function AboutPage() {
  return (
    <ProductPage
      title="About Lumina"
      subtitle="Lumina is a doctor-led rare disease triage workspace for collecting clinical evidence, reviewing HPO terms, and generating referral-ready outputs."
      image="/lumina/doctor-start-blue.webp"
      imagePosition="center 18%"
      cards={[
        { title: "Doctor-first workflow", text: "The clinician remains responsible for accepting or rejecting phenotype suggestions before any score is generated." },
        { title: "Evidence traceability", text: "Notes, photos, lab reports, and genetic context remain tied to the HPO terms they support." },
        { title: "Referral-ready output", text: "Accepted evidence can be transformed into a structured scorecard and referral letter for specialist handoff." },
      ]}
    />
  );
}
