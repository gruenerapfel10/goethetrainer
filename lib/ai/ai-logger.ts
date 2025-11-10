const LOG_TRUNCATE = 800;

function trim(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  if (value.length <= LOG_TRUNCATE) {
    return value;
  }
  return `${value.slice(0, LOG_TRUNCATE)}… (truncated ${value.length - LOG_TRUNCATE} chars)`;
}

export function logAiRequest(
  label: string,
  expected: string,
  context: {
    system?: string;
    prompt?: string;
    metadata?: Record<string, unknown>;
  } = {}
): void {
  console.log(`[AI][REQUEST][${label}] Expected: ${expected}`);
  if (context.metadata) {
    console.log(`[AI][REQUEST][${label}] Metadata: ${JSON.stringify(context.metadata)}`);
  }
  const system = trim(context.system);
  if (system) {
    console.log(`[AI][REQUEST][${label}] System Prompt: ${system}`);
  }
  const prompt = trim(context.prompt);
  if (prompt) {
    console.log(`[AI][REQUEST][${label}] User Prompt: ${prompt}`);
  }
}

export function logAiResponse(label: string, response: unknown): void {
  const serialised =
    typeof response === 'string'
      ? response
      : JSON.stringify(response, null, 2);
  console.log(`[AI][RESPONSE][${label}] ${trim(serialised) ?? '(no payload)'}`);
}
