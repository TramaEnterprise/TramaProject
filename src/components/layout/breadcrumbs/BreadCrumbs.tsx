import { Link, useLocation, matchPath } from "react-router";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { BREADCRUMB_TRAILS } from "./breadcrumbConfig";
import { useBreadcrumbSlots } from "@/context/breadcrumb/useBreadcrumb";
import "./Breadcrumbs.scss";

function interpolate(to: string | undefined, params: Record<string, string | undefined>) {
  if (!to) return undefined;
  return to.replace(/:([A-Za-z0-9_]+)/g, (_, p) => params[p] ?? "");
}

export default function Breadcrumbs() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const slots = useBreadcrumbSlots();

  let pattern: string | null = null;
  let params: Record<string, string | undefined> = {};
  for (const p of Object.keys(BREADCRUMB_TRAILS)) {
    const m = matchPath(p, pathname);
    if (m) {
      pattern = p;
      params = m.params;
      break;
    }
  }
  if (!pattern) return null;

  const trail = BREADCRUMB_TRAILS[pattern];
  const lastIndex = trail.length - 1;

  const built = trail.map((c, i) => {
    const slot = c.slot ? slots[c.slot] : undefined;
    const label = c.slot ? slot?.label : c.key ? t(c.key) : undefined;
    const to = c.slot ? (slot?.to ?? c.to) : c.to;
    return { label, to, trailLast: i === lastIndex };
  });

  const visible = built.filter((c) => c.label != null || c.trailLast);

  const crumbs = visible.map((c, i) => {
    const isLast = i === visible.length - 1;
    return { label: c.label, to: isLast ? undefined : interpolate(c.to, params), isLast };
  });

  return (
    <nav className="breadcrumbs" aria-label={t("breadcrumbs.ariaLabel")}>
      <ol className="breadcrumbs__list">
        {crumbs.map((c, i) => (
          <li key={i} className="breadcrumbs__item">
            {c.label == null ? (
              <span className="breadcrumbs__skeleton" aria-hidden="true" />
            ) : c.to ? (
              <Link className="breadcrumbs__link" to={c.to}>
                {c.label}
              </Link>
            ) : (
              <span className="breadcrumbs__current" aria-current="page">
                {c.label}
              </span>
            )}
            {!c.isLast && <ChevronRight className="breadcrumbs__sep" size={14} aria-hidden="true" />}
          </li>
        ))}
      </ol>
    </nav>
  );
}
