import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Unsend.",
    short_name: "Unsend.",
    description: "For everything you almost said.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fffbeb",
    theme_color: "#fffbeb",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "16x16 32x32",
        type: "image/x-icon",
      },
    ],
    // Web Share Target (Android / installed PWA): any app's share sheet can
    // send a draft straight into the composer. iOS ignores this — the native
    // Share Extension covers it there (development plan, Phase 3).
    share_target: {
      action: "/",
      method: "GET",
      params: {
        title: "title",
        text: "text",
        url: "url",
      },
    },
  };
}
