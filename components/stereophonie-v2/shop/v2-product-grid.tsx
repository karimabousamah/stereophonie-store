import type { StoreProductCardProduct } from "@/components/storefront/store-product-card";
import V2ProductCard from "@/components/stereophonie-v2/shop/v2-product-card";

type Props = {
  products: StoreProductCardProduct[];
};

export default function V2ProductGrid({ products }: Props) {
  return (
    <div className="st-product-card-canonical-context st3-shop-card-context">
      <div className="st3-shop-v4__grid st-product-grid-canonical">
        {products.map((product, index) => (
          <V2ProductCard key={product.id} product={product} index={index} />
        ))}
      </div>
    </div>
  );
}
