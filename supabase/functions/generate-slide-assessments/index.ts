import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { deck_id, slides } = await req.json();

    console.log('Generating assessments for deck:', deck_id);

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Combine all slide content
    const allContent = slides.map(slide => `Slide ${slide.slide_number}: ${slide.title}\n${slide.content}`).join('\n\n');

    const prompt = `Based on this presentation content, create assessment questions to test understanding and retention. Create exactly:

- 5 Multiple Choice Questions (testing key concepts and understanding)
- 3 Short Answer Questions (testing deeper insights and application)

Content:
${allContent}

For Multiple Choice Questions:
- Focus on important concepts, definitions, and key insights
- Provide 4 options (A, B, C, D) with only one clearly correct answer
- Include plausible distractors
- Vary difficulty levels

For Short Answer Questions:
- Focus on application, analysis, and synthesis
- Ask about deeper insights and practical implications
- Encourage thoughtful, nuanced responses

Return as JSON:
{
  "multiple_choice": [
    {
      "question": "Question text?",
      "options": {
        "A": "Option A",
        "B": "Option B", 
        "C": "Option C",
        "D": "Option D"
      },
      "correct_answer": "B",
      "explanation": "Why this answer is correct...",
      "difficulty": 2
    }
  ],
  "short_answer": [
    {
      "question": "Short answer question?",
      "sample_answer": "A good sample answer...",
      "key_points": ["Point 1", "Point 2", "Point 3"],
      "difficulty": 3
    }
  ]
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert educator who creates effective assessment questions to test understanding and promote learning. Always return valid JSON format.' 
          },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(errorData.error?.message || 'Failed to generate assessments');
    }

    const data = await response.json();
    let assessments;
    
    try {
      assessments = JSON.parse(data.choices[0].message.content);
    } catch {
      console.error('Failed to parse assessments JSON');
      assessments = { multiple_choice: [], short_answer: [] };
    }

    // Insert multiple choice questions
    const insertedAssessments = [];
    
    for (const mc of assessments.multiple_choice || []) {
      const { data: insertedMC, error } = await supabase
        .from('assessments')
        .insert({
          deck_id,
          question_type: 'multiple-choice',
          question_text: mc.question,
          options: mc.options,
          correct_answer: mc.correct_answer,
          explanation: mc.explanation,
          difficulty_level: mc.difficulty || 2
        })
        .select()
        .single();

      if (!error) {
        insertedAssessments.push(insertedMC);
      }
    }

    // Insert short answer questions
    for (const sa of assessments.short_answer || []) {
      const { data: insertedSA, error } = await supabase
        .from('assessments')
        .insert({
          deck_id,
          question_type: 'short-answer',
          question_text: sa.question,
          correct_answer: sa.sample_answer,
          explanation: sa.key_points?.join('. ') || '',
          difficulty_level: sa.difficulty || 3
        })
        .select()
        .single();

      if (!error) {
        insertedAssessments.push(insertedSA);
      }
    }

    console.log(`Generated ${insertedAssessments.length} assessment questions`);

    return new Response(JSON.stringify({
      assessments: insertedAssessments,
      message: `Successfully generated ${insertedAssessments.length} assessment questions`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-slide-assessments function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate assessments' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});