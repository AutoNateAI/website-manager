import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, CheckCircle, Image as ImageIcon, Wand2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Slide {
  id: string;
  slide_number: number;
  title: string;
  content: string;
  speaker_notes?: string;
  image_url?: string;
  image_prompt?: string;
}

interface SlideCanvasWithImageGenProps {
  deckId: string;
  slides: Slide[];
  totalSlides: number;
  isGenerating: boolean;
}

const SlideCanvasWithImageGen: React.FC<SlideCanvasWithImageGenProps> = ({ 
  deckId, 
  slides, 
  totalSlides, 
  isGenerating 
}) => {
  const [displaySlides, setDisplaySlides] = useState<Slide[]>([]);
  const [generatingImages, setGeneratingImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    setDisplaySlides(slides.sort((a, b) => a.slide_number - b.slide_number));
  }, [slides]);

  const generateSlideImage = async (slide: Slide) => {
    if (generatingImages.has(slide.id)) return;
    
    setGeneratingImages(prev => new Set([...prev, slide.id]));
    
    try {
      const { data: imageData, error: imageError } = await supabase.functions.invoke('generate-image', {
        body: {
          prompt: slide.image_prompt || `Professional 16:9 presentation slide image for: ${slide.title}. Modern, clean, corporate style.`,
          size: "1536x864", // 16:9 aspect ratio
          quality: "high"
        }
      });

      if (imageError) throw imageError;

      if (imageData?.imageUrl) {
        // Update slide with generated image
        const { error: updateError } = await supabase
          .from('slides')
          .update({ image_url: imageData.imageUrl })
          .eq('id', slide.id);

        if (updateError) throw updateError;
        
        // Update local state
        setDisplaySlides(prev => 
          prev.map(s => s.id === slide.id ? { ...s, image_url: imageData.imageUrl } : s)
        );
        
        toast.success(`Image generated for slide ${slide.slide_number}`);
      }
    } catch (error) {
      console.error(`Error generating image for slide ${slide.slide_number}:`, error);
      toast.error(`Failed to generate image for slide ${slide.slide_number}`);
    } finally {
      setGeneratingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(slide.id);
        return newSet;
      });
    }
  };

  const renderSlide = (slide: Slide, isPlaceholder = false) => (
    <Card key={slide.id || `placeholder-${slide.slide_number}`} 
          className={`w-80 h-72 p-4 relative ${isPlaceholder ? 'border-dashed opacity-50' : ''}`}>
      {/* Slide Number */}
      <Badge variant="secondary" className="absolute top-2 left-2 text-xs font-medium">
        Slide {slide.slide_number}
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
      <div className="mt-8 h-full flex flex-col">
        <h3 className={`font-semibold text-sm mb-3 line-clamp-2 ${
          isPlaceholder ? 'text-muted-foreground' : ''
        }`}>
          {isPlaceholder ? 'Generating...' : slide.title}
        </h3>

        <div className="flex-1 flex flex-col">
          {/* Image area with 16:9 aspect ratio */}
          <div className="relative mb-3">
            {!isPlaceholder && slide.image_url ? (
              <div className="w-full aspect-video rounded border overflow-hidden">
                <img 
                  src={slide.image_url} 
                  alt={slide.title}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className={`w-full aspect-video rounded border-2 border-dashed flex flex-col items-center justify-center gap-2 ${
                isPlaceholder ? 'border-muted-foreground/30' : 'border-muted-foreground/50'
              }`}>
                <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
                {!isPlaceholder && !slide.image_url && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => generateSlideImage(slide)}
                    disabled={generatingImages.has(slide.id)}
                    className="text-xs h-6"
                  >
                    {generatingImages.has(slide.id) ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-3 h-3 mr-1" />
                        Generate Image
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>

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
              <p className="line-clamp-3">{slide.content}</p>
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
            {generatingImages.size > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Wand2 className="w-3 h-3" />
                {generatingImages.size} images generating
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

export default SlideCanvasWithImageGen;