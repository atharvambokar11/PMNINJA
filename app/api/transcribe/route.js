import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const audio = formData.get('audio');

  if (!audio) {
    return Response.json({ error: 'No audio provided' }, { status: 400 });
  }

  if (audio.size > 5 * 1024 * 1024) {
    return Response.json({ error: 'Audio too large. Maximum size is 5MB.' }, { status: 413 });
  }

  const groqForm = new FormData();
  groqForm.append('file', audio, 'audio.webm');
  groqForm.append('model', 'whisper-large-v3-turbo');
  groqForm.append('language', 'en');
  groqForm.append('response_format', 'json');

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: groqForm,
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('Groq transcription error:', err);
    return Response.json({ error: 'Transcription failed' }, { status: 500 });
  }

  const data = await response.json();
  return Response.json({ transcription: data.text ?? '' });
}
