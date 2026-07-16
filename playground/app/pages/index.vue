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
