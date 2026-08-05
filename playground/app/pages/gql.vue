<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import { useMutationAsync } from "#layers/director-gql/app/composables/mutation";
import { useQueryAsync } from "#layers/director-gql/app/composables/query";
import { handleMutationResult } from "#layers/director-gql/app/utils/handleMutationResult";
import { notifyOnGqlError } from "#layers/director-gql/app/utils/notifyOnError";

import { addBookMutation, booksQuery, boomQuery } from "../gql/documents";
import type { AddBookPayload } from "../gql/documents";
import { clearGqlNotices, gqlNotices } from "../utils/gqlNotices";

// A ref as `variables`: the layer watches it and refetches, debounced. The first run
// happens here during SSR, so the list is in the markup and hydration replays it from
// the payload rather than fetching again.
const search = ref("");
const variables = computed(() => ({ search: search.value || null }));
const { data: books, pending } = await useQueryAsync(booksQuery, { variables });

const title = ref("");
const author = ref("");
const status = ref<string | null>(null);
const busy = ref(false);

// The list is server-rendered, so these controls are on screen before their handlers are.
// Keeping them disabled until hydration means a fast click cannot silently do nothing —
// and it gives the E2E specs a real thing to wait for instead of a timeout.
const ready = ref(false);
onMounted(() => {
  ready.value = true;
});

async function addBook() {
  status.value = null;
  busy.value = true;

  try {
    const response = await useMutationAsync(addBookMutation, {
      variables: { title: title.value, author: author.value },
      // The payload — not the whole mutation result — is what carries `errors`, so it is
      // what handleMutationResult needs to see.
      transform: data => data.addBook,
    });

    const result = handleMutationResult<AddBookPayload, AddBookPayload>({
      response,
      onError: {
        onDuplicateTitle: (error) => {
          status.value = `Rejected: ${error.message}`;
        },
        onTitleRequired: (error) => {
          status.value = `Rejected: ${error.message}`;
        },
      },
    });

    status.value = `Added "${result.book.title}"`;
    title.value = "";
    author.value = "";
  }
  catch {
    // handleMutationResult throws on every failure; the handlers above already wrote the
    // message for the ones this form knows about, and `gql.notify` caught the rest.
  }
  finally {
    busy.value = false;
  }
}

async function triggerServerError() {
  clearGqlNotices();
  await useQueryAsync(boomQuery, { onError: notifyOnGqlError });
}
</script>

<template>
  <div class=":uno: flex flex-col gap-8">
    <p class=":uno: text-gray-600 dark:text-gray-300">
      <code>@directorkit/gql</code> demo — one urql client configured from <code>app.config</code>,
      talking to the playground's own toy GraphQL server.
    </p>

    <section class=":uno: flex max-w-xl flex-col gap-4">
      <h2 class=":uno: text-sm font-semibold vtext-1">
        Books
      </h2>

      <label class=":uno: flex flex-col gap-1 text-sm">
        <span class=":uno: vtext-1">Search</span>
        <input
          v-model="search"
          :disabled="!ready"
          class=":uno: rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
          placeholder="Filter by title or author"
        >
      </label>

      <div>
        <p class=":uno: mb-1 text-xs vtext-3">
          {{ pending ? "Loading…" : `${books?.books.length ?? 0} book(s)` }}
        </p>

        <ul
          aria-label="Books"
          class=":uno: flex flex-col gap-1"
        >
          <li
            v-for="book in books?.books ?? []"
            :key="book.id"
            class=":uno: rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-700"
          >
            <span class=":uno: font-medium vtext-1">{{ book.title }}</span>
            <span class=":uno: vtext-3"> — {{ book.author }}</span>
          </li>
        </ul>
      </div>
    </section>

    <section class=":uno: flex max-w-xl flex-col gap-4">
      <h2 class=":uno: text-sm font-semibold vtext-1">
        Add a book
      </h2>

      <label class=":uno: flex flex-col gap-1 text-sm">
        <span class=":uno: vtext-1">Title</span>
        <input
          v-model="title"
          :disabled="!ready"
          class=":uno: rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
        >
      </label>

      <label class=":uno: flex flex-col gap-1 text-sm">
        <span class=":uno: vtext-1">Author</span>
        <input
          v-model="author"
          :disabled="!ready"
          class=":uno: rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
        >
      </label>

      <div class=":uno: flex gap-2">
        <DButton
          :disabled="!ready || busy"
          @click="addBook"
        >
          Add book
        </DButton>

        <DButton
          :disabled="!ready"
          @click="triggerServerError"
        >
          Trigger a server error
        </DButton>
      </div>

      <p
        v-if="status"
        role="alert"
        class=":uno: text-sm vtext-1"
      >
        {{ status }}
      </p>
    </section>

    <section class=":uno: flex max-w-xl flex-col gap-2">
      <h2 class=":uno: text-sm font-semibold vtext-1">
        Notices from <code>gql.notify</code>
      </h2>

      <ul
        aria-label="Notices"
        class=":uno: flex flex-col gap-1"
      >
        <li
          v-for="(notice, index) in gqlNotices"
          :key="index"
          class=":uno: rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-700"
        >
          <span class=":uno: font-medium vtext-1">{{ notice.title }}</span>
          <span class=":uno: vtext-3"> — {{ notice.message }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>
