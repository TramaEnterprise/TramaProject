import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Pencil, MoreHorizontal, Share2, Trash2, Lock } from "lucide-react";
import { useAuth } from "@/context/auth/useAuth";
import { useLists } from "@/hooks/useLists";
import BookCard from "@/components/book/cards/BookCard";
import ListEditorModal from "@/components/shelf/modals/ListEditorModal";
import { listBookToBook } from "@/utils/bookListUtils";
import "./ListDetailPage.scss";
import { useBreadcrumbLabel } from "@/context/breadcrumb/useBreadcrumb";

export default function ListDetailPage() {
  const { userId, listId } = useParams<{ userId: string; listId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { lists, loading, updateList, deleteList } = useLists(userId);
  const [editorOpen, setEditorOpen] = useState(false);
  const confirmRef = useRef<HTMLDialogElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: list?.name, url });
    } else {
      await navigator.clipboard.writeText(url);
    }
    setMenuOpen(false);
  };

  const isOwner = !!user && user.uid === userId;
  const list = lists.find((l) => l.id === listId);

  const handleDelete = async () => {
    if (!listId) return;
    await deleteList(listId);
    navigate(`/lists/${userId}`);
  };

  useBreadcrumbLabel(
    "listsOwner",
    isOwner ? t("nav.myLibrary") : t("breadcrumbs.profile"),
    isOwner ? "/my-library" : `/profile/${userId}`
  );
  useBreadcrumbLabel("list", list?.name);

  return (
    <div className="list-detail-page">
      <div className="list-detail-page__header">
        <button type="button" className="list-detail-page__back" onClick={() => navigate(-1)}>
          <ChevronLeft aria-hidden="true" />
          {t("explore.backBtn")}
        </button>
        {list && (
          <div className="list-detail-page__header-row">
            <div className="list-detail-page__title-block">
              <h2 className="list-detail-page__title">
                {list.name}
                {!list.isPublic && <Lock size={16} className="list-detail-page__private-icon" aria-hidden="true" />}
              </h2>
              {list.description && (
                <p className="list-detail-page__description">{list.description}</p>
              )}
            </div>
            {isOwner && (
              <div className="list-detail-page__actions">
                <button
                  type="button"
                  className="list-detail-page__action"
                  onClick={() => setEditorOpen(true)}
                >
                  <Pencil size={14} aria-hidden="true" /> {t("myLibrary.listDetail.edit")}
                </button>
                <div className="list-detail-page__menu" ref={menuRef}>
                  <button
                    type="button"
                    className="list-detail-page__menu-trigger"
                    aria-label={t("myLibrary.listDetail.moreOptions")}
                    onClick={() => setMenuOpen((v) => !v)}
                  >
                    <MoreHorizontal size={18} aria-hidden="true" />
                  </button>
                  {menuOpen && (
                    <ul className="list-detail-page__menu-dropdown" role="menu">
                      <li role="none">
                        <button
                          type="button"
                          className="list-detail-page__menu-item"
                          role="menuitem"
                          onClick={handleShare}
                        >
                          <Share2 size={15} aria-hidden="true" />
                          {t("myLibrary.listDetail.share")}
                        </button>
                      </li>
                      <li role="separator" aria-hidden="true">
                        <hr className="list-detail-page__menu-divider" />
                      </li>
                      <li role="none">
                        <button
                          type="button"
                          className="list-detail-page__menu-item list-detail-page__menu-item--danger"
                          role="menuitem"
                          onClick={() => {
                            setMenuOpen(false);
                            confirmRef.current?.showModal();
                          }}
                        >
                          <Trash2 size={15} aria-hidden="true" />
                          {t("myLibrary.listDetail.delete")}
                        </button>
                      </li>
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {!loading && !list && (
        <p className="list-detail-page__empty">{t("myLibrary.listDetail.notFound")}</p>
      )}

      {list && list.books.length === 0 && (
        <p className="list-detail-page__empty">{t("myLibrary.listDetail.empty")}</p>
      )}

      {list && list.books.length > 0 && (
        <div className="list-detail-page__grid">
          {list.books.map((book) => (
            <BookCard key={book.key} book={listBookToBook(book)} />
          ))}
        </div>
      )}

      {editorOpen && isOwner && list && (
        <ListEditorModal
          existingList={list}
          onClose={() => setEditorOpen(false)}
          onSubmit={async ({ name, description, books, isPublic }) => {
            await updateList(list.id, { name, description, books, isPublic });
          }}
        />
      )}

      {isOwner && (
        <dialog
          ref={confirmRef}
          className="list-detail-page__confirm"
        >
          <div className="list-detail-page__confirm-box">
            <p className="list-detail-page__confirm-text">
              {t("myLibrary.listDetail.confirmDelete")}
            </p>
            <p className="list-detail-page__confirm-subtitle">
              {t("myLibrary.listDetail.confirmDeleteSubtitle")}
            </p>
            <div className="list-detail-page__confirm-actions">
              <button
                type="button"
                className="list-detail-page__confirm-btn list-detail-page__confirm-btn--danger"
                onClick={handleDelete}
              >
                {t("myLibrary.listDetail.confirmDeleteYes")}
              </button>
              <button
                type="button"
                className="list-detail-page__confirm-btn"
                onClick={() => confirmRef.current?.close()}
              >
                {t("myLibrary.listDetail.confirmDeleteNo")}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
