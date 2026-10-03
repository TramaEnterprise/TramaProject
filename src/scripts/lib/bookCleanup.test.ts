import { describe, it, expect } from "vitest";
import { analyzeBook, cleanSlashTitle, upgradeCoverUrl, computePriority, titleLanguageFlags, synopsisLangMismatch } from "./bookCleanup";

describe("cleanSlashTitle", () => {
  it("corta todo a partir del primer ' / ' literal", () => {
    expect(cleanSlashTitle("El Hobbit / o historia de una ida y una vuelta")).toBe("El Hobbit");
  });
  it("respeta barras sin espacios alrededor (no es el patrón objetivo)", () => {
    expect(cleanSlashTitle("Yes/No")).toBe("Yes/No");
  });
  it("deja intactos los títulos sin ' / '", () => {
    expect(cleanSlashTitle("Harry Potter y la piedra filosofal")).toBe("Harry Potter y la piedra filosofal");
  });
  it("recorta espacios sobrantes tras el corte", () => {
    expect(cleanSlashTitle("Dune / Book One ")).toBe("Dune");
  });
});

describe("upgradeCoverUrl", () => {
  it("construye la URL -L de OpenLibrary desde cover_id", () => {
    expect(upgradeCoverUrl(12345)).toBe("https://covers.openlibrary.org/b/id/12345-L.jpg");
  });
  it("devuelve null cuando no hay cover_id", () => {
    expect(upgradeCoverUrl(null)).toBeNull();
    expect(upgradeCoverUrl(undefined)).toBeNull();
  });
});

describe("computePriority", () => {
  it("addCount domina la prioridad", () => {
    expect(computePriority(4, 5, 20)).toBe(5420); // 5*1000 + 4*100 + 20
  });
  it("ignora el rating si hay pocos votos (<10)", () => {
    expect(computePriority(5, 0, 1)).toBe(1); // rating no cuenta; solo ratingCount
  });
  it("trata null/undefined como 0", () => {
    expect(computePriority(null, undefined, null)).toBe(0);
  });
});

describe("titleLanguageFlags", () => {
  it("marca title.es==en cuando coinciden (no localizado)", () => {
    expect(titleLanguageFlags({ es: "The Hobbit", en: "The Hobbit" })).toContain("title.es==en");
  });
  it("marca title.es missing si falta el español pero hay inglés", () => {
    expect(titleLanguageFlags({ en: "The Hobbit" })).toContain("title.es missing");
  });
  it("no marca nada cuando ambos títulos existen y difieren", () => {
    expect(titleLanguageFlags({ es: "El Hobbit", en: "The Hobbit" })).toEqual([]);
  });
});

describe("synopsisLangMismatch", () => {
  it("detecta una sinopsis 'es' escrita en inglés", () => {
    const englishText =
      "This is a long english synopsis about a hobbit who goes on an unexpected journey across the misty mountains to reclaim a lost treasure guarded by a dragon.";
    expect(synopsisLangMismatch(englishText, "es")).toBe(true);
  });
  it("acepta una sinopsis 'es' realmente en español", () => {
    const spanishText =
      "Esta es una sinopsis larga en español sobre un hobbit que emprende un viaje inesperado a través de las montañas nubladas para recuperar un tesoro perdido custodiado por un dragón.";
    expect(synopsisLangMismatch(spanishText, "es")).toBe(false);
  });
  it("no se fía de textos demasiado cortos (no marca)", () => {
    expect(synopsisLangMismatch("Hola", "es")).toBe(false);
  });
});

describe("analyzeBook", () => {
  it("auto-corrige ' / ' y portada, sin flags => auto-ok", () => {
    const entry = analyzeBook({
      key: "/works/OL1W",
      titles: { es: "El Hobbit / historia", en: "The Hobbit" },
      synopsis: {
        es: "Una sinopsis suficientemente larga en español para que el detector la valide bien sin dudas.",
        en: "A sufficiently long english synopsis so the detector validates it without any doubt at all.",
      },
      cover_id: 999,
      pages: 310,
      rating: 4,
      addCount: 7,
    });
    expect(entry.after.titles.es).toBe("El Hobbit");
    expect(entry.after.cover_url).toBe("https://covers.openlibrary.org/b/id/999-L.jpg");
    expect(entry.changes).toContain("title.es: cleaned ' / '");
    expect(entry.flags).toEqual([]);
    expect(entry.status).toBe("auto-ok");
    expect(entry.priority).toBe(7000); // 7 adds * 1000; rating no cuenta sin ratingCount
  });

  it("marca needs-claude cuando faltan páginas", () => {
    const entry = analyzeBook({
      key: "/works/OL2W",
      titles: { es: "El Hobbit", en: "The Hobbit" },
      synopsis: { es: "", en: "" },
      cover_id: 1,
      pages: null,
      rating: 0,
      addCount: 0,
    });
    expect(entry.flags).toContain("pages missing");
    expect(entry.status).toBe("needs-claude");
  });

  it("normaliza synopsis legado (string) como es", () => {
    const entry = analyzeBook({
      key: "/works/OL3W",
      titles: { es: "Libro", en: "Book" },
      synopsis: "Sinopsis antigua en formato string suelto, lo bastante larga para no marcarse corta.",
      cover_id: 2,
      pages: 100,
    });
    expect(entry.after.synopsis.es).toContain("Sinopsis antigua");
    expect(entry.flags).toContain("synopsis.en missing");
  });
});

describe("analyzeBook — flags que bloquean vs informativos", () => {
  it("sinopsis ausente sola NO bloquea (auto-ok)", () => {
    const entry = analyzeBook({
      key: "/works/OL9W",
      titles: { es: "El Hobbit", en: "The Hobbit" },
      cover_id: 5,
      pages: 200,
    });
    expect(entry.flags).toContain("synopsis.es missing");
    expect(entry.status).toBe("auto-ok");
  });

  it("title.es==en sí bloquea (needs-claude)", () => {
    const entry = analyzeBook({
      key: "/works/OL10W",
      titles: { es: "The Hobbit", en: "The Hobbit" },
      synopsis: { es: "x".repeat(50), en: "y".repeat(50) },
      cover_id: 5,
      pages: 200,
    });
    expect(entry.status).toBe("needs-claude");
  });
});
