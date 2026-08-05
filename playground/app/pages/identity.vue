<script setup lang="ts">
import { ref } from "vue";

import { useIdentity } from "#layers/director-identity/app/composables/useIdentity";
import { usePasskey } from "#layers/director-identity/app/composables/usePasskey";
import { buildLoginCredentials } from "#layers/director-identity/app/core/credentials";
import { PasskeyErrorResults } from "#layers/director-identity/app/errors/passkeyErrors";

const identity = useIdentity();
const passkey = usePasskey();

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

/**
 * The passkey demo.
 *
 * `isAvailable()` is both halves of the question — configuration and browser capability —
 * and it is read after mount rather than during render: WebAuthn does not exist on the
 * server, so deciding on the server what to show would disagree with the client and trip a
 * hydration mismatch.
 */
const passkeySupported = ref(false);
const passkeyStatus = ref<string | null>(null);
const passkeyBusy = ref(false);

onMounted(() => {
  passkeySupported.value = passkey.isAvailable();
});

async function enrolPasskey() {
  passkeyStatus.value = null;
  passkeyBusy.value = true;

  try {
    const result = await passkey.enrol();

    passkeyStatus.value = result.success
      ? "Passkey enrolled."
      : describe(result.error);
  }
  finally {
    passkeyBusy.value = false;
  }
}

async function signInWithPasskey() {
  passkeyStatus.value = null;
  passkeyBusy.value = true;

  try {
    const result = await passkey.authenticate();

    // The assertion is where the layer stops: turning it into a session is this app's own
    // login flow, and the playground has a mock backend rather than one that mints tokens.
    passkeyStatus.value = result.success
      ? `Assertion signed (challenge ${result.value.challengeId}).`
      : describe(result.error);
  }
  finally {
    passkeyBusy.value = false;
  }
}

function describe(error: PasskeyErrorResults): string {
  switch (error) {
    case PasskeyErrorResults.Cancelled:
      // Not a failure: someone closed the prompt. Saying "cancelled" rather than "failed"
      // is the whole reason this value exists.
      return "Cancelled.";
    case PasskeyErrorResults.Unsupported:
      return "This browser cannot do WebAuthn.";
    case PasskeyErrorResults.NotConfigured:
      return "No passkey API configured.";
    default:
      return `Passkey error: ${error}`;
  }
}
</script>

<template>
  <div class=":uno: flex flex-col gap-6">
    <h2 class=":uno: text-sm font-semibold vtext-1">
      Identity session
    </h2>
    <p class=":uno: text-gray-600 dark:text-gray-300">
      <code>@directorkit/identity</code> demo — the plugin boots the session from the marker
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

      <div class=":uno: flex gap-2">
        <DButton @click="signOut">
          Sign out
        </DButton>

        <DButton
          v-if="passkeySupported"
          data-testid="passkey-enrol"
          :disabled="passkeyBusy"
          @click="enrolPasskey"
        >
          Enrol a passkey
        </DButton>
      </div>
    </template>

    <div
      v-if="passkeyStatus"
      data-testid="passkey-status"
      class=":uno: text-sm vtext-2"
    >
      {{ passkeyStatus }}
    </div>

    <form
      v-if="!identity.isAuthorized.value"
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

      <div
        v-if="passkeySupported"
        class=":uno: text-sm vtext-2"
      >
        <DButton
          data-testid="passkey-signin"
          :disabled="passkeyBusy"
          @click="signInWithPasskey"
        >
          Sign in with a passkey
        </DButton>
      </div>

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
