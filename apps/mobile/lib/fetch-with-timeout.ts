const DEFAULT_TIMEOUT_MS = 10_000;

export async function fetchWithTimeout(
  input: Parameters<typeof fetch>[0],
  init?: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const abortFromExternalSignal = () => {
    controller.abort();
  };

  if (init?.signal) {
    if (init.signal.aborted) {
      controller.abort();
    } else {
      init.signal.addEventListener('abort', abortFromExternalSignal, { once: true });
    }
  }

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
    init?.signal?.removeEventListener('abort', abortFromExternalSignal);
  }
}
