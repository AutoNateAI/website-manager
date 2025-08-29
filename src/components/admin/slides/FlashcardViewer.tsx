import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, ChevronLeft, ChevronRight, Shuffle } from 'lucide-react';
import { toast } from 'sonner';

interface FlashcardViewerProps {
  deckId: string;
}

export const FlashcardViewer = ({ deckId }: FlashcardViewerProps) => {
  const [concepts, setConcepts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [shuffledOrder, setShuffledOrder] = useState([]);

  useEffect(() => {
    fetchConcepts();
  }, [deckId]);

  const fetchConcepts = async () => {
    try {
      const { data, error } = await supabase
        .from('core_concepts')
        .select('*')
        .eq('deck_id', deckId)
        .order('importance_level', { ascending: false });

      if (error) throw error;
      
      setConcepts(data || []);
      setShuffledOrder(data?.map((_, i) => i) || []);
    } catch (error) {
      console.error('Error fetching concepts:', error);
      toast.error('Failed to fetch core concepts');
    } finally {
      setLoading(false);
    }
  };

  const shuffleConcepts = () => {
    const newOrder = [...shuffledOrder];
    for (let i = newOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newOrder[i], newOrder[j]] = [newOrder[j], newOrder[i]];
    }
    setShuffledOrder(newOrder);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const nextCard = () => {
    if (currentIndex < concepts.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const prevCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const flipCard = () => {
    setIsFlipped(!isFlipped);
  };

  const getImportanceColor = (level) => {
    switch (level) {
      case 5:
        return 'bg-red-500/20 text-red-700 dark:text-red-400';
      case 4:
        return 'bg-orange-500/20 text-orange-700 dark:text-orange-400';
      case 3:
        return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400';
      case 2:
        return 'bg-blue-500/20 text-blue-700 dark:text-blue-400';
      case 1:
        return 'bg-green-500/20 text-green-700 dark:text-green-400';
      default:
        return 'bg-gray-500/20 text-gray-700 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (concepts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🧠</div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No concepts generated yet</h3>
        <p className="text-muted-foreground">
          Core concepts will appear here once the slide deck is fully generated.
        </p>
      </div>
    );
  }

  const conceptIndex = shuffledOrder[currentIndex];
  const concept = concepts[conceptIndex];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-foreground">Core Concepts</h2>
          <Badge variant="outline">
            {currentIndex + 1} of {concepts.length}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={shuffleConcepts}>
            <Shuffle className="h-4 w-4 mr-1" />
            Shuffle
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={prevCard}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={nextCard}
            disabled={currentIndex === concepts.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Flashcard */}
      <div className="perspective-1000 h-80">
        <div 
          className={`relative w-full h-full cursor-pointer transition-transform duration-700 transform-style-preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}
          onClick={flipCard}
        >
          {/* Front of card */}
          <Card className="absolute inset-0 backface-hidden bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 hover:shadow-lg transition-shadow">
            <CardContent className="h-full p-8 flex flex-col items-center justify-center text-center space-y-6">
              <div className="space-y-4">
                <Badge className={getImportanceColor(concept.importance_level)}>
                  Priority {concept.importance_level}/5
                </Badge>
                
                <h3 className="text-3xl font-bold text-foreground">
                  {concept.concept_title}
                </h3>
              </div>
              
              <div className="flex items-center gap-2 text-muted-foreground">
                <RotateCcw className="h-4 w-4" />
                <span className="text-sm">Click to reveal description</span>
              </div>
            </CardContent>
          </Card>

          {/* Back of card */}
          <Card className="absolute inset-0 backface-hidden rotate-y-180 bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20 hover:shadow-lg transition-shadow">
            <CardContent className="h-full p-8 flex flex-col justify-center space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-foreground mb-4">
                  {concept.concept_title}
                </h3>
                
                <p className="text-lg text-foreground leading-relaxed mb-6">
                  {concept.concept_description}
                </p>
                
                {concept.related_slide_numbers?.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    <span className="text-sm text-muted-foreground">Related slides:</span>
                    {concept.related_slide_numbers.map((slideNum) => (
                      <Badge key={slideNum} variant="outline" className="text-xs">
                        #{slideNum}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <RotateCcw className="h-4 w-4" />
                <span className="text-sm">Click to flip back</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="flex gap-1 justify-center">
        {concepts.map((_, index) => (
          <div
            key={index}
            className={`h-2 w-8 rounded-full transition-colors ${
              index === currentIndex ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Mobile swipe hint */}
      <div className="text-center text-xs text-muted-foreground md:hidden">
        Swipe left or right to navigate, tap to flip
      </div>
    </div>
  );
};