import { parse } from "graphql";
import type { TadaDocumentNode } from "gql.tada";

/**
 * Hand-typed documents against the fixture's schema. A real app gets these from gql.tada's
 * codegen; the layer accepts any `TadaDocumentNode`, and the fixture's schema is small
 * enough to type by hand without pretending otherwise.
 */
function document<
  Result,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  Variables extends Record<string, unknown> = {},
>(source: string): TadaDocumentNode<Result, Variables> {
  return parse(source) as unknown as TadaDocumentNode<Result, Variables>;
}

/** A document as `gql.tada generate persisted` leaves it: an id, and no AST. */
function persistedDocument<
  Result,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  Variables extends Record<string, unknown> = {},
>(documentId: string): TadaDocumentNode<Result, Variables> {
  return {
    documentId,
    kind: "Document",
    definitions: [],
  } as unknown as TadaDocumentNode<Result, Variables>;
}

export interface Book {
  id: string
  title: string
  author: string
}

export const booksQuery = document<{ books: Book[] }, { search: string | null }>(`
  query Books($search: String) {
    books(search: $search) { id title author }
  }
`);

export const allBooksQuery = document<{ books: Book[] }>(`
  query AllBooks {
    books { id title author }
  }
`);

export const viewerQuery = document<{ viewer: string | null }>(`
  query Viewer { viewer }
`);

export const transportQuery = document<{ transport: string | null }>(`
  query Transport { transport }
`);

export const boomQuery = document<{ boom: string | null }>(`
  query Boom { boom }
`);

export interface AddBookPayload {
  book: Book | null
  errors: { code: "TitleRequired" | "DuplicateTitle", message: string }[]
}

export const addBookMutation = document<
  { addBook: AddBookPayload },
  { title: string, author: string }
>(`
  mutation AddBook($title: String!, $author: String!) {
    addBook(title: $title, author: $author) {
      book { id title author }
      errors { code message }
    }
  }
`);

export const bookAddedSubscription = document<{ bookAdded: Book }>(`
  subscription BookAdded {
    bookAdded { id title author }
  }
`);

// The ids below match the fixture server's manifest in server/graphql/persisted.ts.
export const persistedBooksQuery
  = persistedDocument<{ books: Book[] }, { search: string | null }>("persisted-books");

export const persistedViewerQuery
  = persistedDocument<{ viewer: string | null }>("persisted-viewer");

export const persistedAddBookMutation = persistedDocument<
  { addBook: AddBookPayload },
  { title: string, author: string }
>("persisted-add-book");

export const unknownPersistedQuery
  = persistedDocument<{ books: Book[] }>("persisted-does-not-exist");
