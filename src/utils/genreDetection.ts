export function genreToI18nKey(genre: string): string {
  return genre
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

const GENRE_MAP: Record<string, string[]> = {
  Fantasy: [
    "fantasy",
    "wizard",
    "witch",
    "sorcery",
    "dragon",
    "fairy tale",
    "elves",
    "mythology",
    "magic",
    "magia",
    "fantástica",
    "imaginary",
    "quests",
    "good and evil",
    "discworld",
    "monsters",
  ],
  "Science Fiction": [
    "science fiction",
    "sci-fi",
    "space opera",
    "cyberpunk",
    "dystopi",
    "life on other planets",
    "extraterrestrial",
    "robots",
    "time travel",
  ],
  "Historical Fiction": ["historical"],
  Horror: ["horror", "ghost stories", "supernatural", "vampire", "zombie", "paranormal"],
  Humor: ["humor", "humour", "comedy", "satire"],
  "Mystery and detective stories": [
    "mystery",
    "detective",
    "crime fiction",
    "murder",
    "police",
    "investigation",
  ],
  Romance: [
    "romance",
    "romántic",
    "love stories",
    "romantic",
    "lovers",
    "courtship",
    "forbidden love",
    "erotica",
  ],
  Thriller: ["thriller", "suspense", "espionage"],
  "Young Adult": [
    "young adult",
    "ya fiction",
    "juvenile",
    "ficción juvenil",
    "novela juvenil",
    "children's",
    "picture book",
  ],
  "Short Stories": ["short stories", "short story"],
  Poetry: ["poetry", "poems"],
  Drama: ["drama"],
  Literature: ["literary fiction", "classics"],
  Plays: ["plays", "theatre"],
};

export function detectGenre(subjects: string[] | undefined): string | undefined {
  if (!subjects || subjects.length === 0) return undefined;

  for (const subject of subjects) {
    const lower = subject.toLowerCase();
    for (const [genre, keywords] of Object.entries(GENRE_MAP)) {
      if (keywords.some((k) => lower.includes(k))) return genre;
    }
  }

  // Fallback
  const fiction = subjects.some((s) => s.toLowerCase() === "fiction");
  return fiction ? "Fiction" : "Non-Fiction";
}

export function detectGenres(subjects: string[] | undefined): string[] {
  if (!subjects || subjects.length === 0) return [];

  const found: string[] = [];
  for (const subject of subjects) {
    const lower = subject.toLowerCase();
    for (const [genre, keywords] of Object.entries(GENRE_MAP)) {
      if (keywords.some((k) => lower.includes(k)) && !found.includes(genre)) {
        found.push(genre);
        if (found.length === 2) return found;
      }
    }
  }

  if (found.length > 0) return found;

  // Fallback
  const fiction = subjects.some((s) => s.toLowerCase() === "fiction");
  return [fiction ? "Fiction" : "Non-Fiction"];
}

export function genreFieldsFromSubjects(subjects: string[] | undefined): {
  genre: string | undefined;
  genre2: string | undefined;
  topics: string[];
} {
  const genres = detectGenres(subjects);
  return {
    genre: genres[0],
    genre2: genres[1],
    topics: subjects ?? [],
  };
}
