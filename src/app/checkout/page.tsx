import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { CheckoutForm } from "@/components/store/CheckoutForm";
import { getSiteSettings } from "@/lib/settings-server";

export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };

export default async function CheckoutPage() {
  const { commerce, brand } = await getSiteSettings();
  return (
    <PageShell>
      <section className="mx-auto max-w-[1200px] px-5 py-12 md:px-10 md:py-16">
        <p className="eyebrow">Checkout</p>
        <h1 className="mt-3 font-display text-4xl text-ivory md:text-5xl">Almost yours</h1>
        <CheckoutForm shippingFee={commerce.shippingFee} freeShippingAbove={commerce.freeShippingAbove} whatsapp={brand.whatsapp} />
      </section>
    </PageShell>
  );
}
