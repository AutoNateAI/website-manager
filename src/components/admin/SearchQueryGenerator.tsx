import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Search, Sparkles, MapPin, Hash, Users } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface SearchQuery {
  title: string;
  description: string;
  parameters: {
    keywords: string[];
    topics: string[];
    business_types: string[];
  };
  location_filters: Array<{
    type: string;
    value: string;
    radius?: string;
  }>;
  hashtag_filters: string[];
  engagement_thresholds: {
    min_comments: number;
    min_likes: number;
    real_commenter_ratio: number;
    min_monthly_posts: number;
    min_total_posts: number;
  };
}

interface SearchQueryGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQueryGenerated?: (query: SearchQuery) => void;
}

export const SearchQueryGenerator: React.FC<SearchQueryGeneratorProps> = ({
  open,
  onOpenChange,
  onQueryGenerated
}) => {
  const [prompt, setPrompt] = useState('');
  const [generatedQuery, setGeneratedQuery] = useState<SearchQuery | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const generateQuery = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a search query prompt",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-search-queries', {
        body: { prompt }
      });

      if (error) throw error;

      setGeneratedQuery(data.searchQuery);
      toast({
        title: "Success",
        description: "Search query generated successfully",
      });
    } catch (error) {
      console.error('Error generating search query:', error);
      toast({
        title: "Error", 
        description: "Failed to generate search query",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const saveQuery = async () => {
    if (!generatedQuery) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('search_queries')
        .insert({
          title: generatedQuery.title,
          description: generatedQuery.description,
          parameters: generatedQuery.parameters,
          location_filters: generatedQuery.location_filters,
          hashtag_filters: generatedQuery.hashtag_filters,
          engagement_thresholds: generatedQuery.engagement_thresholds
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Search query saved successfully",
      });

      onQueryGenerated?.(generatedQuery);
      onOpenChange(false);
      setPrompt('');
      setGeneratedQuery(null);
    } catch (error) {
      console.error('Error saving search query:', error);
      toast({
        title: "Error",
        description: "Failed to save search query",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetGenerator = () => {
    setPrompt('');
    setGeneratedQuery(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Search Query Generator
          </DialogTitle>
          <DialogDescription>
            Describe what you want to find on Instagram, and AI will create sophisticated search parameters
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Input Section */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Describe Your Search Intent
              </label>
              <Textarea
                placeholder="Example: I want to find active business owners in Miami who post about marketing strategies, get high engagement, and seem authentic..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[120px]"
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={generateQuery}
                disabled={isGenerating || !prompt.trim()}
                className="flex-1"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Generate Query
                  </>
                )}
              </Button>
              
              {generatedQuery && (
                <Button variant="outline" onClick={resetGenerator}>
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Generated Query Display */}
          {generatedQuery && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{generatedQuery.title}</span>
                  <Button onClick={saveQuery} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Query
                      </>
                    )}
                  </Button>
                </CardTitle>
                <CardDescription>
                  {generatedQuery.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Keywords & Topics */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-1">
                      <Search className="h-4 w-4" />
                      Keywords
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {generatedQuery.parameters.keywords?.map((keyword, index) => (
                        <Badge key={index} variant="secondary">{keyword}</Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      Business Types
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {generatedQuery.parameters.business_types?.map((type, index) => (
                        <Badge key={index} variant="outline">{type}</Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Location Filters */}
                {generatedQuery.location_filters?.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      Location Filters
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {generatedQuery.location_filters.map((location, index) => (
                        <Badge key={index} variant="default">
                          {location.value} {location.radius && `(${location.radius})`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hashtags */}
                {generatedQuery.hashtag_filters?.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-1">
                      <Hash className="h-4 w-4" />
                      Hashtag Filters
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {generatedQuery.hashtag_filters.map((hashtag, index) => (
                        <Badge key={index} variant="secondary">{hashtag}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Engagement Thresholds */}
                <div>
                  <h4 className="font-medium mb-2">Engagement Thresholds</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    <div className="bg-muted p-2 rounded">
                      <div className="font-medium">Min Comments</div>
                      <div className="text-muted-foreground">{generatedQuery.engagement_thresholds.min_comments}</div>
                    </div>
                    <div className="bg-muted p-2 rounded">
                      <div className="font-medium">Min Likes</div>
                      <div className="text-muted-foreground">{generatedQuery.engagement_thresholds.min_likes}</div>
                    </div>
                    <div className="bg-muted p-2 rounded">
                      <div className="font-medium">Real Commenter %</div>
                      <div className="text-muted-foreground">{Math.round(generatedQuery.engagement_thresholds.real_commenter_ratio * 100)}%</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};