import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { UserPlus, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AddCommenterDialogProps {
  postId: string;
  onCommentAdded: () => void;
}

export function AddCommenterDialog({ postId, onCommentAdded }: AddCommenterDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [commenterData, setCommenterData] = useState({
    username: '',
    displayName: '',
    profileUrl: '',
    commentText: '',
    location: '',
    bio: ''
  });
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!commenterData.username.trim() || !commenterData.commentText.trim()) {
      toast({
        title: "Error",
        description: "Username and comment text are required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // For now, we'll just create the comment without linking to a person
      // This can be enhanced later when the people table is fully set up
      let personId = null;

      // Create the comment
      const { error: commentError } = await supabase
        .from('social_media_comments')
        .insert({
          post_id: postId,
          commenter_username: commenterData.username,
          commenter_display_name: commenterData.displayName || commenterData.username,
          comment_text: commenterData.commentText,
          comment_timestamp: new Date().toISOString(),
          is_my_comment: false,
          is_reply_to_my_comment: false,
          thread_depth: 0,
          status: 'posted'
        });

      if (commentError) throw commentError;

      toast({
        title: "Success",
        description: "Commenter and comment added successfully",
      });

      setCommenterData({
        username: '',
        displayName: '',
        profileUrl: '',
        commentText: '',
        location: '',
        bio: ''
      });
      setIsOpen(false);
      onCommentAdded();
    } catch (error) {
      console.error('Error adding commenter:', error);
      toast({
        title: "Error",
        description: "Failed to add commenter and comment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Commenter
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Commenter</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              placeholder="@username"
              value={commenterData.username}
              onChange={(e) => setCommenterData(prev => ({ ...prev, username: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              placeholder="Full Name"
              value={commenterData.displayName}
              onChange={(e) => setCommenterData(prev => ({ ...prev, displayName: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profileUrl">Profile URL</Label>
            <Input
              id="profileUrl"
              placeholder="https://instagram.com/username"
              value={commenterData.profileUrl}
              onChange={(e) => setCommenterData(prev => ({ ...prev, profileUrl: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="City, Country"
              value={commenterData.location}
              onChange={(e) => setCommenterData(prev => ({ ...prev, location: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Brief bio or description..."
              value={commenterData.bio}
              onChange={(e) => setCommenterData(prev => ({ ...prev, bio: e.target.value }))}
              className="min-h-[60px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="commentText">Comment Text *</Label>
            <Textarea
              id="commentText"
              placeholder="What did they comment?"
              value={commenterData.commentText}
              onChange={(e) => setCommenterData(prev => ({ ...prev, commentText: e.target.value }))}
              className="min-h-[80px]"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={loading}>
              <Send className="h-4 w-4 mr-2" />
              {loading ? 'Adding...' : 'Add Comment'}
            </Button>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}