import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Track Your Order",
  description:
    "Check the latest delivery status for a Stereophonie order in Lebanon.",
};

export default function TrackOrderLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
