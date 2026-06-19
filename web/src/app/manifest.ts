import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Unsent.",
    short_name: "Unsent.",
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
  };
}
