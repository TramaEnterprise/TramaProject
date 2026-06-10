import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import ShelfToast from "./ShelfToast";

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => false };
});

describe("ShelfToast — confeti", () => {
  it("muestra confeti cuando celebrate=true", () => {
    const { container } = render(
      <ShelfToast celebrate cover={null} title="x" message="y" toastId="1" />
    );
    expect(container.querySelector(".confetti-burst")).not.toBeNull();
  });

  it("no muestra confeti por defecto", () => {
    const { container } = render(
      <ShelfToast cover={null} title="x" message="y" toastId="1" />
    );
    expect(container.querySelector(".confetti-burst")).toBeNull();
  });
});
