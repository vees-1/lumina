import { ProductPage } from "@/components/lumina/product-page";

export default function TermsPage() {
  return (
    <ProductPage
      title="Terms"
      subtitle="Lumina is designed as clinical decision-support software. Final clinical interpretation, diagnosis, and referral decisions remain with qualified clinicians."
      image="/lumina/doctor-hero.avif"
      imagePosition="center 14%"
      cards={[
        { title: "Clinical responsibility", text: "Lumina does not replace clinician judgment or specialist evaluation." },
        { title: "Approved evidence only", text: "Scoring and referral outputs should be based on clinician-approved terms and case evidence." },
        { title: "Data governance", text: "Clinics are responsible for consent, retention, sharing, and export policies in production use." },
      ]}
    />
  );
}
