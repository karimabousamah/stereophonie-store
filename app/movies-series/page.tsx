import { V3Header } from "@/components/stereophonie-v3/layout/v3-header";
import V3Footer from "@/components/stereophonie-v3/layout/v3-footer";
import type { Metadata } from "next";

import MovieSeriesRequestForm from "@/components/movies-series/movie-series-request-form";

export const metadata: Metadata = {
  title: "Movies & Series | Stereophonie",
  description:
    "Request movies and series from Stereophonie and receive availability and pricing directly on WhatsApp.",
};

export default function MoviesSeriesPage() {
  return (
    <main className="st-media-request-shell">
      <V3Header />

      <div className="st-media-request-page">
        <MovieSeriesRequestForm />
      </div>

      <V3Footer />
    </main>
  );
}
