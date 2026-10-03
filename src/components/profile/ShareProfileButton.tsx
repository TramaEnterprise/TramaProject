import { useTranslation } from "react-i18next";
import "./ShareProfileButton.scss";
import { Share2 } from "lucide-react";
import { useShare } from "@/hooks/useShare";

type ShareProfileButtonProps = {
  username: string;
  name: string;
};

export default function ShareProfileButton({ username, name }: ShareProfileButtonProps) {
  const { t } = useTranslation();
  const title = name.trim() || `@${username}`;
  const { share, toastVisible } = useShare({
    url: `${window.location.origin}/u/${username}`,
    title,
    text: t("profile.share.shareText", { name: title }),
  });

  if (!username.trim()) {
    return null;
  }
  return (
    <div className="share-profile-button">
      <button
        type="button"
        className="share-profile-button__btn"
        onClick={share}
        aria-label={t("profile.share.ariaLabel")}
      >
        <Share2 size={18} aria-hidden="true" />
      </button>
      {toastVisible && (
        <p className="share-profile-button__toast" role="status">
          {t("profile.share.copied")}
        </p>
      )}
    </div>
  );
}
