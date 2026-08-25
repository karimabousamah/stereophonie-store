import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wishlist",
  description: "Review the products saved to your Stereophonie wishlist.",
};

export default function WishlistLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
