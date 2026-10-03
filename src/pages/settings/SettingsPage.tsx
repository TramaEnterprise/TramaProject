import { usePreferences } from "@/context/preferences/usePreferences";
import "./SettingsPage.scss";
import { useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { resolveSectionCrumb } from "@/components/layout/breadcrumbs/breadcrumbConfig";
import { useBreadcrumbLabel } from "@/context/breadcrumb/useBreadcrumb";
import { useState } from "react";
import GoodreadsImportModal from "@/components/profile/modals/GoodreadsImportModal";

export default function SettingsPage() {
  const { miniNavEnabled, setMiniNavEnabled } = usePreferences();
  const [importOpen, setImportOpen] = useState(false);
  const location = useLocation();
  const { t } = useTranslation();
  const from = (location.state as { from?: string } | null)?.from;
  const origin = resolveSectionCrumb(from);
  useBreadcrumbLabel("settingsOrigin", t(origin.key), origin.to);

  return (
    <div className="settings-page">
      <h2 className="settings-page__title">{t("settings.title")}</h2>

      <section className="settings-page__section">
        <p className="settings-page__section-title">{t("settings.nav.sectionTitle")}</p>

        <div className="settings-page__row">
          <div className="settings-page__row-info">
            <p className="settings-page__row-label">{t("settings.nav.compactBar")}</p>
            <p className="settings-page__row-desc">{t("settings.nav.compactBarDesc")}</p>
          </div>
          <button
            type="button"
            className={`settings-page__toggle${miniNavEnabled ? " settings-page__toggle--on" : ""}`}
            role="switch"
            aria-checked={miniNavEnabled}
            aria-label={t("settings.nav.compactBar")}
            onClick={() => setMiniNavEnabled(!miniNavEnabled)}
          />
        </div>
      </section>

      <section className="settings-page__section">
        <p className="settings-page__section-title">{t("settings.data.sectionTitle")}</p>

        <div className="settings-page__row">
          <div className="settings-page__row-info">
            <p className="settings-page__row-label">{t("settings.data.importGoodreads")}</p>
            <p className="settings-page__row-desc">{t("settings.data.importGoodreadsDesc")}</p>
          </div>
          <button
            type="button"
            className="settings-page__action-btn"
            onClick={() => setImportOpen(true)}
          >
            {t("settings.data.import")}
          </button>
        </div>
      </section>

      {importOpen && <GoodreadsImportModal onClose={() => setImportOpen(false)} />}
    </div>
  );
}
