import { ImageResponse } from "next/og";
import { iconMark } from "../_icon-shared";

export function GET() {
  return new ImageResponse(iconMark(192), {
    width: 192,
    height: 192,
    headers: { "cache-control": "public, max-age=31536000, immutable" },
  });
}
