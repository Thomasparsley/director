import { reactive } from "vue";

import type { GqlNotice } from "#layers/director-gql/app/types/appConfig";

/**
 * Where `gql.notify` sends failures in this app. A real one would hand them to a toast
 * system; the playground keeps a list so the demo page can render them and the E2E specs
 * can read them.
 *
 * Client-only on purpose: module state is shared across SSR requests, so populating it on
 * the server would leak between users AND make the markup disagree with the client's.
 * Nothing here fires during SSR anyway — notices come from user interaction.
 */
export const gqlNotices = reactive<GqlNotice[]>([]);

export function pushGqlNotice(notice: GqlNotice): void {
  if (import.meta.server) {
    return;
  }
  gqlNotices.push(notice);
}

export function clearGqlNotices(): void {
  gqlNotices.splice(0, gqlNotices.length);
}
