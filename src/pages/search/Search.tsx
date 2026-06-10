import { useState, useRef, type FormEvent, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import BookCard from "@/components/book/cards/BookCard";
import { Search, X, ChevronLeft } from "lucide-react";
import "./Search.scss";
import { useBookSearchInfinite } from "@/hooks/useBookSearchInfinite";
import { useCurrentLanguage } from "@/plugins/i18n/useCurrentLanguage";
import LoadMore from "@/components/common/LoadMore";
import { buildTitleTokens } from "@/utils/titleSearch";

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { lang } = useCurrentLanguage();
  const q = searchParams.get("q") ?? "";
  const trimmedQ = q.trim();
  const insufficient = trimmedQ !== "" && (trimmedQ.length < 3 || buildTitleTokens(trimmedQ).length === 0);

  const [inputValue, setInputValue] = useState(q);
  const [prevQ, setPrevQ] = useState(q);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { books, loading, error, totalResults, hasNextPage, isFetchingNextPage, fetchNextPage } = useBookSearchInfinite(insufficient ? "" : q, "todo", lang);

  if (prevQ !== q) {
    setPrevQ(q);
    if (!isFocused) {
      setInputValue(q);
    }
  }

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    const end = el.value.length;
    try { 
      el.setSelectionRange(end, end); 
    } 
    catch { /* type=search puede no permitirlo */ }
  }, []);


  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && !loading && books.length <= 6) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, loading, books.length, fetchNextPage]);

  useEffect(() => {
    const trimmed = inputValue.trim();
    if (trimmed.length < 3) return;          
    if (trimmed === q.trim()) return;      
    const timer = window.setTimeout(() => {
      navigate(`/search?q=${encodeURIComponent(trimmed)}`, { replace: true });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [inputValue, q, navigate]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed) {
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  };

  // "searching" cubre tanto la carga inicial (BD) como el fallback a la API
  // cuando la BD trajo ≤6 (incluido 0) — así no parpadea "sin resultados".
  const searching = loading || (isFetchingNextPage && books.length === 0);
  const showNoResults = !searching && !error && !insufficient && trimmedQ !== "" && books.length === 0;

  return (
    <div className="search-page">
      <div className="search-page__header">
        <button type="button" className="search-page__back-btn" onClick={() => navigate(-1)}>
          <ChevronLeft aria-hidden="true" />
          {t("explore.backBtn")}
        </button>
      </div>

      <div className="search-page__search-wrap">
        <h2 className="search-page__search-title">{t("explore.searchTitle")}</h2>
        <form className="search-page__search-form" onSubmit={handleSubmit} role="search">
          <span className="search-page__search-icon" aria-hidden="true">
            <Search size={18} />
          </span>
          <input
            ref={inputRef}
            className="search-page__search-input"
            type="search"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={t("explore.searchPlaceholder")}
            aria-label={t("search.searchLabel")}
          />
          {inputValue && (
            <button
              type="button"
              className="search-page__search-clear"
              aria-label={t("search.clearLabel")}
              onMouseDown={(e) => {
                e.preventDefault();
                setInputValue("");
                navigate("/explore");
              }}
            >
              <X size={18} />
            </button>
          )}
        </form>
      </div>

      <div className="search-page__results">
        {!q.trim() && <p className="search-page__status">{t("search.emptyPrompt")}</p>}

        {searching && <p className="search-page__status">{t("explore.searching")}</p>}

        {error && !searching && <p className="search-page__error">{error}</p>}

        {insufficient && (
          <div className="search-page__no-results">
            <h3 className="search-page__no-results-title">{t("search.tooShort")}</h3>
            <p className="search-page__no-results-subtitle">{t("search.noResultsSubtitle")}</p>
            <img src="/no-results.png" alt="" className="search-page__no-results-img" />
          </div>
        )}

        {showNoResults && (
          <div className="search-page__no-results">
            <h3 className="search-page__no-results-title">{t("myLibrary.noResults")}</h3>
            <p className="search-page__no-results-subtitle">{t("search.noResultsSubtitle")}</p>
            <img src="/no-results.png" alt="" className="search-page__no-results-img" />
          </div>
        )}

        {!loading && books.length > 0 && (
          <>
            <p className="search-page__status">
              {t("explore.resultsFound", { count: totalResults })}
            </p>
            <div className="search-page__grid">
              {books.map((book) => (
                <BookCard key={book.key} book={book} />
              ))}
            </div>
            <LoadMore
              hasMore={hasNextPage}
              loading={isFetchingNextPage}
              onLoadMore={fetchNextPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
