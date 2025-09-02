import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AttentionScoreCard } from './AttentionScoreCard';
import { CommentsThread } from './CommentsThread';
import { 
  ExternalLink, 
  User, 
  MapPin, 
  Hash, 
  Heart, 
  MessageSquare, 
  Calendar,
  Target,
  Brain,
  Trash2,
  Share,
  Repeat
} from 'lucide-react';

interface TargetPost {
  id: string;
  post_url: string;
  poster_username?: string;
  post_content?: string;
  location_tag?: string;
  hashtags?: string[];
  like_count: number;
  comment_count: number;
  analysis_status: string;
  notes?: string;
  created_at: string;
  attention_score?: number;
  authenticity_score?: number;
  market_fit_score?: number;
  network_value_score?: number;
  overall_attention_score?: number;
  scoring_metadata?: any;
  last_scored_at?: string;
  share_count?: number;
  repost_count?: number;
  post_search_queries?: Array<{
    search_queries?: {
      id: string;
      title: string;
    };
  }>;
  instagram_users?: any;
}

interface PostDetailModalProps {
  post: TargetPost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (postId: string) => void;
  onCalculateScore: (postId: string) => void;
  isCalculatingScores: boolean;
}

export function PostDetailModal({ 
  post, 
  open, 
  onOpenChange, 
  onDelete, 
  onCalculateScore,
  isCalculatingScores 
}: PostDetailModalProps) {
  if (!post) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      onDelete(post.id);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Post Details - {post.poster_username ? `@${post.poster_username}` : 'Unknown User'}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Badge variant={post.analysis_status === 'completed' ? 'default' : 'secondary'}>
                {post.analysis_status}
              </Badge>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                className="ml-2"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Post URL and Basic Info */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Post Information</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(post.post_url, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Original
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Username:</span>
                  <span>{post.poster_username || 'Unknown'}</span>
                </div>
                
                {post.location_tag && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Location:</span>
                    <span>{post.location_tag}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Added:</span>
                  <span>{formatDate(post.created_at)}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Heart className="h-4 w-4 text-red-500" />
                  <span className="font-medium">Likes:</span>
                  <span>{post.like_count.toLocaleString()}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">Comments:</span>
                  <span>{post.comment_count.toLocaleString()}</span>
                </div>
                
                {post.share_count !== undefined && (
                  <div className="flex items-center gap-2 text-sm">
                    <Share className="h-4 w-4 text-green-500" />
                    <span className="font-medium">Shares:</span>
                    <span>{post.share_count.toLocaleString()}</span>
                  </div>
                )}
                
                {post.repost_count !== undefined && (
                  <div className="flex items-center gap-2 text-sm">
                    <Repeat className="h-4 w-4 text-purple-500" />
                    <span className="font-medium">Reposts:</span>
                    <span>{post.repost_count.toLocaleString()}</span>
                  </div>
                )}
                
                {post.last_scored_at && (
                  <div className="flex items-center gap-2 text-sm">
                    <Brain className="h-4 w-4 text-purple-500" />
                    <span className="font-medium">Last Scored:</span>
                    <span>{formatDate(post.last_scored_at)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Post Content */}
          {post.post_content && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Post Content</h3>
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{post.post_content}</p>
              </div>
            </div>
          )}

          {/* Hashtags */}
          {post.hashtags && post.hashtags.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Hashtags ({post.hashtags.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {post.hashtags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Attention Scores */}
          {(post.attention_score || post.authenticity_score || post.market_fit_score || post.network_value_score) ? (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">AI Attention Analysis</h3>
              <AttentionScoreCard
                scores={{
                  attention_score: post.attention_score || 0,
                  authenticity_score: post.authenticity_score || 0,
                  market_fit_score: post.market_fit_score || 0,
                  network_value_score: post.network_value_score || 0,
                  overall_attention_score: post.overall_attention_score || 0
                }}
                metadata={post.scoring_metadata}
                onRecalculate={() => onCalculateScore(post.id)}
                isCalculating={isCalculatingScores}
                compact={false}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">AI Attention Analysis</h3>
              <div className="p-6 bg-muted/30 rounded-lg text-center">
                <Brain className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No attention scores calculated yet</p>
                <Button
                  onClick={() => onCalculateScore(post.id)}
                  disabled={isCalculatingScores}
                  className="mx-auto"
                >
                  {isCalculatingScores ? (
                    <>
                      <Brain className="h-4 w-4 mr-2 animate-pulse" />
                      Calculating...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Calculate Attention Score
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Search Queries */}
          {post.post_search_queries && post.post_search_queries.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Associated Search Queries</h3>
              <div className="space-y-2">
                {post.post_search_queries.map((pq: any, index) => (
                  <Badge key={index} variant="secondary" className="mr-2">
                    {pq.search_queries?.title || 'Unknown Query'}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {post.notes && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Notes</h3>
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm">{post.notes}</p>
              </div>
            </div>
          )}

          {/* User Profile Info */}
          {post.instagram_users && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">User Profile</h3>
              <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm"><span className="font-medium">Display Name:</span> {post.instagram_users.display_name || 'N/A'}</p>
                    <p className="text-sm"><span className="font-medium">Followers:</span> {post.instagram_users.follower_count?.toLocaleString() || 'N/A'}</p>
                    <p className="text-sm"><span className="font-medium">Following:</span> {post.instagram_users.following_count?.toLocaleString() || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm"><span className="font-medium">Influence Score:</span> {post.instagram_users.influence_score || 0}</p>
                    <p className="text-sm"><span className="font-medium">Follows Me:</span> {post.instagram_users.follows_me ? 'Yes' : 'No'}</p>
                    <p className="text-sm"><span className="font-medium">Account Type:</span> {post.instagram_users.account_type || 'Unknown'}</p>
                  </div>
                </div>
                {post.instagram_users.bio && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm"><span className="font-medium">Bio:</span></p>
                    <p className="text-sm text-muted-foreground mt-1">{post.instagram_users.bio}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Comments Thread */}
          <div className="space-y-3">
            <CommentsThread postId={post.id} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}