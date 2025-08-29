import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Search, Plus } from 'lucide-react';
import { toast } from 'sonner';
import SlideGenerator from './slides/SlideGenerator';
import { SlideLibrary } from './slides/SlideLibrary';
import { SlideViewer } from './slides/SlideViewer';
import { FlashcardViewer } from './slides/FlashcardViewer';
import { AssessmentViewer } from './slides/AssessmentViewer';

export const SlideManager = () => {
  const [activeTab, setActiveTab] = useState('library');
  const [slideDecks, setSlideDecks] = useState([]);
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showGenerator, setShowGenerator] = useState(false);

  useEffect(() => {
    fetchSlideDecks();
  }, []);

  const fetchSlideDecks = async () => {
    try {
      const { data, error } = await supabase
        .from('slide_decks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSlideDecks(data || []);
    } catch (error) {
      console.error('Error fetching slide decks:', error);
      toast.error('Failed to fetch slide decks');
    } finally {
      setLoading(false);
    }
  };

  const filteredDecks = slideDecks.filter(deck => 
    deck.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (deck.description && deck.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (deck.topic && deck.topic.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDeckCreated = (newDeck) => {
    setSlideDecks(prev => [newDeck, ...prev]);
    setSelectedDeck(newDeck);
    setShowGenerator(false);
    toast.success('Slide deck created successfully!');
  };

  const handleDeckSelect = (deck) => {
    setSelectedDeck(deck);
    setActiveTab('viewer');
  };

  if (selectedDeck) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button 
              variant="ghost" 
              onClick={() => setSelectedDeck(null)}
              className="mb-2"
            >
              ← Back to Library
            </Button>
            <h1 className="text-3xl font-bold text-foreground">{selectedDeck.title}</h1>
            <p className="text-muted-foreground mt-1">{selectedDeck.description}</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="viewer">Slides</TabsTrigger>
            <TabsTrigger value="concepts">Concepts</TabsTrigger>
            <TabsTrigger value="assessments">Assessments</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="viewer" className="mt-6">
            <SlideViewer deck={selectedDeck} />
          </TabsContent>

          <TabsContent value="concepts" className="mt-6">
            <FlashcardViewer deckId={selectedDeck.id} />
          </TabsContent>

          <TabsContent value="assessments" className="mt-6">
            <AssessmentViewer deckId={selectedDeck.id} />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground">Analytics dashboard coming soon...</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Slide Deck Library</h1>
          <p className="text-muted-foreground mt-1">
            Generate, manage, and present AI-powered slide decks
          </p>
        </div>
        <Button onClick={() => setShowGenerator(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Generate New Deck
        </Button>
      </div>

      {showGenerator && (
        <div className="border border-border rounded-lg p-6 bg-card/50 backdrop-blur-sm">
          <SlideGenerator 
            onDeckCreated={handleDeckCreated}
            onCancel={() => setShowGenerator(false)}
          />
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search slide decks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-background/50 backdrop-blur-sm border-border"
          />
        </div>
      </div>

      <SlideLibrary 
        decks={filteredDecks}
        loading={loading}
        onDeckSelect={handleDeckSelect}
        onDeckUpdate={fetchSlideDecks}
      />
    </div>
  );
};