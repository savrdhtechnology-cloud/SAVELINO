import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SAVLINO — A Legacy of Elegance",
    short_name: "SAVLINO",
    start_url: "/",
    display: "standalone",
    background_color: "#0B0B0B",
    theme_color: "#0B0B0B",
    icons: [{ src: "/icon.png", sizes: "512x512", type: "image/png" }],
  };
}
