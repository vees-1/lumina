import { ProductPage } from "@/components/lumina/product-page";

export default function RareDiseaseScoringPage() {
  return (
    <ProductPage
      title="Rare Disease Scoring"
      subtitle="Rank Orphanet-linked rare disease differentials using accepted clinical phenotypes and genetic evidence."
      image="/lumina/doctor-referral.avif"
      imagePosition="center 10%"
      cards={[
        { title: "Transparent ranking", text: "Show contributing, missing, and differentiating HPO terms for each result." },
        { title: "Doctor-approved inputs", text: "Prevent hallucinated outputs by requiring accepted evidence first." },
        { title: "Referral-ready scorecard", text: "Summaries can be shared with a specialist after clinical review." },
      ]}
    />
  );
}
