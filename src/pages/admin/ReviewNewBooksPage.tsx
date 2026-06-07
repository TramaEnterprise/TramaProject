import { useEffect, useMemo, useState } from "react";
import "./ReviewNewBooksPage.scss";

interface BookSnapshot {
  titles: Record<string, string>;
  synopsis: Record<string, string>;
  cover_id: number | null;
  cover_url: string | null;
  pages: number | null;
}
interface ReviewEntry {
  key: string;
  before: BookSnapshot;
  after: BookSnapshot;
  changes: string[];
  flags: string[];
  priority: number;
  status: "auto-ok" | "needs-claude" | "claude-done";
}

const PAGE_SIZE = 50;

export default function ReviewBooksPage() {
  const [entries, setEntries] = useState<ReviewEntry[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    fetch("/books.review.json")
      .then((r) => r.json())
      .then(setEntries)
      .catch(() => setEntries([]));
  }, []);

  const filtered = useMemo(
    () => entries.filter((e) => statusFilter === "all" || e.status === statusFilter),
    [entries, statusFilter]
  );

  return (
    <div className="review-page">
      <header className="review-page__bar">
        <h1>Revisión de libros ({filtered.length})</h1>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">Todos</option>
          <option value="auto-ok">auto-ok</option>
          <option value="needs-claude">needs-claude</option>
          <option value="claude-done">claude-done</option>
        </select>
      </header>

      <ul className="review-page__list">
        {filtered.slice(0, visible).map((e) => (
          <li key={e.key} className="review-card">
            <div className="review-card__head">
              <span className={`review-card__status review-card__status--${e.status}`}>
                {e.status}
              </span>
              <code>{e.key}</code>
              <span className="review-card__priority">prioridad {e.priority}</span>
            </div>
            {e.flags.length > 0 && (
              <div className="review-card__flags">
                {e.flags.map((f) => (
                  <span key={f} className="review-card__flag">{f}</span>
                ))}
              </div>
            )}
            <div className="review-card__cols">
              <Side label="ANTES" snap={e.before} />
              <Side label="DESPUÉS" snap={e.after} />
            </div>
            {e.changes.length > 0 && (
              <ul className="review-card__changes">
                {e.changes.map((c) => <li key={c}>{c}</li>)}
              </ul>
            )}
          </li>
        ))}
      </ul>

      {visible < filtered.length && (
        <button className="review-page__more" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
          Cargar más ({filtered.length - visible} restantes)
        </button>
      )}
    </div>
  );
}

function Side({ label, snap }: { label: string; snap: BookSnapshot }) {
  return (
    <div className="review-side">
      <span className="review-side__label">{label}</span>
      {snap.cover_url ? (
        <img className="review-side__cover" src={snap.cover_url} alt="" loading="lazy" />
      ) : (
        <div className="review-side__cover review-side__cover--empty">sin portada</div>
      )}
      <p className="review-side__title"><b>es:</b> {snap.titles.es ?? "—"}</p>
      <p className="review-side__title"><b>en:</b> {snap.titles.en ?? "—"}</p>
      <p className="review-side__pages">páginas: {snap.pages ?? "—"}</p>
      <p className="review-side__syn"><b>sinopsis es:</b> {snap.synopsis.es ?? "—"}</p>
      <p className="review-side__syn"><b>sinopsis en:</b> {snap.synopsis.en ?? "—"}</p>
    </div>
  );
}
