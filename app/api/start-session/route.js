import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { questions } from '../../../lib/questions';

export async function POST() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('free_mocks_left')
    .eq('id', user.id)
    .single();

  if (!profile || profile.free_mocks_left <= 0) {
    return NextResponse.json({ error: 'No mocks remaining.' }, { status: 403 });
  }

  // Optimistic lock: only decrement if the value hasn't changed since we read it.
  // If two tabs fire simultaneously both reading free_mocks_left=3, only one
  // update will match the .eq('free_mocks_left', 3) condition — the other gets 409.
  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update({ free_mocks_left: profile.free_mocks_left - 1 })
    .eq('id', user.id)
    .eq('free_mocks_left', profile.free_mocks_left)
    .select('id')
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: 'No mocks remaining.' }, { status: 409 });
  }

  const randomIdx = Math.floor(Math.random() * questions.length);
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .insert({
      user_id: user.id,
      question_id: randomIdx,
      question_text: questions[randomIdx],
      status: 'started',
    })
    .select()
    .single();

  if (sessionError || !session) {
    // Rollback the decrement so the user doesn't lose a mock
    await supabase
      .from('profiles')
      .update({ free_mocks_left: profile.free_mocks_left })
      .eq('id', user.id);
    return NextResponse.json({ error: 'Failed to create session.' }, { status: 500 });
  }

  return NextResponse.json({ sessionId: session.id });
}
