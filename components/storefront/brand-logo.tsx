import Image from "next/image";

type BrandLogoProps = {
  variant?: "dark" | "light";
  className?: string;
  priority?: boolean;
};

export default function BrandLogo({
  variant = "light",
  className = "",
  priority = false,
}: BrandLogoProps) {
  const src =
    variant === "dark"
      ? "/brand/stereophonie-logo-white-red.png"
      : "/brand/stereophonie-logo-black-red.png";

  return (
    <Image
      src={src}
      alt="Stereophonie Store"
      width={1500}
      height={420}
      priority={priority}
      sizes="(max-width: 768px) 180px, 260px"
      className={`block h-auto w-auto object-contain ${className}`}
    />
  );
}
