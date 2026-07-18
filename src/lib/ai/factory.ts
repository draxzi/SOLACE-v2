import { AIProvider } from './types';
import { GroqProvider } from './groq';

// Registry of supported providers.
// To add a new provider (e.g., OpenAI or Gemini), implement the AIProvider interface and add it here.
const providers: Record<string, () => AIProvider> = {
  groq: () => new GroqProvider(),
};

/**
 * Factory function to retrieve the configured AI Provider.
 * By default, it reads the provider name from the `AI_PROVIDER` environment variable.
 */
export function getAIProvider(name?: string): AIProvider {
  const providerName = name || process.env.AI_PROVIDER || 'groq';
  const providerFactory = providers[providerName.toLowerCase()];

  if (!providerFactory) {
    throw new Error(
      `AI Provider "${providerName}" is not supported. Supported providers are: ${Object.keys(providers).join(', ')}`
    );
  }

  return providerFactory();
}
export * from './types';
