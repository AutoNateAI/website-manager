import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Plus, MessageSquare, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface Account {
  id: string;
  username: string;
}

interface EngagementLog {
  id: string;
  user_id?: string | null;
  activity_type: string;
  target_post_id?: string | null;
  target_user_id?: string | null;
  content?: string | null;
  notes?: string | null;
  engagement_score?: number | null;
  led_to_follow?: boolean | null;
  parent_comment_id?: string | null;
  response_content?: string | null;
  created_at: string;
  updated_at: string;
}

export function InstagramEngagementTab() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [engagementLogs, setEngagementLogs] = useState<EngagementLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [actionType, setActionType] = useState<string>('comment');
  const [targetPostUrl, setTargetPostUrl] = useState('');
  const [targetUser, setTargetUser] = useState('');
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch engagement logs from our new table
      const { data: logsData, error: logsError } = await supabase
        .from('engagement_activities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (logsError && logsError.code !== 'PGRST116') {
        throw logsError;
      }

      setEngagementLogs(logsData || []);
      // For now, create some mock accounts for the UI
      setAccounts([
        { id: '1', username: 'main_account' },
        { id: '2', username: 'backup_account' }
      ]);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error loading data',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const logEngagementActivity = async () => {
    if (!selectedAccount || !actionType) {
      toast({
        title: 'Missing required fields',
        description: 'Please select an account and action type',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Insert directly into our engagement_activities table
      const { data, error } = await supabase
        .from('engagement_activities')
        .insert({
          user_id: selectedAccount,
          activity_type: actionType,
          target_post_id: targetPostUrl || null,
          target_user_id: targetUser || null,
          content: commentText || null,
          notes: `Manual entry via admin panel`
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Engagement activity logged successfully'
      });

      // Clear form
      setTargetPostUrl('');
      setTargetUser('');
      setCommentText('');

      // Reload logs
      loadData();
    } catch (error: any) {
      console.error('Error logging activity:', error);
      toast({
        title: 'Error logging activity',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const getStatusIcon = (status: string) => {
    // For now, all manually logged activities are considered completed
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getStatusBadge = (status: string) => {
    return <Badge variant="default">completed</Badge>;
  };

  if (loading) {
    return <div className="p-6">Loading engagement management...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Instagram Engagement</h2>
          <p className="text-muted-foreground">Manually manage your Instagram engagement activities</p>
        </div>
      </div>


      {/* Engagement Logging */}
      <Card>
        <CardHeader>
          <CardTitle>Log Engagement Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Account</label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      @{account.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Action Type</label>
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comment">Comment</SelectItem>
                  <SelectItem value="like">Like</SelectItem>
                  <SelectItem value="follow">Follow</SelectItem>
                  <SelectItem value="unfollow">Unfollow</SelectItem>
                  <SelectItem value="story_view">Story View</SelectItem>
                  <SelectItem value="dm">Direct Message</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Target Post URL (optional)</label>
              <Input
                placeholder="https://instagram.com/p/..."
                value={targetPostUrl}
                onChange={(e) => setTargetPostUrl(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Target User (optional)</label>
              <Input
                placeholder="@username"
                value={targetUser}
                onChange={(e) => setTargetUser(e.target.value)}
              />
            </div>
          </div>

          {(actionType === 'comment' || actionType === 'dm') && (
            <div>
              <label className="text-sm font-medium">Comment/Message Text</label>
              <Textarea
                placeholder="Enter your comment or message..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={3}
              />
            </div>
          )}

          <Button onClick={logEngagementActivity} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Log Engagement Activity
          </Button>
        </CardContent>
      </Card>

      {/* Engagement History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Engagement Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {engagementLogs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No engagement activities logged yet
              </p>
            ) : (
              engagementLogs.map((log) => (
                <div key={log.id} className="flex items-start justify-between p-3 border rounded-lg">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      {getStatusIcon('completed')}
                      <span className="font-medium capitalize">{log.activity_type}</span>
                      {getStatusBadge('completed')}
                    </div>
                    
                    {log.target_post_id && (
                      <p className="text-sm text-muted-foreground">
                        Post: {log.target_post_id}
                      </p>
                    )}
                    
                    {log.target_user_id && (
                      <p className="text-sm text-muted-foreground">
                        User: {log.target_user_id}
                      </p>
                    )}
                    
                    {log.content && (
                      <p className="text-sm bg-muted p-2 rounded">
                        "{log.content}"
                      </p>
                    )}
                    
                    {log.notes && (
                      <p className="text-sm text-muted-foreground">
                        Notes: {log.notes}
                      </p>
                    )}
                    
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}