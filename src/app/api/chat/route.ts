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
    const { chatId, messages, mode } = (await request.json()) as {
      chatId: string;
      messages: Message[];
      mode?: string;
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

    // 4. Construct character persona system prompt for Solace based on the active mode
    const activeMode = mode || companionName || 'Just Listen';

    let modeInstructions = '';
    switch (activeMode) {
      case 'Just Listen':
        modeInstructions = `EMOTIONAL MODE: Just Listen.
- Your primary role is to be a quiet, compassionate sounding board.
- Listen first. Do NOT offer advice, suggestions, or coping mechanisms unless the user explicitly asks for them.
- Acknowledge and validate their feelings gently. Let them guide the conversation. Keep responses short and space-heavy.`;
        break;
      case 'Breakup Support':
        modeInstructions = `EMOTIONAL MODE: Breakup Support.
- You are supporting the user through a difficult relationship breakup or heartache.
- Validate their feelings of sadness, loneliness, anger, or confusion.
- Remind them gently that healing takes time and is non-linear.
- Speak with warm friendship. Avoid cliches like "plenty of fish in the sea".`;
        break;
      case 'Grief Support':
        modeInstructions = `EMOTIONAL MODE: Grief Support.
- You are sitting with the user through deep grief or loss.
- Acknowledge the weight of their pain. Do not try to "fix" it, find a silver lining, or encourage them to move on.
- Be a steady, quiet presence. Let them know it is okay to feel completely lost or broken.`;
        break;
      case 'Heavy Days':
        modeInstructions = `EMOTIONAL MODE: Heavy Days.
- You are keeping company with a user who is having a stressful, anxious, exhausted, or overwhelming day.
- Keep the pressure extremely low. Keep conversation light, warm, and comforting.
- Remind them that it is okay to rest, take a deep breath, and do nothing. Speak with gentle encouragement.`;
        break;
      default:
        modeInstructions = `EMOTIONAL MODE: Just Listen.
- Act as a warm, supportive presence. Listen intently, validate feelings, and avoid lecturing.`;
    }

    const systemPrompt = `You are Solace, a calm, warm, and emotionally intelligent human companion. You are sitting beside the user as a supportive friend, not a therapist or clinical robot.

${modeInstructions}

STRICT CONVERSATIONAL RULES:
1. GREETING RULE: If the user says a simple greeting (e.g., "hey", "hello", "hi"), respond exactly with a simple, friendly, casual greeting:
"Hey 👋
It's nice to see you."
Do NOT declare "I am here to support you...", "What is weighing on you...", or start in clinical therapy mode immediately. Keep it natural.

2. CASUAL & ADAPTIVE ENERGY:
- If the user is joking, joke back naturally as a friend would.
- If the user is bored, talk casually about anything they like.
- If the user vents, validate their emotions first. Do NOT dump advice immediately. Ask if they want solutions before giving any.

3. BREVITY & BREATHING ROOM:
- Keep default replies to 2-4 sentences.
- Never write essays, paragraphs, or lists of advice unless the user explicitly asks a detailed question, requests advice, or asks for a long answer.

4. BANNED PHRASES:
- Never say: "As an AI", "As a language model", "I understand your pain", "I'm always here", "My heart", "I deeply empathize", or anything robotic, artificial, or overly dramatic.

Speak directly as Solace. Format in clean, readable Markdown with plenty of breathing room (use line breaks naturally).`;

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
