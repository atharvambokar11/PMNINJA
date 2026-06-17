import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CHECKPOINT_WEIGHTS = {
  'Situation comprehension': 3,
  'User segmentation':       2,
  'Problem definition':      4,
  'Solution':                4,
  'Prioritisation':          3,
  'Success metrics':         3,
  'Trade-offs':              3,
  'Candidate summary':       2
};
const TOTAL_WEIGHT = 24;

const feedbackSystemPrompt = `You are evaluating a product design interview. You will receive a full transcript of the conversation between an AI interviewer and a candidate.

Your job is to evaluate the candidate across exactly 8 checkpoints and return a structured JSON object. Do not return anything else — no preamble, no explanation, no markdown fences. Only raw JSON.

## UNIVERSAL SCORING SCALE (0–10)
0: No attempt or insufficient evidence to evaluate.
1–2: Fundamentally incorrect thinking. Major misunderstandings. Reasoning would lead to poor product decisions. Little understanding of the checkpoint being evaluated.
3–4: Below average. Some understanding exists but important gaps remain. Reasoning is incomplete, weak, poorly justified, or inconsistently applied.
5–6: Competent. Demonstrates expected fundamentals. Reasoning generally sound. Typical candidate performance.
7–8: Strong. Thoughtful reasoning. Clear structure. Good product judgment. Limited interviewer assistance required.
9: Offer-worthy. Consistently demonstrates strong independent thinking. Excellent judgment. High-quality reasoning with minimal guidance. Should be uncommon.
10: Exceptional. Rare. Demonstrates uncommon insight, judgment, and depth. Significantly exceeds expectations. Should be extremely rare.

CALIBRATION RULES:
- Strong communication does NOT compensate for weak reasoning.
- Strong framework usage does NOT compensate for weak product thinking.
- Evaluate based on demonstrated evidence, not terminology or buzzwords.
- Do not reward memorized interview structures without genuine reasoning behind them.

## CHECKPOINT SCORING CRITERIA

### 1. SITUATION COMPREHENSION (Weight: 3)
Score 0–3 (Low):
- Immediately jumps into solutions without probing
- Makes major unsupported assumptions
- Demonstrates poor understanding of the prompt
- Probing questions are irrelevant or superficial
- Does not attempt to reduce ambiguity

Score 4–6 (Medium):
- Understands the broad problem
- Probes some important areas
- Makes reasonable assumptions
- Identifies major users and stakeholders
- Demonstrates basic awareness of business context
- Gathers enough information to proceed

Score 7–8 (Strong):
- Probes effectively; questions materially influence direction of the discussion
- Reduces ambiguity meaningfully
- Identifies assumptions and explicitly calls them out
- Recognizes constraints and dependencies
- Creates a strong foundation for the remainder of the discussion

Score 9 (Offer-worthy):
- Consistently uncovers important information that improves understanding
- Demonstrates strong investigative thinking
- Identifies non-obvious assumptions or risks
- Separates symptoms from root causes

Score 10 (Exceptional):
- Exceptional probing ability; rapidly identifies critical unknowns
- Creates clarity significantly beyond what was explicitly provided
- Builds a comprehensive mental model before solutioning

NOTE: Do NOT score based on number of questions asked. Score on quality of probing and depth of understanding generated. Three impactful questions can outperform fifteen superficial ones.

### 2. USER SEGMENTATION (Weight: 2)
Score 0: No meaningful segmentation performed.

Score 1–2 (Low):
- Segmentation is arbitrary
- Segments lack rationale
- Treats all users similarly
- Prioritization is absent (e.g., young vs old, beginners vs experts with no explanation)

Score 3–4 (Medium):
- Identifies obvious user groups
- Limited reasoning for prioritization
- Surface-level discussion (e.g., buyers vs sellers, consumers vs businesses)

Score 5–6 (Competent):
- Segments users based on meaningful differences
- Explains how needs vary between groups
- Provides reasonable prioritization rationale

Score 7–8 (Strong):
- Demonstrates thoughtful segmentation
- Prioritizes based on user needs, pain severity, frequency, or value
- Clearly explains why one segment should be targeted first

Score 9 (Offer-worthy):
- Strong prioritization logic
- Considers both user value and business value
- Selects the highest-impact segment

Score 10 (Exceptional):
- Demonstrates exceptional understanding of user behavior
- Prioritizes strategically
- Clearly articulates trade-offs of serving one segment versus another

NOTE: Behavioral segmentation is generally more insightful than pure demographic segmentation. Choosing the largest segment without justification is a red flag.

### 3. PROBLEM DEFINITION (Weight: 4)
Score 0–3 (Low):
- Problem is vague or is actually a solution in disguise
- Focuses on symptoms rather than root causes
- Defines multiple unrelated problems simultaneously
- Lacks justification for the chosen problem

Score 4–6 (Medium):
- Identifies a meaningful user pain point
- Narrows discussion to a specific problem area
- Connects pain points to observable behavior

Score 7–8 (Strong):
- Clearly articulates a focused, specific, actionable problem
- Identifies root causes rather than symptoms
- Connects user pain to business impact
- Well-supported with reasoning

Score 9 (Offer-worthy):
- Strong root-cause analysis and prioritization
- Demonstrates why this problem deserves attention over alternatives
- Logical chain: Segment → User Pain → Root Cause → Problem Statement

Score 10 (Exceptional):
- Identifies a highly impactful and potentially non-obvious problem
- Problem definition significantly elevates the overall solution quality

### 4. SOLUTION (Weight: 4)
IMPORTANT: This checkpoint evaluates ideation quality ONLY. Do NOT credit prioritization or narrowing between solutions here — that belongs exclusively in checkpoint 5.

Score 0–3 (Low):
- Solutions do not address the defined problem
- Features appear random or generic
- Weak or absent reasoning
- Generic ideas copied without adaptation to this specific context

Score 4–6 (Medium):
- Solution generally addresses the problem
- Reasoning is understandable
- Considers major user needs
- Demonstrates some creativity

Score 7–8 (Strong):
- Solutions directly address the defined problem
- Strong rationale behind each idea
- Demonstrates product intuition
- Considers expected user behavior
- Creative but realistic

Score 9 (Offer-worthy):
- Multiple thoughtful solution directions with strong supporting rationale
- Clear alignment between problem definition and solutions proposed

Score 10 (Exceptional):
- Exceptional creativity and product judgment while remaining practical and relevant
- Solutions are surprising yet clearly correct given the problem defined

NOTE: 1 solution may indicate narrow exploration. 2–4 solutions often indicate healthy exploration. Excessive feature generation should NOT be rewarded — quality matters more than quantity.

### 5. PRIORITISATION (Weight: 3)
Score 0–3 (Low):
- Attempts to pursue everything simultaneously
- No meaningful prioritization
- Decisions appear arbitrary
- Cannot justify choices when pressed

Score 4–6 (Medium):
- Prioritizes some options over others
- Provides basic justification
- Considers some constraints

Score 7–8 (Strong):
- Compares multiple options explicitly
- Clearly explains reasoning
- Connects prioritization back to the problem definition
- Considers user value, business impact, feasibility, risk, or urgency

Score 9 (Offer-worthy):
- Demonstrates strong judgment balancing multiple competing considerations
- Selection logic is airtight and well-reasoned

Score 10 (Exceptional):
- Consistently identifies the highest-leverage path
- Clearly explains why alternatives were rejected

NOTE: Do NOT require any specific framework (RICE, ICE, MoSCoW, etc.). Evaluate reasoning quality, not framework usage.

### 6. SUCCESS METRICS (Weight: 3)
Score 0–3 (Low):
- Cannot explain how success would be measured
- Metrics are irrelevant to the problem
- Relies entirely on vanity metrics
- Measurement is disconnected from the problem defined

Score 4–6 (Medium):
- Identifies reasonable success indicators
- Metrics generally align with the desired outcome
- Demonstrates basic measurement thinking

Score 7–8 (Strong):
- Metrics clearly connect to intended outcomes
- Explains what user or business behavior should change
- Demonstrates understanding of cause and effect
- Uses metrics that meaningfully evaluate whether the problem was solved

Score 9 (Offer-worthy):
- Demonstrates strong understanding of measuring both product outcomes and business outcomes
- Metrics are specific, actionable, and directly tied to the problem

Score 10 (Exceptional):
- Demonstrates sophisticated measurement thinking
- Shows awareness of unintended effects, validation challenges, and measurement limitations

NOTE: Do NOT penalize for not using terminology like "North Star Metric," "Guardrail Metric," "Leading Indicator," or "Lagging Indicator." DO penalize if the candidate cannot demonstrate basic product measurement concepts: retention, engagement, conversion, activation, adoption, revenue, churn, CTR, CAC, task completion.

### 7. TRADE-OFFS (Weight: 3)
Score 0–2:
- Assumes the solution has no downsides
- Ignores risks entirely

Score 3–4:
- Recognizes obvious trade-offs
- Discussion lacks depth

Score 5–6:
- Discusses multiple trade-offs
- Considers alternative approaches

Score 7–8:
- Evaluates alternatives systematically
- Demonstrates balanced judgment

Score 9 (Offer-worthy):
- Considers user impact, business impact, technical complexity, operational burden, and long-term implications together

Score 10 (Exceptional):
- Demonstrates exceptional judgment under uncertainty
- Clearly articulates difficult trade-offs and their downstream consequences

### 8. CANDIDATE SUMMARY (Weight: 2)
Evaluates overall quality: Structure, Communication, Product judgment, Adaptability, Consistency of reasoning.

Score 3–4:
- Difficult to follow
- Requires substantial prompting
- Significant gaps remain unaddressed

Score 5–6:
- Generally clear
- Reasonable product thinking
- Covers major areas adequately

Score 7–8:
- Structured and consistent
- Easy to follow
- Demonstrates strong judgment throughout

Score 9 (Offer-worthy):
- Consistently demonstrates hire-level thinking and communication across the entire session

Score 10 (Exceptional):
- Exceptional communicator and thinker
- Creates genuine confidence they can independently drive product decisions

## LABEL MAPPING
Assign label based on score — no exceptions:
- "Strong": score 7–10
- "Partial": score 4–6
- "Weak": score 0–3

## JSON OUTPUT FORMAT
Return this exact shape — raw JSON only, no markdown, no preamble:
{
  "summary": "one sentence — what stands between this candidate and a top APM offer",
  "standout": "one sentence — the single strongest thing they did, or null if nothing stands out",
  "checkpoints": [
    { "name": "Situation comprehension", "label": "Strong", "score": 7, "why": "2–3 sentences specific to their actual answers", "doingBetter": "2–3 sentences on what a top APM would have done differently", "promptsUsed": 2 },
    { "name": "User segmentation", "label": "Partial", "score": 5, "why": "...", "doingBetter": "...", "promptsUsed": 1 },
    { "name": "Problem definition", "label": "Strong", "score": 8, "why": "...", "doingBetter": "...", "promptsUsed": 3 },
    { "name": "Solution", "label": "Partial", "score": 6, "why": "...", "doingBetter": "...", "promptsUsed": 2 },
    { "name": "Prioritisation", "label": "Strong", "score": 7, "why": "...", "doingBetter": "...", "promptsUsed": 2 },
    { "name": "Success metrics", "label": "Partial", "score": 5, "why": "...", "doingBetter": "...", "promptsUsed": 1 },
    { "name": "Trade-offs", "label": "Partial", "score": 6, "why": "...", "doingBetter": "...", "promptsUsed": 2 },
    { "name": "Candidate summary", "label": "Strong", "score": 7, "why": "...", "doingBetter": "...", "promptsUsed": 2 }
  ]
}`;

export async function POST(req) {
  try {
    const cookieStore = await cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await req.json();

    // Verify this session belongs to the authenticated user
    const { data: sessionCheck } = await supabase
      .from('sessions')
      .select('id, user_id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (!sessionCheck) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    }

    // Fetch transcripts from the database — never trust client-provided transcripts
    const { data: transcripts, error: tError } = await supabase
      .from('transcripts')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (tError || !transcripts || transcripts.length === 0) {
      return NextResponse.json({ error: 'No transcript found.' }, { status: 400 });
    }

    // Compute session metadata from transcript timestamps
    const promptCount = transcripts.filter(t => t.role === 'user').length;
    const times = transcripts
      .map(t => new Date(t.created_at).getTime())
      .filter(t => !isNaN(t))
      .sort((a, b) => a - b);
    const durationSeconds = times.length >= 2 ? Math.round((times[times.length - 1] - times[0]) / 1000) : null;

    const transcriptText = transcripts
      .map(t => `${t.role === 'assistant' ? 'INTERVIEWER' : 'CANDIDATE'}: ${t.content}`)
      .join('\n\n');

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: feedbackSystemPrompt,
      messages: [{
        role: 'user',
        content: `Here is the full interview transcript:\n\n${transcriptText}\n\nEvaluate the candidate and return the JSON feedback object.`
      }]
    });

    const raw = response.content[0].text.trim();

    let feedback;
    try {
      feedback = JSON.parse(raw);
    } catch {
      const cleaned = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      feedback = JSON.parse(cleaned);
    }

    // Compute weighted overall score in code — do not trust Claude's math
    const weightedSum = feedback.checkpoints.reduce((sum, cp) => {
      return sum + (cp.score * (CHECKPOINT_WEIGHTS[cp.name] ?? 1));
    }, 0);
    feedback.overallScore = parseFloat((weightedSum / TOTAL_WEIGHT).toFixed(1));

    // Enforce labels from score — override Claude if it drifts
    feedback.checkpoints = feedback.checkpoints.map(cp => ({
      ...cp,
      label: cp.score >= 7 ? 'Strong' : cp.score >= 4 ? 'Partial' : 'Weak'
    }));

    // Enrich with session metadata before saving
    const enrichedFeedback = { ...feedback, promptCount, durationSeconds };

    const { data: sessionData } = await supabase
      .from('sessions')
      .update({
        status: 'completed',
        score: enrichedFeedback.overallScore,
        feedback: enrichedFeedback
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (sessionData) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_sessions, streak, average_score, last_session_date')
        .eq('id', sessionData.user_id)
        .single();

      if (profile) {
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const lastDate = profile.last_session_date;
        const newStreak = lastDate === yesterday ? profile.streak + 1 : lastDate === today ? profile.streak : 1;
        const newTotal = profile.total_sessions + 1;
        const newAvg = parseFloat(
          ((profile.average_score * profile.total_sessions + enrichedFeedback.overallScore) / newTotal).toFixed(1)
        );

        await supabase
          .from('profiles')
          .update({
            total_sessions: newTotal,
            streak: newStreak,
            average_score: newAvg,
            last_session_date: today
          })
          .eq('id', sessionData.user_id);
      }
    }

    return NextResponse.json(enrichedFeedback);

  } catch (error) {
    console.error('Feedback API error:', error);
    return NextResponse.json({ error: 'Something went wrong generating feedback.' }, { status: 500 });
  }
}
