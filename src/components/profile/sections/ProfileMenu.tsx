import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { useAuth } from "@/context/auth/useAuth";
import { useTheme } from "@/context/theme/useTheme";
import { User, Settings, Moon, Sun, LogOut } from "lucide-react";
import "./ProfileMenu.scss";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useClickOutside } from "@/hooks/useClickOutside";

type ProfileMenuProps = {
  onClose: () => void;
};

export default function ProfileMenu({ onClose }: ProfileMenuProps) {
  const { t } = useTranslation();
  const { logout, profile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEscapeKey(onClose);
  useClickOutside(ref, onClose);

  return (
    <div className="profile-menu" ref={ref}>
      <Link className="profile-menu__item" to="/profile" onClick={onClose}>
        {profile?.profilePhotoUrl ? (
          <img className="profile-menu__avatar" src={profile.profilePhotoUrl} alt="" />
        ) : (
          <User />
        )}
        {t("profile.menu.viewProfile")}
      </Link>

      <Link className="profile-menu__item" to="/settings" onClick={onClose}>
        <Settings />
        {t("profile.menu.settings")}
      </Link>

      <button className="profile-menu__item" type="button" onClick={toggleTheme}>
        {theme === "light" ? <Moon /> : <Sun />}
        {theme === "light" ? t("profile.menu.darkTheme") : t("profile.menu.lightTheme")}
      </button>

      <div className="profile-menu__divider" />

      <button
        className="profile-menu__item profile-menu__item--danger"
        type="button"
        onClick={() => {
          logout();
          onClose();
          navigate("/");
        }}
      >
        <LogOut />
        {t("profile.menu.logout")}
      </button>
    </div>
  );
}
