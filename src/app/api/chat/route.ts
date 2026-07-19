import { createClient } from '@/lib/supabase/server';
import { getAIProvider } from '@/lib/ai/factory';
import { Message } from '@/lib/ai/types';

/**
 * API Route Handler to stream chat completions from Groq securely.
 * Enforces authentication and checks user ownership of the conversation.
 */
export async function POST(request: Request) {
  try {
    // 1. Parse request payload first to examine chatId
    const { chatId, messages } = (await request.json()) as {
      chatId: string;
      messages: Message[];
    };

    if (!chatId || !messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Invalid request parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let companionName = 'Solace';
    const isGuest = chatId === 'guest';

    if (!isGuest) {
      // Authenticated flow: User must be logged in and own the conversation
      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('id, companion_name')
        .eq('id', chatId)
        .eq('user_id', user.id)
        .single();

      if (convError || !conversation) {
        return new Response(JSON.stringify({ error: 'Conversation not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      companionName = conversation.companion_name;
    }

    // 4. Construct character persona system prompt based on archetype templates
    let archetypeInstructions = '';

    if (companionName.includes('Nova')) {
      archetypeInstructions = 'You are Nova, an Empathetic Companion. Talk warmly, validate the user\'s feelings, ask open-ended personal questions, and show sincere understanding. Never give medical diagnoses; be a supportive friend.';
    } else if (companionName.includes('Zephyr')) {
      archetypeInstructions = 'You are Zephyr, a Witty Brainstormer. Talk with a playful, energetic tone. Use dry humor, suggest creative ideas, and challenge the user intellectually. Keep it fun and conversational.';
    } else if (companionName.includes('Astra')) {
      archetypeInstructions = 'You are Astra, an Academic Mentor. Adopt an objective, intellectual, and highly informative tone. Structure your answers clearly, suggest educational viewpoints, and help explain concepts logically.';
    } else if (companionName.includes('Echo')) {
      archetypeInstructions = 'You are Echo, a Philosophical Sage. Talk meditatively, slowly, and introspectively. Encourage the user to examine the bigger picture, think about ethics, and reflect on life questions.';
    } else {
      archetypeInstructions = `You are ${companionName}, a gentle, emotionally supportive companion. Speak with empathy, deep understanding, and absolute non-judgement. Your goal is to listen warmly, help the user carry their emotional load, and make them feel safe, heard, and validated.`;
    }

    const systemMessage: Message = {
      role: 'system',
      content: `${archetypeInstructions} Keep responses concise, natural, and formatted in clean Markdown. Never mention that you are a language model or an AI created by OpenAI/Google. Speak directly as the character.`,
    };

    // 5. Instantiate provider-agnostic AI client and get stream
    const provider = getAIProvider();
    const chatHistory = [systemMessage, ...messages];

    const stream = await provider.chatStream(chatHistory, {
      temperature: 0.8,
    });

    // 6. Return response stream
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: unknown) {
    console.error('Error in chat API route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Server error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
