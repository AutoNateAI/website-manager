import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  MessageSquare, 
  Heart, 
  ChevronDown, 
  ChevronRight, 
  User,
  Reply,
  Plus,
  Send,
  Calendar,
  Trash2,
  Bot,
  Activity,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SocialMediaComment } from './types';
import { AICommentHelper } from './AICommentHelper';
import { AddCommenterDialog } from './AddCommenterDialog';

interface CommentsThreadProps {
  postId: string;
}

export function CommentsThread({ postId }: CommentsThreadProps) {
  const [comments, setComments] = useState<SocialMediaComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [newComment, setNewComment] = useState('');
  const [replyToComment, setReplyToComment] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showAddComment, setShowAddComment] = useState(false);
  const [scheduledFor, setScheduledFor] = useState('');
  const [commentStatus, setCommentStatus] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('social_media_comments')
        .select('*')
        .eq('post_id', postId)
        .order('comment_timestamp', { ascending: true });

      if (error) throw error;

      // Build comment tree and extract status
      const commentTree = buildCommentTree(data || []);
      setComments(commentTree);
      
      // Update status state
      const statusMap: { [key: string]: string } = {};
      data?.forEach(comment => {
        statusMap[comment.id] = comment.status || 'posted';
      });
      setCommentStatus(statusMap);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch comments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const buildCommentTree = (flatComments: SocialMediaComment[]): SocialMediaComment[] => {
    const commentMap = new Map<string, SocialMediaComment>();
    const rootComments: SocialMediaComment[] = [];

    // First pass: create comment objects with replies array
    flatComments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Second pass: build the tree structure
    flatComments.forEach(comment => {
      const commentWithReplies = commentMap.get(comment.id)!;
      
      if (comment.parent_comment_id) {
        const parent = commentMap.get(comment.parent_comment_id);
        if (parent) {
          parent.replies!.push(commentWithReplies);
        }
      } else {
        rootComments.push(commentWithReplies);
      }
    });

    return rootComments;
  };

  const toggleThread = (commentId: string) => {
    const newExpanded = new Set(expandedThreads);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }
    setExpandedThreads(newExpanded);
  };

  const addComment = async () => {
    if (!newComment.trim()) return;

    try {
      const commentData: any = {
        post_id: postId,
        commenter_username: 'you',
        commenter_display_name: 'You',
        comment_text: newComment,
        comment_timestamp: new Date().toISOString(),
        is_my_comment: true,
        thread_depth: 0,
        status: scheduledFor ? 'scheduled' : 'posted'
      };

      if (scheduledFor) {
        commentData.scheduled_for = scheduledFor;
        
        // Create notification for scheduled comment
        await supabase
          .from('notifications')
          .insert({
            type: 'scheduled_comment',
            title: 'Scheduled Comment Ready',
            message: `Your scheduled comment is ready to post: "${newComment.substring(0, 50)}..."`,
            data: { postId, commentText: newComment, scheduledFor },
            is_read: false
          });
      }

      const { error } = await supabase
        .from('social_media_comments')
        .insert(commentData);

      if (error) throw error;

      setNewComment('');
      setScheduledFor('');
      setShowAddComment(false);
      await fetchComments();
      
      toast({
        title: "Success",
        description: scheduledFor ? "Comment scheduled successfully" : "Comment added successfully",
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    }
  };

  const addReply = async (parentId: string, aiSuggestion?: string) => {
    const textToUse = aiSuggestion || replyText;
    if (!textToUse.trim()) return;

    try {
      const parentComment = findComment(comments, parentId);
      const threadDepth = parentComment ? parentComment.thread_depth + 1 : 1;

      const { error } = await supabase
        .from('social_media_comments')
        .insert({
          post_id: postId,
          parent_comment_id: parentId,
          commenter_username: 'you',
          commenter_display_name: 'You',
          comment_text: textToUse,
          comment_timestamp: new Date().toISOString(),
          is_my_comment: true,
          is_reply_to_my_comment: false,
          thread_depth: threadDepth,
          status: 'posted'
        });

      if (error) throw error;

      if (!aiSuggestion) {
        setReplyText('');
        setReplyToComment(null);
      }
      await fetchComments();
      
      toast({
        title: "Success",
        description: "Reply added successfully",
      });
    } catch (error) {
      console.error('Error adding reply:', error);
      toast({
        title: "Error",
        description: "Failed to add reply",
        variant: "destructive",
      });
    }
  };

  const findComment = (comments: SocialMediaComment[], id: string): SocialMediaComment | null => {
    for (const comment of comments) {
      if (comment.id === id) return comment;
      if (comment.replies) {
        const found = findComment(comment.replies, id);
        if (found) return found;
      }
    }
    return null;
  };

  const updateCommentStatus = async (commentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('social_media_comments')
        .update({ status: newStatus })
        .eq('id', commentId);

      if (error) throw error;

      setCommentStatus(prev => ({ ...prev, [commentId]: newStatus }));
      
      toast({
        title: "Success",
        description: "Comment status updated",
      });
    } catch (error) {
      console.error('Error updating comment status:', error);
      toast({
        title: "Error",
        description: "Failed to update comment status",
        variant: "destructive",
      });
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!confirm('Are you sure? This will delete the comment and all replies below it.')) {
      return;
    }

    try {
      const { error } = await supabase.rpc('delete_comment_cascade', {
        comment_id: commentId
      });

      if (error) throw error;

      await fetchComments();
      
      toast({
        title: "Success",
        description: "Comment and replies deleted",
      });
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive",
      });
    }
  };

  const buildCommentThreadText = (comment: SocialMediaComment): string => {
    let threadText = `${comment.commenter_display_name}: ${comment.comment_text}\n`;
    
    if (comment.replies) {
      comment.replies.forEach(reply => {
        threadText += `↳ ${reply.commenter_display_name}: ${reply.comment_text}\n`;
      });
    }
    
    return threadText;
  };

  const renderComment = (comment: SocialMediaComment, depth: number = 0) => {
    const hasReplies = comment.replies && comment.replies.length > 0;
    const isExpanded = expandedThreads.has(comment.id);
    const isMyComment = comment.is_my_comment;
    const isReplyToMe = comment.is_reply_to_my_comment;
    const status = commentStatus[comment.id] || 'posted';

    return (
      <div key={comment.id} className={`${depth > 0 ? 'ml-6 border-l border-border pl-4' : ''}`}>
        <div className={`p-3 rounded-lg border ${isMyComment ? 'bg-primary/5 border-primary/20' : isReplyToMe ? 'bg-accent/50' : 'bg-card'}`}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <User className="h-4 w-4" />
              <span className="font-medium text-sm">
                {comment.commenter_display_name || comment.commenter_username}
              </span>
              {isMyComment && <Badge variant="outline" className="text-xs">You</Badge>}
              {isReplyToMe && <Badge variant="secondary" className="text-xs">Reply to you</Badge>}
              <Badge 
                variant={status === 'scheduled' ? 'default' : status === 'posted' ? 'secondary' : 'outline'} 
                className="text-xs"
              >
                {status === 'scheduled' && <Clock className="h-3 w-3 mr-1" />}
                {status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(comment.comment_timestamp).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Heart className="h-3 w-3" />
              {comment.like_count}
            </div>
          </div>
          
          <p className="text-sm mb-2 whitespace-pre-wrap">{comment.comment_text}</p>
          
          <div className="flex items-center gap-2 flex-wrap">
            {hasReplies && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleThread(comment.id)}
                className="h-6 px-2 text-xs"
              >
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                {comment.replies!.length} {comment.replies!.length === 1 ? 'reply' : 'replies'}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyToComment(comment.id)}
              className="h-6 px-2 text-xs"
            >
              <Reply className="h-3 w-3 mr-1" />
              Reply
            </Button>
            {isMyComment && (
              <>
                <Select
                  value={status}
                  onValueChange={(value) => updateCommentStatus(comment.id, value)}
                >
                  <SelectTrigger className="h-6 w-20 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="posted">Posted</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteComment(comment.id)}
                  className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>

          {replyToComment === comment.id && (
            <div className="mt-3 space-y-2">
              <Textarea
                placeholder="Write a reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="min-h-[60px]"
              />
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={() => addReply(comment.id)}>
                  <Send className="h-3 w-3 mr-1" />
                  Send Reply
                </Button>
                <AICommentHelper
                  postId={postId}
                  commentThread={buildCommentThreadText(comment)}
                  onSuggestionAccept={(suggestion) => addReply(comment.id, suggestion)}
                />
                <Button variant="outline" size="sm" onClick={() => setReplyToComment(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {hasReplies && isExpanded && (
          <div className="mt-2 space-y-2">
            {comment.replies!.map(reply => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const myCommentThreads = comments.filter(comment => 
    comment.is_my_comment || 
    (comment.replies && comment.replies.some(reply => reply.is_my_comment || reply.is_reply_to_my_comment))
  );

  const otherThreads = comments.filter(comment => 
    !comment.is_my_comment && 
    !(comment.replies && comment.replies.some(reply => reply.is_my_comment || reply.is_reply_to_my_comment))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments ({comments.length})
        </h3>
        <div className="flex gap-2">
          <AddCommenterDialog postId={postId} onCommentAdded={fetchComments} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddComment(!showAddComment)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Comment
          </Button>
        </div>
      </div>

      {showAddComment && (
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-3">
              <Textarea
                placeholder="Add a comment to this post..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[80px]"
              />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <Label htmlFor="schedule-date" className="text-sm">Schedule for later (optional)</Label>
                </div>
                <Input
                  id="schedule-date"
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  className="max-w-xs"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={addComment}>
                  <Send className="h-4 w-4 mr-2" />
                  {scheduledFor ? 'Schedule Comment' : 'Post Comment'}
                </Button>
                <Button variant="outline" onClick={() => setShowAddComment(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="my-threads" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-threads">
            My Threads ({myCommentThreads.length})
          </TabsTrigger>
          <TabsTrigger value="other-threads">
            Other Threads ({otherThreads.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="my-threads" className="space-y-3">
          {myCommentThreads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No comments or threads involving you yet</p>
            </div>
          ) : (
            myCommentThreads.map(comment => renderComment(comment))
          )}
        </TabsContent>
        
        <TabsContent value="other-threads" className="space-y-3">
          {otherThreads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No other comment threads</p>
            </div>
          ) : (
            otherThreads.map(comment => renderComment(comment))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}