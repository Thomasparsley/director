/**
 * The manifest a persisted-document server resolves ids against.
 *
 * A real one is generated at build time by `gql.tada generate persisted`, keyed by a hash
 * of the document. The fixture hand-writes three entries so `operations: "persisted"` has
 * a genuine server to talk to — the point being that the *client* never sends the query
 * text, which is only provable if the server can answer without it.
 */
export const persistedDocuments: Record<string, string> = {
  "persisted-books": "query Books($search: String) { books(search: $search) { id title author } }",
  "persisted-viewer": "query Viewer { viewer }",
  "persisted-add-book":
    "mutation AddBook($title: String!, $author: String!) { addBook(title: $title, author: $author) { book { id title } errors { code message } } }",
  "persisted-book-added": "subscription BookAdded { bookAdded { id title author } }",
};
