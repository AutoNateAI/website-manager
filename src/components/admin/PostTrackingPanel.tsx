import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, Clock, CheckCircle, AlertCircle, Send } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SocialMediaPost, InstagramAccount, ScheduledPost } from './types';

interface PostTrackingPanelProps {
  post: SocialMediaPost;
  onUpdate: () => void;
}

const PostTrackingPanel = ({ post, onUpdate }: PostTrackingPanelProps) => {
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(post.assigned_account_id || '');
  const [selectedStatus, setSelectedStatus] = useState<string>(post.post_status || 'draft');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(
    post.scheduled_at ? new Date(post.scheduled_at) : undefined
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newAccount, setNewAccount] = useState({
    username: '',
    bio: ''
  });
  
  const { toast } = useToast();

  useEffect(() => {
    fetchAccounts();
    fetchScheduledPosts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('instagram_accounts')
        .select('*')
        .order('username');
      
      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchScheduledPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('social_media_post_id', post.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setScheduledPosts((data || []) as ScheduledPost[]);
    } catch (error) {
      console.error('Error fetching scheduled posts:', error);
    }
  };

  const handleAddAccount = async () => {
    if (!newAccount.username.trim()) {
      toast({
        title: "Username required",
        description: "Please enter an Instagram username",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('instagram_accounts')
        .insert({
          username: newAccount.username.replace('@', ''),
          platform: 'instagram',
          access_status: 'pending'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      await fetchAccounts();
      setSelectedAccountId(data.id);
      setShowAddAccountModal(false);
      setNewAccount({ username: '', bio: '' });
      
      toast({
        title: "Account added",
        description: `Instagram account @${data.username} has been added`
      });
    } catch (error: any) {
      console.error('Error adding account:', error);
      toast({
        title: "Error adding account",
        description: error.message?.includes('unique') ? 'This username already exists' : 'Failed to add account',
        variant: "destructive"
      });
    }
  };

  const updatePostTracking = async () => {
    try {
      const updates: any = {
        assigned_account_id: selectedAccountId || null,
        post_status: selectedStatus,
        scheduled_at: scheduledDate?.toISOString() || null,
        updated_at: new Date().toISOString()
      };

      if (selectedStatus === 'posted') {
        updates.posted_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('social_media_posts')
        .update(updates)
        .eq('id', post.id);
      
      if (error) throw error;

      // If scheduling, create a scheduled post entry
      if (selectedStatus === 'scheduled' && scheduledDate && selectedAccountId) {
        const { error: scheduleError } = await supabase.functions.invoke('phyllo-schedule-post', {
          body: {
            account_id: selectedAccountId,
            social_media_post_id: post.id,
            scheduled_for: scheduledDate.toISOString(),
            payload: {
              caption: post.caption,
              hashtags: post.hashtags,
              platform: post.platform
            }
          }
        });

        if (scheduleError) throw scheduleError;
      }

      await fetchScheduledPosts();
      onUpdate();
      
      toast({
        title: "Post updated",
        description: "Tracking information has been updated"
      });
    } catch (error) {
      console.error('Error updating post:', error);
      toast({
        title: "Error updating post",
        description: "Failed to update tracking information",
        variant: "destructive"
      });
    }
  };

  const publishNow = async () => {
    if (!selectedAccountId) {
      toast({
        title: "Account required",
        description: "Please assign an Instagram account first",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('phyllo-publish-post', {
        body: {
          account_id: selectedAccountId,
          social_media_post_id: post.id
        }
      });

      if (error) throw error;

      setSelectedStatus('posted');
      await updatePostTracking();
      
      toast({
        title: "Post published",
        description: "Post has been published to Instagram"
      });
    } catch (error) {
      console.error('Error publishing post:', error);
      toast({
        title: "Error publishing post",
        description: "Failed to publish to Instagram",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = () => {
    switch (selectedStatus) {
      case 'draft': return <AlertCircle size={16} className="text-muted-foreground" />;
      case 'assigned': return <Clock size={16} className="text-blue-500" />;
      case 'scheduled': return <CalendarIcon size={16} className="text-orange-500" />;
      case 'posted': return <CheckCircle size={16} className="text-green-500" />;
      case 'failed': return <AlertCircle size={16} className="text-red-500" />;
      default: return null;
    }
  };

  const getStatusColor = () => {
    switch (selectedStatus) {
      case 'draft': return 'secondary';
      case 'assigned': return 'secondary';
      case 'scheduled': return 'default';
      case 'posted': return 'default';
      case 'failed': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-3">
      <Card className="border-l-4 border-l-primary/50">
        <CardContent className="p-4 space-y-3">
          {/* Account Assignment */}
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium min-w-0 flex-shrink-0">Instagram:</Label>
            <div className="flex items-center gap-2 flex-1">
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Assign account..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      @{account.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-8 w-8 p-0"
                onClick={() => setShowAddAccountModal(true)}
              >
                <Plus size={14} />
              </Button>
            </div>
          </div>

          {/* Status and Scheduling */}
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium min-w-0 flex-shrink-0">Status:</Label>
            <div className="flex items-center gap-2 flex-1">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="posted">Posted</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant={getStatusColor()} className="flex items-center gap-1 text-xs">
                {getStatusIcon()}
                {selectedStatus}
              </Badge>
            </div>
          </div>

          {/* Schedule Date (if status is scheduled) */}
          {selectedStatus === 'scheduled' && (
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium min-w-0 flex-shrink-0">Schedule:</Label>
              <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 text-xs justify-start font-normal flex-1",
                      !scheduledDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon size={14} className="mr-2" />
                    {scheduledDate ? format(scheduledDate, "MMM d, h:mm a") : "Pick date & time"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={(date) => {
                      setScheduledDate(date);
                      setShowDatePicker(false);
                    }}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button size="sm" onClick={updatePostTracking} className="text-xs">
              Save Changes
            </Button>
            {selectedAccountId && selectedStatus !== 'posted' && (
              <Button size="sm" variant="outline" onClick={publishNow} className="text-xs">
                <Send size={12} className="mr-1" />
                Publish Now
              </Button>
            )}
          </div>

          {/* Scheduled Posts Info */}
          {scheduledPosts.length > 0 && (
            <div className="text-xs text-muted-foreground">
              {scheduledPosts.length} scheduled post{scheduledPosts.length !== 1 ? 's' : ''} found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Account Modal */}
      <Dialog open={showAddAccountModal} onOpenChange={setShowAddAccountModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Instagram Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="username">Instagram Username *</Label>
              <Input
                id="username"
                value={newAccount.username}
                onChange={(e) => setNewAccount({ ...newAccount, username: e.target.value })}
                placeholder="@username or username"
              />
            </div>
            <div>
              <Label htmlFor="bio">Notes (optional)</Label>
              <Textarea
                id="bio"
                value={newAccount.bio}
                onChange={(e) => setNewAccount({ ...newAccount, bio: e.target.value })}
                placeholder="Notes about this account..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddAccountModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddAccount}>
                Add Account
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PostTrackingPanel;