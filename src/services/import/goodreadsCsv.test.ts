import { describe, it, expect } from "vitest";
import { parseGoodreadsCsvText, GoodreadsCsvError } from "./goodreadsCsv";

const HEADER =
  'Title,Author,ISBN,ISBN13,My Rating,My Review,Exclusive Shelf,Date Read,Date Added';

describe("parseGoodreadsCsvText", () => {
  it("mapea estados de Goodreads a ShelfStatus", () => {
    const csv = [
      HEADER,
      '"Dune","Frank Herbert","=""0441013597""","=""9780441013593""",5,"Great, epic read",read,2021/05/01,2021/01/01',
      '"It","Stephen King","","",0,"",currently-reading,,2022/02/02',
      '"1984","George Orwell","","",0,"",to-read,,2023/03/03',
    ].join("\n");

    const rows = parseGoodreadsCsvText(csv);

    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      title: "Dune",
      author: "Frank Herbert",
      isbn: "0441013597",
      isbn13: "9780441013593",
      status: "finished",
      rating: 5,
      review: "Great, epic read",
    });
    expect(rows[0].readDate).toContain("2021-05-01");
    expect(rows[1]).toMatchObject({ status: "reading", rating: undefined, review: undefined });
    expect(rows[1].readDate).toContain("2022-02-02"); // fallback a Date Added
    expect(rows[2]).toMatchObject({ status: "wantToRead" });
  });

  it("ignora filas con Exclusive Shelf desconocido", () => {
    const csv = [HEADER, '"X","Y","","",0,"",some-custom-shelf,,'].join("\n");
    expect(parseGoodreadsCsvText(csv)).toHaveLength(0);
  });

  it("limpia HTML de la reseña", () => {
    const csv = [HEADER, '"X","Y","","",4,"Line1<br/>Line2 <b>bold</b>",read,,'].join("\n");
    expect(parseGoodreadsCsvText(csv)[0].review).toBe("Line1\nLine2 bold");
  });

  it("lanza GoodreadsCsvError si faltan cabeceras clave", () => {
    expect(() => parseGoodreadsCsvText("Foo,Bar\n1,2")).toThrow(GoodreadsCsvError);
  });
});