import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Eye, Copy, Edit, Trash2 } from 'lucide-react';
import { SocialMediaPost, SocialMediaImage } from './types';

interface SocialMediaPostCardProps {
  post: SocialMediaPost;
  images: SocialMediaImage[];
  onView: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const SocialMediaPostCard = ({
  post,
  images,
  onView,
  onCopy,
  onEdit,
  onDelete
}: SocialMediaPostCardProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const truncateCaption = (text: string, maxLength: number = 100) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const getFirstThreeHashtags = () => {
    return post.hashtags.slice(0, 3);
  };

  const nextImage = () => {
    if (images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }
  };

  const prevImage = () => {
    if (images.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  return (
    <Card className="glass-card hover:shadow-lg transition-all duration-200 cursor-pointer group">
      <div onClick={onView}>
        {/* Image Section */}
        <div className="relative aspect-square overflow-hidden rounded-t-lg bg-muted">
          {images.length > 0 ? (
            <>
              <img
                src={images[currentImageIndex]?.image_url}
                alt={images[currentImageIndex]?.alt_text || `Image ${currentImageIndex + 1}`}
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
              
              {/* Image Navigation */}
              {images.length > 1 && (
                <div className="absolute inset-0 flex items-center justify-between p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="bg-background/80 backdrop-blur-sm hover:bg-background/90"
                    onClick={(e) => {
                      e.stopPropagation();
                      prevImage();
                    }}
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="bg-background/80 backdrop-blur-sm hover:bg-background/90"
                    onClick={(e) => {
                      e.stopPropagation();
                      nextImage();
                    }}
                  >
                    <ChevronRight size={16} />
                  </Button>
                </div>
              )}
              
              {/* Image Counter */}
              {images.length > 1 && (
                <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm rounded-full px-2 py-1 text-xs">
                  {currentImageIndex + 1}/{images.length}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No images generated yet
            </div>
          )}
        </div>

        <CardContent className="p-4 space-y-3">
          {/* Title and Labels */}
          <div>
            <h3 className="font-semibold text-lg line-clamp-2 mb-2">{post.title}</h3>
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" className="text-xs">{post.platform}</Badge>
              <Badge variant="secondary" className="text-xs">{post.style}</Badge>
              <Badge variant="secondary" className="text-xs">{post.voice}</Badge>
            </div>
          </div>

          {/* Truncated Caption */}
          <div>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {truncateCaption(post.caption)}
            </p>
          </div>

          {/* Hashtags Preview */}
          {post.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {getFirstThreeHashtags().map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  #{tag}
                </Badge>
              ))}
              {post.hashtags.length > 3 && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  +{post.hashtags.length - 3} more
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </div>

      {/* Action Buttons */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          className="bg-background/80 backdrop-blur-sm hover:bg-background/90"
          onClick={(e) => {
            e.stopPropagation();
            onView();
          }}
        >
          <Eye size={14} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="bg-background/80 backdrop-blur-sm hover:bg-background/90"
          onClick={(e) => {
            e.stopPropagation();
            onCopy();
          }}
        >
          <Copy size={14} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="bg-background/80 backdrop-blur-sm hover:bg-background/90"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <Edit size={14} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="bg-background/80 backdrop-blur-sm hover:bg-background/90 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 size={14} />
        </Button>
      </div>
    </Card>
  );
};

export default SocialMediaPostCard;