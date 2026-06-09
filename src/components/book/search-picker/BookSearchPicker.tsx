import { useDebouncedBookSearch } from "@/hooks/useDebouncedBookSearch";
import { useCurrentLanguage } from "@/plugins/i18n/useCurrentLanguage";
import type { Book } from "@/types/Book";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

type BookSearchPickerMode = "single" | "multi";

type BookSearchPickerProps = {
  selected: { key: string }[];
  max: number;
  onAdd: (book: Book) => void;
  onAddMany?: (books: Book[]) => void;
  mode?: BookSearchPickerMode;
  translationPrefix: string;
  classNames?: Partial<{
    search: string;
    searching: string;
    noResults: string;
    results: string;
    resultItem: string;
    resultCover: string;
    resultTitle: string;
    resultAuthor: string;
    resultContent: string;
    resultCheckbox: string;
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
    () => new Set(selected.map((book) => book.key)),
    [selected]
  );

  const validPending = useMemo(
    () => pendingBooks.filter((book) => !selectedKeys.has(book.key)),
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
    if (selectedKeys.has(book.key)) return;
    onAdd(book);
    setQuery("");
  };

  const togglePending = (book: Book) => {
    if (selectedKeys.has(book.key)) return;

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
      {book.cover_url && (
        <img
          className={classNames?.resultCover}
          src={book.cover_url}
          alt=""
          aria-hidden="true"
        />
      )}
      <div className={classNames?.resultContent}>
        <p className={classNames?.resultTitle}>{book.title}</p>
        <p className={classNames?.resultAuthor}>{book.authors[0]}</p>
      </div>
    </>
  );

  return (
    <>
      <input
        className={classNames?.search}
        type="text"
        placeholder={t(`${translationPrefix}.searchPlaceholder`)}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {searching && <p className={classNames?.searching}>{t(`${translationPrefix}.searching`)}</p>}

      {!searching && query.trim() && results.length === 0 && (
        <p className={classNames?.noResults}>{t(`${translationPrefix}.noResults`)}</p>
      )}

      {results.length > 0 && (
        <ul className={classNames?.results}>
          {results.map((book) => {
            const alreadySelected = selectedKeys.has(book.key);
            const isPending = pendingKeys.has(book.key);
            const isDisabled = alreadySelected || (!isPending && validPending.length >= remainingSlots);

            return (
              <li key={book.key}>
                {mode === "multi" ? (
                  <label className={getResultClassName(isPending, isDisabled)}>
                    <input
                      className={classNames?.resultCheckbox}
                      type="checkbox"
                      checked={isPending}
                      disabled={isDisabled}
                      onChange={() => togglePending(book)}
                      aria-label={book.title}
                    />
                    {renderBookContent(book)}
                  </label>
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
          <span className={classNames?.selectionText}>
            {t(`${translationPrefix}.selectedCount`, { count: validPending.length })}
          </span>
          <div className={classNames?.selectionActions}>
            <button
              type="button"
              className={classNames?.clearSelection}
              onClick={() => setPendingBooks([])}
            >
              {t(`${translationPrefix}.clearSelection`)}
            </button>
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