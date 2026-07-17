<script setup lang="ts">
import { ref } from "vue";
import { Inbox, SearchX } from "@lucide/vue";

const bold = ref(true);
const pinned = ref(false);
const view = ref("grid");
const emphasis = ref<string[]>(["bold"]);
</script>

<template>
  <div class=":uno: flex flex-col gap-8">
    <p class=":uno: text-gray-600 dark:text-gray-300">
      Layer chain working: <code>@director/core → @director/ui → @director/common</code>
    </p>

    <section class=":uno: flex flex-col gap-3">
      <h2 class=":uno: text-sm font-semibold vtext-1">
        Buttons
      </h2>
      <div class=":uno: flex flex-wrap items-center gap-3">
        <DButton>Default</DButton>
        <DButton color="primary">
          Primary
        </DButton>
        <DButton color="success">
          Success
        </DButton>
        <DButton color="warning">
          Warning
        </DButton>
        <DButton color="danger">
          Danger
        </DButton>
        <DButton variant="control" size="sm">
          Control
        </DButton>
        <DButton disabled>
          Disabled
        </DButton>
      </div>
    </section>

    <section class=":uno: flex flex-col gap-3">
      <h2 class=":uno: text-sm font-semibold vtext-1">
        Button groups
      </h2>
      <div class=":uno: flex flex-wrap items-center gap-4">
        <DButtonGroup label="Fork options">
          <DButton variant="control" size="sm">
            <IconGitFork class=":uno: mr-1.5 h-3.5 w-3.5" />
            Fork
          </DButton>
          <DButton variant="control" size="sm">
            12
          </DButton>
          <DButton variant="control" size="sm" aria-label="More fork options">
            <IconChevronDown class=":uno: h-3.5 w-3.5" />
          </DButton>
        </DButtonGroup>

        <DButtonGroup>
          <DButton color="primary">
            Save
          </DButton>
          <DButton color="primary" aria-label="More save options">
            <IconChevronDown class=":uno: h-4 w-4" />
          </DButton>
        </DButtonGroup>

        <DButtonGroup orientation="vertical">
          <DButton variant="control" size="sm">
            Top
          </DButton>
          <DButton variant="control" size="sm">
            Middle
          </DButton>
          <DButton variant="control" size="sm">
            Bottom
          </DButton>
        </DButtonGroup>
      </div>
    </section>

    <section class=":uno: flex flex-col gap-3">
      <h2 class=":uno: text-sm font-semibold vtext-1">
        Toggles
      </h2>
      <div class=":uno: flex flex-wrap items-center gap-3">
        <DToggle v-model="bold" square label="Bold">
          <IconBold class=":uno: h-4 w-4" />
        </DToggle>
        <DToggle v-model="pinned">
          <IconPin class=":uno: h-4 w-4" />
          Pinned
        </DToggle>
        <DToggle variant="ghost" square label="Italic">
          <IconItalic class=":uno: h-4 w-4" />
        </DToggle>
        <DToggle size="sm">
          Small
        </DToggle>
        <DToggle size="lg">
          Large
        </DToggle>
        <DToggle disabled>
          Disabled
        </DToggle>
      </div>
    </section>

    <section class=":uno: flex flex-col gap-3">
      <h2 class=":uno: text-sm font-semibold vtext-1">
        Toggle groups
      </h2>
      <div class=":uno: flex flex-wrap items-center gap-4">
        <DToggleGroup v-model="view" type="single">
          <DToggleGroupItem value="list">
            List
          </DToggleGroupItem>
          <DToggleGroupItem value="grid">
            Grid
          </DToggleGroupItem>
          <DToggleGroupItem value="board">
            Board
          </DToggleGroupItem>
        </DToggleGroup>

        <DToggleGroup v-model="emphasis" type="multiple" size="sm">
          <DToggleGroupItem value="bold" square label="Bold">
            <IconBold class=":uno: h-3.5 w-3.5" />
          </DToggleGroupItem>
          <DToggleGroupItem value="italic" square label="Italic">
            <IconItalic class=":uno: h-3.5 w-3.5" />
          </DToggleGroupItem>
          <DToggleGroupItem value="underline" square label="Underline">
            <IconUnderline class=":uno: h-3.5 w-3.5" />
          </DToggleGroupItem>
        </DToggleGroup>

        <DToggleGroup type="single" size="lg" disabled>
          <DToggleGroupItem value="on">
            Disabled
          </DToggleGroupItem>
          <DToggleGroupItem value="off">
            Group
          </DToggleGroupItem>
        </DToggleGroup>
      </div>
    </section>

    <section class=":uno: flex flex-col gap-3">
      <h2 class=":uno: text-sm font-semibold vtext-1">
        Kbd
      </h2>
      <div class=":uno: flex flex-wrap items-center gap-4">
        <span class=":uno: inline-flex items-center gap-1 text-sm vtext-2">
          Command palette
          <DKbd value="meta" />
          <DKbd value="K" />
        </span>
        <span class=":uno: inline-flex items-center gap-1 text-sm vtext-2">
          Save
          <DKbd value="meta" variant="subtle" />
          <DKbd value="S" variant="subtle" />
        </span>
        <span class=":uno: inline-flex items-center gap-1 text-sm vtext-2">
          Submit
          <DKbd value="shift" variant="outline" />
          <DKbd value="enter" variant="outline" />
        </span>
        <span class=":uno: inline-flex items-center gap-1">
          <DKbd value="alt" size="sm" />
          <DKbd value="escape" size="sm" />
        </span>
        <span class=":uno: inline-flex items-center gap-1">
          <DKbd value="arrowup" size="lg" />
          <DKbd value="arrowdown" size="lg" />
        </span>
      </div>
    </section>

    <section class=":uno: flex flex-col gap-3">
      <h2 class=":uno: text-sm font-semibold vtext-1">
        Badges
      </h2>
      <div class=":uno: flex flex-wrap items-center gap-3">
        <DBadge color="primary">
          Primary
        </DBadge>
        <DBadge>Neutral</DBadge>
        <DBadge color="info">
          Info
        </DBadge>
        <DBadge color="success">
          Success
        </DBadge>
        <DBadge color="warn">
          Warn
        </DBadge>
        <DBadge color="error">
          Error
        </DBadge>
        <DBadge
          color="primary"
          variant="subtle"
        >
          Subtle
        </DBadge>
      </div>
    </section>

    <section class=":uno: flex flex-col gap-3">
      <h2 class=":uno: text-sm font-semibold vtext-1">
        Chips
      </h2>
      <div class=":uno: flex flex-wrap items-center gap-4">
        <DChip />
        <DChip color="success" :text="4" />
        <DChip color="error" :text="12" />
        <DChip color="warn" size="lg" />
      </div>
    </section>

    <section class=":uno: flex flex-col gap-3">
      <h2 class=":uno: text-sm font-semibold vtext-1">
        Cards
      </h2>
      <div class=":uno: grid gap-4 md:grid-cols-2">
        <DCard
          title="Outline"
          description="The default surface — frosted glass over a hairline ring."
        >
          <p class=":uno: text-sm vtext-2">
            Body content sits between the header and the footer, and the dividers appear on
            their own.
          </p>
          <template #footer>
            <DButton size="sm" color="primary">
              Save
            </DButton>
          </template>
        </DCard>

        <DCard variant="soft" title="Soft" description="Elevation with no edge.">
          <p class=":uno: text-sm vtext-2">
            No ring — the shadow does the work.
          </p>
        </DCard>

        <DCard variant="subtle" title="Subtle" description="Ring and a deeper shadow.">
          <p class=":uno: text-sm vtext-2">
            For a card that has to lift off a busy background.
          </p>
        </DCard>

        <DCard variant="solid" title="Solid" description="The inverted surface.">
          <p class=":uno: text-sm text-white/70 dark:text-gray-900/70">
            The only opaque fill — text inverts against the colour mode.
          </p>
        </DCard>

        <DCard>
          <p class=":uno: text-sm vtext-2">
            Body only: no header, no footer, no dividers.
          </p>
        </DCard>

        <DCard title="Header slot">
          <template #header>
            <div class=":uno: flex items-center justify-between">
              <span class=":uno: text-base font-semibold vtext-1">Custom header</span>
              <DBadge color="success">Live</DBadge>
            </div>
          </template>
          <p class=":uno: text-sm vtext-2">
            The header slot replaces the whole title/description block.
          </p>
        </DCard>
      </div>
    </section>

    <section class=":uno: flex flex-col gap-3">
      <h2 class=":uno: text-sm font-semibold vtext-1">
        Empty
      </h2>
      <div class=":uno: grid gap-4 md:grid-cols-2">
        <DEmpty
          :icon="Inbox"
          title="No projects found"
          description="It looks like you haven't added any projects. Create one to get started."
        >
          <template #actions>
            <DButton color="primary" size="sm">
              New project
            </DButton>
            <DButton variant="control" size="sm">
              Import
            </DButton>
          </template>
        </DEmpty>

        <DEmpty
          variant="soft"
          size="sm"
          :icon="SearchX"
          title="No results"
          description="Try a different search term."
        />

        <DEmpty
          variant="solid"
          :icon="Inbox"
          title="Inbox zero"
          description="Nothing left to read."
        />

        <!-- naked is the variant for an empty state dropped into a box that already exists. -->
        <DCard title="Members" description="Nested: a naked empty state inside a card.">
          <DEmpty
            variant="naked"
            size="xs"
            :icon="Inbox"
            title="No members yet"
            description="Invite someone to get started."
            title-level="h4"
          />
        </DCard>
      </div>
    </section>

    <section class=":uno: flex flex-col gap-3">
      <h2 class=":uno: text-sm font-semibold vtext-1">
        Skeleton
      </h2>
      <div class=":uno: flex flex-col gap-2">
        <DSkeleton :rw="[8, 12]" class=":uno: h-4" />
        <DSkeleton :rw="[12, 16]" class=":uno: h-4" />
        <DSkeleton :rw="[6, 10]" class=":uno: h-4" />
      </div>
    </section>
  </div>
</template>
