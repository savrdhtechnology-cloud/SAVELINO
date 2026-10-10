import "server-only";
import { getCollection } from "@/lib/collections";
import type { TryOnView } from "./config";
import { TRYON_VIEWS } from "./config";

export type TryOnRequest = {
  sessionId: string;
  productId: string;
  category: string;
  mode: "quick" | "premium";
  size?: string | null;
  color?: string | null;
  inputTypes: string[];
};

export type TryOnOutput = { view: TryOnView; image_url: string | null; meta: Record<string, unknown> };

export interface TryOnProvider {
  readonly id: string;
  /** True when this provider produces real AI renders (false = labelled sample preview). */
  readonly live: boolean;
  generate(req: TryOnRequest): Promise<TryOnOutput[]>;
}

/**
 * Phase-1 mock provider. It does NOT run any AI model: it returns the product's own
 * imagery for each view, clearly labelled as a sample so nobody mistakes it for a real
 * render. The result page composites the customer's own photo for the front comparison.
 */
class MockProvider implements TryOnProvider {
  readonly id = "mock";
  readonly live = false;
  async generate(req: TryOnRequest): Promise<TryOnOutput[]> {
    const product = getCollection(req.productId) ?? getCollection(req.category);
    const image = product?.image.src ?? null;
    await new Promise((r) => setTimeout(r, 600));
    return TRYON_VIEWS.map((view) => ({
      view,
      image_url: image,
      meta: {
        provider: "mock",
        sample: true,
        estimated: view !== "front" && !req.inputTypes.includes(view),
        label: "Sample preview — AI provider not connected",
        color: req.color ?? null,
        size: req.size ?? null,
      },
    }));
  }
}

/** Selected with TRYON_PROVIDER. Only "mock" ships in Phase 1; real providers plug in here. */
export function getTryOnProvider(): TryOnProvider {
  switch ((process.env.TRYON_PROVIDER ?? "mock").toLowerCase()) {
    default:
      return new MockProvider();
  }
}
