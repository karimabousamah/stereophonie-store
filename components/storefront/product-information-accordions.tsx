"use client";

import {
  ChevronDown,
  PackageCheck,
  RefreshCcw,
  ShieldCheck,
  Diamond,
  Truck,
} from "lucide-react";
import { useState } from "react";

type AccordionItem = {
  id: string;
  title: string;
  content: string;
  icon: typeof Truck;
};

type ProductInformationAccordionsProps = {
  description: string | null;
  categoryName: string;
};

export default function ProductInformationAccordions({
  description,
  categoryName,
}: ProductInformationAccordionsProps) {
  const [openItem, setOpenItem] = useState<string>("details");

  const normalizedDescription =
    description?.trim() ||
    `A selected ${categoryName.toLowerCase()} piece from the Nita Style collection.`;

  const items: AccordionItem[] = [
    {
      id: "details",
      title: "Product details",
      content: normalizedDescription,
      icon: Diamond,
    },
    {
      id: "delivery",
      title: "Delivery",
      content:
        "Orders are prepared carefully before dispatch. Delivery timing and availability depend on the destination and will be confirmed during checkout or by the Nita Style team.",
      icon: Truck,
    },
    {
      id: "returns",
      title: "Returns policy",
      content:
        "Nita Style does not accept returns. Please review the product description, selected size, price, and availability carefully before completing your order.",
      icon: RefreshCcw,
    },
    {
      id: "care",
      title: "Care guidance",
      content:
        "Always follow the care label attached to the garment. For delicate pieces, use gentle cleaning methods and avoid high heat unless the product label specifically permits it.",
      icon: PackageCheck,
    },
    {
      id: "secure",
      title: "Secure ordering",
      content:
        "Your selected product, size, quantity, and order information are reviewed during checkout. Availability is managed individually for each product option.",
      icon: ShieldCheck,
    },
  ];

  return (
    <section className="border-y border-black/10 bg-white">
      <div className="mx-auto max-w-[1600px] px-4 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/40">
              Product information
            </p>

            <h2 className="mt-4 max-w-lg text-4xl font-semibold uppercase leading-[0.95] tracking-[-0.05em] sm:text-5xl">
              Everything you need to know
            </h2>

            <p className="mt-6 max-w-md text-sm leading-7 text-black/50">
              Review the product details, delivery information, care guidance,
              and ordering policy before completing your purchase.
            </p>
          </div>

          <div className="border-t border-black/10">
            {items.map((item) => {
              const Icon = item.icon;
              const isOpen = openItem === item.id;

              return (
                <article key={item.id} className="border-b border-black/10">
                  <button
                    type="button"
                    onClick={() => setOpenItem(isOpen ? "" : item.id)}
                    aria-expanded={isOpen}
                    className="group flex w-full items-center justify-between gap-6 py-6 text-left"
                  >
                    <span className="flex items-center gap-4">
                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center border transition ${
                          isOpen
                            ? "border-black bg-black text-white"
                            : "border-black/10 bg-white text-black group-hover:border-black"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>

                      <span className="text-sm font-semibold uppercase tracking-[0.12em]">
                        {item.title}
                      </span>
                    </span>

                    <ChevronDown
                      className={`h-5 w-5 shrink-0 transition duration-300 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <div
                    className={`grid transition-all duration-300 ${
                      isOpen ? "grid-rows-[1fr] pb-7" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="max-w-2xl pl-[60px] text-sm leading-7 text-black/55">
                        {item.content}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
