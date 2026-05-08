import Image from "next/image";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { EvidenceModuleCard, MarketingFooter, ServiceCard } from "@/components/lumina/practo-ui";

const services = [
  {
    title: "Start Rare Disease Case",
    description: "Bring notes, photos, labs, and genetics into one clinical intake.",
    image: "/lumina/confident-male-doctor-white-lab-600nw-2735790063.webp",
    href: "/en/new-case",
    objectPosition: "center 18%",
  },
  {
    title: "Doctor Review Workflow",
    description: "AI phenotype suggestions stay pending until a clinician accepts them.",
    image: "/lumina/doctor-hero.avif",
    href: "/en/clinical-reviewer",
    objectPosition: "center 14%",
  },
  {
    title: "Score Accepted Evidence",
    description: "Transparent Orphanet ranking from reviewed HPO findings only.",
    image: "/lumina/doctor-score.avif",
    href: "/en/rare-disease-scoring",
    objectPosition: "center 18%",
  },
  {
    title: "Referral Ready Output",
    description: "Generate a concise letter with doctor profile and evidence trail.",
    image: "/lumina/doctor-referral.avif",
    href: "/en/referral-letters",
    objectPosition: "center 10%",
  },
];

const evidence = [
  { kind: "notes" as const, title: "Clinical notes", action: "Extract HPO" },
  { kind: "photos" as const, title: "Patient photos", action: "Suggest traits" },
  { kind: "labs" as const, title: "Lab reports", action: "Parse findings" },
  { kind: "genetics" as const, title: "Genetic evidence", action: "Add variants" },
  { kind: "approval" as const, title: "Doctor approval", action: "Review terms" },
  { kind: "letter" as const, title: "Draft letter", action: "Create letter" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-[#2f3037]">
      <Nav />

      <main>
        <section className="mx-auto max-w-6xl px-6 pb-20 pt-24">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <ServiceCard key={service.title} {...service} />
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-10">
          <div className="mb-9 flex items-end justify-between gap-6">
            <div>
              <h1 className="text-[28px] font-bold tracking-[-0.02em]">Analyze complex clinical evidence for rare disease diagnosis</h1>
              <p className="mt-1 text-[15px] text-[#40434d]">Doctor-reviewed HPO extraction with transparent scoring and referral support</p>
            </div>
            <Link href="/en/new-case" className="hidden rounded border border-[#21aeee] px-5 py-3 text-[14px] font-medium text-[#20aeea] sm:block">
              View All Modalities
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
            {evidence.map((item) => (
              <EvidenceModuleCard key={item.title} {...item} />
            ))}
          </div>
        </section>

        <section className="border-y border-[#edf0f5] bg-[#fbfcfe]">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <h2 className="max-w-md text-[36px] font-bold leading-[1.08] tracking-[-0.03em]">Clinical intelligence that stays doctor-led</h2>
              <p className="mt-5 max-w-md text-[16px] leading-7 text-[#4f5668]">
                Lumina helps clinicians move from messy evidence to accepted phenotypes, ranked differentials, and a referral-ready summary without automating clinical acceptance.
              </p>
              <Link href="/en/new-case" className="mt-8 inline-flex rounded bg-[#38b6e8] px-6 py-3 text-[15px] font-bold text-white">
                Start a case
              </Link>
            </div>
            <div className="relative min-h-[360px] overflow-hidden rounded shadow-[0_16px_40px_rgba(0,0,0,0.12)]">
              <Image src="/lumina/doctor-hero.avif" alt="" fill sizes="(max-width: 1024px) 90vw, 720px" className="object-cover" style={{ objectPosition: "center 14%" }} priority />
              <div className="absolute bottom-8 left-8 rounded bg-white px-5 py-4 shadow-[0_8px_24px_rgba(0,0,0,0.14)]">
                <p className="text-[20px] font-bold text-[#2536a0]">Doctor-reviewed AI</p>
                <p className="text-[14px] text-[#343741]">Accepted evidence drives every score</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-6 lg:grid-cols-4">
            <div className="border border-[#e5e8f0] p-8 lg:col-span-1">
              <h2 className="text-[30px] font-bold leading-tight tracking-[-0.03em]">Designed for real clinical handoff</h2>
              <p className="mt-4 text-[15px] leading-6 text-[#5d6373]">Each step keeps the clinician in control while Lumina structures the case for rare disease triage.</p>
              <Link href="/en/hpo-workflow" className="mt-8 inline-flex rounded bg-[#38b6e8] px-5 py-3 text-[14px] font-bold text-white">
                See workflow
              </Link>
            </div>
            {[
              { label: "REVIEW", title: "AI suggestions remain pending until approved", text: "Doctor-in-the-loop by design", image: "/lumina/doctor-referral.avif", pos: "center 12%" },
              { label: "SCORE", title: "Ranked rare disease differentials with evidence", text: "Top matches and differentiating clues", image: "/lumina/doctor-score.avif", pos: "center 22%" },
              { label: "REFER", title: "Professional letter ready for specialist referral", text: "Saved doctor signature and clinic details", image: "/lumina/clinic-profile.jpg", pos: "center 18%" },
            ].map((card) => (
              <article key={card.label} className="border border-[#e5e8f0] bg-white">
                <div className="relative h-40">
                  <Image src={card.image} alt="" fill sizes="260px" className="object-cover" style={{ objectPosition: card.pos }} />
                </div>
                <div className="p-5">
                  <p className="text-[12px] font-bold text-[#16940a]">{card.label}</p>
                  <h3 className="mt-2 text-[18px] font-bold leading-tight text-[#2f3037]">{card.title}</h3>
                  <p className="mt-3 text-[14px] text-[#6a7080]">{card.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-6 pt-4 text-center">
          <h2 className="text-[32px] font-bold tracking-[-0.03em]">Built for clinical confidence</h2>
          <div className="mt-9 grid gap-6 md:grid-cols-3">
            {[
              ["Evidence audit", "Every phenotype is traceable to notes, images, lab reports, or genetic context before it contributes to scoring."],
              ["Transparent scoring", "Accepted HPO terms drive deterministic ranking instead of opaque black-box diagnosis claims."],
              ["Referral workflow", "The final output is structured for real referral work, not just a demo result screen."],
            ].map(([title, text]) => (
              <div key={title} className="border border-[#e5e8f0] p-7 text-left">
                <p className="text-[16px] leading-7 text-[#343741]">{text}</p>
                <p className="mt-5 text-[16px] font-bold text-[#2536a0]">{title}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
