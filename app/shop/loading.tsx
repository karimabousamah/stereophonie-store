import V2Footer from "@/components/stereophonie-v2/layout/v2-footer";
import V2Header from "@/components/stereophonie-v2/layout/v2-header";
import ShopArcadeLoading from "@/components/stereophonie-v2/shop/shop-arcade-loading";

export default function ShopLoading() {
  return (
    <main className="st-v2 st-v2-shop">
      <V2Header />

      <ShopArcadeLoading />

      <V2Footer />
    </main>
  );
}
