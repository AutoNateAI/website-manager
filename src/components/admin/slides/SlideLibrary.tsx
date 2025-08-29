import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, MoreVertical, Trash2, Edit } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SlideLibraryProps {
  decks: any[];
  loading: boolean;
  onDeckSelect: (deck: any) => void;
  onDeckUpdate: () => void;
}

export const SlideLibrary = ({ decks, loading, onDeckSelect, onDeckUpdate }: SlideLibraryProps) => {
  const handleDeleteDeck = async (deckId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this slide deck? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('slide_decks')
        .delete()
        .eq('id', deckId);

      if (error) throw error;
      
      toast.success('Slide deck deleted successfully');
      onDeckUpdate();
    } catch (error) {
      console.error('Error deleting deck:', error);
      toast.error('Failed to delete slide deck');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400';
      case 'generated':
        return 'bg-blue-500/20 text-blue-700 dark:text-blue-400';
      case 'completed':
        return 'bg-green-500/20 text-green-700 dark:text-green-400';
      default:
        return 'bg-gray-500/20 text-gray-700 dark:text-gray-400';
    }
  };

  const getAudienceIcon = (audience: string) => {
    switch (audience) {
      case 'leads':
        return '🎯';
      case 'internal-team':
        return '👥';
      case 'technical-team':
        return '⚙️';
      case 'executive-team':
        return '💼';
      default:
        return '📊';
    }
  };

  // Group decks by year and month
  const groupedDecks = decks.reduce((groups: Record<string, {label: string, decks: any[]}>, deck) => {
    const date = new Date(deck.created_at);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    if (!groups[key]) {
      groups[key] = {
        label: monthYear,
        decks: []
      };
    }
    groups[key].decks.push(deck);
    return groups;
  }, {} as Record<string, {label: string, decks: any[]}>);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (decks.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto max-w-md">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No slide decks yet</h3>
          <p className="text-muted-foreground mb-6">
            Create your first AI-powered slide deck to get started with presentations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {Object.entries(groupedDecks).map(([key, group]: [string, {label: string, decks: any[]}]) => (
        <div key={key} className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground border-l-4 border-primary pl-3">
            {group.label}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {group.decks.map((deck) => (
              <Card 
                key={deck.id} 
                className="group cursor-pointer transition-all duration-300 hover:shadow-lg bg-card/80 backdrop-blur-sm border-border hover:border-primary/50"
                onClick={() => onDeckSelect(deck)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {deck.title}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={getStatusColor(deck.status)}>
                          {deck.status}
                        </Badge>
                        <span className="text-lg">{getAudienceIcon(deck.target_audience)}</span>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDeckSelect(deck); }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Deck
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => handleDeleteDeck(deck.id, e)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Deck
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {deck.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {deck.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(deck.created_at), { addSuffix: true })}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span className="capitalize">
                          {deck.target_audience?.replace('-', ' ')}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {deck.slide_count} slides
                      </div>
                    </div>
                  </div>
                  
                  {deck.topic && (
                    <Badge variant="outline" className="text-xs">
                      {deck.topic}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};