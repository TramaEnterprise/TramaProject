import { usePreferences } from "@/context/preferences/usePreferences";
import "./SettingsPage.scss";
import { useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { resolveSectionCrumb } from "@/components/layout/breadcrumbs/breadcrumbConfig";
import { useBreadcrumbLabel } from "@/context/breadcrumb/useBreadcrumb";

export default function SettingsPage() {
  const { miniNavEnabled, setMiniNavEnabled } = usePreferences();
  const location = useLocation();
  const { t } = useTranslation();
  const from = (location.state as { from?: string } | null)?.from;
  const origin = resolveSectionCrumb(from);
  useBreadcrumbLabel("settingsOrigin", t(origin.key), origin.to);

  return (
    <div className="settings-page">
      <h2 className="settings-page__title">Ajustes</h2>

      <section className="settings-page__section">
        <p className="settings-page__section-title">Navegación</p>

        <div className="settings-page__row">
          <div className="settings-page__row-info">
            <p className="settings-page__row-label">Barra compacta al desplazar</p>
            <p className="settings-page__row-desc">
              Sustituye la barra de navegación principal por una versión compacta al hacer scroll.
            </p>
          </div>
          <button
            type="button"
            className={`settings-page__toggle${miniNavEnabled ? " settings-page__toggle--on" : ""}`}
            role="switch"
            aria-checked={miniNavEnabled}
            aria-label="Barra compacta al desplazar"
            onClick={() => setMiniNavEnabled(!miniNavEnabled)}
          />
        </div>
      </section>
    </div>
  );
}
