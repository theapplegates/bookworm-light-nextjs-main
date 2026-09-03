import manifest from "../data/cloudinary-breakpoints.json";

export type ManifestEntry = {
  width: number;
  height: number;
  widths: number[];
};

// Single source of truth. Written by scripts/cloudinary-breakpoints.mjs,
// keyed by Cloudinary public ID (e.g. "images/wallace-henry--uKWSU9q47w-unsplash").
const entries = manifest as Record<string, ManifestEntry>;

export const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

// Used when an image has no manifest entry yet. c_limit keeps Cloudinary
// from upscaling images that are narrower than these.
export const DEFAULT_WIDTHS = [200, 400, 600, 800, 1000, 1200, 1600, 2000];

// "/images/foo.jpg", "public/images/foo.jpg", "src/images/foo.jpg" -> "images/foo"
export function normalizePublicId(src: string): string {
  return src
    .trim()
    .replace(/^\/+/, "")
    .replace(/^(public|src)\//, "")
    .replace(/\.[a-z0-9]+$/i, "");
}

export function getManifestEntry(src: string): ManifestEntry | undefined {
  return entries[normalizePublicId(src)];
}

export function cloudinaryUrl(
  publicId: string,
  opts: { w?: number; f?: string } = {},
): string {
  const { w, f = "auto" } = opts;
  const t = [`f_${f}`, "q_auto"];
  if (w) t.push("c_limit", `w_${w}`);
  return `https://res.cloudinary.com/${cloudName}/image/upload/${t.join(",")}/${publicId}`;
}
