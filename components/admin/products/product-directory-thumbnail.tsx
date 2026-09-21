"use client";

import { useState } from "react";

type ProductDirectoryThumbnailProps = {
  src: string;
  fallbackSrc: string;
  alt: string;
};

export default function ProductDirectoryThumbnail({
  src,
  fallbackSrc,
  alt,
}: ProductDirectoryThumbnailProps) {
  const [currentSrc, setCurrentSrc] = useState(src);

  return (
    <img
      src={currentSrc}
      alt={alt}
      width={48}
      height={48}
      loading="lazy"
      decoding="async"
      fetchPriority="low"
      onError={() => {
        if (currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        }
      }}
    />
  );
}
