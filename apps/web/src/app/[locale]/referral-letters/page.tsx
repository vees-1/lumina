import { ProductPage } from "@/components/lumina/product-page";

export default function ReferralLettersPage() {
  return (
    <ProductPage
      title="Referral Letters"
      subtitle="Generate doctor-approved referral drafts from accepted HPO terms, ranked differentials, and saved clinic details."
      image="/lumina/doctor-referral.avif"
      cards={[
        { title: "Doctor profile merge", text: "Saved signature, specialty, and clinic preferences feed the letter." },
        { title: "Evidence-linked summary", text: "Referral text references accepted terms instead of raw AI guesses." },
        { title: "Specialist-ready output", text: "Prepare concise handoff letters for genetics or rare disease clinics." },
      ]}
    />
  );
}
