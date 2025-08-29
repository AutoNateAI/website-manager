import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Edit3, Save, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface SlideViewerProps {
  deck: any;
}

export const SlideViewer = ({ deck }: SlideViewerProps) => {
  const [slides, setSlides] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editingSlide, setEditingSlide] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [generatingImage, setGeneratingImage] = useState(false);

  useEffect(() => {
    fetchSlides();
  }, [deck.id]);

  const fetchSlides = async () => {
    try {
      const { data, error } = await supabase
        .from('slides')
        .select('*')
        .eq('deck_id', deck.id)
        .order('slide_number');

      if (error) throw error;
      setSlides(data || []);
    } catch (error) {
      console.error('Error fetching slides:', error);
      toast.error('Failed to fetch slides');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSlide = (slide) => {
    setEditingSlide(slide.id);
    setEditContent(slide.content);
    setEditNotes(slide.speaker_notes || '');
  };

  const handleSaveSlide = async () => {
    if (!editingSlide) return;

    try {
      const { error } = await supabase
        .from('slides')
        .update({
          content: editContent,
          speaker_notes: editNotes
        })
        .eq('id', editingSlide);

      if (error) throw error;
      
      await fetchSlides();
      setEditingSlide(null);
      toast.success('Slide updated successfully');
    } catch (error) {
      console.error('Error updating slide:', error);
      toast.error('Failed to update slide');
    }
  };

  const handleGenerateImage = async (slide) => {
    setGeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: {
          prompt: `${slide.image_prompt}. Professional, 16:9 aspect ratio, modern design, high quality`,
          size: "1536x1024"
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        const { error: updateError } = await supabase
          .from('slides')
          .update({ image_url: data.imageUrl })
          .eq('id', slide.id);

        if (updateError) throw updateError;
        
        await fetchSlides();
        toast.success('Image generated successfully');
      }
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('Failed to generate image');
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleEditImage = async (slide, editPrompt) => {
    if (!slide.image_url || !editPrompt) return;

    setGeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke('edit-image', {
        body: {
          originalImageUrl: slide.image_url,
          editPrompt: editPrompt
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        const { error: updateError } = await supabase
          .from('slides')
          .update({ image_url: data.imageUrl })
          .eq('id', slide.id);

        if (updateError) throw updateError;
        
        await fetchSlides();
        toast.success('Image edited successfully');
      }
    } catch (error) {
      console.error('Error editing image:', error);
      toast.error('Failed to edit image');
    } finally {
      setGeneratingImage(false);
    }
  };

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No slides found for this deck.</p>
      </div>
    );
  }

  const slide = slides[currentSlide];

  return (
    <div className="space-y-6">
      {/* Slide Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            Slide {slide.slide_number} of {slides.length}
          </Badge>
          <h2 className="text-xl font-semibold text-foreground">{slide.title}</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={prevSlide}
            disabled={currentSlide === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={nextSlide}
            disabled={currentSlide === slides.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Slide Content */}
        <Card className="bg-card/80 backdrop-blur-sm border-border">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Slide Content</h3>
              {editingSlide === slide.id ? (
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveSlide}>
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingSlide(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => handleEditSlide(slide)}>
                  <Edit3 className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
            </div>

            {editingSlide === slide.id ? (
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-32"
                placeholder="Slide content..."
              />
            ) : (
              <div className="prose prose-sm max-w-none">
                <p className="text-foreground whitespace-pre-wrap">{slide.content}</p>
              </div>
            )}

            {/* Speaker Notes */}
            <div className="border-t pt-4">
              <h4 className="font-medium text-foreground mb-2">Speaker Notes</h4>
              {editingSlide === slide.id ? (
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="min-h-24"
                  placeholder="Speaker notes..."
                />
              ) : (
                <div className="text-sm text-muted-foreground">
                  <p className="whitespace-pre-wrap">{slide.speaker_notes || 'No speaker notes available.'}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Slide Visual */}
        <Card className="bg-card/80 backdrop-blur-sm border-border">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Visual</h3>
              <div className="flex gap-2">
                {slide.image_url ? (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      const prompt = window.prompt('Describe how you want to edit this image:');
                      if (prompt) handleEditImage(slide, prompt);
                    }}
                    disabled={generatingImage}
                  >
                    <Edit3 className="h-4 w-4 mr-1" />
                    Edit Image
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    onClick={() => handleGenerateImage(slide)}
                    disabled={generatingImage}
                  >
                    {generatingImage ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <ImageIcon className="h-4 w-4 mr-1" />
                    )}
                    Generate Image
                  </Button>
                )}
              </div>
            </div>

            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center overflow-hidden">
              {slide.image_url ? (
                <img 
                  src={slide.image_url} 
                  alt={slide.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center space-y-2">
                  <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">No image generated yet</p>
                  {slide.image_prompt && (
                    <p className="text-xs text-muted-foreground max-w-md">
                      Suggested: {slide.image_prompt}
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Slide Thumbnails */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {slides.map((s, index) => (
          <Button
            key={s.id}
            variant={currentSlide === index ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentSlide(index)}
            className="flex-shrink-0"
          >
            {s.slide_number}
          </Button>
        ))}
      </div>
    </div>
  );
};