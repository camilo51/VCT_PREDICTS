import { ImageResponse } from "next/og";
import { iconMark } from "../_icon-shared";

export function GET() {
  return new ImageResponse(iconMark(512), {
    width: 512,
    height: 512,
    headers: { "cache-control": "public, max-age=31536000, immutable" },
  });
}
