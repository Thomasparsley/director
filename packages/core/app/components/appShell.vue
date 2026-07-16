<script setup lang="ts">
import { useProvideIsDirector } from "../composables/useDirector";

import type { DAppShellProps } from "./appShell.types";

withDefaults(defineProps<DAppShellProps>(), {
  collapsed: false,
});

useProvideIsDirector();
</script>

<template>
  <div class=":uno: relative h-svh of-hidden bg-gray-100 dark:bg-gray-950">
    <div class=":uno: relative h-full flex flex-row">
      <!-- Left rail; animates between full and icon width. -->
      <div
        class=":uno: h-full shrink-0 transition-all duration-300 ease-out"
        :class="collapsed ? ':uno: w-[76px]' : ':uno: w-[250px]'"
      >
        <div class=":uno: h-full flex flex-col gap-4 p-3 pr-1">
          <slot name="left" />
        </div>
      </div>

      <!-- Floating glass content card. -->
      <main class=":uno: relative m-2 ml-1 h-[calc(100svh-1rem)] min-w-0 flex flex-1 flex-col of-hidden rounded-2xl bg-white/75 ring-1 ring-black/5 shadow-[0_8px_30px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-2xl backdrop-saturate-150 dark:bg-gray-900/70 dark:ring-white/10 dark:shadow-[0_8px_30px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]">
        <header
          v-if="$slots.header"
          class=":uno: h-14 flex shrink-0 items-center justify-between gap-2 border-b border-black/5 px-5 vtext-3 dark:border-white/8"
        >
          <slot name="header" />
        </header>

        <div class=":uno: flex-1 of-auto px-5">
          <div class=":uno: h-full of-x-hidden of-y-auto py-5">
            <!-- main slot -->
            <slot />
            <!-- /main -->
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
