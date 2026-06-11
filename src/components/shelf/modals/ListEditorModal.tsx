import type { Book } from "@/types/Book";
import type { BookList, ListBook } from "@/types/BookList";
import { isValidListName, MAX_LIST_BOOKS, MAX_LIST_DESCRIPTION } from "@/utils/bookListUtils";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import "./ListEditorModal.scss";
import Modal from "@/components/common/Modal";
import BookSearchPicker from "@/components/book/search-picker/BookSearchPicker";

const BOOKS_PER_PAGE = 4;

type ListEditorModalProps = {
  existingList?: BookList;
  onSubmit: (data: { name: string; description: string; books: ListBook[]; isPublic: boolean }) => Promise<void>;
  onClose: () => void;
};

export default function ListEditorModal({ existingList, onSubmit, onClose }: ListEditorModalProps) {
  const { t } = useTranslation();
  const isEdit = !!existingList;

  const [name, setName] = useState(existingList?.name ?? "");
  const [description, setDescription] = useState(existingList?.description ?? "");
  const [books, setBooks] = useState<ListBook[]>(existingList?.books ?? []);
  const [isPublic, setIsPublic] = useState(existingList?.isPublic ?? true);
  const [page, setPage] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(books.length / BOOKS_PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const pageBooks = books.slice(
    safePage * BOOKS_PER_PAGE,
    safePage * BOOKS_PER_PAGE + BOOKS_PER_PAGE
  );

  const toListBook = (book: Book): ListBook => ({
    key: book.key,
    title: book.title,
    authors: book.authors,
    cover_url: book.cover_url,
    rating: book.rating,
    ratingCount: book.ratingCount,
  });

  const addBooks = (incomingBooks: Book[]) => {
    const currentKeys = new Set(books.map((book) => book.key));
    const remainingSlots = MAX_LIST_BOOKS - books.length;

    const nextBooks = incomingBooks
      .filter((book) => !currentKeys.has(book.key))
      .slice(0, remainingSlots)
      .map(toListBook);

    if (nextBooks.length === 0) return;

    const updatedBooks = [...books, ...nextBooks];
    setBooks(updatedBooks);
    setPage(Math.max(0, Math.ceil(updatedBooks.length / BOOKS_PER_PAGE) - 1));
  };

  const addBook = (book: Book) => {
    addBooks([book]);
  };

  const removeBook = (key: string) => {
    setBooks((prev) => prev.filter((b) => b.key !== key));
  };

  const handleSubmit = async () => {
    if (!isValidListName(name) || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onSubmit({ name: name.trim(), description: description.trim(), books, isPublic });
      onClose();
    } catch {
      setSaveError(t("myLibrary.listEditor.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const title = isEdit
    ? t("myLibrary.listEditor.editTitle")
    : t("myLibrary.listEditor.createTitle");

  return (
    <Modal
      title={title}
      closeAriaLabel={t("myLibrary.listEditor.closeAria")}
      onClose={onClose}
      classNames={{
        root: "list-editor-modal",
        backdrop: "list-editor-modal__backdrop",
        box: "list-editor-modal__box",
        header: "list-editor-modal__header",
        title: "list-editor-modal__title",
        close: "list-editor-modal__close",
      }}
    >
      <div className="list-editor-modal__meta">
        <div className="list-editor-modal__left-col">
          <div className="list-editor-modal__name-field">
            <label className="list-editor-modal__name-label" htmlFor="list-name">
              {t("myLibrary.listEditor.nameLabel")}
            </label>
            <input
              id="list-name"
              className="list-editor-modal__name"
              type="text"
              placeholder={t("myLibrary.listEditor.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="list-editor-modal__visibility-field">
            <span className="list-editor-modal__visibility-label">
              {t("myLibrary.listEditor.visibilityLabel")}
            </span>
            <label className="list-editor-modal__toggle">
              <input
                type="checkbox"
                className="list-editor-modal__toggle-input"
                checked={!isPublic}
                onChange={(e) => setIsPublic(!e.target.checked)}
              />
              <span className="list-editor-modal__toggle-track">
                <span className="list-editor-modal__toggle-thumb" />
              </span>
              <span className="list-editor-modal__toggle-text">
                {!isPublic
                  ? t("myLibrary.listEditor.private")
                  : t("myLibrary.listEditor.public")}
              </span>
            </label>
          </div>
        </div>

        <div className="list-editor-modal__right-col">
          <div className="list-editor-modal__description-field">
            <div className="list-editor-modal__description-header">
              <label className="list-editor-modal__description-label" htmlFor="list-description">
                {t("myLibrary.listEditor.descriptionLabel")}
              </label>
              <span
                className={`list-editor-modal__desc-counter${description.length >= MAX_LIST_DESCRIPTION ? " list-editor-modal__desc-counter--limit" : ""}`}
              >
                {description.length}/{MAX_LIST_DESCRIPTION}
              </span>
            </div>
            <textarea
              id="list-description"
              className="list-editor-modal__description"
              placeholder={t("myLibrary.listEditor.descriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={MAX_LIST_DESCRIPTION}
            />
          </div>
        </div>
      </div>

      <div className="list-editor-modal__search-field">
        <div className="list-editor-modal__search-header">
          <p className="list-editor-modal__add-books-label">
            {t("myLibrary.listEditor.addBooksLabel")}
          </p>
          <span className="list-editor-modal__counter" aria-live="polite">
            {books.length}/{MAX_LIST_BOOKS}
          </span>
        </div>
        <div className="list-editor-modal__search-area">
          <BookSearchPicker
            selected={books}
            max={MAX_LIST_BOOKS}
            mode="multi"
            onAdd={addBook}
            onAddMany={addBooks}
            translationPrefix="myLibrary.listEditor"
            classNames={{
              search: "list-editor-modal__search",
              searching: "list-editor-modal__searching",
              noResults: "list-editor-modal__no-results",
              results: "list-editor-modal__results",
              resultItem: "list-editor-modal__result-item",
              resultCover: "list-editor-modal__result-cover",
              resultTitle: "list-editor-modal__result-title",
              resultAuthor: "list-editor-modal__result-author",
              resultContent: "list-editor-modal__result-content",
              resultCheckbox: "list-editor-modal__result-checkbox",
              selectionBar: "list-editor-modal__selection-bar",
              selectionText: "list-editor-modal__selection-text",
              selectionActions: "list-editor-modal__selection-actions",
              clearSelection: "list-editor-modal__selection-clear",
              addSelected: "list-editor-modal__selection-add",
            }}
          />
        </div>
      </div>

      <div className="list-editor-modal__current">
        {books.length === 0 && (
          <p className="list-editor-modal__empty">{t("myLibrary.listEditor.empty")}</p>
        )}
        {pageBooks.map((book) => (
          <div key={book.key} className="list-editor-modal__book-item">
            {book.cover_url && (
              <img
                className="list-editor-modal__book-cover"
                src={book.cover_url}
                alt={book.title}
              />
            )}
            <div className="list-editor-modal__book-info">
              <span className="list-editor-modal__book-title">{book.title}</span>
              {book.authors?.[0] && (
                <span className="list-editor-modal__book-author">{book.authors[0]}</span>
              )}
            </div>
            <button
              type="button"
              className="list-editor-modal__book-remove"
              onClick={() => removeBook(book.key)}
              aria-label={t("myLibrary.listEditor.removeAria", { title: book.title })}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="list-editor-modal__pager">
          <button
            type="button"
            className="list-editor-modal__pager-btn"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            aria-label={t("myLibrary.listEditor.prevPage")}
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <span className="list-editor-modal__pager-info">
            {safePage + 1} / {totalPages}
          </span>
          <button
            type="button"
            className="list-editor-modal__pager-btn"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage === totalPages - 1}
            aria-label={t("myLibrary.listEditor.nextPage")}
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="list-editor-modal__footer">
        {saveError && (
          <p className="list-editor-modal__save-error" role="alert">
            {saveError}
          </p>
        )}
        <div className="list-editor-modal__footer-actions">
          <button
            type="button"
            className="list-editor-modal__btn list-editor-modal__btn--cancel"
            onClick={onClose}
          >
            {t("myLibrary.listEditor.cancel")}
          </button>
          <button
            type="button"
            className="list-editor-modal__btn list-editor-modal__btn--save"
            onClick={handleSubmit}
            disabled={saving || !isValidListName(name)}
          >
            {saving ? t("myLibrary.listEditor.saving") : t("myLibrary.listEditor.save")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
