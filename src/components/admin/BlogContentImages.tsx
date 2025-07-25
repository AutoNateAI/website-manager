import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, Eye, ExternalLink } from 'lucide-react';
import ImageEditor from './ImageEditor';

interface BlogContentImagesProps {
  content: string;
  onImageUpdated: (oldUrl: string, newUrl: string) => void;
}

interface ContentImage {
  url: string;
  alt: string;
  caption?: string;
  position: string;
}

const BlogContentImages = ({ content, onImageUpdated }: BlogContentImagesProps) => {
  const [contentImages, setContentImages] = useState<ContentImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<{ url: string; id: string } | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  useEffect(() => {
    extractImagesFromContent();
  }, [content]);

  const extractImagesFromContent = () => {
    // Regex to match markdown images: ![alt](url) and optionally *caption*
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)(?:\n\*([^*]+)\*)?/g;
    const images: ContentImage[] = [];
    let match;
    let position = 0;

    while ((match = imageRegex.exec(content)) !== null) {
      images.push({
        url: match[2],
        alt: match[1] || '',
        caption: match[3] || undefined,
        position: `position_${position++}`
      });
    }

    setContentImages(images);
  };

  const handleEditImage = (imageUrl: string) => {
    // Extract image ID from URL (assumes URL format includes ID)
    const imageId = imageUrl.split('/').pop()?.split('.')[0] || 'unknown';
    setSelectedImage({ url: imageUrl, id: imageId });
    setIsEditorOpen(true);
  };

  const handleImageUpdated = (newImageUrl: string) => {
    if (selectedImage) {
      onImageUpdated(selectedImage.url, newImageUrl);
      setIsEditorOpen(false);
      setSelectedImage(null);
    }
  };

  if (contentImages.length === 0) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No images found in blog content</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye size={20} />
            Content Images ({contentImages.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {contentImages.map((image, index) => (
            <div key={index} className="flex gap-4 p-4 border border-border/50 rounded-lg">
              <div className="flex-shrink-0">
                <img 
                  src={image.url} 
                  alt={image.alt}
                  className="w-24 h-24 object-cover rounded-xl shadow-lg"
                />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{image.alt || 'No alt text'}</p>
                    {image.caption && (
                      <p className="text-xs text-muted-foreground italic">{image.caption}</p>
                    )}
                    <Badge variant="outline" className="mt-1 text-xs">
                      Position {index + 1}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(image.url, '_blank')}
                      className="h-8 w-8 p-0"
                    >
                      <ExternalLink size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditImage(image.url)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit size={14} />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {image.url}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {selectedImage && (
        <ImageEditor
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          imageUrl={selectedImage.url}
          imageId={selectedImage.id}
          onImageUpdated={handleImageUpdated}
        />
      )}
    </>
  );
};

export default BlogContentImages;