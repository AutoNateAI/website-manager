import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, CheckCircle, Image as ImageIcon } from 'lucide-react';

interface Slide {
  id: string;
  slide_number: number;
  title: string;
  content: string;
  speaker_notes?: string;
  image_url?: string;
  image_prompt?: string;
}

interface SlideCanvasProps {
  deckId: string;
  slides: Slide[];
  totalSlides: number;
  isGenerating: boolean;
}

const SlideCanvas: React.FC<SlideCanvasProps> = ({ 
  deckId, 
  slides, 
  totalSlides, 
  isGenerating 
}) => {
  const [displaySlides, setDisplaySlides] = useState<Slide[]>([]);

  useEffect(() => {
    setDisplaySlides(slides.sort((a, b) => a.slide_number - b.slide_number));
  }, [slides]);

  const renderSlide = (slide: Slide, isPlaceholder = false) => (
    <Card key={slide.id || `placeholder-${slide.slide_number}`} 
          className={`w-80 h-56 p-4 relative ${isPlaceholder ? 'border-dashed opacity-50' : ''}`}>
      {/* Slide Number */}
      <Badge variant="secondary" className="absolute top-2 left-2 text-xs">
        {slide.slide_number}
      </Badge>

      {/* Slide Status */}
      <div className="absolute top-2 right-2">
        {isPlaceholder ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : (
          <CheckCircle className="w-4 h-4 text-green-500" />
        )}
      </div>

      {/* Slide Content */}
      <div className="mt-6 h-full flex flex-col">
        <h3 className={`font-semibold text-sm mb-2 line-clamp-2 ${
          isPlaceholder ? 'text-muted-foreground' : ''
        }`}>
          {isPlaceholder ? 'Generating...' : slide.title}
        </h3>

        <div className="flex-1 flex flex-col">
          {/* Image placeholder/actual image */}
          {!isPlaceholder && slide.image_url ? (
            <div className="w-full h-20 mb-2 rounded border overflow-hidden">
              <img 
                src={slide.image_url} 
                alt={slide.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className={`w-full h-20 mb-2 rounded border-2 border-dashed flex items-center justify-center ${
              isPlaceholder ? 'border-muted-foreground/30' : 'border-muted-foreground/50'
            }`}>
              <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
            </div>
          )}

          {/* Content preview */}
          <div className={`text-xs flex-1 overflow-hidden ${
            isPlaceholder ? 'text-muted-foreground' : 'text-muted-foreground'
          }`}>
            {isPlaceholder ? (
              <div className="space-y-1">
                <div className="h-2 bg-muted rounded animate-pulse"></div>
                <div className="h-2 bg-muted rounded animate-pulse w-3/4"></div>
                <div className="h-2 bg-muted rounded animate-pulse w-1/2"></div>
              </div>
            ) : (
              <p className="line-clamp-4">{slide.content}</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );

  // Create placeholder slides for remaining slots
  const placeholderSlides = [];
  for (let i = displaySlides.length + 1; i <= totalSlides; i++) {
    placeholderSlides.push({
      id: `placeholder-${i}`,
      slide_number: i,
      title: '',
      content: ''
    });
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Slide Canvas</h3>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {displaySlides.length} / {totalSlides} generated
            </Badge>
            {isGenerating && (
              <Badge variant="secondary" className="gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Generating...
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Rendered slides */}
          {displaySlides.map(slide => renderSlide(slide))}
          
          {/* Placeholder slides */}
          {isGenerating && placeholderSlides.map(slide => renderSlide(slide, true))}
        </div>

        {displaySlides.length === 0 && !isGenerating && (
          <div className="text-center text-muted-foreground py-12">
            <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Your slides will appear here as they're generated</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default SlideCanvas;