import fantasy from "@/assets/genres/fantasy.png";
import scifi from "@/assets/genres/scifi.jpg";
import historic from "@/assets/genres/historic.png";
import mystery from "@/assets/genres/mystery.png";
import horror from "@/assets/genres/horror.png";
import romance from "@/assets/genres/romance.png";
import thriller from "@/assets/genres/thriller.jpg";

export {
  genreToI18nKey,
  detectGenre,
  detectGenres,
  genreFieldsFromSubjects,
} from "./genreDetection";

const GENRE_IMAGE_MAP: Record<string, string> = {
  Horror: horror,
  Thriller: thriller,
  "Mystery and detective stories": mystery,
  Romance: romance,
  "Science Fiction": scifi,
  "Historical Fiction": historic,
  Fantasy: fantasy,
};

const GENRE_POS_MAP: Record<string, string> = {
  Horror: "center 30%",
  Fantasy: "center top",
  "Science Fiction": "center 15%",
  "Mystery and detective stories": "center 55%",
  "Historical Fiction": "center 25%",
  Romance: "center 5%",
};

export function genreToPosition(genre: string): string | undefined {
  return GENRE_POS_MAP[genre];
}

const GENRE_SIZE_MAP: Record<string, string> = {};

export function genreToSize(genre: string): string | undefined {
  return GENRE_SIZE_MAP[genre];
}

const GENRE_COLOR_MAP: Record<string, string> = {
  Fiction: "var(--color-genre-fiction)",
  "Non-Fiction": "var(--color-genre-nonfiction)",
  "Mystery and detective stories": "var(--color-genre-mystery)",
  Romance: "var(--color-genre-romance)",
  "Science Fiction": "var(--color-genre-scifi)",
  "Historical Fiction": "var(--color-genre-historical)",
  Fantasy: "var(--color-genre-fiction)",
  Thriller: "var(--color-genre-mystery)",
};

export function genreToColorVar(genre: string): string {
  return GENRE_COLOR_MAP[genre] ?? "var(--color-genre-default)";
}

const MORE_GENRE_TITLE_KEYS: Record<string, string> = {
  Fiction: "explore.sections.moreGenreFiction",
  "Non-Fiction": "explore.sections.moreGenreNonFiction",
  "Mystery and detective stories": "explore.sections.moreGenreMystery",
  Romance: "explore.sections.moreGenreRomance",
  "Science Fiction": "explore.sections.moreGenreSciFi",
  "Historical Fiction": "explore.sections.moreGenreHistoricalFiction",
  Fantasy: "explore.sections.moreGenreFantasy",
  Thriller: "explore.sections.moreGenreThriller",
};

export function moreGenreTitleKey(genre: string | undefined): string {
  return (genre && MORE_GENRE_TITLE_KEYS[genre]) ?? "explore.sections.moreGenre";
}

export function genreToImage(genre: string): string | undefined {
  return GENRE_IMAGE_MAP[genre];
}
