// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "./button";

describe("Button", () => {
  it("keeps native accessible button behavior", () => {
    render(<Button type="button">Continue</Button>);
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });
});
