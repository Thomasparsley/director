import { buildSchema, graphql } from "graphql";

/**
 * A toy GraphQL server, so the playground's `@directorkit/gql` demo runs against something
 * real: SSR fetches over HTTP, hydration replays the payload, mutations round-trip.
 *
 * It is deliberately tiny and in-memory — the point is exercising the layer's wiring,
 * not modelling a backend. State lives for the life of the server process, so the E2E
 * specs add books under unique titles rather than asserting on the whole list.
 */
const schema = buildSchema(`
  type Book {
    id: ID!
    title: String!
    author: String!
  }

  type MutationError {
    code: String!
    message: String!
  }

  type AddBookPayload {
    book: Book
    errors: [MutationError!]!
  }

  type Query {
    books(search: String): [Book!]!
    "Always fails — the demo's GraphQL-error path."
    boom: String
  }

  type Mutation {
    addBook(title: String!, author: String!): AddBookPayload!
  }
`);

interface Book {
  id: string
  title: string
  author: string
}

const books: Book[] = [
  { id: "1", title: "Structure and Interpretation of Computer Programs", author: "Abelson" },
  { id: "2", title: "The Mythical Man-Month", author: "Brooks" },
  { id: "3", title: "Refactoring", author: "Fowler" },
];

let nextId = books.length + 1;

const root = {
  books: ({ search }: { search?: string | null }) => {
    if (!search) {
      return books;
    }
    const needle = search.toLowerCase();
    return books.filter(book =>
      book.title.toLowerCase().includes(needle) || book.author.toLowerCase().includes(needle),
    );
  },

  boom: () => {
    throw new Error("The server refused to answer.");
  },

  addBook: ({ title, author }: { title: string, author: string }) => {
    if (!title.trim()) {
      return {
        book: null,
        errors: [{ code: "TitleRequired", message: "A book needs a title." }],
      };
    }

    if (books.some(book => book.title.toLowerCase() === title.trim().toLowerCase())) {
      return {
        book: null,
        errors: [{ code: "DuplicateTitle", message: `"${title}" is already on the shelf.` }],
      };
    }

    const book: Book = { id: String(nextId++), title: title.trim(), author: author.trim() };
    books.push(book);
    return { book, errors: [] };
  },
};

export default defineEventHandler(async (event) => {
  const body = await readBody<{ query?: string, variables?: Record<string, unknown> }>(event);

  if (!body?.query) {
    setResponseStatus(event, 400);
    return { errors: [{ message: "No query in the request body." }] };
  }

  return await graphql({
    schema,
    source: body.query,
    rootValue: root,
    variableValues: body.variables,
  });
});
