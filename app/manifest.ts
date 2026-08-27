import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kora Health Lab",
    short_name: "Kora",
    description: "Painel de gestão do Kora Health Lab",
    start_url: "/",
    display: "standalone",
    background_color: "#3c4536",
    theme_color: "#3c4536",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };
}
