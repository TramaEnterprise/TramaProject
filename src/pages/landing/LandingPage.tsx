import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/auth/useAuth";
import { useEffect } from "react";
import { Star } from "lucide-react";
import "./LandingPage.scss";
import HeroSection from "./HeroSection";
import LandingLibrarySection from "./LandingLibrarySection";
import avatarGirlImg from "@/assets/landing-community-icon-profile-girl.svg";
import avatarBoyImg from "@/assets/landing-community-icon-profile-boy.svg";
import coverMariaImg from "@/assets/landing-book-temor.jpg";
import coverCarlosImg from "@/assets/landing-book-yorobot.jpg";
import coverSenorImg from "@/assets/landing-book-senor.jpg";
import coverTronoImg from "@/assets/landing-book-trono.jpg";
import coverJuegoTronosImg from "@/assets/landing-book-juegotronos.jpg";
import coverHambreImg from "@/assets/landing-book-hambre.jpg";
import coverCriadaImg from "@/assets/landing-book-criada.jpg";
import coverCalalobosImg from "@/assets/landing-book-calabobos.jpg";
import coverFrankensteinImg from "@/assets/landing-book-frankenstein.jpg";
import coverHarryPotterImg from "@/assets/landing-book-harrypotter.jpg";
import coverShogunImg from "@/assets/landing-book-shogun.png";
import coverPedroImg from "@/assets/landing-book-pedro.jpg";

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
              <div className="landing__profile-card-info">
                <div className="landing__profile-card-name-row">
                  <p className="landing__profile-card-name">María García</p>
                  <span className="landing__profile-card-follow-btn" aria-hidden="true">
                    {t("landing.community.card.follow")}
                  </span>
                </div>
                <p className="landing__profile-card-meta">@mariag01</p>
                <p className="landing__profile-card-followers">47 {t("landing.community.card.followers")}</p>
              </div>
            </div>
            <div className="landing__profile-card-reading">
              <p className="landing__profile-card-section-label">
                {t("landing.community.card.readingNow")}
              </p>
              <div className="landing__profile-card-book-row">
                <img className="landing__profile-card-cover" src={coverMariaImg} alt="El Temor de un Hombre Sabio" />
                <div className="landing__profile-card-book-body">
                  <div className="landing__profile-card-book-header">
                    <p className="landing__profile-card-book-title">El Temor de un Hombre Sabio</p>
                    <p className="landing__profile-card-book-author">Patrick Rothfuss</p>
                  </div>
                  <div className="landing__profile-card-progress-box">
                    <div className="landing__profile-card-progress-labels">
                      <span>{t("myLibrary.readingProgress")}</span>
                      <span>68%</span>
                    </div>
                    <div className="landing__progress-bar landing__progress-bar--sm">
                      <div className="landing__progress-bar-fill" style={{ width: "68%" }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="landing__profile-card-favorites">
              <p className="landing__profile-card-section-label">
                {t("landing.community.card.favorites")}
              </p>
              <div className="landing__profile-card-fav-covers">
                <img className="landing__profile-card-fav-cover" src={coverSenorImg} alt="" />
                <img className="landing__profile-card-fav-cover" src={coverTronoImg} alt="" />
                <img className="landing__profile-card-fav-cover" src={coverJuegoTronosImg} alt="" />
                <img className="landing__profile-card-fav-cover" src={coverHambreImg} alt="" />
                <img className="landing__profile-card-fav-cover" src={coverCriadaImg} alt="" />
              </div>
            </div>
          </div>

          {/* Tarjeta Carlos Ruiz */}
          <div className="landing__profile-card">
            <div className="landing__profile-card-user">
              <div className="landing__profile-card-avatar">
                <img src={avatarBoyImg} alt="" aria-hidden="true" />
              </div>
              <div className="landing__profile-card-info">
                <div className="landing__profile-card-name-row">
                  <p className="landing__profile-card-name">Carlos Ruiz</p>
                  <span className="landing__profile-card-follow-btn" aria-hidden="true">
                    {t("landing.community.card.follow")}
                  </span>
                </div>
                <p className="landing__profile-card-meta">@carlos_books</p>
                <p className="landing__profile-card-followers">128 {t("landing.community.card.followers")}</p>
              </div>
            </div>
            <div className="landing__profile-card-reading">
              <p className="landing__profile-card-section-label">
                {t("landing.community.card.readingNow")}
              </p>
              <div className="landing__profile-card-book-row">
                <img className="landing__profile-card-cover" src={coverCarlosImg} alt="Yo, Robot" />
                <div className="landing__profile-card-book-body">
                  <div className="landing__profile-card-book-header">
                    <p className="landing__profile-card-book-title">Yo, Robot</p>
                    <p className="landing__profile-card-book-author">Isaac Asimov</p>
                  </div>
                  <div className="landing__profile-card-progress-box">
                    <div className="landing__profile-card-progress-labels">
                      <span>{t("myLibrary.readingProgress")}</span>
                      <span>14%</span>
                    </div>
                    <div className="landing__progress-bar landing__progress-bar--sm">
                      <div className="landing__progress-bar-fill" style={{ width: "14%" }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="landing__profile-card-favorites">
              <p className="landing__profile-card-section-label">
                {t("landing.community.card.favorites")}
              </p>
              <div className="landing__profile-card-fav-covers">
                <img className="landing__profile-card-fav-cover" src={coverCalalobosImg} alt="" />
                <img className="landing__profile-card-fav-cover" src={coverFrankensteinImg} alt="" />
                <img className="landing__profile-card-fav-cover" src={coverHarryPotterImg} alt="" />
                <img className="landing__profile-card-fav-cover" src={coverShogunImg} alt="" />
                <img className="landing__profile-card-fav-cover" src={coverPedroImg} alt="" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonios + CTA final ──────────────────────── */}
      <section className="landing__social-proof">
        <div className="landing__cta-final">
          <h2 className="landing__cta-title">{t("landing.cta.title")}</h2>
          <button type="button" className="landing__btn-primary" onClick={handleRegister}>
            {t("landing.cta.btn")}
          </button>
        </div>
        <div className="landing__quotes">
          <div className="landing__quote-card">
            <div className="landing__quote-stars" aria-label="5 estrellas">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} fill="currentColor" strokeWidth={0} />
              ))}
            </div>
            <p className="landing__quote-text">{t("landing.socialProof.quote1.text")}</p>
            <div className="landing__quote-author">
              <p className="landing__quote-author-name">{t("landing.socialProof.quote1.author")}</p>
              <p className="landing__quote-author-handle">
                {t("landing.socialProof.quote1.handle")}
              </p>
            </div>
          </div>
          <div className="landing__quote-card">
            <div className="landing__quote-stars" aria-label="4 estrellas y media">
              {[...Array(4)].map((_, i) => (
                <Star key={i} size={16} fill="currentColor" strokeWidth={0} />
              ))}
              <span className="landing__quote-star-half" aria-hidden="true">
                <Star size={16} strokeWidth={1.5} />
                <Star size={16} fill="currentColor" strokeWidth={0} />
              </span>
            </div>
            <p className="landing__quote-text">{t("landing.socialProof.quote2.text")}</p>
            <div className="landing__quote-author">
              <p className="landing__quote-author-name">{t("landing.socialProof.quote2.author")}</p>
              <p className="landing__quote-author-handle">
                {t("landing.socialProof.quote2.handle")}
              </p>
            </div>
          </div>
          <div className="landing__quote-card">
            <div className="landing__quote-stars" aria-label="5 estrellas">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} fill="currentColor" strokeWidth={0} />
              ))}
            </div>
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
