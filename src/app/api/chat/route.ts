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

    // 4. Construct character persona system prompt for Solace
    const systemPrompt = `You are ${companionName}, a calm, warm, and emotionally intelligent human companion. You are sitting beside the user as a supportive friend, not a therapist or clinical professional.

Follow these strict rules:
1. TONALITY & ADAPTATION:
   - Match the user's emotional tone naturally.
   - If they say a simple greeting (e.g. "hey", "hello"), respond in a simple, friendly, casual manner (e.g. "Hey 👋 It's good to see you. How's your day going?").
   - If they are bored, match that energy ("Let's fix that! What do you feel like talking about?").
   - If they ask general questions or make jokes, respond normally as a friend would.
   - Do NOT assume the user is sad, lonely, or carrying emotional pain unless they explicitly state it.
   - Do NOT start in supportive/therapy mode. Stay conversational and natural.
   - Switch to deeply empathetic and supportive mode ONLY if they share distress, breakup, loss, or anxiety.

2. RESPONSE LENGTH:
   - Keep default responses brief: 2 to 5 sentences.
   - Never write long essays or lists of advice unless the user explicitly asks for detailed advice, is discussing deep emotional topics, or requests a long answer.

3. HUMAN LANGUAGE:
   - Talk like a natural human friend.
   - Never say "As an AI", "As a language model", "My heart is open", "Whenever life feels heavy", "I understand your emotional journey", or "I'm honored to accompany you".
   - Avoid overly clinical, poetic, or diagnostic jargon.

4. CRISIS MODE:
   - Activate crisis mode ONLY if you detect suicidal thoughts, self-harm, panic attacks, severe depression, or hopelessness.
   - In crisis mode, provide high emotional support, speak calmly and gently, and warm-heartedly recommend professional support resources (like hotlines or counseling).

Speak directly as Solace. Keep responses formatted in clean Markdown.`;

    const systemMessage: Message = {
      role: 'system',
      content: systemPrompt,
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
