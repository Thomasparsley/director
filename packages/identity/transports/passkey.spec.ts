import { beforeEach, describe, expect, it, vi } from "vitest";

import { PasskeyErrorResults } from "../app/errors/passkeyErrors";

const browser = vi.hoisted(() => ({
  browserSupportsWebAuthn: vi.fn(() => true),
  startRegistration: vi.fn(),
  startAuthentication: vi.fn(),
}));

vi.mock("@simplewebauthn/browser", () => browser);

const { createPasskey, getPasskeyAssertion, supportsPasskeys } = await import("./passkey");

/** The browser's own error shape: a DOMException is identified by its `name`. */
function domError(name: string): Error {
  const error = new Error(name);
  error.name = name;

  return error;
}

beforeEach(() => {
  vi.clearAllMocks();
  browser.browserSupportsWebAuthn.mockReturnValue(true);
});

describe("the passkey ceremony", () => {
  it("reports what the browser supports", () => {
    browser.browserSupportsWebAuthn.mockReturnValue(false);

    expect(supportsPasskeys()).toBe(false);
  });

  /**
   * The options come from the server's library and go to the browser's. Nothing between
   * them may reshape them — this is the seam where the two meet, and the first place a
   * ceremony breaks.
   */
  it("hands the server's options over untouched", async () => {
    const options = { challenge: "b64url-challenge", rp: { id: "localhost" } };
    browser.startRegistration.mockResolvedValue({ id: "credential-1" });

    await createPasskey(options);

    expect(browser.startRegistration).toHaveBeenCalledWith({ optionsJSON: options });
  });

  it("refuses before asking when the browser has no WebAuthn", async () => {
    browser.browserSupportsWebAuthn.mockReturnValue(false);

    const result = await createPasskey({});

    expect(result).toEqual({ success: false, error: PasskeyErrorResults.Unsupported });
    expect(browser.startRegistration).not.toHaveBeenCalled();
  });

  /**
   * The one every WebAuthn client gets wrong first. Dismissing the prompt raises
   * `NotAllowedError`, and reporting that as a failure puts an error in front of someone who
   * simply changed their mind.
   */
  it("calls a dismissed prompt cancelled, not failed", async () => {
    browser.startRegistration.mockRejectedValue(domError("NotAllowedError"));

    const result = await createPasskey({});

    expect(result).toEqual({ success: false, error: PasskeyErrorResults.Cancelled });
  });

  it("calls an aborted ceremony cancelled too", async () => {
    browser.startAuthentication.mockRejectedValue(domError("AbortError"));

    const result = await getPasskeyAssertion({});

    expect(result).toEqual({ success: false, error: PasskeyErrorResults.Cancelled });
  });

  it("keeps a genuine failure distinct from a cancellation", async () => {
    browser.startAuthentication.mockRejectedValue(domError("SecurityError"));

    const result = await getPasskeyAssertion({});

    expect(result).toEqual({ success: false, error: PasskeyErrorResults.CeremonyFailed });
  });

  it("returns the signed assertion on success", async () => {
    const assertion = { id: "credential-1", response: { signature: "b64url" } };
    browser.startAuthentication.mockResolvedValue(assertion);

    const result = await getPasskeyAssertion({ challenge: "x" });

    expect(result).toEqual({ success: true, value: assertion });
  });
});
