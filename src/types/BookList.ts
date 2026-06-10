export type ListBook = {
  key: string;
  title: string;
  authors: string[];
  cover_url?: string;
  rating?: number;
  ratingCount?: number;
};

export type BookList = {
  id: string;
  name: string;
  description?: string;
  books: ListBook[];
  isPublic?: boolean;
  createdAt: string;
  updatedAt: string;
};
