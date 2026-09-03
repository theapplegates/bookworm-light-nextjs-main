#!/usr/bin/env node
// Upload an image to Cloudinary, derive responsive breakpoint widths, and
// record them in src/data/cloudinary-breakpoints.json (the build-time cache
// that src/lib/cloudinary.ts + Picture read from).
//
//   pnpm cloudinary:breakpoints public/images/foo.jpg
//
// Run only when you add or replace an image — not on every build.

import { v2 as cloudinary } from "cloudinary";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

// Plain `node` does not auto-load .env the way Next.js and bun do.
// .env.local wins over .env; values already exported in the shell win over both.
for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || line.trimStart().startsWith("#")) continue;
    if (process.env[m[1]] === undefined)
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
  process.env;
if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error(
    "Missing Cloudinary credentials. Set CLOUDINARY_CLOUD_NAME, " +
      "CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env/.env.local.",
  );
  process.exit(1);
}
cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

// Mirrors normalizePublicId() in src/lib/cloudinary.ts — keep in sync.
function getPublicId(filePath) {
  return path
    .relative(process.cwd(), path.resolve(filePath))
    .replace(/\\/g, "/")
    .replace(/^(public|src)\//, "")
    .replace(/\.[a-z0-9]+$/i, "");
}

const FALLBACK_WIDTHS = [200, 400, 600, 800, 1000, 1200, 1600, 2000];
const CACHE_PATH = "src/data/cloudinary-breakpoints.json";

async function run() {
  // pnpm/npm may forward a literal "--"; take the first real file argument.
  const file = process.argv.slice(2).find((a) => a !== "--");
  if (!file) {
    console.error(
      "Usage: pnpm cloudinary:breakpoints <path/to/image.jpg>\n" +
        "       (works with images under public/, src/, or anywhere else)",
    );
    process.exit(1);
  }
  if (!existsSync(file)) {
    console.error(`File not found: ${file}`);
    process.exit(1);
  }

  const publicId = getPublicId(file);
  console.log(`Processing "${file}" using public_id "${publicId}"`);

  const res = await cloudinary.uploader.upload(file, {
    public_id: publicId,
    overwrite: true,
    resource_type: "image",
    // Cloudinary computes widths by byte-size savings and (with
    // create_derived) pre-generates the derived images, so first
    // requests don't pay transform latency.
    responsive_breakpoints: [
      {
        create_derived: true,
        bytes_step: 20000,
        min_width: 200,
        max_width: 2000,
        max_images: 8,
        transformation: { crop: "limit", quality: "auto" },
      },
    ],
  });

  let widths =
    res.responsive_breakpoints?.[0]?.breakpoints?.map((b) => b.width) ?? [];
  if (widths.length === 0) {
    console.warn(
      "responsive_breakpoints returned nothing; falling back to fixed widths",
    );
    widths = FALLBACK_WIDTHS.filter((w) => w <= res.width);
    if (widths.at(-1) !== res.width) widths.push(Math.min(res.width, 2000));
  }
  widths = [...new Set(widths)].sort((a, b) => a - b);

  const cache = existsSync(CACHE_PATH)
    ? JSON.parse(readFileSync(CACHE_PATH, "utf8"))
    : {};
  cache[publicId] = { width: res.width, height: res.height, widths };
  mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + "\n");

  console.log(`Successfully handled: ${publicId}`);
  console.log(`Original size: ${res.width}x${res.height}`);
  console.log(`Breakpoints: ${widths.join(", ")}`);
  console.log(`Updated breakpoints cache at ${path.resolve(CACHE_PATH)}`);
  console.log(`
To use it in a post, either set it as the frontmatter image:

  image: "/${publicId}.${res.format}"

or embed it anywhere in the .md body (no import needed):

  <Picture
    src="${publicId}"
    alt="TODO: describe this image"
    sizes="(min-width: 1000px) 1000px, 100vw"
  />

Then commit src/data/cloudinary-breakpoints.json together with the post.
The JSON is bundled at build time — restart the dev server to pick it up.`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
