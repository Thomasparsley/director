import { listenerCount } from "../graphql/schema";

/**
 * How many live `bookAdded` subscribers the server has.
 *
 * Exposed so a spec can assert from the outside that unsubscribing actually reached the
 * server and released its generator — something no client-side assertion can prove.
 */
export default defineEventHandler(() => ({ count: listenerCount() }));
