import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

// Mock determinista de prefers-reduced-motion. La variable debe llevar
// prefijo `mock` para que vitest permita referenciarla en el factory hoisteado.
let mockReduceMotion = false;
vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => mockReduceMotion };
});

import ConfettiBurst from "./ConfettiBurst";

beforeEach(() => {
  document.body.innerHTML = "";
  mockReduceMotion = false;
});

describe("ConfettiBurst", () => {
  it("renderiza el número pedido de partículas cuando no hay reduced-motion", () => {
    mockReduceMotion = false;
    render(<ConfettiBurst count={12} />);
    expect(document.body.querySelectorAll(".confetti-burst__piece").length).toBe(12);
  });

  it("no renderiza partículas y llama onComplete con reduced-motion", () => {
    mockReduceMotion = true;
    const onComplete = vi.fn();
    render(<ConfettiBurst count={12} onComplete={onComplete} />);
    expect(document.body.querySelectorAll(".confetti-burst__piece").length).toBe(0);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
