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
import { SocialMediaPost, InstagramUser, ScheduledPost } from './types';

interface PostTrackingPanelProps {
  post: SocialMediaPost;
  onUpdate: () => void;
}

const PostTrackingPanel = ({ post, onUpdate }: PostTrackingPanelProps) => {
  const [users, setUsers] = useState<InstagramUser[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>(post.assigned_user_id || '');
  const [selectedStatus, setSelectedStatus] = useState<string>(post.post_status || 'draft');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(
    post.scheduled_at ? new Date(post.scheduled_at) : undefined
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    notes: ''
  });
  
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
    fetchScheduledPosts();
  }, []);

  const fetchUsers = async () => {
    try {
      // Fetch existing instagram_users
      const { data: instagramUsers, error: usersError } = await supabase
        .from('instagram_users')
        .select('*')
        .order('username');
      
      if (usersError) throw usersError;

      // Fetch unique commenters who might not be in instagram_users yet
      const { data: commenters, error: commentersError } = await supabase
        .from('social_media_comments')
        .select('commenter_username, commenter_display_name')
        .not('commenter_username', 'is', null);

      if (commentersError) throw commentersError;

      // Create a map of existing usernames to avoid duplicates
      const existingUsernames = new Set(instagramUsers?.map(user => user.username) || []);
      
      // Add commenters who aren't already in instagram_users
      const uniqueCommenters = commenters?.filter(commenter => 
        !existingUsernames.has(commenter.commenter_username)
      ) || [];

      // Convert commenters to instagram_user format
      const commenterUsers: InstagramUser[] = uniqueCommenters.map(commenter => ({
        id: `commenter_${commenter.commenter_username}`, // Temporary ID
        username: commenter.commenter_username,
        display_name: commenter.commenter_display_name,
        discovered_through: 'comment',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      // Combine all users
      const allUsers = [...(instagramUsers || []), ...commenterUsers];
      setUsers(allUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
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

  const handleAddUser = async () => {
    if (!newUser.username.trim()) {
      toast({
        title: "Username required",
        description: "Please enter an Instagram username",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('instagram_users')
        .insert({
          username: newUser.username.replace('@', ''),
          notes: newUser.notes,
          discovered_through: 'manual_entry'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      await fetchUsers();
      setSelectedUserId(data.id);
      setShowAddUserModal(false);
      setNewUser({ username: '', notes: '' });
      
      toast({
        title: "User added",
        description: `Instagram user @${data.username} has been added`
      });
    } catch (error: any) {
      console.error('Error adding user:', error);
      toast({
        title: "Error adding user",
        description: error.message?.includes('unique') ? 'This username already exists' : 'Failed to add user',
        variant: "destructive"
      });
    }
  };

  const updatePostTracking = async () => {
    try {
      let finalUserId = selectedUserId;
      
      // If user selected a commenter (temporary ID), create them as an instagram_user first
      if (selectedUserId && selectedUserId.startsWith('commenter_')) {
        const selectedUser = users.find(u => u.id === selectedUserId);
        if (selectedUser) {
          const { data: newUser, error: createError } = await supabase
            .from('instagram_users')
            .insert({
              username: selectedUser.username,
              display_name: selectedUser.display_name,
              discovered_through: 'comment'
            })
            .select()
            .single();
          
          if (createError) {
            // If user already exists, try to find them
            const { data: existingUser } = await supabase
              .from('instagram_users')
              .select('id')
              .eq('username', selectedUser.username)
              .single();
            
            finalUserId = existingUser?.id || null;
          } else {
            finalUserId = newUser.id;
          }
        }
      }

      const updates: any = {
        assigned_user_id: finalUserId || null,
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
      if (selectedStatus === 'scheduled' && scheduledDate && finalUserId) {
        const { error: scheduleError } = await supabase.functions.invoke('phyllo-schedule-post', {
          body: {
            account_id: finalUserId,
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
      await fetchUsers(); // Refresh users list
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
    if (!selectedUserId) {
      toast({
        title: "User required",
        description: "Please assign a target Instagram user first",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('phyllo-publish-post', {
        body: {
          account_id: selectedUserId,
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
          {/* User Assignment */}
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium min-w-0 flex-shrink-0">Target User:</Label>
            <div className="flex items-center gap-2 flex-1">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Assign target user..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <span>@{user.username}</span>
                        {user.display_name && (
                          <span className="text-muted-foreground text-xs">({user.display_name})</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-8 w-8 p-0"
                onClick={() => setShowAddUserModal(true)}
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
            {selectedUserId && selectedStatus !== 'posted' && (
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

      {/* Add User Modal */}
      <Dialog open={showAddUserModal} onOpenChange={setShowAddUserModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Instagram User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="username">Instagram Username *</Label>
              <Input
                id="username"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                placeholder="@username or username"
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={newUser.notes}
                onChange={(e) => setNewUser({ ...newUser, notes: e.target.value })}
                placeholder="Notes about this user..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddUserModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddUser}>
                Add User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PostTrackingPanel;