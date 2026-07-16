import { base64ToUtf8, utf8ToBase64 } from "#layers/director-common/app/utils/base64";

import type { InnerFormType } from "#layers/director-forms/app/types/innerFormTypes";
import type { PatchForm } from "#layers/director-forms/app/types/patching";

/** Filter data ⇢ URL-safe query value: JSON, base64 (UTF-8 safe), URL-encoded. */
export function serializeQueryData<T>(data: InnerFormType<T>): string {
  const jsonString = JSON.stringify(data);
  const base64 = utf8ToBase64(jsonString);

  return encodeURIComponent(base64);
}

/** Inverse of {@link serializeQueryData}. */
export function deserializeQueryData<T>(queryValue: string): PatchForm<T> {
  const base64 = decodeURIComponent(queryValue);
  const jsonString = base64ToUtf8(base64);

  return JSON.parse(jsonString);
}
