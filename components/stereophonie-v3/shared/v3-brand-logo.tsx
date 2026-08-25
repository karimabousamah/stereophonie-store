import Image from "next/image";

type V3BrandLogoProps = {
  className?: string;
  priority?: boolean;
};

export function V3BrandLogo({
  className = "",
  priority = false,
}: V3BrandLogoProps) {
  return (
    <span
      className={`st3-brand-logo ${className}`}
      aria-label="Stereophonie Store"
    >
      <Image
        src="/brand/stereophonie-store-logo.png"
        alt="Stereophonie Store"
        width={420}
        height={118}
        priority={priority}
        className="st3-brand-logo__image"
      />
    </span>
  );
}
