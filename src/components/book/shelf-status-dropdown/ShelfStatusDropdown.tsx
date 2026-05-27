import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bookmark, BookOpen, BookCheck, BookX,
  ChevronDown, ChevronRight, ListPlus, Check, Plus,
} from "lucide-react";
import type { Book } from "@/types/Book";
import type { ShelfStatus } from "@/types/BookDetail";
import type { BookList, ListBook } from "@/types/BookList";
import { useAuth } from "@/context/auth/useAuth";
import { useShelf } from "@/context/shelf/useShelf";
import { useClickOutside } from "@/hooks/useClickOutside";
import { getLists, updateListDB } from "@/services/firebase/firebaseLists";
import { encodeKey } from "@/utils/bookPaths";
import { bem } from "@/utils/className";
import "./ShelfStatusDropdown.scss";

const SHELF_OPTIONS: ShelfStatus[] = ["wantToRead", "reading", "finished", "didNotFinish"];

const STATUS_ICONS: Record<ShelfStatus, React.ElementType> = {
  wantToRead: Bookmark,
  reading: BookOpen,
  finished: BookCheck,
  didNotFinish: BookX,
};

type ShelfStatusDropdownProps = {
  book: Book;
  classNames?: Partial<{
    root: string;
    btn: string;
    list: string;
    item: string;
    tooltip: string;
  }>;
};

export default function ShelfStatusDropdown({ book, classNames }: ShelfStatusDropdownProps) {
  const { t } = useTranslation();
  const { addBook, removeBook, getStatus } = useShelf();
  const { isAuthenticated, user } = useAuth();
  const saved = getStatus(book.key);

  const [open, setOpen] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const [lists, setLists] = useState<BookList[] | null>(null);
  const [listsLoading, setListsLoading] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useClickOutside(wrapperRef, () => {
    setOpen(false);
    setSubmenuOpen(false);
  }, open);

  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    };
  }, []);

  const loadLists = () => {
    if (!user || lists !== null || listsLoading) return;
    setListsLoading(true);
    getLists(user.uid)
      .then((l) => setLists(l))
      .catch(() => setLists([]))
      .finally(() => setListsLoading(false));
  };

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      setTooltipVisible(true);
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = setTimeout(() => setTooltipVisible(false), 2000);
      return;
    }
    setSubmenuOpen(false);
    setOpen((o) => !o);
  };

  const handleStatusSelect = (e: React.MouseEvent, status: ShelfStatus) => {
    e.stopPropagation();
    if (saved === status) removeBook(book.key);
    else addBook(book, status);
    setOpen(false);
    setSubmenuOpen(false);
  };

  const handleAddToListClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    loadLists();
    setSubmenuOpen((s) => !s);
  };

  const handleToggleList = async (e: React.MouseEvent, list: BookList) => {
    e.stopPropagation();
    if (!user || !lists) return;
    const encodedKey = encodeKey(book.key);
    const alreadyIn = list.books.some((b) => b.key === encodedKey);
    const listBook: ListBook = {
      key: encodedKey,
      title: book.title,
      authors: book.authors,
      cover_url: book.cover_url ?? undefined,
    };
    const newBooks = alreadyIn
      ? list.books.filter((b) => b.key !== encodedKey)
      : [...list.books, listBook];
    setLists((prev) =>
      prev?.map((l) => (l.id === list.id ? { ...l, books: newBooks } : l)) ?? null
    );
    try {
      await updateListDB(user.uid, list.id, { books: newBooks });
    } catch {
      setLists((prev) =>
        prev?.map((l) => (l.id === list.id ? list : l)) ?? null
      );
    }
  };

  const StatusIcon = saved ? STATUS_ICONS[saved] : null;

  return (
    <div className={bem(classNames?.root, { open })} ref={wrapperRef}>
      {tooltipVisible && classNames?.tooltip && (
        <span className={classNames.tooltip}>{t("explore.saveTooltip")}</span>
      )}

      <button
        type="button"
        className={bem(classNames?.btn, { open, saved: !!saved })}
        onClick={handleTriggerClick}
        aria-label={saved ? t(`myLibrary.shelf.${saved}`) : t("book.add")}
      >
        {StatusIcon && <StatusIcon size={14} />}
        <span>{saved ? t(`myLibrary.shelf.${saved}`) : t("book.add")}</span>
        <ChevronDown
          size={12}
          className={bem("shelf-status-dropdown__chevron", { open })}
        />
      </button>

      {open && (
        <ul
          className={classNames?.list}
          onClick={(e) => e.stopPropagation()}
        >
          {SHELF_OPTIONS.map((opt) => {
            const Icon = STATUS_ICONS[opt];
            return (
              <li key={opt}>
                <button
                  type="button"
                  className={bem(classNames?.item, { active: saved === opt })}
                  onClick={(e) => handleStatusSelect(e, opt)}
                >
                  <Icon size={14} />
                  {t(`myLibrary.shelf.${opt}`)}
                </button>
              </li>
            );
          })}

          {isAuthenticated && (
            <>
              <li role="separator" aria-hidden="true" className="shelf-status-dropdown__separator" />

              <li className="shelf-status-dropdown__submenu-item">
                <button
                  type="button"
                  className={bem(classNames?.item, { "submenu-open": submenuOpen })}
                  onClick={handleAddToListClick}
                >
                  <ListPlus size={14} />
                  {t("book.addToList")}
                  <ChevronRight
                    size={12}
                    className={bem("shelf-status-dropdown__submenu-arrow", { open: submenuOpen })}
                  />
                </button>

                {submenuOpen && (
                  <ul className="shelf-status-dropdown__submenu">
                    {listsLoading ? (
                      <li className="shelf-status-dropdown__submenu-empty">
                        {t("bookDetail.loading")}
                      </li>
                    ) : lists && lists.length > 0 ? (
                      lists.map((list) => {
                        const inList = list.books.some(
                          (b) => b.key === encodeKey(book.key)
                        );
                        return (
                          <li key={list.id}>
                            <button
                              type="button"
                              className={bem("shelf-status-dropdown__submenu-btn", { active: inList })}
                              onClick={(e) => handleToggleList(e, list)}
                            >
                              {inList ? <Check size={12} /> : <Plus size={12} />}
                              <span>{list.name}</span>
                            </button>
                          </li>
                        );
                      })
                    ) : (
                      <li className="shelf-status-dropdown__submenu-empty">
                        {t("book.noLists")}
                      </li>
                    )}
                  </ul>
                )}
              </li>
            </>
          )}
        </ul>
      )}
    </div>
  );
}
