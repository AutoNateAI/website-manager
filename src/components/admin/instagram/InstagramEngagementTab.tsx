import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Plus, MessageSquare, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import InstagramAccountConnector from './InstagramAccountConnector';

interface Account {
  id: string;
  username: string;
  access_status: string;
}

interface EngagementLog {
  id: string;
  account_id: string;
  action_type: string;
  target_post_url?: string;
  target_user?: string;
  comment_text?: string;
  status: string;
  error?: string;
  created_at: string;
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

      // Fetch Instagram accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('instagram_accounts')
        .select('*')
        .order('username');

      if (accountsError && accountsError.code !== 'PGRST116') {
        throw accountsError;
      }

      // Fetch engagement logs
      const { data: logsData, error: logsError } = await supabase
        .from('instagram_engagement_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (logsError && logsError.code !== 'PGRST116') {
        throw logsError;
      }

      setAccounts(accountsData || []);
      setEngagementLogs(logsData || []);
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
      const payload = {
        account_id: selectedAccount,
        action_type: actionType,
        target_post_url: targetPostUrl || null,
        target_user: targetUser || null,
        comment_text: commentText || null
      };

      const { data, error } = await supabase.functions.invoke('phyllo-auto-engage', {
        body: payload
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
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'queued':
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default' as const,
      failed: 'destructive' as const,
      queued: 'secondary' as const
    };
    return <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>{status}</Badge>;
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

      {/* Account Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Account Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <InstagramAccountConnector />
        </CardContent>
      </Card>

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
                      @{account.username} ({account.access_status})
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
                      {getStatusIcon(log.status)}
                      <span className="font-medium capitalize">{log.action_type}</span>
                      {getStatusBadge(log.status)}
                    </div>
                    
                    {log.target_post_url && (
                      <p className="text-sm text-muted-foreground">
                        Post: {log.target_post_url}
                      </p>
                    )}
                    
                    {log.target_user && (
                      <p className="text-sm text-muted-foreground">
                        User: {log.target_user}
                      </p>
                    )}
                    
                    {log.comment_text && (
                      <p className="text-sm bg-muted p-2 rounded">
                        "{log.comment_text}"
                      </p>
                    )}
                    
                    {log.error && (
                      <p className="text-sm text-red-600">
                        Error: {log.error}
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