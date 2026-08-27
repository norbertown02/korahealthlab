import { ImageResponse } from "next/og";
import { KoraLogo } from "@/components/kora-logo";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#3c4536"
        }}
      >
        <KoraLogo />
      </div>
    ),
    size
  );
}
