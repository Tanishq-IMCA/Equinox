import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";

export async function GET() {
  const model = await readFile("attached_assets/tesla_powerwall_2_1786387109575.glb");
  return new NextResponse(model, {
    headers: {
      "Content-Type": "model/gltf-binary",
      "Cache-Control": "public, max-age=3600",
    },
  });
}