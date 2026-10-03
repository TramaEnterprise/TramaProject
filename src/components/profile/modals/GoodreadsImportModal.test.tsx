import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockHook = {
  phase: "idle" as string,
  preview: undefined as unknown,
  progress: { done: 0, total: 0 },
  result: undefined as unknown,
  error: undefined as unknown,
  parse: vi.fn(),
  confirmImport: vi.fn(),
  cancel: vi.fn(),
  reset: vi.fn(),
};
vi.mock("@/hooks/useGoodreadsImport", () => ({
  useGoodreadsImport: () => mockHook,
  MAX_IMPORT: 1000,
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

import GoodreadsImportModal from "./GoodreadsImportModal";

beforeEach(() => {
  mockHook.phase = "idle";
  mockHook.preview = undefined;
  mockHook.result = undefined;
});

describe("GoodreadsImportModal", () => {
  it("muestra el intro en estado inicial", () => {
    render(<GoodreadsImportModal onClose={vi.fn()} />);
    expect(screen.getByText("profile.goodreadsImport.intro")).toBeInTheDocument();
  });

  it("muestra 'Importando datos…' en fase importing", () => {
    mockHook.phase = "importing";
    mockHook.progress = { done: 3, total: 10 };
    render(<GoodreadsImportModal onClose={vi.fn()} />);
    expect(screen.getByText("profile.goodreadsImport.importing")).toBeInTheDocument();
  });
});
