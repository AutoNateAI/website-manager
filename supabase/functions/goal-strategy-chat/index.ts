import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, linkedSOPs = [], action = 'chat' } = await req.json();
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === 'extract_and_create') {
      // Extract campaign data and create campaign, goals, and tasks
      const extractionPrompt = `Based on this conversation about a campaign, extract the following information in JSON format:

{
  "campaign": {
    "name": "campaign name",
    "description": "campaign description",
    "financial_target": number (in dollars),
    "start_date": "YYYY-MM-DD",
    "end_date": "YYYY-MM-DD",
    "status": "active"
  },
  "goals": [
    {
      "title": "goal title",
      "description": "goal description", 
      "priority": "high|medium|low",
      "due_date": "YYYY-MM-DD",
      "target_metrics": {"key": "value"}
    }
  ],
  "tasks": [
    {
      "title": "task title",
      "description": "task description",
      "due_date": "YYYY-MM-DD",
      "assignee": "who should do this"
    }
  ],
  "strategy_breakdown": "A detailed text breakdown of the campaign strategy and how the linked SOPs will be used"
}

Available SOPs that should be referenced in strategy_breakdown:
${linkedSOPs.map(sop => `- ${sop.title}: ${sop.description}`).join('\n')}

Conversation:
${messages.map(m => `${m.role}: ${m.content}`).join('\n')}

Return ONLY the JSON object, no other text.`;

      const extractionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-2025-04-14',
          messages: [
            { role: 'user', content: extractionPrompt }
          ],
          max_tokens: 2000,
          temperature: 0.3,
        }),
      });

      const extractionData = await extractionResponse.json();
      
      if (!extractionResponse.ok) {
        console.error('OpenAI extraction error:', extractionData);
        throw new Error(extractionData.error?.message || 'Failed to extract campaign data');
      }

      let extracted;
      try {
        extracted = JSON.parse(extractionData.choices[0].message.content);
      } catch (e) {
        console.error('Failed to parse extracted JSON:', extractionData.choices[0].message.content);
        throw new Error('Failed to parse campaign data from conversation');
      }

      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          name: extracted.campaign.name,
          description: extracted.campaign.description,
          financial_target: (extracted.campaign.financial_target || 0) * 100, // Convert to cents
          start_date: extracted.campaign.start_date,
          end_date: extracted.campaign.end_date,
          status: 'active'
        })
        .select()
        .single();

      if (campaignError) {
        console.error('Campaign creation error:', campaignError);
        throw new Error('Failed to create campaign');
      }

      // Create goals
      const goalsToInsert = extracted.goals.map(goal => ({
        campaign_id: campaign.id,
        title: goal.title,
        description: goal.description,
        priority: goal.priority,
        status: 'pending',
        due_date: goal.due_date,
        target_metrics: goal.target_metrics || {}
      }));

      const { data: goals, error: goalsError } = await supabase
        .from('goals')
        .insert(goalsToInsert)
        .select();

      if (goalsError) {
        console.error('Goals creation error:', goalsError);
        // Don't throw, continue with tasks
      }

      // Create tasks (link to first goal if available)
      if (extracted.tasks && extracted.tasks.length > 0) {
        const tasksToInsert = extracted.tasks.map(task => ({
          goal_id: goals?.[0]?.id || null,
          title: task.title,
          description: task.description,
          due_date: task.due_date,
          assignee: task.assignee,
          status: 'pending'
        }));

        const { error: tasksError } = await supabase
          .from('tasks')
          .insert(tasksToInsert);

        if (tasksError) {
          console.error('Tasks creation error:', tasksError);
          // Don't throw, task creation is optional
        }
      }

      return new Response(JSON.stringify({ 
        success: true,
        campaign,
        goals: goals || [],
        strategy_breakdown: extracted.strategy_breakdown,
        message: `Successfully created campaign "${campaign.name}" with ${goals?.length || 0} goals and ${extracted.tasks?.length || 0} tasks!`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Regular chat mode
    let systemPrompt = `You are a Campaign Strategy Assistant helping users plan and create marketing/business campaigns.

Your role is to:
1. Help users clarify their campaign objectives, target audience, and success metrics
2. Ask strategic questions about timeline, budget, and desired outcomes
3. Suggest specific, measurable goals and actionable strategies
4. Reference relevant SOPs/processes as implementation strategies
5. After 2-3 exchanges, you should have enough info to create a comprehensive campaign

Keep responses conversational and focused. Ask one key strategic question at a time.`;

    if (linkedSOPs.length > 0) {
      systemPrompt += `\n\nAvailable SOPs/Strategies that can be incorporated:\n${linkedSOPs.map(sop => `- ${sop.title}: ${sop.description}`).join('\n')}`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('OpenAI API error:', data);
      throw new Error(data.error?.message || 'Failed to get AI response');
    }

    const assistantMessage = data.choices[0].message.content;

    return new Response(JSON.stringify({ 
      message: assistantMessage,
      model: 'gpt-4.1-2025-04-14'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in goal-strategy-chat function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});