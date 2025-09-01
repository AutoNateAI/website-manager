import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight, Grid, Maximize, X } from 'lucide-react';
import { SocialMediaImage } from './types';
import ImageViewer from './ImageViewer';

interface SocialMediaImageGalleryProps {
  images: SocialMediaImage[];
}

const SocialMediaImageGallery = ({ images }: SocialMediaImageGalleryProps) => {
  const [viewMode, setViewMode] = useState<'gallery' | 'single'>('gallery');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedImage, setSelectedImage] = useState<SocialMediaImage | null>(null);
  const [showImageViewer, setShowImageViewer] = useState(false);

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const openImageViewer = (image: SocialMediaImage) => {
    setSelectedImage(image);
    setShowImageViewer(true);
  };

  if (images.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No images available
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* View Toggle */}
      <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
        <h3 className="font-medium">Images ({images.length})</h3>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'gallery' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('gallery')}
          >
            <Grid size={14} className="mr-1" />
            Gallery
          </Button>
          <Button
            variant={viewMode === 'single' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('single')}
          >
            <Maximize size={14} className="mr-1" />
            Single
          </Button>
        </div>
      </div>

      {viewMode === 'gallery' ? (
        // Gallery View - Scrollable
        <ScrollArea className="flex-1 px-6 pb-6">
          <div className="grid grid-cols-3 gap-3">
            {images.map((image, index) => (
              <div
                key={image.id}
                className="group relative aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                onClick={() => openImageViewer(image)}
              >
                <img
                  src={image.image_url}
                  alt={image.alt_text || `Image ${index + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize className="text-white" size={20} />
                  </div>
                </div>
                <div className="absolute top-2 left-2">
                  <Badge variant="secondary" className="text-xs">
                    {index + 1}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        // Single View - Fixed Image, Scrollable Details
        <div className="flex-1 flex flex-col px-6 pb-6 overflow-hidden">
          {/* Fixed Image Container */}
          <div className="relative flex-shrink-0 mb-4">
            <div className="aspect-[16/6] bg-muted rounded-lg overflow-hidden">
              <img
                src={images[currentIndex]?.image_url}
                alt={images[currentIndex]?.alt_text || `Image ${currentIndex + 1}`}
                className="w-full h-full object-contain cursor-pointer"
                onClick={() => openImageViewer(images[currentIndex])}
              />
            </div>
            
            {/* Navigation Controls */}
            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-background/80 backdrop-blur-sm"
                  onClick={prevImage}
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-background/80 backdrop-blur-sm"
                  onClick={nextImage}
                >
                  <ChevronRight size={16} />
                </Button>
              </>
            )}
            
            {/* Counter */}
            <div className="absolute bottom-4 right-4 bg-background/80 backdrop-blur-sm rounded-full px-3 py-1 text-sm">
              {currentIndex + 1} / {images.length}
            </div>

            {/* Expand Button */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm"
              onClick={() => openImageViewer(images[currentIndex])}
            >
              <Maximize size={14} />
            </Button>
          </div>

          {/* Scrollable Details Section */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-4 pr-4">
                {/* Image Details */}
                <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Image {currentIndex + 1}</span>
                    <Badge variant="outline">
                      Carousel {images[currentIndex]?.carousel_index + 1}
                    </Badge>
                  </div>
                  {images[currentIndex]?.image_prompt && (
                    <div>
                      <span className="text-sm font-medium">Prompt:</span>
                      <p className="text-sm text-muted-foreground mt-1">
                        {images[currentIndex].image_prompt}
                      </p>
                    </div>
                  )}
                  {images[currentIndex]?.alt_text && (
                    <div>
                      <span className="text-sm font-medium">Alt Text:</span>
                      <p className="text-sm text-muted-foreground mt-1">
                        {images[currentIndex].alt_text}
                      </p>
                    </div>
                  )}
                </div>

                {/* Thumbnail Navigation */}
                {images.length > 1 && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Navigate Images:</span>
                    <div className="grid grid-cols-4 gap-2">
                      {images.map((image, index) => (
                        <button
                          key={image.id}
                          className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                            index === currentIndex
                              ? 'border-primary'
                              : 'border-transparent hover:border-muted-foreground'
                          }`}
                          onClick={() => setCurrentIndex(index)}
                        >
                          <img
                            src={image.image_url}
                            alt={image.alt_text || `Thumbnail ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {selectedImage && (
        <ImageViewer
          isOpen={showImageViewer}
          onClose={() => setShowImageViewer(false)}
          imageUrl={selectedImage.image_url}
          altText={selectedImage.alt_text}
          caption={selectedImage.image_prompt}
        />
      )}
    </div>
  );
};

export default SocialMediaImageGallery;