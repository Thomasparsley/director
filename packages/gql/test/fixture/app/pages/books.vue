<script setup lang="ts">
import { parse } from "graphql";
import type { TadaDocumentNode } from "gql.tada";

import { useQueryAsync } from "#layers/director-gql/app/composables/query";

// The layer accepts any TadaDocumentNode; a real app gets these from gql.tada's codegen.
const booksQuery = parse(`
  query Books {
    books { id title author }
    viewer
  }
`) as TadaDocumentNode<{ books: { id: string, title: string, author: string }[], viewer: string | null }>;

// Awaited in setup, so on the server this runs over real HTTP and its result goes into
// the SSR payload — which is exactly what the integration spec reads back out.
const { data } = await useQueryAsync(booksQuery);
</script>

<template>
  <main>
    <p data-testid="viewer">
      {{ data?.viewer ?? "anonymous" }}
    </p>

    <ul data-testid="books">
      <li
        v-for="book in data?.books ?? []"
        :key="book.id"
      >
        {{ book.title }} — {{ book.author }}
      </li>
    </ul>
  </main>
</template>
