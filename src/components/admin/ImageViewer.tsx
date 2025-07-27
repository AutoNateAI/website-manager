import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, ExternalLink } from 'lucide-react';

interface Image {
  id: string;
  title: string;
  alt_text?: string;
  caption?: string;
  url: string;
  width?: number;
  height?: number;
  created_at: string;
}

interface ImageViewerProps {
  image: Image | null;
  isOpen: boolean;
  onClose: () => void;
}

const ImageViewer = ({ image, isOpen, onClose }: ImageViewerProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  if (!image) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = `${image.title}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenOriginal = () => {
    window.open(image.url, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-0 bg-black/95 border-none">
        <div className="relative flex flex-col h-full">
          {/* Header with controls */}
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleDownload}
              className="bg-black/50 hover:bg-black/70 text-white border-white/20"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleOpenOriginal}
              className="bg-black/50 hover:bg-black/70 text-white border-white/20"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={onClose}
              className="bg-black/50 hover:bg-black/70 text-white border-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Image container */}
          <div className="flex-1 flex items-center justify-center p-4 min-h-0">
            <div className="relative max-w-full max-h-full">
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full"></div>
                </div>
              )}
              <img
                src={image.url}
                alt={image.alt_text || image.title}
                className={`w-full h-full max-w-full max-h-[80vh] object-contain transition-opacity duration-300 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setImageLoaded(true)}
                onError={(e) => {
                  e.currentTarget.src = '/placeholder.svg';
                  setImageLoaded(true);
                }}
              />
            </div>
          </div>

          {/* Caption area */}
          {(image.caption || image.title) && (
            <div className="bg-black/80 text-white p-4 border-t border-white/10">
              <div className="max-w-4xl mx-auto text-center">
                <h3 className="text-lg font-semibold mb-2">{image.title}</h3>
                {image.caption && (
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {image.caption}
                  </p>
                )}
                <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-400">
                  {image.width && image.height && (
                    <span>{image.width} × {image.height}</span>
                  )}
                  <span>
                    {new Date(image.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageViewer;