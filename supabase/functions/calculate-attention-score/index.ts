import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScoringWeights {
  attention_magnetism: number;
  authenticity: number;
  market_fit: number;
  network_value: number;
}

interface ScoringThresholds {
  min_comments: number;
  real_commenter_ratio: number;
  min_monthly_posts: number;
  min_total_posts: number;
  min_engaged_posts: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { postId, algorithmId } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the scoring algorithm
    const { data: algorithm, error: algError } = await supabase
      .from('scoring_algorithms')
      .select('weights, thresholds')
      .eq('id', algorithmId)
      .eq('is_active', true)
      .single();

    let finalAlgorithm = algorithm;
    
    if (algError || !algorithm) {
      // Use default algorithm
      const { data: defaultAlg } = await supabase
        .from('scoring_algorithms')
        .select('weights, thresholds')
        .eq('name', 'Default Attention Algorithm')
        .single();
      
      if (!defaultAlg) {
        throw new Error('No scoring algorithm found');
      }
      finalAlgorithm = defaultAlg;
    }

    const weights: ScoringWeights = finalAlgorithm.weights as ScoringWeights;
    const thresholds: ScoringThresholds = finalAlgorithm.thresholds as ScoringThresholds;

    // Get the post data
    const { data: post, error: postError } = await supabase
      .from('instagram_target_posts')
      .select(`
        *,
        instagram_users!poster_user_id (*)
      `)
      .eq('id', postId)
      .single();

    if (postError || !post) {
      throw new Error('Post not found');
    }

    // Get engagement activities for this post
    const { data: engagements } = await supabase
      .from('engagement_activities')
      .select('*')
      .eq('target_post_id', postId);

    // Get content analysis if exists
    const { data: contentAnalysis } = await supabase
      .from('content_analysis')
      .select('*')
      .eq('content_id', postId)
      .eq('content_type', 'instagram_post')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Calculate Attention Magnetism Score (0-100)
    let attentionScore = 0;
    
    // Comment volume (30% of attention score)
    const commentCount = post.comment_count || 0;
    const commentScore = Math.min((commentCount / thresholds.min_comments) * 30, 30);
    attentionScore += commentScore;
    
    // Like-to-comment ratio (20% of attention score)  
    const likeCount = post.like_count || 0;
    const likeCommentRatio = commentCount > 0 ? likeCount / commentCount : 0;
    const ratioScore = Math.min((likeCommentRatio / 10) * 20, 20); // Normalize around 10:1 ratio
    attentionScore += ratioScore;
    
    // Engagement recency (25% of attention score)
    const postDate = new Date(post.post_timestamp || post.created_at);
    const daysSincePost = (Date.now() - postDate.getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(25 - (daysSincePost * 2), 0); // Decay over time
    attentionScore += recencyScore;
    
    // Sentiment and content quality (25% of attention score)
    let contentScore = 12.5; // Default middle score
    if (contentAnalysis) {
      const sentimentScore = (contentAnalysis.sentiment_score || 0) * 12.5; // Convert to 0-12.5 scale
      const confidenceScore = (contentAnalysis.confidence_score || 0.5) * 12.5;
      contentScore = sentimentScore + confidenceScore;
    }
    attentionScore += contentScore;

    // Calculate Authenticity Score (0-100)
    let authenticityScore = 50; // Default middle score
    
    if (post.instagram_users) {
      const user = post.instagram_users;
      
      // Posting frequency (25% of authenticity)
      const postCount = user.post_count || 0;
      const postFreqScore = Math.min((postCount / thresholds.min_total_posts) * 25, 25);
      
      // Account verification and business status (25% of authenticity)
      let verificationScore = 0;
      if (user.is_verified) verificationScore += 15;
      if (user.is_business_account) verificationScore += 10;
      
      // Engagement consistency (25% of authenticity)
      const followersCount = user.follower_count || 0;
      const engagementRate = user.engagement_rate || 0;
      const consistencyScore = Math.min(engagementRate * 25, 25);
      
      // Profile completeness (25% of authenticity)
      let completenessScore = 0;
      if (user.bio) completenessScore += 5;
      if (user.profile_image_url) completenessScore += 5;
      if (user.external_url) completenessScore += 5;
      if (user.location) completenessScore += 5;
      if (user.display_name) completenessScore += 5;
      
      authenticityScore = postFreqScore + verificationScore + consistencyScore + completenessScore;
    }

    // Calculate Market Fit Score (0-100)
    let marketFitScore = 50; // Default middle score
    
    // Location relevance (40% of market fit)
    let locationScore = 0;
    if (post.location_tag) locationScore = 40;
    
    // Hashtag relevance (30% of market fit)
    let hashtagScore = 0;
    if (post.hashtags && post.hashtags.length > 0) {
      hashtagScore = Math.min(post.hashtags.length * 5, 30);
    }
    
    // Business type alignment (30% of market fit)
    let businessScore = 15; // Default
    if (contentAnalysis && contentAnalysis.topics) {
      const relevantTopics = contentAnalysis.topics.filter((topic: string) => 
        ['business', 'marketing', 'sales', 'entrepreneurship', 'startup'].includes(topic.toLowerCase())
      );
      businessScore = Math.min(relevantTopics.length * 10, 30);
    }
    
    marketFitScore = locationScore + hashtagScore + businessScore;

    // Calculate Network Value Score (0-100)
    let networkValueScore = 30; // Default base score
    
    // Commenter quality (50% of network value)
    let commenterQualityScore = 25; // Default
    if (engagements && engagements.length > 0) {
      const qualityEngagements = engagements.filter(eng => 
        eng.activity_type === 'comment' && 
        eng.content && eng.content.length > 20 // Substantive comments
      );
      commenterQualityScore = Math.min((qualityEngagements.length / commentCount) * 50, 50);
    }
    
    // Cross-platform presence (25% of network value)
    let crossPlatformScore = 0;
    if (post.instagram_users) {
      // This would need to be enhanced with actual cross-platform data
      crossPlatformScore = 12.5; // Default placeholder
    }
    
    // Influence metrics (25% of network value)
    let influenceScore = 12.5; // Default
    if (post.instagram_users) {
      const influenceLevel = post.instagram_users.influence_score || 0;
      influenceScore = Math.min(influenceLevel / 4, 25); // Normalize to 0-25
    }
    
    networkValueScore = commenterQualityScore + crossPlatformScore + influenceScore;

    // Calculate Overall Attention Score using weighted average
    const overallScore = 
      (attentionScore * weights.attention_magnetism) +
      (authenticityScore * weights.authenticity) +
      (marketFitScore * weights.market_fit) +
      (networkValueScore * weights.network_value);

    // Prepare scoring metadata
    const scoringMetadata = {
      algorithm_used: algorithmId || 'default',
      component_scores: {
        attention_magnetism: {
          score: attentionScore,
          components: { commentScore, ratioScore, recencyScore, contentScore }
        },
        authenticity: {
          score: authenticityScore,
          factors: ['post_frequency', 'verification', 'engagement_consistency', 'profile_completeness']
        },
        market_fit: {
          score: marketFitScore,
          components: { locationScore, hashtagScore, businessScore }
        },
        network_value: {
          score: networkValueScore,
          components: { commenterQualityScore, crossPlatformScore, influenceScore }
        }
      },
      weights_used: weights,
      thresholds_used: thresholds,
      calculation_date: new Date().toISOString()
    };

    // Update the post with calculated scores
    const { error: updateError } = await supabase
      .from('instagram_target_posts')
      .update({
        attention_score: Math.round(attentionScore * 10) / 10,
        authenticity_score: Math.round(authenticityScore * 10) / 10,
        market_fit_score: Math.round(marketFitScore * 10) / 10,
        network_value_score: Math.round(networkValueScore * 10) / 10,
        overall_attention_score: Math.round(overallScore * 10) / 10,
        scoring_metadata: scoringMetadata,
        last_scored_at: new Date().toISOString()
      })
      .eq('id', postId);

    if (updateError) {
      console.error('Failed to update post scores:', updateError);
      throw new Error('Failed to update post scores');
    }

    const result = {
      postId,
      scores: {
        attention_score: Math.round(attentionScore * 10) / 10,
        authenticity_score: Math.round(authenticityScore * 10) / 10,
        market_fit_score: Math.round(marketFitScore * 10) / 10,
        network_value_score: Math.round(networkValueScore * 10) / 10,
        overall_attention_score: Math.round(overallScore * 10) / 10
      },
      metadata: scoringMetadata
    };

    console.log('Calculated attention scores:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in calculate-attention-score function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});