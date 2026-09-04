export type StereophonieEntertainmentItem = {
  id: string;
  title: string;
  kind: "Movie" | "Series";
  year: string;
  genre: string;
  tagline: string;
  posterUrl: string;
  backdropUrl: string;
  trailerPath: string;
};

export const stereophonieEntertainment: StereophonieEntertainmentItem[] = [
  {
    id: "avengers-endgame",
    title: "Avengers: Endgame",
    kind: "Movie",
    year: "2019",
    genre: "Action · Adventure",
    tagline: "Whatever it takes.",
    posterUrl:
      "https://image.tmdb.org/t/p/w780/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
    backdropUrl:
      "https://image.tmdb.org/t/p/original/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg",
    trailerPath: "/trailers/avengers-endgame.mp4",
  },
  {
    id: "oppenheimer",
    title: "Oppenheimer",
    kind: "Movie",
    year: "2023",
    genre: "Drama · History",
    tagline: "The world forever changes.",
    posterUrl:
      "https://image.tmdb.org/t/p/w780/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    backdropUrl:
      "https://image.tmdb.org/t/p/original/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg",
    trailerPath: "/trailers/oppenheimer.mp4",
  },
  {
    id: "dune-part-two",
    title: "Dune: Part Two",
    kind: "Movie",
    year: "2024",
    genre: "Science Fiction · Adventure",
    tagline: "Long live the fighters.",
    posterUrl:
      "https://image.tmdb.org/t/p/w780/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    backdropUrl:
      "https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg",
    trailerPath: "/trailers/dune-part-two.mp4",
  },
  {
    id: "the-batman",
    title: "The Batman",
    kind: "Movie",
    year: "2022",
    genre: "Crime · Mystery",
    tagline: "Unmask the truth.",
    posterUrl:
      "https://image.tmdb.org/t/p/w780/74xTEgt7R36Fpooo50r9T25onhq.jpg",
    backdropUrl:
      "https://image.tmdb.org/t/p/original/b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg",
    trailerPath: "/trailers/the-batman.mp4",
  },
  {
    id: "interstellar",
    title: "Interstellar",
    kind: "Movie",
    year: "2014",
    genre: "Science Fiction · Drama",
    tagline: "Mankind was born on Earth. It was never meant to die here.",
    posterUrl:
      "https://image.tmdb.org/t/p/w780/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    backdropUrl:
      "https://image.tmdb.org/t/p/original/xJHokMbljvjADYdit5fK5VQsXEG.jpg",
    trailerPath: "/trailers/interstellar.mp4",
  },
  {
    id: "the-last-of-us",
    title: "The Last of Us",
    kind: "Series",
    year: "2023",
    genre: "Drama · Adventure",
    tagline: "When you're lost in the darkness, look for the light.",
    posterUrl:
      "https://image.tmdb.org/t/p/w780/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg",
    backdropUrl:
      "https://image.tmdb.org/t/p/original/uDgy6hyPd82kOHh6I95FLtLnj6p.jpg",
    trailerPath: "/trailers/the-last-of-us.mp4",
  },
  {
    id: "stranger-things",
    title: "Stranger Things",
    kind: "Series",
    year: "2016",
    genre: "Science Fiction · Mystery",
    tagline: "Every ending has a beginning.",
    posterUrl:
      "https://image.tmdb.org/t/p/w780/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
    backdropUrl:
      "https://image.tmdb.org/t/p/original/56v2KjBlU4XaOv9rVYEQypROD7P.jpg",
    trailerPath: "/trailers/stranger-things.mp4",
  },
  {
    id: "breaking-bad",
    title: "Breaking Bad",
    kind: "Series",
    year: "2008",
    genre: "Crime · Drama",
    tagline: "All bad things must come to an end.",
    posterUrl:
      "https://image.tmdb.org/t/p/w780/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg",
    backdropUrl:
      "https://image.tmdb.org/t/p/original/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg",
    trailerPath: "/trailers/breaking-bad.mp4",
  },
];

export function isMoviesSeriesCategory(input: {
  name?: string | null;
  slug?: string | null;
}) {
  const value = `${input.name ?? ""} ${input.slug ?? ""}`
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ");

  return (
    value.includes("movies and series") ||
    value.includes("movie and series") ||
    value.includes("movies series") ||
    value.includes("movie series") ||
    value.includes("films and series") ||
    value.includes("film and series") ||
    value.includes("films series") ||
    value.includes("film series")
  );
}
