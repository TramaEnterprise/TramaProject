import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bookmark, BookOpen, BookCheck, BookX,
  ChevronDown, ChevronRight, ListPlus, Check, Plus, X,
} from "lucide-react";
import type { Book } from "@/types/Book";
import type { ShelfStatus } from "@/types/BookDetail";
import type { BookList, ListBook } from "@/types/BookList";
import { useAuth } from "@/context/auth/useAuth";
import { useShelf } from "@/context/shelf/useShelf";
import { useClickOutside, useClickOutsideMany } from "@/hooks/useClickOutside";
import { createListDB, getLists, updateListDB } from "@/services/firebase/firebaseLists";
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
  portal?: boolean;
  classNames?: Partial<{
    root: string;
    btn: string;
    list: string;
    item: string;
    tooltip: string;
  }>;
};

export default function ShelfStatusDropdown({ book, classNames, portal = false }: ShelfStatusDropdownProps) {
  const { t } = useTranslation();
  const { addBook, removeBook, getStatus } = useShelf();
  const { isAuthenticated, user } = useAuth();
  const saved = getStatus(book.key);

  const [open, setOpen] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const [lists, setLists] = useState<BookList[] | null>(null);
  const [listsLoading, setListsLoading] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [creating, setCreating] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  const wrapperRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const floatingRef = useRef<HTMLUListElement>(null);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mouseLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeAll = useCallback(() => {
    setOpen(false);
    setSubmenuOpen(false);
    setCreateMode(false);
    setNewListName("");
  }, []);

  // Non-portal: click outside the wrapper closes the dropdown
  useClickOutside(wrapperRef, closeAll, !portal && open);

  // Portal: click outside both the wrapper and the floating dropdown closes it
  useClickOutsideMany(
    [wrapperRef, floatingRef],
    closeAll,
    portal && open
  );

  // Portal: close on any scroll so the dropdown doesn't drift
  useEffect(() => {
    if (!portal || !open) return;
    const onScroll = () => closeAll();
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => window.removeEventListener("scroll", onScroll, { capture: true });
  }, [portal, open, closeAll]);

  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
      if (mouseLeaveTimerRef.current) clearTimeout(mouseLeaveTimerRef.current);
    };
  }, []);

  const encodedBookKey = encodeKey(book.key);

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
    if (portal && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen((o) => !o);
  };

  const handleStatusSelect = (e: React.MouseEvent, status: ShelfStatus) => {
    e.stopPropagation();
    if (saved === status) removeBook(book.key);
    else addBook(book, status);
    setOpen(false);
    setSubmenuOpen(false);
  };

  const handleSubmenuMouseEnter = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mouseLeaveTimerRef.current) clearTimeout(mouseLeaveTimerRef.current);
    loadLists();
    setSubmenuOpen(true);
  };

  const handleSubmenuMouseLeave = () => {
    mouseLeaveTimerRef.current = setTimeout(() => {
      setSubmenuOpen(false);
      setCreateMode(false);
      setNewListName("");
    }, 150);
  };

  const handleToggleList = async (e: React.MouseEvent, list: BookList) => {
    e.stopPropagation();
    if (!user || !lists) return;
    const alreadyIn = list.books.some((b) => b.key === encodedBookKey);
    const listBook: ListBook = {
      key: encodedBookKey,
      title: book.title,
      authors: book.authors,
      cover_url: book.cover_url ?? undefined,
    };
    const newBooks = alreadyIn
      ? list.books.filter((b) => b.key !== encodedBookKey)
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

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const trimmed = newListName.trim();
    if (!user || !trimmed) return;
    setCreating(true);
    const listBook: ListBook = {
      key: encodedBookKey,
      title: book.title,
      authors: book.authors,
      cover_url: book.cover_url ?? undefined,
    };
    try {
      const id = await createListDB(user.uid, trimmed, [listBook]);
      const date = new Date().toISOString();
      const newList: BookList = { id, name: trimmed, books: [listBook], description: "", createdAt: date, updatedAt: date };
      setLists((prev) => [...(prev ?? []), newList]);
      setNewListName("");
      setCreateMode(false);
    } finally {
      setCreating(false);
    }
  };

  const StatusIcon = saved ? STATUS_ICONS[saved] : null;

  const dropdownContent = (
    <ul
      ref={portal ? floatingRef : undefined}
      className={classNames?.list}
      style={portal ? { position: "fixed", top: dropdownPos.top, left: dropdownPos.left, zIndex: 9999 } : undefined}
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

          <li
            className="shelf-status-dropdown__submenu-item"
            onMouseEnter={handleSubmenuMouseEnter}
            onMouseLeave={handleSubmenuMouseLeave}
          >
            <button
              type="button"
              className={bem(classNames?.item, { "submenu-open": submenuOpen })}
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
                    const inList = list.books.some((b) => b.key === encodedBookKey);
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

                <li role="separator" aria-hidden="true" className="shelf-status-dropdown__separator" />

                <li>
                  {!createMode ? (
                    <button
                      type="button"
                      className="shelf-status-dropdown__submenu-btn"
                      onClick={(e) => { e.stopPropagation(); setCreateMode(true); }}
                    >
                      <Plus size={12} />
                      <span>{t("myLibrary.createList")}</span>
                    </button>
                  ) : (
                    <form
                      className="shelf-status-dropdown__create-form"
                      onSubmit={handleCreateList}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        autoFocus
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        placeholder={t("myLibrary.listEditor.namePlaceholder")}
                        aria-label={t("myLibrary.listEditor.nameLabel")}
                        className="shelf-status-dropdown__create-input"
                        disabled={creating}
                      />
                      <div className="shelf-status-dropdown__create-actions">
                        <button
                          type="submit"
                          aria-label={t("myLibrary.listEditor.save")}
                          disabled={!newListName.trim() || creating}
                        >
                          <Check size={12} />
                        </button>
                        <button
                          type="button"
                          aria-label={t("myLibrary.listEditor.cancel")}
                          onClick={(e) => { e.stopPropagation(); setCreateMode(false); setNewListName(""); }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </form>
                  )}
                </li>
              </ul>
            )}
          </li>
        </>
      )}
    </ul>
  );

  return (
    <div className={bem(classNames?.root, { open })} ref={wrapperRef}>
      {tooltipVisible && (
        <span className={classNames?.tooltip ?? "shelf-status-dropdown__tooltip"}>
          {t("explore.saveTooltip")}
        </span>
      )}

      <button
        ref={btnRef}
        type="button"
        className={bem(classNames?.btn, { open, saved: !!saved })}
        onClick={handleTriggerClick}
        aria-label={saved ? t(`myLibrary.shelf.${saved}`) : t("book.add")}
      >
        {StatusIcon && <StatusIcon size={14} />}
        <span>{saved ? t(`myLibrary.shelf.${saved}`) : t("book.add")}</span>
        <ChevronDown
          size={13}
          className={bem("shelf-status-dropdown__chevron", { open })}
        />
      </button>

      {open && (portal ? createPortal(dropdownContent, document.body) : dropdownContent)}
    </div>
  );
}
