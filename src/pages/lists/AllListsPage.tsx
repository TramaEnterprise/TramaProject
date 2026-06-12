import { useState } from "react";
import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { useAuth } from "@/context/auth/useAuth";
import { useLists } from "@/hooks/useLists";
import ListCard from "@/components/shelf/cards/ListCard";
import ListEditorModal from "@/components/shelf/modals/ListEditorModal";
import "./AllListsPage.scss";
import { useBreadcrumbLabel } from "@/context/breadcrumb/useBreadcrumb";

export default function AllListsPage() {
  const { userId } = useParams<{ userId: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { lists: allLists, loading, createList } = useLists(userId);
  const [editorOpen, setEditorOpen] = useState(false);

  const isOwner = !!user && user.uid === userId;
  const lists = isOwner ? allLists : allLists.filter((l) => l.isPublic);

  useBreadcrumbLabel(
    "listsOwner",
    isOwner ? t("nav.myLibrary") : t("breadcrumbs.profile"),
    isOwner ? "/my-library" : `/profile/${userId}`
  );

  return (
    <div className="all-lists-page">
      <div className="all-lists-page__header">
        <h2 className="all-lists-page__title">{t("myLibrary.allListsTitle")}</h2>
      </div>

      {!loading && (
        <div className="lists-section__grid">
          {lists.map((list) => (
            <ListCard key={list.id} list={list} userId={userId!} />
          ))}
          {isOwner && (
            <button
              type="button"
              className="lists-section__create"
              onClick={() => setEditorOpen(true)}
            >
              <div className="lists-section__create-icon">
                <Plus size={14} aria-hidden="true" />
              </div>
              <span className="lists-section__create-text">{t("myLibrary.createList")}</span>
            </button>
          )}
        </div>
      )}

      {editorOpen && isOwner && (
        <ListEditorModal
          onClose={() => setEditorOpen(false)}
          onSubmit={async ({ name, description, books, isPublic }) => {
            await createList(name, books, description, isPublic);
          }}
        />
      )}
    </div>
  );
}
