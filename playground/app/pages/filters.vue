<script setup lang="ts">
import { computed } from "vue";

import { useFilters } from "#layers/director-filters/app/composables/useFilters";
import { useFormControl } from "#layers/director-forms/app/composables/useFormControl";

interface Person {
  name: string;
  role: "admin" | "editor" | "viewer";
  active: boolean;
}

const PEOPLE: Array<Person> = [
  { name: "Ada Lovelace", role: "admin", active: true },
  { name: "Alan Turing", role: "editor", active: true },
  { name: "Grace Hopper", role: "editor", active: false },
  { name: "Katherine Johnson", role: "viewer", active: true },
  { name: "Radia Perlman", role: "admin", active: false },
];

// Query-per-field mode: each filter mirrors to its own URL query param.
const people = useFilters(
  {
    search: useFormControl<string>(""),
    role: useFormControl<string>(""),
    active: useFormControl<boolean>(false),
  },
  {
    storage: { id: "people", query: true },
    initializeTransform: query => ({
      search: typeof query.search === "string" ? query.search : "",
      role: typeof query.role === "string" ? query.role : "",
      active: query.active === "true",
    }),
  },
);

const filtered = computed(() => {
  const { search, role, active } = people.data.value;

  return PEOPLE.filter((person) => {
    if (search && !person.name.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (role && person.role !== role) {
      return false;
    }
    if (active && !person.active) {
      return false;
    }
    return true;
  });
});

// Serialized-object mode: the whole filter rides in one base64 query param (`adv`).
const advanced = useFilters(
  { term: useFormControl<string>("") },
  { storage: { id: "adv", queryObject: true } },
);
</script>

<template>
  <div class=":uno: flex flex-col gap-8">
    <p class=":uno: text-gray-600 dark:text-gray-300">
      <code>@director/filters</code> demo — <code>useFilters</code> mirroring a filter form to
      the URL query, per-field and as one serialized object.
    </p>

    <section class=":uno: flex max-w-xl flex-col gap-4">
      <h2 class=":uno: text-sm font-semibold vtext-1">
        People filter (query per field)
      </h2>

      <label class=":uno: flex flex-col gap-1 text-sm">
        <span class=":uno: vtext-1">Search</span>
        <input
          v-model="people.form.controls.search.data"
          class=":uno: rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
          placeholder="Filter by name"
        >
      </label>

      <label class=":uno: flex flex-col gap-1 text-sm">
        <span class=":uno: vtext-1">Role</span>
        <select
          v-model="people.form.controls.role.data"
          class=":uno: rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
        >
          <option value="">
            All roles
          </option>
          <option value="admin">
            Admin
          </option>
          <option value="editor">
            Editor
          </option>
          <option value="viewer">
            Viewer
          </option>
        </select>
      </label>

      <label class=":uno: flex items-center gap-2 text-sm">
        <input
          v-model="people.form.controls.active.data"
          type="checkbox"
        >
        <span class=":uno: vtext-1">Active only</span>
      </label>

      <div>
        <p class=":uno: mb-1 text-xs vtext-3">
          {{ filtered.length }} result{{ filtered.length === 1 ? "" : "s" }}
        </p>
        <ul
          aria-label="People"
          class=":uno: flex flex-col gap-1"
        >
          <li
            v-for="person in filtered"
            :key="person.name"
            class=":uno: text-sm vtext-2"
          >
            {{ person.name }}
          </li>
        </ul>
      </div>
    </section>

    <section class=":uno: flex max-w-xl flex-col gap-3">
      <h2 class=":uno: text-sm font-semibold vtext-1">
        Advanced (serialized query object)
      </h2>
      <label class=":uno: flex flex-col gap-1 text-sm">
        <span class=":uno: vtext-1">Term</span>
        <input
          v-model="advanced.form.controls.term.data"
          class=":uno: rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
          placeholder="Round-trips through one param"
        >
      </label>
    </section>
  </div>
</template>
