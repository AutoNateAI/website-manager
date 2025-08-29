import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface SlideGeneratorProps {
  onDeckCreated: (deck: any) => void;
  onCancel: () => void;
}

export const SlideGenerator = ({ onDeckCreated, onCancel }: SlideGeneratorProps) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    target_audience: '',
    topic: '',
    presentation_style: '',
    slide_count: 10,
    insights: ''
  });
  
  const [step, setStep] = useState(1); // 1: Form, 2: Outline, 3: Generation
  const [outline, setOutline] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deckId, setDeckId] = useState(null);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerateOutline = async () => {
    if (!formData.title || !formData.target_audience || !formData.presentation_style) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // Create deck in database first
      const { data: newDeck, error: deckError } = await supabase
        .from('slide_decks')
        .insert({
          title: formData.title,
          description: formData.description,
          target_audience: formData.target_audience,
          topic: formData.topic,
          presentation_style: formData.presentation_style,
          slide_count: formData.slide_count,
          insights: formData.insights,
          status: 'draft'
        })
        .select()
        .single();

      if (deckError) throw deckError;
      setDeckId(newDeck.id);

      // Generate outline
      const { data, error } = await supabase.functions.invoke('generate-slide-outline', {
        body: formData
      });

      if (error) throw error;
      
      setOutline(data.outline || []);
      setStep(2);
      toast.success('Slide outline generated successfully!');
    } catch (error) {
      console.error('Error generating outline:', error);
      toast.error('Failed to generate slide outline');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFullDeck = async () => {
    if (!deckId || !outline.length) return;

    setLoading(true);
    try {
      // Generate full slides
      const { data: slidesData, error: slidesError } = await supabase.functions.invoke('generate-full-slides', {
        body: {
          deck_id: deckId,
          outline,
          presentation_style: formData.presentation_style
        }
      });

      if (slidesError) throw slidesError;

      // Generate slide images
      for (const slide of slidesData.slides) {
        try {
          const { data: imageData, error: imageError } = await supabase.functions.invoke('generate-image', {
            body: {
              prompt: `${slide.image_prompt}. Professional, 16:9 aspect ratio, modern design, high quality`,
              size: "1536x1024"
            }
          });

          if (!imageError && imageData?.imageUrl) {
            await supabase
              .from('slides')
              .update({ image_url: imageData.imageUrl })
              .eq('id', slide.id);
          }
        } catch (imageError) {
          console.error('Error generating image for slide:', slide.id, imageError);
        }
      }

      // Generate core concepts in parallel
      supabase.functions.invoke('generate-slide-concepts', {
        body: { deck_id: deckId, slides: slidesData.slides }
      });

      // Generate assessments in parallel
      supabase.functions.invoke('generate-slide-assessments', {
        body: { deck_id: deckId, slides: slidesData.slides }
      });

      // Get the completed deck
      const { data: completedDeck, error: fetchError } = await supabase
        .from('slide_decks')
        .select('*')
        .eq('id', deckId)
        .single();

      if (fetchError) throw fetchError;

      onDeckCreated(completedDeck);
      toast.success('Slide deck generated successfully!');
    } catch (error) {
      console.error('Error generating full deck:', error);
      toast.error('Failed to generate full slide deck');
    } finally {
      setLoading(false);
    }
  };

  const editOutlineSlide = (index, field, value) => {
    const updatedOutline = [...outline];
    updatedOutline[index] = { ...updatedOutline[index], [field]: value };
    setOutline(updatedOutline);
  };

  if (step === 1) {
    return (
      <Card className="w-full max-w-4xl mx-auto bg-card/80 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Generate New Slide Deck
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Presentation Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="e.g., Introduction to AI in Business"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Brief description of the presentation content..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="topic">Topic/Theme</Label>
                <Input
                  id="topic"
                  value={formData.topic}
                  onChange={(e) => handleInputChange('topic', e.target.value)}
                  placeholder="e.g., Artificial Intelligence, Machine Learning"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="target_audience">Target Audience *</Label>
                <Select value={formData.target_audience} onValueChange={(value) => handleInputChange('target_audience', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select target audience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leads">Potential Leads/Clients</SelectItem>
                    <SelectItem value="internal-team">Internal Team</SelectItem>
                    <SelectItem value="technical-team">Technical Team</SelectItem>
                    <SelectItem value="executive-team">Executive Team</SelectItem>
                    <SelectItem value="mixed-audience">Mixed Audience</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="presentation_style">Presentation Style *</Label>
                <Select value={formData.presentation_style} onValueChange={(value) => handleInputChange('presentation_style', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select presentation style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="casual">Casual & Conversational</SelectItem>
                    <SelectItem value="technical">Technical & Detailed</SelectItem>
                    <SelectItem value="inspirational">Inspirational & Motivational</SelectItem>
                    <SelectItem value="educational">Educational & Academic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="slide_count">Number of Slides</Label>
                <Select 
                  value={formData.slide_count.toString()} 
                  onValueChange={(value) => handleInputChange('slide_count', parseInt(value))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 slides</SelectItem>
                    <SelectItem value="8">8 slides</SelectItem>
                    <SelectItem value="10">10 slides</SelectItem>
                    <SelectItem value="12">12 slides</SelectItem>
                    <SelectItem value="15">15 slides</SelectItem>
                    <SelectItem value="20">20 slides</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="insights">Additional Insights & Context</Label>
            <Textarea
              id="insights"
              value={formData.insights}
              onChange={(e) => handleInputChange('insights', e.target.value)}
              placeholder="Any specific insights, data points, or context you want to include..."
              className="mt-1"
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              onClick={handleGenerateOutline} 
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Outline...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Outline
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 2) {
    return (
      <Card className="w-full max-w-6xl mx-auto bg-card/80 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle>Review & Edit Slide Outline</CardTitle>
          <p className="text-muted-foreground">
            Review the generated outline and make any adjustments before generating the full presentation.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {outline.map((slide, index) => (
              <div key={index} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                    Slide {slide.slide_number}
                  </span>
                  <Input
                    value={slide.title}
                    onChange={(e) => editOutlineSlide(index, 'title', e.target.value)}
                    className="font-medium"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Content Points:</Label>
                  {slide.content_points?.map((point, pointIndex) => (
                    <Input
                      key={pointIndex}
                      value={point}
                      onChange={(e) => {
                        const updatedPoints = [...slide.content_points];
                        updatedPoints[pointIndex] = e.target.value;
                        editOutlineSlide(index, 'content_points', updatedPoints);
                      }}
                      className="text-sm"
                      placeholder="Content point..."
                    />
                  ))}
                </div>

                <Textarea
                  value={slide.speaker_notes}
                  onChange={(e) => editOutlineSlide(index, 'speaker_notes', e.target.value)}
                  placeholder="Speaker notes..."
                  rows={2}
                  className="text-sm"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back to Form
            </Button>
            <Button 
              onClick={handleGenerateFullDeck} 
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Full Deck...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Full Slide Deck
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
};