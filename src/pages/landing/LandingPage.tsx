import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/auth/useAuth";
import { useEffect } from "react";
import "./LandingPage.scss";
import HeroSection from "./HeroSection";
import LandingLibrarySection from "./LandingLibrarySection";
import avatarGirlImg from "@/assets/landing-community-icon-profile-girl.svg";
import avatarBoyImg from "@/assets/landing-community-icon-profile-boy.svg";
import coverDuneImg from "@/assets/landing-cover-dune.png";
import cover1984Img from "@/assets/landing-cover-1984.png";
import fav1Img from "@/assets/landing-fav-1.png";
import fav2Img from "@/assets/landing-fav-2.png";
import fav3Img from "@/assets/landing-fav-3.png";
import fav4Img from "@/assets/landing-fav-4.png";
import fav5Img from "@/assets/landing-fav-5.png";
import fav6Img from "@/assets/landing-fav-6.png";
import fav7Img from "@/assets/landing-fav-7.png";
import fav8Img from "@/assets/landing-fav-8.png";
import fav9Img from "@/assets/landing-fav-9.png";
import fav10Img from "@/assets/landing-fav-10.png";

function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/my-library", { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  const handleRegister = () => navigate("/auth", { state: { tab: "register" } });
  const handleGuest = () => navigate("/explore");

  if (loading) {
    return (
      <div className="landing">
        <p className="landing__loading">{t("landing.checkingSession")}</p>
      </div>
    );
  }

  return (
    <div className="landing">
      {/* ── Hero ─────────────────────────────────────────── */}
      <HeroSection onRegister={handleRegister} onGuest={handleGuest} />

      {/* ── Biblioteca ───────────────────────────────────── */}
      <LandingLibrarySection />

      {/* ── Hábitos ──────────────────────────────────────── */}
      <section className="landing__habits">
        <div className="landing__stats-panel">
          <div className="landing__stats-streak">
            <span className="landing__stats-streak-label">
              {t("landing.habits.stats.streakLabel")}
            </span>
            <span className="landing__stats-streak-value">
              {t("landing.habits.stats.streakValue")}
            </span>
          </div>
          <hr className="landing__stats-divider" />
          <div className="landing__stats-block">
            <span className="landing__stats-label">{t("landing.habits.stats.goalLabel")}</span>
            <span className="landing__stats-goal-text">{t("landing.habits.stats.goalValue")}</span>
            <div className="landing__progress-bar">
              <div className="landing__progress-bar-fill" style={{ width: "46%" }} />
            </div>
          </div>
          <hr className="landing__stats-divider" />
          <div className="landing__stats-block">
            <span className="landing__stats-label">{t("landing.habits.stats.genresLabel")}</span>
            <div className="landing__genre-row">
              <div className="landing__genre-header">
                <span className="landing__genre-label">{t("landing.habits.stats.genre1")}</span>
                <span className="landing__genre-pct">40%</span>
              </div>
              <div className="landing__progress-bar landing__progress-bar--sm">
                <div className="landing__progress-bar-fill landing__progress-bar-fill--muted" style={{ width: "40%" }} />
              </div>
            </div>
            <div className="landing__genre-row">
              <div className="landing__genre-header">
                <span className="landing__genre-label">{t("landing.habits.stats.genre2")}</span>
                <span className="landing__genre-pct">35%</span>
              </div>
              <div className="landing__progress-bar landing__progress-bar--sm landing__progress-bar--green">
                <div
                  className="landing__progress-bar-fill landing__progress-bar-fill--green"
                  style={{ width: "35%" }}
                />
              </div>
            </div>
            <div className="landing__genre-row">
              <div className="landing__genre-header">
                <span className="landing__genre-label">{t("landing.habits.stats.genre3")}</span>
                <span className="landing__genre-pct">25%</span>
              </div>
              <div className="landing__progress-bar landing__progress-bar--sm landing__progress-bar--warm">
                <div
                  className="landing__progress-bar-fill landing__progress-bar-fill--warm"
                  style={{ width: "25%" }}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="landing__habits-text">
          <h2 className="landing__section-title">{t("landing.habits.title")}</h2>
          <p className="landing__section-subtitle">{t("landing.habits.subtitle")}</p>
        </div>
      </section>

      {/* ── Comunidad ────────────────────────────────────── */}
      <section className="landing__community">
        <div className="landing__community-heading">
          <h2 className="landing__section-title landing__section-title--centered">
            {t("landing.community.title")}
          </h2>
          <p className="landing__section-subtitle landing__section-subtitle--centered">
            {t("landing.community.subtitle")}
          </p>
        </div>
        <div className="landing__profile-cards">
          {/* Tarjeta María García */}
          <div className="landing__profile-card">
            <div className="landing__profile-card-user">
              <div className="landing__profile-card-avatar">
                <img src={avatarGirlImg} alt="" aria-hidden="true" />
              </div>
              <div>
                <p className="landing__profile-card-name">María García</p>
                <p className="landing__profile-card-meta">
                  @mariag01 · ★ 47 {t("landing.community.card.followers")}
                </p>
              </div>
            </div>
            <div className="landing__profile-card-reading">
              <p className="landing__profile-card-section-label">
                {t("landing.community.card.readingNow")}
              </p>
              <div className="landing__profile-card-book-row">
                <img className="landing__profile-card-cover" src={coverDuneImg} alt="Dune" />
                <div>
                  <p className="landing__profile-card-book-title">Dune</p>
                  <p className="landing__profile-card-book-author">Frank Herbert</p>
                </div>
              </div>
              <span className="landing__profile-card-pct">68%</span>
              <div className="landing__progress-bar landing__progress-bar--sm">
                <div className="landing__progress-bar-fill" style={{ width: "68%" }} />
              </div>
            </div>
            <div className="landing__profile-card-favorites">
              <p className="landing__profile-card-section-label">
                {t("landing.community.card.favorites")}
              </p>
              <div className="landing__profile-card-fav-covers">
                <img className="landing__profile-card-fav-cover" src={fav1Img} alt="" />
                <img className="landing__profile-card-fav-cover" src={fav2Img} alt="" />
                <img className="landing__profile-card-fav-cover" src={fav3Img} alt="" />
                <img className="landing__profile-card-fav-cover" src={fav4Img} alt="" />
                <img className="landing__profile-card-fav-cover" src={fav5Img} alt="" />
              </div>
            </div>
            <button type="button" className="landing__profile-card-follow-btn">
              {t("landing.community.card.follow")}
            </button>
          </div>

          {/* Tarjeta Carlos Ruiz */}
          <div className="landing__profile-card">
            <div className="landing__profile-card-user">
              <div className="landing__profile-card-avatar">
                <img src={avatarBoyImg} alt="" aria-hidden="true" />
              </div>
              <div>
                <p className="landing__profile-card-name">Carlos Ruiz</p>
                <p className="landing__profile-card-meta">
                  @carlos_books · ★ 128 {t("landing.community.card.followers")}
                </p>
              </div>
            </div>
            <div className="landing__profile-card-reading">
              <p className="landing__profile-card-section-label">
                {t("landing.community.card.readingNow")}
              </p>
              <div className="landing__profile-card-book-row">
                <img className="landing__profile-card-cover" src={cover1984Img} alt="1984" />
                <div>
                  <p className="landing__profile-card-book-title">1984</p>
                  <p className="landing__profile-card-book-author">George Orwell</p>
                </div>
              </div>
              <span className="landing__profile-card-pct">14%</span>
              <div className="landing__progress-bar landing__progress-bar--sm">
                <div className="landing__progress-bar-fill" style={{ width: "14%" }} />
              </div>
            </div>
            <div className="landing__profile-card-favorites">
              <p className="landing__profile-card-section-label">
                {t("landing.community.card.favorites")}
              </p>
              <div className="landing__profile-card-fav-covers">
                <img className="landing__profile-card-fav-cover" src={fav6Img} alt="" />
                <img className="landing__profile-card-fav-cover" src={fav7Img} alt="" />
                <img className="landing__profile-card-fav-cover" src={fav8Img} alt="" />
                <img className="landing__profile-card-fav-cover" src={fav9Img} alt="" />
                <img className="landing__profile-card-fav-cover" src={fav10Img} alt="" />
              </div>
            </div>
            <button type="button" className="landing__profile-card-follow-btn">
              {t("landing.community.card.follow")}
            </button>
          </div>
        </div>
      </section>

      {/* ── Testimonios + CTA final ──────────────────────── */}
      <section className="landing__social-proof">
        <div className="landing__cta-final">
          <h2 className="landing__cta-title">{t("landing.cta.title")}</h2>
          <div className="landing__cta-buttons">
            <button type="button" className="landing__btn-primary" onClick={handleRegister}>
              {t("landing.cta.btn")}
            </button>
          </div>
        </div>
        <div className="landing__quotes">
          <div className="landing__quote-card">
            <p className="landing__quote-stars">★★★★★</p>
            <p className="landing__quote-text">{t("landing.socialProof.quote1.text")}</p>
            <div className="landing__quote-author">
              <p className="landing__quote-author-name">{t("landing.socialProof.quote1.author")}</p>
              <p className="landing__quote-author-handle">
                {t("landing.socialProof.quote1.handle")}
              </p>
            </div>
          </div>
          <div className="landing__quote-card">
            <p className="landing__quote-stars">★★★★★</p>
            <p className="landing__quote-text">{t("landing.socialProof.quote2.text")}</p>
            <div className="landing__quote-author">
              <p className="landing__quote-author-name">{t("landing.socialProof.quote2.author")}</p>
              <p className="landing__quote-author-handle">
                {t("landing.socialProof.quote2.handle")}
              </p>
            </div>
          </div>
          <div className="landing__quote-card">
            <p className="landing__quote-stars">★★★★★</p>
            <p className="landing__quote-text">{t("landing.socialProof.quote3.text")}</p>
            <div className="landing__quote-author">
              <p className="landing__quote-author-name">{t("landing.socialProof.quote3.author")}</p>
              <p className="landing__quote-author-handle">
                {t("landing.socialProof.quote3.handle")}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;
