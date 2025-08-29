import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ArrowLeft, Edit3, Save, Wand2, Image as ImageIcon, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ConversationInterface from './ConversationInterface';
import SlideCanvas from './SlideCanvas';
import { Label } from '@/components/ui/label';

interface SlideGeneratorProps {
  onDeckCreated: (deck: any) => void;
  onCancel: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const SlideGenerator: React.FC<SlideGeneratorProps> = ({ onDeckCreated, onCancel }) => {
  const [currentStep, setCurrentStep] = useState<'conversation' | 'outline' | 'canvas'>('conversation');
  const [outline, setOutline] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isGeneratingFull, setIsGeneratingFull] = useState(false);
  const [editingSlide, setEditingSlide] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationMessages, setConversationMessages] = useState<Message[]>([]);
  const [activeDeck, setActiveDeck] = useState<any>(null);
  const [canvasSlides, setCanvasSlides] = useState<any[]>([]);

  const handleGenerateOutline = async (convId: string, messages: Message[]) => {
    setConversationId(convId);
    setConversationMessages(messages);
    setLoading(true);

    try {
      // Create presentation details from conversation context
      const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
      
      // First create the slide deck entry
      const { data: deckData, error: deckError } = await supabase
        .from('slide_decks')
        .insert({
          title: 'Presentation from Conversation',
          description: 'Generated from AI conversation',
          target_audience: 'Professional audience',
          topic: 'AutoNateAI Presentation',
          presentation_style: 'professional',
          slide_count: 12,
          insights: conversationText.slice(0, 1000),
          status: 'draft',
          conversation_id: convId
        })
        .select()
        .single();

      if (deckError) throw deckError;
      setActiveDeck(deckData);

      // Generate outline using conversation context
      const { data, error } = await supabase.functions.invoke('generate-slide-outline', {
        body: {
          title: 'AutoNateAI Presentation',
          description: 'Presentation based on conversation context',
          audience: 'Professional audience',
          topic: 'AutoNateAI Services and Solutions',
          style: 'professional',
          slideCount: 12,
          insights: conversationText
        }
      });

      if (error) throw error;

      setOutline(data.outline || []);
      setCurrentStep('outline');
      toast.success('Outline generated successfully!');

    } catch (error) {
      console.error('Error generating outline:', error);
      toast.error('Failed to generate outline. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFullDeck = async () => {
    if (!activeDeck) {
      toast.error('No active deck found');
      return;
    }

    setIsGeneratingFull(true);
    setCurrentStep('canvas');
    
    try {
      // Generate full slide content
      const { data: fullSlideData, error: fullSlideError } = await supabase.functions.invoke('generate-full-slides', {
        body: {
          deck_id: activeDeck.id,
          outline: outline,
          presentation_style: 'professional',
          conversation_id: conversationId
        }
      });

      if (fullSlideError) {
        console.error('Error generating full slides:', fullSlideError);
        throw new Error('Failed to generate slide content');
      }

      // Listen for slides being created
      const channel = supabase
        .channel('slide-updates')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'slides',
            filter: `deck_id=eq.${activeDeck.id}`
          },
          (payload) => {
            console.log('New slide created:', payload);
            setCanvasSlides(prev => [...prev, payload.new].sort((a, b) => a.slide_number - b.slide_number));
          }
        )
        .subscribe();

      // Generate images for each slide as they're created
      setTimeout(async () => {
        try {
          const { data: slides } = await supabase
            .from('slides')
            .select('*')
            .eq('deck_id', activeDeck.id)
            .order('slide_number');

          if (slides) {
            setCanvasSlides(slides);
            
            // Generate images for slides
            const imagePromises = slides.map(async (slide) => {
              try {
                const { data: imageData, error: imageError } = await supabase.functions.invoke('generate-image', {
                  body: {
                    prompt: slide.image_prompt || `Professional slide image for: ${slide.title}`,
                    slide_id: slide.id
                  }
                });

                if (!imageError && imageData?.image_url) {
                  await supabase
                    .from('slides')
                    .update({ image_url: imageData.image_url })
                    .eq('id', slide.id);
                  
                  // Update canvas
                  setCanvasSlides(prev => 
                    prev.map(s => s.id === slide.id ? { ...s, image_url: imageData.image_url } : s)
                  );
                }
              } catch (error) {
                console.error(`Error generating image for slide ${slide.slide_number}:`, error);
              }
            });

            await Promise.allSettled(imagePromises);
          }
        } catch (error) {
          console.error('Error processing slides:', error);
        }
      }, 2000);

      // Generate concepts and assessments in parallel
      const [conceptsResult, assessmentsResult] = await Promise.allSettled([
        supabase.functions.invoke('generate-slide-concepts', {
          body: {
            deck_id: activeDeck.id,
            outline: outline
          }
        }),
        supabase.functions.invoke('generate-slide-assessments', {
          body: {
            deck_id: activeDeck.id,
            outline: outline
          }
        })
      ]);

      if (conceptsResult.status === 'rejected') {
        console.error('Error generating concepts:', conceptsResult.reason);
      }

      if (assessmentsResult.status === 'rejected') {
        console.error('Error generating assessments:', assessmentsResult.reason);
      }

      // Cleanup and complete
      setTimeout(() => {
        supabase.removeChannel(channel);
        onDeckCreated(activeDeck);
        toast.success('Slide deck generated successfully!');
        setIsGeneratingFull(false);
      }, 10000); // Give time for all processes to complete

    } catch (error) {
      console.error('Error generating full deck:', error);
      toast.error('Failed to generate full slide deck. Please try again.');
      setIsGeneratingFull(false);
    }
  };

  const editOutlineSlide = (index: number, content: string[], notes: string) => {
    const updatedOutline = [...outline];
    updatedOutline[index] = {
      ...updatedOutline[index],
      content: content,
      speakerNotes: notes
    };
    setOutline(updatedOutline);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6" />
          AI Slide Generator
        </h2>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      <Tabs value={currentStep} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="conversation" disabled={currentStep !== 'conversation' && currentStep !== 'outline'}>
            Conversation
          </TabsTrigger>
          <TabsTrigger value="outline" disabled={currentStep === 'conversation'}>
            Outline
          </TabsTrigger>
          <TabsTrigger value="canvas" disabled={currentStep !== 'canvas'}>
            Canvas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conversation" className="space-y-4">
          <ConversationInterface onGenerateOutline={handleGenerateOutline} />
        </TabsContent>

        <TabsContent value="outline" className="space-y-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setCurrentStep('conversation')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Conversation
            </Button>
            <h2 className="text-2xl font-bold">Review & Edit Outline</h2>
          </div>

          <div className="space-y-4">
            {outline.map((slide, index) => (
              <Card key={index} className="relative">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <span className="bg-primary text-primary-foreground px-2 py-1 rounded text-sm">
                        Slide {slide.slideNumber}
                      </span>
                      {slide.title}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingSlide(index);
                        setEditContent(Array.isArray(slide.content) ? slide.content.join('\n') : slide.content);
                        setEditNotes(slide.speakerNotes || '');
                      }}
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                  </div>

                  {editingSlide === index ? (
                    <div className="space-y-4">
                      <div>
                        <Label>Content Points</Label>
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={6}
                          placeholder="Enter slide content points, one per line"
                        />
                      </div>
                      <div>
                        <Label>Speaker Notes</Label>
                        <Textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          rows={4}
                          placeholder="Enter speaker notes for this slide"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            editOutlineSlide(index, editContent.split('\n').filter(line => line.trim()), editNotes);
                            setEditingSlide(null);
                          }}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingSlide(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Content:</h4>
                        <div className="bg-muted/30 p-3 rounded">
                          <div className="text-sm text-muted-foreground whitespace-pre-line">
                            {Array.isArray(slide.content) ? slide.content.join('\n') : slide.content}
                          </div>
                        </div>
                      </div>
                      {slide.speakerNotes && (
                        <div>
                          <h4 className="font-medium mb-2">Speaker Notes:</h4>
                          <div className="bg-muted/30 p-3 rounded">
                            <p className="text-sm text-muted-foreground">{slide.speakerNotes}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-end">
            <Button onClick={handleGenerateFullDeck} disabled={isGeneratingFull}>
              {isGeneratingFull ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Full Deck...
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Generate Full Slide Deck
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="canvas" className="space-y-4">
          <SlideCanvas
            deckId={activeDeck?.id || ''}
            slides={canvasSlides}
            totalSlides={outline.length}
            isGenerating={isGeneratingFull}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SlideGenerator;