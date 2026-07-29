import { buildSchema } from "graphql";

/**
 * The integration fixture's toy GraphQL schema, shared by the HTTP route and the
 * WebSocket route so both transports answer from the same state.
 *
 * It exists to be *real*: a genuine `graphql` execution behind a genuine Nitro server, so
 * the layer's client, exchanges, fetch and socket are exercised end to end rather than
 * against a fake. It is not a model of anything.
 */
export const schema = buildSchema(`
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
    "Always fails — exercises the GraphQL-error channel."
    boom: String
    "Echoes back the request's session cookie, so header forwarding is observable."
    viewer: String
    "Echoes the HTTP method the operation arrived on, so POST-vs-GET is observable."
    transport: String
  }

  type Mutation {
    addBook(title: String!, author: String!): AddBookPayload!
  }

  type Subscription {
    bookAdded: Book!
  }
`);

export interface Book {
  id: string
  title: string
  author: string
}

/** The request-scoped values a resolver may need. */
export interface GraphqlContext {
  /** Value of the `session` cookie on the incoming request, if any. */
  session?: string
  /** The HTTP method the operation arrived on (`undefined` over the socket). */
  method?: string
}

const seed: Book[] = [
  { id: "1", title: "Structure and Interpretation of Computer Programs", author: "Abelson" },
  { id: "2", title: "The Mythical Man-Month", author: "Brooks" },
  { id: "3", title: "Refactoring", author: "Fowler" },
];

let books: Book[] = [...seed];
let nextId = seed.length + 1;

/** Live `bookAdded` listeners. One process serves both transports, so a mutation over
 * HTTP is what a subscriber on the socket hears. */
const listeners = new Set<(book: Book) => void>();

/** Drops every added book and disconnects nothing — for specs that want a clean shelf. */
export function resetBooks(): void {
  books = [...seed];
  nextId = seed.length + 1;
}

export const rootValue = {
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

  viewer: (_args: unknown, context: GraphqlContext | undefined) => context?.session ?? null,

  transport: (_args: unknown, context: GraphqlContext | undefined) => context?.method ?? null,

  addBook: ({ title, author }: { title: string, author: string }) => {
    if (!title.trim()) {
      return { book: null, errors: [{ code: "TitleRequired", message: "A book needs a title." }] };
    }

    if (books.some(book => book.title.toLowerCase() === title.trim().toLowerCase())) {
      return {
        book: null,
        errors: [{ code: "DuplicateTitle", message: `"${title}" is already on the shelf.` }],
      };
    }

    const book: Book = { id: String(nextId++), title: title.trim(), author: author.trim() };
    books.push(book);

    for (const listener of listeners) {
      listener(book);
    }

    return { book, errors: [] };
  },
};

/**
 * Subscription roots. graphql-js resolves a subscription field by calling it and
 * expecting an AsyncIterable; each value it yields becomes the root value the selection
 * set is then executed against — hence the `{ bookAdded }` shape.
 */
export const subscriptionRootValue = {
  bookAdded: () => {
    const queue: Book[] = [];
    let wake: (() => void) | undefined;
    let closed = false;

    const listener = (book: Book) => {
      queue.push(book);
      wake?.();
      wake = undefined;
    };
    listeners.add(listener);

    const finish = () => {
      closed = true;
      listeners.delete(listener);
      // Release a `next()` that is parked waiting for an event, or it never returns.
      wake?.();
      wake = undefined;
      return Promise.resolve({ value: undefined, done: true as const });
    };

    // Written as an explicit iterator rather than an `async function*` on purpose.
    // graphql-js ends a subscription by calling `.return()`, and on an async *generator*
    // that call is queued behind whatever `await` the generator is parked on — which here
    // is "wait for the next book", a promise that may never settle. The listener would
    // then never be removed and every disconnect would leak one. An explicit iterator's
    // `return()` runs immediately.
    const iterator: AsyncIterableIterator<{ bookAdded: Book }> = {
      [Symbol.asyncIterator]() {
        return iterator;
      },

      async next() {
        while (!closed) {
          const book = queue.shift();
          if (book) {
            return { value: { bookAdded: book }, done: false };
          }
          await new Promise<void>((resolve) => {
            wake = resolve;
          });
        }
        return { value: undefined as never, done: true };
      },

      return: finish as unknown as AsyncIterableIterator<{ bookAdded: Book }>["return"],

      async throw(error: unknown) {
        await finish();
        throw error;
      },
    };

    return iterator;
  },
};

/** How many subscribers the server currently has — asserted by the teardown spec. */
export function listenerCount(): number {
  return listeners.size;
}
