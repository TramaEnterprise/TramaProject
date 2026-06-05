import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

let mockReduceMotion = false;
vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => mockReduceMotion };
});

import ConfettiBurst from "./ConfettiBurst";

beforeEach(() => {
  mockReduceMotion = false;
});

describe("ConfettiBurst", () => {
  it("renderiza el número pedido de partículas", () => {
    mockReduceMotion = false;
    const { container } = render(<ConfettiBurst count={12} />);
    expect(container.querySelectorAll(".confetti-burst__piece").length).toBe(12);
  });

  it("no renderiza y llama onComplete con reduced-motion", () => {
    mockReduceMotion = true;
    const onComplete = vi.fn();
    const { container } = render(<ConfettiBurst count={12} onComplete={onComplete} />);
    expect(container.querySelectorAll(".confetti-burst__piece").length).toBe(0);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
