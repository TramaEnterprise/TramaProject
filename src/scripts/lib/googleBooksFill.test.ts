import { describe, it, expect, vi } from "vitest";
import { fetchWithRetry } from "./googleBooksFill";

function res(status: number) {
  return { ok: status >= 200 && status < 300, status } as Response;
}

describe("fetchWithRetry", () => {
  it("reintenta ante 503 y termina devolviendo el 200", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(res(503))
      .mockResolvedValueOnce(res(503))
      .mockResolvedValueOnce(res(200));

    const r = await fetchWithRetry("http://x", { retries: 3, baseDelay: 1, fetchImpl });
    expect(r.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("devuelve la última respuesta si agota los reintentos", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(res(503));
    const r = await fetchWithRetry("http://x", { retries: 2, baseDelay: 1, fetchImpl });
    expect(r.status).toBe(503);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("no reintenta ante un 200 a la primera", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(res(200));
    const r = await fetchWithRetry("http://x", { retries: 3, baseDelay: 1, fetchImpl });
    expect(r.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
