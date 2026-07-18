export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Interface that all AI Providers (Groq, OpenAI, Gemini) must implement.
 * This ensures that our application code remains provider-agnostic.
 */
export interface AIProvider {
  /**
   * Generates a non-streaming response for a given list of chat messages.
   */
  chat(messages: Message[], options?: ChatOptions): Promise<string>;

  /**
   * Generates a streaming response for a given list of chat messages.
   * Returns a standard Web ReadableStream of string chunks.
   */
  chatStream(messages: Message[], options?: ChatOptions): Promise<ReadableStream<string>>;
}
