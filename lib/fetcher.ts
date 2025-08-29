export async function fetcher<T = any>(
    input: RequestInfo,
    init?: RequestInit
  ): Promise<T> {
    const res = await fetch(input, init);
    if (!res.ok) {
      const error = new Error(`Fetch failed (${res.status}): ${res.statusText}`);
      throw error;
    }
    return res.json();
  }
  