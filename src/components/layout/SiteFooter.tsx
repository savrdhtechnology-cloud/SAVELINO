import { resolveCategories } from "@/lib/catalogue";
import { getVisibleCategories } from "@/lib/data/catalog-server";
import { Footer } from "./Footer";

/** Server wrapper: passes the website's switched-on categories to the client footer. */
export async function SiteFooter() {
  const categories = resolveCategories(await getVisibleCategories());
  return <Footer categories={categories.map((c) => ({ label: c.title, href: `/collections/${c.slug}` }))} />;
}
