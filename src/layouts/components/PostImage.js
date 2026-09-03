import { getManifestEntry } from "@lib/cloudinary";
import Image from "next/image";
import Picture from "./Picture";

// Featured/post images: use the Cloudinary responsive <picture> when the
// image has been registered in the breakpoints manifest, otherwise fall
// back to the theme's original next/image behavior (local files).
const PostImage = ({ src, alt, width, height, sizes, className, priority }) => {
  if (!getManifestEntry(src)) {
    return (
      <Image
        src={src}
        alt={alt || ""}
        width={width}
        height={height}
        className={className}
        priority={priority}
      />
    );
  }
  return (
    <Picture
      src={src}
      alt={alt || ""}
      width={width}
      height={height}
      sizes={sizes}
      className={className}
      priority={priority}
    />
  );
};

export default PostImage;
