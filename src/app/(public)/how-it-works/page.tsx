import { HowItWorksContent } from "@/components/how-it-works-content";

export const metadata = { title: "How it works — TransferSetu" };

export default function HowItWorksPage() {
  return (
    <div className="px-4 py-12">
      <HowItWorksContent showCta />
    </div>
  );
}
