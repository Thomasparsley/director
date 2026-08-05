import { parse } from "graphql";
import type { TadaDocumentNode } from "gql.tada";

/**
 * Types a hand-written GraphQL document.
 *
 * A real consumer does NOT do this: it runs gql.tada's codegen against its schema and
 * gets `graphql` from `initGraphQLTada`, which infers result and variable types from the
 * introspection. `@directorkit/gql` accepts any `TadaDocumentNode`, so the playground keeps
 * its toy schema (`server/api/graphql.post.ts`) small enough to type by hand rather than
 * adding a codegen step and a generated `graphql-env.d.ts` to this repo.
 *
 * The types below are what codegen would have produced — including the literal union on
 * `code`, which is what makes `handleMutationResult`'s `on<Code>` handlers exist.
 */
function typedDocument<
  Result,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  Variables extends Record<string, unknown> = {},
>(source: string): TadaDocumentNode<Result, Variables> {
  return parse(source) as unknown as TadaDocumentNode<Result, Variables>;
}

export interface Book {
  id: string
  title: string
  author: string
}

export const booksQuery = typedDocument<
  { books: Book[] },
  { search: string | null }
>(`
  query Books($search: String) {
    books(search: $search) {
      id
      title
      author
    }
  }
`);

export const boomQuery = typedDocument<{ boom: string | null }>(`
  query Boom {
    boom
  }
`);

export interface AddBookPayload {
  book: Book | null
  errors: { code: "TitleRequired" | "DuplicateTitle", message: string }[]
}

export const addBookMutation = typedDocument<
  { addBook: AddBookPayload },
  { title: string, author: string }
>(`
  mutation AddBook($title: String!, $author: String!) {
    addBook(title: $title, author: $author) {
      book {
        id
        title
        author
      }
      errors {
        code
        message
      }
    }
  }
`);
