import Image from "next/image";

type BrandLogoProps = {
  variant?: "black" | "white";
  className?: string;
  priority?: boolean;
};

export default function BrandLogo({
  variant = "black",
  className = "",
  priority = false,
}: BrandLogoProps) {
  return (
    <Image
      src="/brand/nita-style-logo-white.png"
      alt="Nita Style"
      width={1000}
      height={300}
      priority={priority}
      className={`h-auto object-contain ${
        variant === "black" ? "brightness-0" : ""
      } ${className}`}
    />
  );
}
