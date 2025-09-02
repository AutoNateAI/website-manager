import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NotificationCenter } from './NotificationCenter';
import { Bell, TrendingUp, Users, MessageSquare, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export function Dashboard() {
  const [metrics, setMetrics] = useState({
    activePosts: 0,
    comments: 0,
    scheduled: 0,
    engagement: 0,
    campaigns: 0,
    slideDecks: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      // Fetch social media posts
      const { data: posts } = await supabase
        .from('social_media_posts')
        .select('status')
        .eq('is_published', true);

      // Fetch comments
      const { data: comments } = await supabase
        .from('social_media_comments')
        .select('id');

      // Fetch scheduled content
      const { data: scheduled } = await supabase
        .from('social_media_comments')
        .select('id')
        .eq('status', 'scheduled');

      // Fetch campaigns
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id')
        .eq('status', 'active');

      // Fetch slide decks
      const { data: slideDecks } = await supabase
        .from('slide_decks')
        .select('id');

      // Calculate engagement rate (mock calculation for now)
      const totalPosts = posts?.length || 0;
      const totalComments = comments?.length || 0;
      const engagementRate = totalPosts > 0 ? Math.round((totalComments / totalPosts) * 100) : 0;

      setMetrics({
        activePosts: totalPosts,
        comments: totalComments,
        scheduled: scheduled?.length || 0,
        engagement: engagementRate,
        campaigns: campaigns?.length || 0,
        slideDecks: slideDecks?.length || 0
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening with your social media management.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Posts</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.activePosts}</div>
                <p className="text-xs text-muted-foreground">
                  Published social media posts
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Comments</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.comments}</div>
                <p className="text-xs text-muted-foreground">
                  Total comments tracked
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.scheduled}</div>
                <p className="text-xs text-muted-foreground">
                  Ready to post
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Engagement</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.engagement}%</div>
                <p className="text-xs text-muted-foreground">
                  Comments per post ratio
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <NotificationCenter />
            
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">Active Campaigns</span>
                  <span className="text-lg font-bold">{metrics.campaigns}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">Slide Presentations</span>
                  <span className="text-lg font-bold">{metrics.slideDecks}</span>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• Create and manage social media posts</p>
                  <p>• Track and respond to comments</p>
                  <p>• Schedule content for optimal posting times</p>
                  <p>• Analyze engagement and performance</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}