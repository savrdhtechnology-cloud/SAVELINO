import { enabledCategories } from "@/lib/catalogue";
import { getSiteSettings } from "@/lib/settings-server";
import { Footer } from "./Footer";

/** Server wrapper: passes the website's switched-on categories to the client footer. */
export async function SiteFooter() {
  const { catalogue } = await getSiteSettings();
  return <Footer categories={enabledCategories(catalogue).map((c) => ({ label: c.title, href: `/collections/${c.slug}` }))} />;
}
