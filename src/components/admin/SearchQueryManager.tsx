import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Plus, Search, Target, Trash2, Edit, Sparkles } from 'lucide-react';

interface SearchQuery {
  id: string;
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
  created_at: string;
  updated_at: string;
}

export const SearchQueryManager: React.FC = () => {
  const [searchQueries, setSearchQueries] = useState<SearchQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [selectedQuery, setSelectedQuery] = useState<SearchQuery | null>(null);
  const [generatingQuery, setGeneratingQuery] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchSearchQueries = async () => {
    try {
      const { data, error } = await supabase
        .from('search_queries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Cast the Json types to proper interfaces
      const typedData = (data || []).map(item => ({
        ...item,
        parameters: item.parameters as SearchQuery['parameters'],
        location_filters: item.location_filters as SearchQuery['location_filters'],
        hashtag_filters: item.hashtag_filters as SearchQuery['hashtag_filters'],
        engagement_thresholds: item.engagement_thresholds as SearchQuery['engagement_thresholds']
      }));
      
      setSearchQueries(typedData);
    } catch (error) {
      console.error('Error fetching search queries:', error);
      toast({ title: 'Error fetching search queries', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSearchQueries();
  }, []);

  const generateSearchQuery = async () => {
    if (!promptText.trim()) {
      toast({ title: 'Please enter a prompt', variant: 'destructive' });
      return;
    }

    setGeneratingQuery(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-search-queries', {
        body: { prompt: promptText }
      });

      if (error) throw error;
      
      toast({ title: 'Search query generated successfully!' });
      setShowGenerateDialog(false);
      setPromptText('');
      fetchSearchQueries(); // Refresh the list
    } catch (error) {
      console.error('Error generating search query:', error);
      toast({ 
        title: 'Error generating search query', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setGeneratingQuery(false);
    }
  };

  const deleteSearchQuery = async (id: string) => {
    try {
      const { error } = await supabase
        .from('search_queries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: 'Search query deleted successfully' });
      fetchSearchQueries(); // Refresh the list
    } catch (error) {
      console.error('Error deleting search query:', error);
      toast({ title: 'Error deleting search query', variant: 'destructive' });
    }
  };

  const filteredQueries = searchQueries.filter(query =>
    query.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    query.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold gradient-text">Search Query Intelligence</h2>
            <p className="text-muted-foreground mt-1">
              AI-powered search strategies for targeted Instagram discovery
            </p>
          </div>
          <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
            <DialogTrigger asChild>
              <Button className="glass-button">
                <Sparkles size={16} className="mr-2" />
                Generate Search Query
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-modal max-w-2xl">
              <DialogHeader>
                <DialogTitle>Generate AI Search Query</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="prompt">Describe your target audience and search intent</Label>
                  <Textarea
                    id="prompt"
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder="E.g., Find high-engagement food truck businesses in Oahu that actively market via Instagram..."
                    rows={4}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowGenerateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={generateSearchQuery}
                    disabled={generatingQuery}
                  >
                    {generatingQuery ? 'Generating...' : 'Generate'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="glass-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            placeholder="Search queries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Query Cards */}
      <div className="grid gap-4">
        {filteredQueries.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Target className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Search Queries Found</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first AI-powered search query to start discovering targeted Instagram content.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredQueries.map((query) => (
            <Card key={query.id} className="glass-card hover:bg-muted/5 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{query.title}</CardTitle>
                    <CardDescription className="mt-2">{query.description}</CardDescription>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedQuery(query)}
                    >
                      <Edit size={14} className="mr-1" />
                      View
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10">
                          <Trash2 size={14} />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Search Query</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete "{query.title}". This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90"
                            onClick={() => deleteSearchQuery(query.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Keywords */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Keywords</h4>
                    <div className="flex flex-wrap gap-1">
                      {query.parameters.keywords.map((keyword, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Hashtags */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Hashtags</h4>
                    <div className="flex flex-wrap gap-1">
                      {query.hashtag_filters.slice(0, 5).map((hashtag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {hashtag}
                        </Badge>
                      ))}
                      {query.hashtag_filters.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{query.hashtag_filters.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Engagement Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="bg-muted/30 p-2 rounded">
                      <div className="text-muted-foreground">Min Likes</div>
                      <div className="font-medium">{query.engagement_thresholds.min_likes}</div>
                    </div>
                    <div className="bg-muted/30 p-2 rounded">
                      <div className="text-muted-foreground">Min Comments</div>
                      <div className="font-medium">{query.engagement_thresholds.min_comments}</div>
                    </div>
                    <div className="bg-muted/30 p-2 rounded">
                      <div className="text-muted-foreground">Real Ratio</div>
                      <div className="font-medium">{Math.round(query.engagement_thresholds.real_commenter_ratio * 100)}%</div>
                    </div>
                    <div className="bg-muted/30 p-2 rounded">
                      <div className="text-muted-foreground">Min Posts</div>
                      <div className="font-medium">{query.engagement_thresholds.min_total_posts}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={selectedQuery !== null} onOpenChange={(open) => !open && setSelectedQuery(null)}>
        <DialogContent className="glass-modal max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedQuery?.title}</DialogTitle>
          </DialogHeader>
          {selectedQuery && (
            <Tabs defaultValue="overview" className="mt-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="parameters">Parameters</TabsTrigger>
                <TabsTrigger value="targeting">Targeting</TabsTrigger>
                <TabsTrigger value="thresholds">Thresholds</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground">{selectedQuery.description}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Business Types</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedQuery.parameters.business_types.map((type, index) => (
                      <Badge key={index}>{type}</Badge>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="parameters" className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Keywords</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedQuery.parameters.keywords.map((keyword, index) => (
                      <Badge key={index} variant="secondary">{keyword}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Topics</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedQuery.parameters.topics.map((topic, index) => (
                      <Badge key={index} variant="outline">{topic}</Badge>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="targeting" className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Location Filters</h3>
                  <div className="space-y-2">
                    {selectedQuery.location_filters.map((filter, index) => (
                      <div key={index} className="flex gap-2 text-sm">
                        <Badge variant="outline">{filter.type}</Badge>
                        <span>{filter.value}</span>
                        {filter.radius && <span className="text-muted-foreground">({filter.radius})</span>}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Hashtag Filters</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedQuery.hashtag_filters.map((hashtag, index) => (
                      <Badge key={index} variant="outline">{hashtag}</Badge>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="thresholds" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Minimum Likes</span>
                      <span className="font-medium">{selectedQuery.engagement_thresholds.min_likes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Minimum Comments</span>
                      <span className="font-medium">{selectedQuery.engagement_thresholds.min_comments}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Real Commenter Ratio</span>
                      <span className="font-medium">{Math.round(selectedQuery.engagement_thresholds.real_commenter_ratio * 100)}%</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Minimum Monthly Posts</span>
                      <span className="font-medium">{selectedQuery.engagement_thresholds.min_monthly_posts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Minimum Total Posts</span>
                      <span className="font-medium">{selectedQuery.engagement_thresholds.min_total_posts}</span>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};