import { NextResponse } from 'next/server';
import { getAIProvider } from '@/lib/ai/factory';
import { createClient } from '@/lib/supabase/server';

/**
 * Route handler to verify the AI provider abstraction and Supabase connection.
 */
export async function GET() {
  try {
    // 1. Resolve active AI Provider using factory
    const provider = getAIProvider();

    // 2. Detect placeholder key
    const apiKey = process.env.GROQ_API_KEY;
    const isPlaceholder = !apiKey || apiKey.includes('your_groq_api_key') || apiKey === '';

    if (isPlaceholder) {
      return NextResponse.json({
        success: true,
        status: 'setup_complete',
        message: 'Groq provider successfully instantiated! Please replace "gsk_your_groq_api_key" in `.env.local` with a valid Groq API key to test live requests.',
        provider: 'groq',
        apiKeyStatus: 'placeholder_detected',
      });
    }

    // 3. Test Supabase Client Initialization
    let supabaseStatus = 'not_tested';
    try {
      const supabase = await createClient();
      const { error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        supabaseStatus = `error: ${sessionError.message}`;
      } else {
        supabaseStatus = 'initialized_successfully';
      }
    } catch (dbErr: unknown) {
      const dbErrMsg = dbErr instanceof Error ? dbErr.message : String(dbErr);
      supabaseStatus = `initialization_failed: ${dbErrMsg}`;
    }

    // 4. Attempt a live AI request to verify network connectivity & API key validity
    const reply = await provider.chat(
      [{ role: 'user', content: 'Respond with the word "Ok" only.' }],
      { maxTokens: 10 }
    );

    return NextResponse.json({
      success: true,
      status: 'live_test_success',
      message: 'Successfully connected to Groq and verified Supabase!',
      provider: 'groq',
      testResponse: reply,
      supabaseStatus,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      {
        success: false,
        status: 'error',
        message: 'Failed to communicate with Groq API.',
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
