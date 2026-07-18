import { AIProvider, Message, ChatOptions } from './types';

/**
 * Implementation of AIProvider using the Groq API.
 * Uses native fetch to remain lightweight and compatible with Edge/Serverless runtimes.
 */
export class GroqProvider implements AIProvider {
  private apiKey: string;
  private defaultModel: string;

  constructor() {
    const key = process.env.GROQ_API_KEY;
    if (!key) {
      console.warn('Warning: GROQ_API_KEY is not defined in the environment variables.');
    }
    this.apiKey = key || '';
    // Use the user's preferred model, falling back to llama-3.3-70b-versatile
    this.defaultModel = 'llama-3.3-70b-versatile';
  }

  async chat(messages: Message[], options?: ChatOptions): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Groq API Key is missing. Please configure GROQ_API_KEY in your env.');
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options?.model || this.defaultModel,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  async chatStream(messages: Message[], options?: ChatOptions): Promise<ReadableStream<string>> {
    if (!this.apiKey) {
      throw new Error('Groq API Key is missing. Please configure GROQ_API_KEY in your env.');
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options?.model || this.defaultModel,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API Error (${response.status}): ${errorText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    return new ReadableStream<string>({
      async start(controller) {
        if (!reader) {
          controller.close();
          return;
        }

        try {
          let buffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep the last incomplete line

            for (const line of lines) {
              const cleanedLine = line.trim();
              if (!cleanedLine) continue;

              // Check if stream is finished
              if (cleanedLine === 'data: [DONE]') {
                controller.close();
                return;
              }

              if (cleanedLine.startsWith('data: ')) {
                try {
                  const dataStr = cleanedLine.substring(6);
                  const parsed = JSON.parse(dataStr);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    controller.enqueue(content);
                  }
                } catch (e) {
                  // Catch json parsing errors for partial or malformed lines
                  console.error('Error parsing Groq stream chunk:', cleanedLine, e);
                }
              }
            }
          }

          // Handle any remaining text in the buffer
          if (buffer.startsWith('data: ')) {
            const cleanedLine = buffer.trim();
            if (cleanedLine !== 'data: [DONE]') {
              try {
                const parsed = JSON.parse(cleanedLine.substring(6));
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(content);
                }
              } catch (e) {
                console.error('Error parsing final Groq stream chunk:', buffer, e);
              }
            }
          }
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });
  }
}
