import { getSiteSettings } from "@/lib/settings-server";
import { Header } from "./Header";

/** Server wrapper: passes the Studio-managed announcement bar to the client header. */
export async function SiteHeader() {
  const { announcement, theme } = await getSiteSettings();
  return <Header announcement={announcement.enabled && announcement.text ? announcement : null} themeToggle={theme.allowToggle} />;
}
