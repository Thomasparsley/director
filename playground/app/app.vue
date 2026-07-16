<script setup lang="ts">
import { ref } from "vue";
import {
  Building2,
  CalendarDays,
  ClipboardList,
  House,
  LayoutDashboard,
  PanelLeft,
  Settings,
  ShieldCheck,
  TextCursorInput,
  Trophy,
  Users,
} from "@lucide/vue";

import type { DNavigationSection } from "#layers/director-core/app/types/navigation";

const collapsed = ref(false);

const sections: Array<DNavigationSection> = [
  {
    key: "root",
    groups: [
      {
        key: "portal",
        items: [
          { label: "Dashboard", icon: LayoutDashboard, to: "/" },
          { label: "Forms", icon: ClipboardList, to: "/forms" },
          { label: "Form UI", icon: TextCursorInput, to: "/form-ui" },
          { label: "Web", icon: House, to: "/web" },
        ],
      },
      {
        key: "firesport",
        label: "Firesport",
        items: [
          {
            label: "Leagues",
            icon: Trophy,
            badge: "12",
            children: [
              { label: "All leagues", to: "/leagues" },
              { label: "My leagues", to: "/leagues/mine", badge: { label: "3", color: "primary" } },
            ],
          },
          {
            label: "Events",
            icon: CalendarDays,
            chip: { color: "success", text: 4 },
            to: "/events",
          },
          { label: "Clubs", icon: Building2, to: "/clubs" },
          { label: "Tools", icon: Settings, to: "/tools", disabled: true },
        ],
      },
      {
        key: "approvals",
        label: "Approvals",
        items: [
          { label: "Events", icon: ShieldCheck, chip: true, to: "/approvals/events" },
          { label: "Teams", icon: Users, to: "/approvals/teams" },
        ],
      },
    ],
  },
];
</script>

<template>
  <DAppShell :collapsed="collapsed">
    <template #left>
      <div class=":uno: flex items-center justify-between px-2">
        <span
          v-if="!collapsed"
          class=":uno: text-sm font-semibold vtext-1"
        >Director</span>

        <DButton
          size="icon_sm"
          aria-label="Toggle sidebar"
          @click="collapsed = !collapsed"
        >
          <PanelLeft class=":uno: h-4 w-4" />
        </DButton>
      </div>

      <DNavigation
        :sections="sections"
        :collapsed="collapsed"
        aria-label="Main"
      />
    </template>

    <NuxtPage />
  </DAppShell>
</template>
