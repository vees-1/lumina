import { ProductPage } from "@/components/lumina/product-page";

export default function SupportPage() {
  return (
    <ProductPage
      title="Contact Support"
      subtitle="Reach Lumina support for clinic onboarding, account access, and workflow setup."
      image="/lumina/doctor-hero.avif"
      imagePosition="center 14%"
      cards={[
        { title: "Clinic onboarding help", text: "Set up doctor profile, referral preferences, and dashboard workflows." },
        { title: "Account recovery", text: "Keep Clerk authentication while supporting clinic users cleanly." },
        { title: "Implementation guidance", text: "Map production behavior to Lumina's rare disease workflow." },
      ]}
    />
  );
}
