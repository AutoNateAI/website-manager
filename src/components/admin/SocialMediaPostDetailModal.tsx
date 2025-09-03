import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Edit, Trash2, Calendar, Clock, Save, X, MessageSquare } from 'lucide-react';
import { SocialMediaPost, SocialMediaImage } from './types';
import SocialMediaImageGallery from './SocialMediaImageGallery';
import PostTrackingPanel from './PostTrackingPanel';
import { CommentsThread } from './CommentsThread';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SocialMediaPostDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: SocialMediaPost | null;
  images: SocialMediaImage[];
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onEditImage?: (image: SocialMediaImage) => void;
  onPostUpdate?: () => void;
}

const SocialMediaPostDetailModal = ({
  isOpen,
  onClose,
  post,
  images,
  onCopy,
  onEdit,
  onDelete,
  onEditImage,
  onPostUpdate
}: SocialMediaPostDetailModalProps) => {
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionText, setCaptionText] = useState("");
  const { toast } = useToast();

  // Initialize caption text when post changes
  useEffect(() => {
    if (post) {
      setCaptionText(post.caption);
    }
  }, [post]);

  if (!post) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSaveCaption = async () => {
    try {
      const { error } = await supabase
        .from('social_media_posts')
        .update({ caption: captionText })
        .eq('id', post.id);

      if (error) throw error;

      toast({ title: 'Caption updated successfully!' });
      setEditingCaption(false);
      if (onPostUpdate) onPostUpdate();
    } catch (error) {
      console.error('Error updating caption:', error);
      toast({ title: 'Error updating caption', variant: 'destructive' });
    }
  };

  const handleCancelEdit = () => {
    setCaptionText(post.caption);
    setEditingCaption(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-modal max-w-7xl max-h-[95vh] p-0">
        <div className="flex h-full max-h-[95vh]">
          {/* Left Side - Post Details */}
          <div className="flex-1 max-w-md border-r border-border flex flex-col">
            <DialogHeader className="p-6 border-b border-border flex-shrink-0">
              <div className="flex items-start justify-between">
                <DialogTitle className="text-xl font-bold line-clamp-2">
                  {post.title}
                </DialogTitle>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={onCopy}>
                    <Copy size={16} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onEdit}>
                    <Edit size={16} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onDelete}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <ScrollArea className="flex-1 overflow-hidden">
              <div className="p-6 space-y-6">
                {/* Platform & Style Info */}
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{post.platform}</Badge>
                    <Badge variant="secondary">{post.style}</Badge>
                    <Badge variant="secondary">{post.voice}</Badge>
                    {post.status && (
                      <Badge variant={post.status === 'completed' ? 'default' : 'destructive'}>
                        {post.status}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Instagram Tracking Panel */}
                <PostTrackingPanel post={post} onUpdate={() => onPostUpdate?.()} />

                {/* Caption */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    Caption
                    {!editingCaption ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingCaption(true)}
                          className="h-6 px-2"
                        >
                          <Edit size={12} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={onCopy}
                          className="h-6 px-2"
                        >
                          <Copy size={12} />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleSaveCaption}
                          className="h-6 px-2 text-green-600 hover:text-green-700"
                        >
                          <Save size={12} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEdit}
                          className="h-6 px-2"
                        >
                          <X size={12} />
                        </Button>
                      </>
                    )}
                  </h4>
                  <div className="bg-muted/30 rounded-lg p-4">
                    {editingCaption ? (
                      <Textarea
                        value={captionText}
                        onChange={(e) => setCaptionText(e.target.value)}
                        className="text-sm resize-none border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[120px]"
                        placeholder="Edit caption..."
                      />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{post.caption}</p>
                    )}
                  </div>
                </div>

                {/* Hashtags */}
                {post.hashtags.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Hashtags ({post.hashtags.length})</h4>
                    <div className="flex flex-wrap gap-1">
                      {post.hashtags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Source Items */}
                {Array.isArray(post.source_items) && post.source_items.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Source Content</h4>
                    <div className="space-y-2">
                      {post.source_items.map((item: any, index: number) => (
                        <div key={index} className="bg-muted/30 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{item.title}</span>
                            <Badge variant="outline" className="text-xs">
                              {item.type}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="space-y-3 border-t border-border pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar size={14} />
                    Created: {formatDate(post.created_at)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock size={14} />
                    Updated: {formatDate(post.updated_at)}
                  </div>
                </div>

                {/* Comments Section */}
                <div className="border-t border-border pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <MessageSquare size={16} />
                    Comments & Engagement
                  </h4>
                  <CommentsThread postId={post.id} />
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Right Side - Image Gallery */}
          <div className="flex-1 min-w-0 flex flex-col">
            <SocialMediaImageGallery images={images} onEditImage={onEditImage} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SocialMediaPostDetailModal;