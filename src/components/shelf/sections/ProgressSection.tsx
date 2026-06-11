import { useTranslation } from "react-i18next";
import { genreToI18nKey } from "@/utils/genreUtils";
import { useReadingStats } from "@/pages/my-library/hooks/useReadingStats";
import "./ProgressSection.scss";

const goalCurrent = 16;
const goalTarget = 20;
const goalPct = Math.min(100, Math.round((goalCurrent / goalTarget) * 100));

export default function ProgressSection() {
  const { t } = useTranslation();
  const { weekly, genres, loading } = useReadingStats();
  const CHART_MAX = 200;
  const hasWeekData = weekly.perDay.some((d) => d.pages > 0);
  const ticks = [CHART_MAX, CHART_MAX / 2, 0]; 

  const changePct = weekly.changePct;
  const changeText =
    changePct === null ? "—" : `${changePct >= 0 ? "↑" : "↓"}${Math.abs(changePct)}%`;
  const changeClass = changePct !== null && changePct >= 0 ? " progresses__stat-num--green" : "";

  return (
    <section className="progresses">
      <h2 className="progresses__title">{t("myLibrary.progress.title")}</h2>

      <div className="progresses__card">
        <div className="progresses__bottom">
          <div className="progresses__goal">
            <p className="progresses__section-label">{t("myLibrary.progress.annualGoal")}</p>
            <div
              className="progresses__goal-outer"
              style={{
                background: `conic-gradient(var(--color-text-primary) ${goalPct}%, var(--color-border-subtle) 0)`,
              }}
            >
              <div className="progresses__goal-inner">
                <span className="progresses__goal-number">
                  {goalCurrent}/{goalTarget}
                </span>
                <span className="progresses__goal-label">{t("myLibrary.progress.books")}</span>
              </div>
            </div>
            {goalCurrent >= goalTarget && (
              <p className="progresses__goal-completed">{t("myLibrary.progress.completed")}</p>
            )}
          </div>
          <div className="progresses__genres-wrap">
            <p className="progresses__section-label">{t("myLibrary.progress.favoriteGenres")}</p>
            {genres.length === 0 ? (
              <p className="progresses__empty">{t("myLibrary.progress.emptyGenres")}</p>
            ) : (
              <div className="progresses__genres">
                {genres.map(({ key, percentage, color, isOther }) => (
                  <div key={key} className="progresses__genre">
                    <div className="progresses__genre-row">
                      <span className="progresses__genre-name">
                        {isOther
                          ? t("myLibrary.genres.others")
                          : t(`book.genres.${genreToI18nKey(key)}`, { defaultValue: key })}
                      </span>
                      <span className="progresses__genre-percentage">{percentage}%</span>
                    </div>
                    <div className="progresses__genre-track">
                      <div
                        className="progresses__genre-fill"
                        style={{ width: `${percentage}%`, background: color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="progresses__card progresses__card--chart">
        <div className="progresses__chart-area">
          <div className="progresses__chart">
            <div className="progresses__y-axis" aria-hidden="true">
              {ticks.map((tickValue) => (
                <span key={tickValue} className="progresses__y-tick">
                  {tickValue}
                </span>
              ))}
            </div>
            <div className="progresses__plot">
              <div className="progresses__bar-chart">
                {weekly.perDay.map(({ day, pages, currentDay }) => (
                  <div key={day} className="progresses__bar-col">
                    {!currentDay && (
                      <span className="progresses__bar-tooltip" role="tooltip">
                        {t("myLibrary.progress.pagesTooltip", { count: pages })}
                      </span>
                    )}
                    <div
                      className={`progresses__bar${currentDay ? " progresses__bar--currentDay" : ""}`}
                      style={{ height: `${Math.min((pages / CHART_MAX) * 100, 100)}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="progresses__day-labels">
                {weekly.perDay.map(({ day, currentDay }) => (
                  <span
                    key={day}
                    className={`progresses__bar-label${currentDay ? " progresses__bar-label--currentDay" : ""}`}
                  >
                    {t(`myLibrary.days.${day}`)}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="progresses__chart-stats">
            <div className="progresses__stat">
              <span className="progresses__stat-num">{weekly.pagesThisWeek}</span>
              <span className="progresses__stat-label">{t("myLibrary.progress.pagesWeek")}</span>
            </div>
            <div className="progresses__stat">
              <span className="progresses__stat-num">{weekly.pagesToday}</span>
              <span className="progresses__stat-label">{t("myLibrary.progress.pagesToday")}</span>
            </div>
            <div className="progresses__stat">
              <span className={`progresses__stat-num${changeClass}`}>{changeText}</span>
              <span className="progresses__stat-label">{t("myLibrary.progress.lastWeek")}</span>
            </div>
          </div>
        </div>

        {!loading && !hasWeekData && (
          <p className="progresses__empty">{t("myLibrary.progress.emptyWeek")}</p>
        )}
      </div>
    </section>
  );
}
