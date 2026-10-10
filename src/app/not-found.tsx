import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Monogram } from "@/components/ui/Logo";

export default function NotFound() {
  return (
    <PageShell>
      <div className="flex flex-col items-center px-5 py-24 text-center">
        <Monogram size={160} />
        <p className="eyebrow mt-8">404</p>
        <h1 className="mt-4 font-display text-5xl italic text-ivory">This page has slipped away</h1>
        <p className="mt-4 max-w-md font-serif text-xl text-ivory/65">The piece you were looking for is not here.</p>
        <div className="mt-10">
          <Button href="/">Return home</Button>
        </div>
      </div>
    </PageShell>
  );
}
