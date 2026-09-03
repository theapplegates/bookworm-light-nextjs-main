import {
  DEFAULT_WIDTHS,
  cloudinaryUrl,
  cloudName,
  getManifestEntry,
  normalizePublicId,
} from "@lib/cloudinary";

type Props = {
  src: string; // Cloudinary public ID or a local path that normalizes to one ("images/foo", "/images/foo.jpg")
  alt: string;
  width?: number;
  height?: number;
  sizes?: string;
  className?: string;
  priority?: boolean;
};

// jxl first: browsers pick the FIRST <source> type they support,
// so the smallest-format-first ordering is what actually delivers JXL.
const FORMATS = [
  { format: "jxl", type: "image/jxl" },
  { format: "avif", type: "image/avif" },
  { format: "webp", type: "image/webp" },
] as const;

const DEFAULT_SIZES = "100vw";

const Picture = ({
  src,
  alt,
  width,
  height,
  sizes = DEFAULT_SIZES,
  className,
  priority = false,
}: Props) => {
  const entry = getManifestEntry(src);

  // Passthrough for anything Cloudinary can't or shouldn't serve:
  // remote URLs, data URIs, or a missing cloud name at build time.
  if (!cloudName || !src || /^(https?:)?\/\//.test(src) || src.startsWith("data:")) {
    return (
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
      />
    );
  }

  const publicId = normalizePublicId(src);
  const widths = [...new Set(entry?.widths ?? DEFAULT_WIDTHS)].sort(
    (a, b) => a - b,
  );
  const intrinsicWidth = width ?? entry?.width;
  const intrinsicHeight = height ?? entry?.height;
  // The <img> fallback: f_auto lets Cloudinary negotiate the best format
  // the browser accepts (this also covers JPEG for old browsers).
  const fallbackWidth = Math.min(1200, widths[widths.length - 1]);

  const srcSet = (format?: string) =>
    widths
      .map((w) => `${cloudinaryUrl(publicId, format ? { w, f: format } : { w })} ${w}w`)
      .join(", ");

  return (
    <picture className={className}>
      {FORMATS.map(({ format, type }) => (
        <source
          key={format}
          type={type}
          srcSet={srcSet(format)}
          sizes={sizes}
        />
      ))}
      <img
        src={cloudinaryUrl(publicId, { w: fallbackWidth })}
        srcSet={srcSet()}
        sizes={sizes}
        alt={alt}
        width={intrinsicWidth}
        height={intrinsicHeight}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding={priority ? "sync" : "async"}
      />
    </picture>
  );
};

export default Picture;
