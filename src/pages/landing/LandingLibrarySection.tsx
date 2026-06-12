import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import "./LandingLibrarySection.scss";

import coverCalalobos from "@/assets/landing-book-calabobos.jpg";
import coverTemor from "@/assets/landing-book-temor.jpg";
import coverYoRobot from "@/assets/landing-book-yorobot.jpg";
import coverSenor from "@/assets/landing-book-senor.jpg";
import coverTrono from "@/assets/landing-book-trono.jpg";
import coverGratitudes from "@/assets/landing-book-gratitudes.jpg";
import coverHambre from "@/assets/landing-book-hambre.jpg";
import coverShogun from "@/assets/landing-book-shogun.png";
import coverFrankenstein from "@/assets/landing-book-frankenstein.jpg";
import coverHarryPotter from "@/assets/landing-book-harrypotter.jpg";
import coverJuegoTronos from "@/assets/landing-book-juegotronos.jpg";
import coverCriada from "@/assets/landing-book-criada.jpg";
import coverIt from "@/assets/landing-book-it.jpg";
import coverPedro from "@/assets/landing-book-pedro.jpg";

type ReadingBook = {
  title: string;
  author: string;
  pct: number;
  pages: string;
  cover: string;
};

type ShelfBook = {
  title: string;
  cover: string;
};

type ShelfKey = "wantToRead" | "reading" | "finished" | "didNotFinish";

const READING_BOOKS: ReadingBook[] = [
  { title: "Calabobos", author: "Luis Mario", pct: 35, pages: "123 / 352", cover: coverCalalobos },
  {
    title: "El Temor de un Hombre Sabio",
    author: "Patrick Rothfuss",
    pct: 62,
    pages: "412 / 994",
    cover: coverTemor,
  },
  { title: "Yo, Robot", author: "Isaac Asimov", pct: 88, pages: "220 / 250", cover: coverYoRobot },
];

const SHELF_BOOKS: Record<ShelfKey, ShelfBook[]> = {
  wantToRead: [
    { title: "El Señor de los Anillos", cover: coverSenor },
    { title: "Trono de Cristal", cover: coverTrono },
    { title: "Las Gratitudes", cover: coverGratitudes },
    { title: "Los Juegos del Hambre", cover: coverHambre },
    { title: "Shogun", cover: coverShogun },
  ],
  reading: [
    { title: "Calabobos", cover: coverCalalobos },
    { title: "El Temor de un Hombre Sabio", cover: coverTemor },
    { title: "Yo, Robot", cover: coverYoRobot },
  ],
  finished: [
    { title: "Frankenstein", cover: coverFrankenstein },
    { title: "Harry Potter y la Piedra Filosofal", cover: coverHarryPotter },
    { title: "Juego de Tronos", cover: coverJuegoTronos },
    { title: "El Cuento de la Criada", cover: coverCriada },
  ],
  didNotFinish: [
    { title: "IT", cover: coverIt },
    { title: "Pedro Páramo", cover: coverPedro },
  ],
};

const SHELF_TABS: { key: ShelfKey; label: string }[] = [
  { key: "wantToRead", label: "Quiero leer" },
  { key: "reading", label: "Leyendo" },
  { key: "finished", label: "Leído" },
  { key: "didNotFinish", label: "Abandonado" },
];

export default function LandingLibrarySection() {
  const { t } = useTranslation();
  const [readingIdx, setReadingIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<ShelfKey>("wantToRead");

  const book = READING_BOOKS[readingIdx];
  const shelfBooks = SHELF_BOOKS[activeTab];

  return (
    <section className="landing-library">
      {/* Texto izquierda */}
      <div className="landing-library__text">
        <h2 className="landing__section-title">{t("landing.library.title")}</h2>
        <p className="landing__section-subtitle">{t("landing.library.subtitle")}</p>
      </div>

      {/* UI derecha */}
      <div className="landing-library__ui">

        {/* Estoy leyendo */}
        <div>
          <div className="landing-library__block-header landing-library__block-header--reading">
            <span className="landing-library__block-label">
              {t("landing.library.readingLabel")}
            </span>
            <span className="landing-library__block-count">
              {readingIdx + 1} / {READING_BOOKS.length}
            </span>
          </div>
          <div className="landing-library__swiper-stage">
            <div className="landing-library__reading-card">
              <img className="landing-library__cover" src={book.cover} alt={book.title} />
              <div className="landing-library__reading-body">
                <div className="landing-library__reading-header">
                  <h3 className="landing-library__reading-title">{book.title}</h3>
                  <p className="landing-library__reading-author">{book.author}</p>
                </div>
                <div className="landing-library__progress-box">
                  <div className="landing-library__progress-labels">
                    <span>
                      {t("myLibrary.readingProgress")}:{" "}
                      <strong className="landing-library__progress-pct">{book.pct}%</strong>
                    </span>
                    <span>{book.pages} pág.</span>
                  </div>
                  <div className="landing-library__progress-bar">
                    <div
                      className="landing-library__progress-fill"
                      style={{ width: `${book.pct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="landing-library__chev"
              onClick={() => setReadingIdx((i) => (i + 1) % READING_BOOKS.length)}
              aria-label={t("myLibrary.nextBook")}
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Estantería */}
        <div>
          <div className="landing-library__block-header">
            <span className="landing-library__block-label">
              {t("landing.library.shelfLabel")}
            </span>
          </div>
          <div className="landing-library__shelf-card">
            <div className="landing-library__shelf-tabs">
              {SHELF_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`landing-library__shelf-tab${activeTab === tab.key ? " landing-library__shelf-tab--active" : ""}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                  <span className="landing-library__shelf-count">
                    {SHELF_BOOKS[tab.key].length}
                  </span>
                </button>
              ))}
            </div>

            <div className="landing-library__shelf-grid">
              {shelfBooks.map((entry) => (
                <div key={entry.title} className="landing-library__shelf-book">
                  <img
                    className="landing-library__cover"
                    src={entry.cover}
                    alt={entry.title}
                  />
                  <p className="landing-library__shelf-title">{entry.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
