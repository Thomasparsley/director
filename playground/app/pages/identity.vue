<script setup lang="ts">
import { ref } from "vue";

import { useIdentity } from "#layers/director-identity/app/composables/useIdentity";
import { buildLoginCredentials } from "#layers/director-identity/app/core/credentials";

const identity = useIdentity();

const username = ref("");
const password = ref("");
const error = ref<string | null>(null);
const busy = ref(false);

async function signIn() {
  error.value = null;
  busy.value = true;
  try {
    const result = await identity.login(buildLoginCredentials(username.value, password.value));
    if (!result.success) {
      error.value = "Login failed — the mock backend accepts demo / demo.";
    }
  }
  finally {
    busy.value = false;
  }
}

async function signOut() {
  await identity.logout();
}
</script>

<template>
  <div class=":uno: flex flex-col gap-6">
    <h2 class=":uno: text-sm font-semibold vtext-1">
      Identity session
    </h2>
    <p class=":uno: text-gray-600 dark:text-gray-300">
      <code>@director/identity</code> demo — the plugin boots the session from the marker
      cookies, and the app supplies the backend through the <code>IdentityApi</code>
      interface in <code>app.config</code> (here: an in-browser mock, <code>demo</code> /
      <code>demo</code>). The session survives a reload.
    </p>

    <p class=":uno: text-sm vtext-2">
      Session status: <strong>{{ identity.sessionStatus.value }}</strong>
    </p>

    <template v-if="identity.isAuthorized.value">
      <p class=":uno: text-sm vtext-1">
        Signed in as <strong>{{ identity.user.value?.name }}</strong>
        ({{ identity.user.value?.email }})
      </p>

      <div>
        <DButton @click="signOut">
          Sign out
        </DButton>
      </div>
    </template>

    <form
      v-else
      class=":uno: flex flex-col gap-3 max-w-xs"
      @submit.prevent="signIn"
    >
      <label class=":uno: flex flex-col gap-1 text-sm vtext-2">
        Username
        <input
          v-model="username"
          name="username"
          autocomplete="username"
          class=":uno: border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent vtext-1"
        >
      </label>

      <label class=":uno: flex flex-col gap-1 text-sm vtext-2">
        Password
        <input
          v-model="password"
          type="password"
          name="password"
          autocomplete="current-password"
          class=":uno: border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent vtext-1"
        >
      </label>

      <div>
        <DButton
          color="primary"
          type="submit"
          :disabled="busy"
        >
          Sign in
        </DButton>
      </div>

      <p
        v-if="error"
        role="alert"
        class=":uno: text-sm text-red-600 dark:text-red-400"
      >
        {{ error }}
      </p>
    </form>
  </div>
</template>
