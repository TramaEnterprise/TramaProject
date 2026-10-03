interface RetryOptions {
  retries?: number;
  baseDelay?: number;
  fetchImpl?: typeof fetch;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchWithRetry(url: string, options: RetryOptions = {}): Promise<Response> {
  const { retries = 3, baseDelay = 300, fetchImpl = fetch } = options;
  let last: Response | undefined;
  for (let attempt = 0; attempt < retries; attempt++) {
    last = await fetchImpl(url);
    if (last.status !== 503) return last;
    if (attempt < retries - 1) await sleep(baseDelay * 2 ** attempt);
  }
  return last as Response;
}
