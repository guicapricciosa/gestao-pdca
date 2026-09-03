import { describe, expect, it } from "vitest";

import { classifyLoginError } from "./login-error";

describe("classifyLoginError", () => {
  it("maps an explicit invalid_credentials rejection to invalid credentials", () => {
    expect(
      classifyLoginError({ status: 400, code: "invalid_credentials" }),
    ).toBe("invalid_credentials");
  });

  it("maps any 4xx authentication rejection to invalid credentials", () => {
    expect(classifyLoginError({ status: 401, code: undefined })).toBe(
      "invalid_credentials",
    );
    expect(classifyLoginError({ status: 422, code: "validation_failed" })).toBe(
      "invalid_credentials",
    );
  });

  it("maps gateway and server failures to a service error", () => {
    expect(classifyLoginError({ status: 502, code: undefined })).toBe(
      "service_unavailable",
    );
    expect(
      classifyLoginError({ status: 500, code: "unexpected_failure" }),
    ).toBe("service_unavailable");
  });

  it("maps network failures without an HTTP status to a service error", () => {
    expect(classifyLoginError({ status: undefined, code: undefined })).toBe(
      "service_unavailable",
    );
    expect(classifyLoginError({ status: 0, code: undefined })).toBe(
      "service_unavailable",
    );
  });
});
