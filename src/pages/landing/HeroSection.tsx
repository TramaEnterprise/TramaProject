import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import "./HeroSection.scss";

import book1 from "@/assets/landing-float-1.png";
import book2 from "@/assets/landing-float-2.png";
import book3 from "@/assets/landing-float-3.png";
import book4 from "@/assets/landing-float-4.png";
import book5 from "@/assets/landing-float-5.png";
import book6 from "@/assets/landing-float-6.png";
import book7 from "@/assets/landing-float-7.png";
import book8 from "@/assets/landing-float-8.png";
import book9 from "@/assets/landing-float-9.png";
import book10 from "@/assets/landing-float-10.png";
import book11 from "@/assets/landing-float-11.png";
import book12 from "@/assets/landing-float-12.png";
import book13 from "@/assets/landing-float-13.png";
import book14 from "@/assets/landing-float-14.png";

type BookConfig = {
  src: string;
  pos: { left?: string; right?: string; top: number };
  rotate: number;
  duration: number;
  delay: number;
};

const LEFT_BOOKS: BookConfig[] = [
  // Columna A (izquierda, ~7-9%)
  { src: book1, pos: { left: "8%",  top: 50  }, rotate: -1,   duration: 5.2, delay: 0   },
  { src: book2, pos: { left: "6%",  top: 240 }, rotate:  1,   duration: 6.5, delay: 1.1 },
  { src: book5, pos: { left: "9%",  top: 430 }, rotate: -0.8, duration: 6.1, delay: 0.3 },
  { src: book6, pos: { left: "7%",  top: 610 }, rotate:  0.6, duration: 5.4, delay: 2.2 },
  // Columna B (interior izquierda, ~20-23%)
  { src: book3, pos: { left: "21%", top: 130 }, rotate: -0.5, duration: 4.8, delay: 0.6 },
  { src: book7, pos: { left: "23%", top: 345 }, rotate:  0.4, duration: 5.9, delay: 1.6 },
  { src: book4, pos: { left: "20%", top: 555 }, rotate:  1.2, duration: 5.8, delay: 1.8 },
];

const RIGHT_BOOKS: BookConfig[] = [
  // Columna A (derecha exterior, ~6-9%)
  { src: book8,  pos: { right: "8%",  top: 50  }, rotate:  1,   duration: 5.6, delay: 0.9 },
  { src: book9,  pos: { right: "6%",  top: 240 }, rotate: -1,   duration: 4.9, delay: 0.4 },
  { src: book12, pos: { right: "9%",  top: 430 }, rotate:  0.8, duration: 5.7, delay: 0.7 },
  { src: book13, pos: { right: "7%",  top: 610 }, rotate: -0.6, duration: 6.0, delay: 1.3 },
  // Columna B (interior derecha, ~20-23%)
  { src: book10, pos: { right: "21%", top: 130 }, rotate:  0.5, duration: 6.3, delay: 1.5 },
  { src: book14, pos: { right: "23%", top: 345 }, rotate: -0.7, duration: 5.3, delay: 0.2 },
  { src: book11, pos: { right: "20%", top: 555 }, rotate: -1.2, duration: 5.1, delay: 2.0 },
];

type Props = {
  onRegister: () => void;
  onGuest: () => void;
};

export default function HeroSection({ onRegister, onGuest }: Props) {
  const { t } = useTranslation();

  const renderBook = (book: BookConfig, idx: number) => (
    <motion.div
      key={idx}
      className="hero__book"
      style={{
        ...book.pos,
        rotate: book.rotate,
      }}
      animate={{ y: [0, -14, 0] }}
      transition={{
        repeat: Infinity,
        ease: "easeInOut",
        duration: book.duration,
        delay: book.delay,
      }}
    >
      <img src={book.src} alt="" aria-hidden="true" />
    </motion.div>
  );

  return (
    <section className="hero">
      {LEFT_BOOKS.map((book, i) => renderBook(book, i))}
      {RIGHT_BOOKS.map((book, i) => renderBook(book, LEFT_BOOKS.length + i))}

      <div className="hero__overlay hero__overlay--left" aria-hidden="true" />
      <div className="hero__overlay hero__overlay--right" aria-hidden="true" />
      <div className="hero__overlay hero__overlay--halo" aria-hidden="true" />

      <div className="hero__content">
        <h1 className="hero__title">
          <span>{t("landing.hero.title")}</span>
          <span>{t("landing.hero.titleSecond")}</span>
        </h1>
        <p className="hero__subtitle">{t("landing.hero.subtitle")}</p>
        <div className="hero__cta">
          <button type="button" className="hero__btn-primary" onClick={onRegister}>
            {t("landing.hero.cta")}
          </button>
          <button type="button" className="hero__btn-ghost" onClick={onGuest}>
            {t("landing.hero.guest")}
            <ArrowRight size={13} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
