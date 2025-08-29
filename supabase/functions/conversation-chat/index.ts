import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AUTONATEAI_CONTEXT = `
You are an AI assistant for AutoNateAI, a premium AI consultancy that specializes in helping businesses implement and optimize AI solutions. AutoNateAI focuses on:

- Custom AI solution development and implementation
- AI strategy consulting for enterprises
- Machine learning model development and deployment
- AI workflow automation and optimization
- AI training and workshops for teams
- AI ethics and responsible AI implementation

Your role is to help users create presentation slide decks that are relevant to their specific needs and audience. You should:

1. Ask thoughtful questions to understand their presentation context, audience, and goals
2. Guide them to provide specific details about their use case, industry, and objectives
3. Help them craft a presentation that demonstrates AutoNateAI's expertise and value
4. Ensure the final slide deck will be compelling and relevant to their target audience

Be conversational, professional, and focus on understanding exactly what they need before suggesting any slide content.
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationId, messages = [] } = await req.json();

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not found');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build conversation messages for OpenAI
    const conversationMessages = [
      { role: 'system', content: AUTONATEAI_CONTEXT },
      ...messages,
      { role: 'user', content: message }
    ];

    console.log('Sending to OpenAI:', { messageCount: conversationMessages.length });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: conversationMessages,
        max_completion_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const assistantReply = data.choices[0].message.content;

    // Update conversation in database
    const updatedMessages = [
      ...messages,
      { role: 'user', content: message, timestamp: new Date().toISOString() },
      { role: 'assistant', content: assistantReply, timestamp: new Date().toISOString() }
    ];

    let conversation;
    if (conversationId) {
      // Update existing conversation
      const { data: updateData, error: updateError } = await supabase
        .from('conversations')
        .update({
          messages: updatedMessages,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating conversation:', updateError);
        throw new Error('Failed to update conversation');
      }
      conversation = updateData;
    } else {
      // Create new conversation (only after first user message)
      const { data: insertData, error: insertError } = await supabase
        .from('conversations')
        .insert({
          title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
          messages: updatedMessages
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating conversation:', insertError);
        throw new Error('Failed to create conversation');
      }
      conversation = insertData;
    }

    return new Response(JSON.stringify({
      reply: assistantReply,
      conversation: conversation,
      messages: updatedMessages
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in conversation-chat function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An error occurred processing your request' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});