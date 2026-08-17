import Link from "next/link";
import {
  ArrowRight,
  Headphones,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Smartphone,
  Truck,
  Zap,
} from "lucide-react";
import { Suspense } from "react";

import AccountVerifiedToast from "@/components/storefront/account-verified-toast";
import StoreFooter from "@/components/storefront/store-footer";
import StoreHeader from "@/components/storefront/store-header";
import V2Homepage from "@/components/stereophonie-v2/home/v2-homepage";
import StoreProductCard, {
  type StoreProductCardProduct,
} from "@/components/storefront/store-product-card";
import { createClient } from "@/lib/supabase/server";

type ProductImage = {
  image_url: string | null;
  alt_text: string | null;
  position: number;
  is_primary: boolean;
};

type ProductVariant = {
  regular_price: number | null;
  sale_price: number | null;
  stock_quantity: number;
  availability_status:
    "in_stock" | "low_stock" | "out_of_stock" | "coming_soon" | null;
};

type CategoryRelation = { name: string } | { name: string }[] | null;

type Product = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  is_featured: boolean | null;
  is_trending: boolean | null;
  is_new_arrival: boolean | null;
  categories: CategoryRelation;
  product_images: ProductImage[] | null;
  product_variants: ProductVariant[] | null;
};

type Category = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
};

const productSelection = `
  id,
  name,
  slug,
  description,
  is_featured,
  is_trending,
  is_new_arrival,
  categories(name),
  product_images(
    image_url,
    alt_text,
    position,
    is_primary
  ),
  product_variants(
    regular_price,
    sale_price,
    stock_quantity,
    availability_status
  )
`;

function categoryName(category: CategoryRelation) {
  if (!category) return "Technology";
  if (Array.isArray(category)) return category[0]?.name ?? "Technology";
  return category.name;
}

function normalizeProduct(product: Product): StoreProductCardProduct {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    categoryName: categoryName(product.categories),
    is_featured: product.is_featured,
    is_trending: product.is_trending,
    is_new_arrival: product.is_new_arrival,
    images: product.product_images ?? [],
    variants: product.product_variants ?? [],
  };
}

function primaryImage(product: Product | null) {
  if (!product) return null;

  const images = [...(product.product_images ?? [])]
    .filter((image) => image.image_url)
    .sort((a, b) => a.position - b.position);

  return images.find((image) => image.is_primary) ?? images[0] ?? null;
}

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: productRows }, { data: categoryRows }] = await Promise.all([
    supabase
      .from("products")
      .select(productSelection)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(12),

    supabase
      .from("categories")
      .select("id,name,slug,image_url")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .limit(8),
  ]);

  const products = (productRows ?? []) as Product[];
  const categories = (categoryRows ?? []) as Category[];

  const heroProduct =
    products.find((product) => product.is_featured) ?? products[0] ?? null;

  const heroImage = primaryImage(heroProduct);

  const productCards = products.slice(0, 8).map(normalizeProduct);

  return <V2Homepage products={productCards} categories={categories} />;
}
