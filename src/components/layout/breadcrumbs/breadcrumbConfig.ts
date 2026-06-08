export type Crumb = { key?: string; slot?: string; to?: string };

export const BREADCRUMB_TRAILS: Record<string, Crumb[]> = {
  "/explore/section/:type": [{ key: "nav.explore", to: "/explore" }, { slot: "section" }],
  "/books/:bookId": [{ key: "nav.explore", to: "/explore" }, { slot: "book" }],
  "/my-library/shelf": [{ key: "nav.myLibrary", to: "/my-library" }, { key: "myLibrary.shelfTitle" }],
  "/profile/edit": [{ key: "breadcrumbs.profile", to: "/profile" }, { key: "breadcrumbs.editProfile" }],
  "/profile/:userId": [{ key: "nav.community", to: "/community" }, { slot: "profileUser" }],
  "/u/:username": [{ key: "nav.community", to: "/community" }, { slot: "profileUser" }],
  "/lists/:userId/:listId": [
    { slot: "listsOwner" },
    { key: "myLibrary.listsTitle", to: "/lists/:userId" },
    { slot: "list" },
  ],
  "/lists/:userId": [{ slot: "listsOwner" }, { key: "myLibrary.listsTitle" }],
  "/settings": [{ slot: "settingsOrigin" }, { key: "breadcrumbs.settings" }],
};

export function resolveSectionCrumb(path: string | undefined): { key: string; to: string } {
  if (path?.startsWith("/explore") || path?.startsWith("/books") || path?.startsWith("/search"))
    return { key: "nav.explore", to: "/explore" };
  if (path?.startsWith("/my-library")) return { key: "nav.myLibrary", to: "/my-library" };
  if (path?.startsWith("/community")) return { key: "nav.community", to: "/community" };
  return { key: "breadcrumbs.profile", to: "/profile" }; // fallback → Perfil
}
