import { useDebouncedBookSearch } from "@/hooks/useDebouncedBookSearch";
import { useCurrentLanguage } from "@/plugins/i18n/useCurrentLanguage";
import type { Book } from "@/types/Book";
import { encodeKey } from "@/utils/bookPaths";
import { BookOpen, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

function BookCoverImage({ src, className }: { src?: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <span className={`${className} ${className}--placeholder`} aria-hidden="true">
        <BookOpen size={14} />
      </span>
    );
  }
  return (
    <img className={className} src={src} alt="" aria-hidden="true" onError={() => setBroken(true)} />
  );
}

type BookSearchPickerMode = "single" | "multi";

type BookSearchPickerProps = {
  selected: { key: string }[];
  max: number;
  onAdd: (book: Book) => void;
  onAddMany?: (books: Book[]) => void;
  mode?: BookSearchPickerMode;
  translationPrefix: string;
  classNames?: Partial<{
    searchWrapper: string;
    search: string;
    searchClear: string;
    searching: string;
    noResults: string;
    results: string;
    resultItem: string;
    resultCover: string;
    resultTitle: string;
    resultAuthor: string;
    resultContent: string;
    resultCheckbox: string;
    resultAction: string;
    selectionBar: string;
    selectionText: string;
    selectionActions: string;
    clearSelection: string;
    addSelected: string;
  }>;
};

export default function BookSearchPicker({
  selected,
  max,
  onAdd,
  onAddMany,
  mode = "single",
  translationPrefix,
  classNames,
}: BookSearchPickerProps) {
  const { t } = useTranslation();
  const { lang } = useCurrentLanguage();
  const [query, setQuery] = useState("");
  const [pendingBooks, setPendingBooks] = useState<Book[]>([]);
  const { results, searching } = useDebouncedBookSearch(query, { lang });

  const selectedKeys = useMemo(
    () => new Set(selected.map((book) => encodeKey(book.key))),
    [selected]
  );

  const validPending = useMemo(
    () => pendingBooks.filter((book) => !selectedKeys.has(encodeKey(book.key))),
    [pendingBooks, selectedKeys]
  );
  const pendingKeys = useMemo(
    () => new Set(validPending.map((book) => book.key)),
    [validPending]
  );

  const remainingSlots = Math.max(0, max - selected.length);

  const [prevReset, setPrevReset] = useState({ mode, query });
  if (prevReset.mode !== mode || prevReset.query !== query) {
    setPrevReset({ mode, query });
    if (mode === "multi" && pendingBooks.length > 0) setPendingBooks([]);
  }

  if (selected.length >= max) return null;

  const getResultClassName = (isPending: boolean, isDisabled = false) => {
    const names = [classNames?.resultItem];

    if (isPending && classNames?.resultItem) {
      names.push(`${classNames.resultItem}--selected`);
    }

    if (isDisabled && classNames?.resultItem) {
      names.push(`${classNames.resultItem}--disabled`);
    }

    return names.filter(Boolean).join(" ");
  };

  const handleAdd = (book: Book) => {
    if (selectedKeys.has(encodeKey(book.key))) return;
    onAdd(book);
    setQuery("");
  };

  const togglePending = (book: Book) => {
    if (selectedKeys.has(encodeKey(book.key))) return;

    setPendingBooks((current) => {
      if (current.some((item) => item.key === book.key)) {
        return current.filter((item) => item.key !== book.key);
      }

      if (validPending.length >= remainingSlots) {
        return current;
      }

      return [...current, book];
    });
  };

  const handleAddPending = () => {
    const booksToAdd = validPending.slice(0, remainingSlots);
    if (booksToAdd.length === 0) return;

    if (onAddMany) {
      onAddMany(booksToAdd);
    } else {
      booksToAdd.forEach(onAdd);
    }

    setPendingBooks([]);
    setQuery("");
  };

  const renderBookContent = (book: Book) => (
    <>
      <BookCoverImage src={book.cover_url} className={classNames?.resultCover} />
      <div className={classNames?.resultContent}>
        <p className={classNames?.resultTitle}>{book.title}</p>
        <p className={classNames?.resultAuthor}>{book.authors[0]}</p>
      </div>
    </>
  );

  return (
    <>
      <div className={classNames?.searchWrapper}>
        <input
          className={classNames?.search}
          type="text"
          placeholder={t(`${translationPrefix}.searchPlaceholder`)}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button
            type="button"
            className={classNames?.searchClear}
            onClick={() => setQuery("")}
            aria-label={t(`${translationPrefix}.clearSearch`)}
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      {searching && <p className={classNames?.searching}>{t(`${translationPrefix}.searching`)}</p>}

      {!searching && query.trim() && results.length === 0 && (
        <p className={classNames?.noResults}>{t(`${translationPrefix}.noResults`)}</p>
      )}

      {results.length > 0 && (
        <ul className={classNames?.results}>
          {results.map((book) => {
            const alreadySelected = selectedKeys.has(encodeKey(book.key));
            const isPending = pendingKeys.has(book.key);
            const isDisabled = alreadySelected || (!isPending && validPending.length >= remainingSlots);

            return (
              <li key={book.key}>
                {mode === "multi" ? (
                  <div className={getResultClassName(isPending, alreadySelected)}>
                    <input
                      className={classNames?.resultCheckbox}
                      type="checkbox"
                      checked={isPending}
                      disabled={isDisabled}
                      onChange={() => togglePending(book)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={book.title}
                    />
                    <button
                      type="button"
                      className={classNames?.resultAction}
                      onClick={() => handleAdd(book)}
                      disabled={alreadySelected}
                    >
                      {renderBookContent(book)}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={getResultClassName(false, alreadySelected)}
                    onClick={() => handleAdd(book)}
                    disabled={alreadySelected}
                  >
                    {renderBookContent(book)}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {mode === "multi" && validPending.length > 0 && (
        <div className={classNames?.selectionBar}>
          <button
            type="button"
            className={classNames?.clearSelection}
            onClick={() => setPendingBooks([])}
          >
            {t(`${translationPrefix}.clearSelection`)}
          </button>
          <span className={classNames?.selectionText}>
            {t(`${translationPrefix}.selectedCount`, { count: validPending.length })}
          </span>
          <div className={classNames?.selectionActions}>
            <button
              type="button"
              className={classNames?.addSelected}
              onClick={handleAddPending}
            >
              {t(`${translationPrefix}.addSelected`, { count: pendingBooks.length })}
            </button>
          </div>
        </div>
      )}
    </>
  );
}