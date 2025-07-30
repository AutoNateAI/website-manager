import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface ImageViewerProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  altText?: string;
  caption?: string;
}

const ImageViewer = ({ isOpen, onClose, imageUrl, altText, caption }: ImageViewerProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] p-2 bg-black/90 border-none">
        <div className="relative flex items-center justify-center h-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
          >
            <X size={20} />
          </Button>
          
          <div className="flex flex-col items-center justify-center max-w-full max-h-full">
            <img
              src={imageUrl}
              alt={altText || 'Product image'}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            
            {caption && (
              <p className="text-white text-center mt-4 px-4 max-w-2xl">
                {caption}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageViewer;