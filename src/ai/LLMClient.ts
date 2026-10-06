/**
 * OpenAI / ChatGPT-compatible API client
 * Supports official OpenAI URL or any compatible endpoint (Azure, OpenRouter, local, etc.)
 */

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMClientOptions {
  /** API key (Bearer token) */
  apiKey: string;
  /**
   * Chat completions endpoint
   * Default: https://api.openai.com/v1/chat/completions
   * Examples:
   *  - https://api.openai.com/v1/chat/completions
   *  - https://your-resource.openai.azure.com/openai/deployments/.../chat/completions?api-version=...
   *  - http://127.0.0.1:1234/v1/chat/completions
   */
  baseUrl?: string;
  /** Model name */
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** Extra headers (e.g. api-key for Azure) */
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export interface LLMResponse {
  content: string;
  raw?: any;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

export class LLMClient {
  readonly options: Required<Pick<LLMClientOptions, "apiKey" | "baseUrl" | "model" | "temperature" | "maxTokens" | "timeoutMs">> & {
    headers: Record<string, string>;
  };

  constructor(opts: LLMClientOptions) {
    if (!opts.apiKey) throw new Error("Aether AI: apiKey is required");
    this.options = {
      apiKey: opts.apiKey,
      baseUrl: opts.baseUrl ?? "https://api.openai.com/v1/chat/completions",
      model: opts.model ?? "gpt-4o-mini",
      temperature: opts.temperature ?? 0.4,
      maxTokens: opts.maxTokens ?? 800,
      headers: opts.headers ?? {},
      timeoutMs: opts.timeoutMs ?? 60000,
    };
  }

  async chat(messages: LLMMessage[], overrides: Partial<LLMClientOptions> = {}): Promise<LLMResponse> {
    const model = overrides.model ?? this.options.model;
    const temperature = overrides.temperature ?? this.options.temperature;
    const maxTokens = overrides.maxTokens ?? this.options.maxTokens;
    const baseUrl = overrides.baseUrl ?? this.options.baseUrl;
    const apiKey = overrides.apiKey ?? this.options.apiKey;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...this.options.headers,
      ...overrides.headers,
    };

    const body = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    };

    const res = await fetch(baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.options.timeoutMs),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`LLM HTTP ${res.status}: ${text.slice(0, 400)}`);
    }

    const json = await res.json();
    const content =
      json.choices?.[0]?.message?.content ??
      json.choices?.[0]?.text ??
      json.output_text ??
      "";

    return {
      content: String(content).trim(),
      raw: json,
      usage: json.usage,
    };
  }

  /** Single-shot prompt helper */
  async complete(system: string, user: string): Promise<string> {
    const r = await this.chat([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);
    return r.content;
  }
}
