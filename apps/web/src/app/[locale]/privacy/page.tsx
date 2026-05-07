import { ProductPage } from "@/components/lumina/product-page";

export default function PrivacyPage() {
  return (
    <ProductPage
      title="Data Privacy"
      subtitle="Patient data remains controlled by the clinic, with clear retention and export rules."
      image="/lumina/doctor-hero.avif"
      imagePosition="center 14%"
      cards={[
        { title: "Private by default", text: "Case evidence should remain tied to the clinic account and workflow." },
        { title: "Traceable access events", text: "Actions can be reviewed across intake, approval, and output generation." },
        { title: "Configurable retention", text: "Future deployment can add retention settings for each clinic." },
      ]}
    />
  );
}
