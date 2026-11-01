import "server-only";
import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { getSupabaseEnv } from "@/lib/supabase/env";

export const PRODUCTS_TAG = "products";

export type PublicProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  description: string | null;
  image_url: string | null;
};

type ProductsQuery = {
  select(c: string): {
    eq(c: string, v: string | boolean): {
      eq(c: string, v: string | boolean): {
        order(c: string, o: { ascending: boolean }): {
          limit(n: number): PromiseLike<{ data: PublicProduct[] | null; error: { message: string } | null }>;
        };
      };
    };
  };
};

/** Live (is_active) products in a website category. Empty when the backend isn't connected yet. */
export const getCategoryProducts = unstable_cache(
  async (category: string): Promise<PublicProduct[]> => {
    const env = getSupabaseEnv();
    if (!env) return [];
    try {
      const client = createClient(env.url, env.anonKey, { auth: { persistSession: false } });
      const { data, error } = await (client.from("products") as unknown as ProductsQuery)
        .select("id,name,slug,price,description,image_url")
        .eq("category", category)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error || !data) return [];
      return data.map((p) => ({ ...p, price: Number(p.price) || 0 }));
    } catch {
      return [];
    }
  },
  ["category-products-v1"],
  { tags: [PRODUCTS_TAG], revalidate: 60 },
);
