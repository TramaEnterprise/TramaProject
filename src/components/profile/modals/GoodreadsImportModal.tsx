import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "@/components/common/Modal";
import { useGoodreadsImport, MAX_IMPORT } from "@/hooks/useGoodreadsImport";
import "./GoodreadsImportModal.scss";

type Props = { onClose: () => void };

export default function GoodreadsImportModal({ onClose }: Props) {
  const { t } = useTranslation();
  const { phase, preview, progress, result, error, parse, confirmImport, cancel } =
    useGoodreadsImport();
  const inputRef = useRef<HTMLInputElement>(null);
  const [showNotFound, setShowNotFound] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void parse(file);
  };

  const handleClose = () => {
    if (phase === "importing") cancel();
    onClose();
  };

  return (
    <Modal
      title={t("profile.goodreadsImport.title")}
      closeAriaLabel={t("profile.goodreadsImport.closeAria")}
      onClose={handleClose}
      closeOnBackdrop={phase !== "importing"}
      usePortal
      classNames={{
        root: "gr-import",
        backdrop: "gr-import__backdrop",
        box: "gr-import__box",
        header: "gr-import__header",
        title: "gr-import__title",
        close: "gr-import__close",
      }}
    >
      {(phase === "idle" || phase === "parsing") && (
        <div className="gr-import__step">
          <p className="gr-import__intro">{t("profile.goodreadsImport.intro")}</p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="gr-import__file-input"
            onChange={handleFile}
          />
          <button
            type="button"
            className="gr-import__btn gr-import__btn--primary"
            onClick={() => inputRef.current?.click()}
            disabled={phase === "parsing"}
          >
            {t("profile.goodreadsImport.selectFile")}
          </button>
          <p className="gr-import__hint">{t("profile.goodreadsImport.fileHint")}</p>
        </div>
      )}

      {phase === "preview" && preview && (
        <div className="gr-import__step">
          <p className="gr-import__preview-title">
            {t("profile.goodreadsImport.previewTitle", { count: preview.total })}
          </p>
          <p className="gr-import__preview-breakdown">
            {t("profile.goodreadsImport.previewBreakdown", {
              finished: preview.byStatus.finished,
              reading: preview.byStatus.reading,
              wantToRead: preview.byStatus.wantToRead,
            })}
          </p>
          {preview.truncated && (
            <p className="gr-import__warning">
              {t("profile.goodreadsImport.truncated", { max: MAX_IMPORT })}
            </p>
          )}
          <div className="gr-import__actions">
            <button
              type="button"
              className="gr-import__btn gr-import__btn--ghost"
              onClick={handleClose}
            >
              {t("profile.goodreadsImport.cancel")}
            </button>
            <button
              type="button"
              className="gr-import__btn gr-import__btn--primary"
              onClick={() => void confirmImport()}
            >
              {t("profile.goodreadsImport.import")}
            </button>
          </div>
        </div>
      )}

      {phase === "importing" && (
        <div className="gr-import__step gr-import__step--center">
          <div className="gr-import__spinner" aria-hidden="true" />
          <p className="gr-import__importing">{t("profile.goodreadsImport.importing")}</p>
          <p className="gr-import__progress" aria-live="polite">
            {t("profile.goodreadsImport.progress", {
              done: progress.done,
              total: progress.total,
            })}
          </p>
        </div>
      )}

      {phase === "done" && result && (
        <div className="gr-import__step">
          <p className="gr-import__done-title">{t("profile.goodreadsImport.doneTitle")}</p>
          <p className="gr-import__summary">
            {t("profile.goodreadsImport.summary", {
              imported: result.imported,
              alreadyExisted: result.alreadyExisted,
              notFound: result.notFound.length,
            })}
          </p>
          {result.notFound.length > 0 && (
            <div className="gr-import__not-found">
              <button
                type="button"
                className="gr-import__not-found-toggle"
                onClick={() => setShowNotFound((s) => !s)}
              >
                {t("profile.goodreadsImport.notFoundTitle", { count: result.notFound.length })}
              </button>
              {showNotFound && (
                <ul className="gr-import__not-found-list">
                  {result.notFound.map((title, i) => (
                    <li key={`${title}-${i}`}>{title}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="gr-import__actions">
            <button
              type="button"
              className="gr-import__btn gr-import__btn--primary"
              onClick={onClose}
            >
              {t("profile.goodreadsImport.close")}
            </button>
          </div>
        </div>
      )}

      {phase === "error" && (
        <div className="gr-import__step">
          <p className="gr-import__error" role="alert">
            {error === "empty"
              ? t("profile.goodreadsImport.errorEmpty")
              : t("profile.goodreadsImport.errorInvalid")}
          </p>
          <div className="gr-import__actions">
            <button
              type="button"
              className="gr-import__btn gr-import__btn--primary"
              onClick={onClose}
            >
              {t("profile.goodreadsImport.close")}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
