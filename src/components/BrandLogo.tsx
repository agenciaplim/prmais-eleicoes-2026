import Image from "next/image";

const variants = {
  azul: "/brand/prmais-azul.png",
  bege: "/brand/prmais-bege.png",
  verde: "/brand/prmais-verde.png",
  laranja: "/brand/prmais-laranja.png"
} as const;

type BrandLogoProps = {
  variant?: keyof typeof variants;
  height?: number;
  priority?: boolean;
};

// Source artwork is 711x192 (cropped from the official PR+ files in /assets).
export function BrandLogo({ variant = "azul", height = 40, priority = false }: BrandLogoProps) {
  return (
    <Image
      src={variants[variant]}
      alt="PR Mais"
      width={Math.round((711 / 192) * height)}
      height={height}
      priority={priority}
    />
  );
}
