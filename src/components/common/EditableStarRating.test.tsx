import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

let mockReduceMotion = false;
vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => mockReduceMotion };
});

import EditableStarRating from "./EditableStarRating";

beforeEach(() => {
  mockReduceMotion = false;
});

describe("EditableStarRating", () => {
  it("llama onChange con el valor de la estrella al hacer clic", () => {
    const onChange = vi.fn();
    render(<EditableStarRating rating={0} onChange={onChange} />);
    // En jsdom getBoundingClientRect es 0 → fracción NaN → estrella completa.
    fireEvent.click(screen.getByLabelText("4 estrellas"));
    expect(onChange).toHaveBeenCalledWith(4);
  });
});
