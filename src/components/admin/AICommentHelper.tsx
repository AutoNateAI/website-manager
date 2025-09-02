import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Bot, Sparkles, Save, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AICommentHelperProps {
  postId: string;
  commentThread: string;
  onSuggestionAccept: (suggestion: string) => void;
}

export function AICommentHelper({ postId, commentThread, onSuggestionAccept }: AICommentHelperProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [responseType, setResponseType] = useState('helpful');
  const [customInstructions, setCustomInstructions] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [promptTitle, setPromptTitle] = useState('');
  const { toast } = useToast();

  const generateSuggestion = async () => {
    setLoading(true);
    try {
      const prompt = buildPrompt();
      
      const { data, error } = await supabase.functions.invoke('generate-comment-response', {
        body: {
          prompt,
          commentThread,
          responseType,
          customInstructions
        }
      });

      if (error) throw error;

      setSuggestion(data.suggestion);
      
      // Save prompt to library if title provided
      if (promptTitle.trim()) {
        await savePromptToLibrary(prompt);
      }
    } catch (error) {
      console.error('Error generating suggestion:', error);
      toast({
        title: "Error",
        description: "Failed to generate comment suggestion",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const buildPrompt = () => {
    const basePrompts = {
      helpful: "Generate a helpful and supportive response that adds value to the conversation.",
      professional: "Generate a professional and business-oriented response.",
      friendly: "Generate a friendly and conversational response that builds rapport.",
      promotional: "Generate a subtle promotional response that showcases expertise without being pushy.",
      educational: "Generate an educational response that teaches or informs the audience.",
      engagement: "Generate a response designed to increase engagement and encourage further discussion."
    };

    const basePrompt = basePrompts[responseType as keyof typeof basePrompts];
    const instructions = customInstructions ? `\n\nAdditional instructions: ${customInstructions}` : '';
    
    return `${basePrompt}${instructions}\n\nComment thread context:\n${commentThread}\n\nGenerate a response that feels natural and authentic.`;
  };

  const savePromptToLibrary = async (prompt: string) => {
    try {
      // Prompt library functionality will be added later when the table structure is confirmed
      toast({
        title: "Info",
        description: "Prompt library feature will be available soon",
      });
    } catch (error) {
      console.error('Error saving prompt:', error);
      toast({
        title: "Error",
        description: "Failed to save prompt to library",
        variant: "destructive",
      });
    }
  };

  const acceptSuggestion = () => {
    onSuggestionAccept(suggestion);
    setIsOpen(false);
    setSuggestion('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Bot className="h-4 w-4 mr-2" />
          AI Helper
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Comment Helper
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="response-type">Response Type</Label>
            <Select value={responseType} onValueChange={setResponseType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="helpful">Helpful & Supportive</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="friendly">Friendly & Conversational</SelectItem>
                <SelectItem value="promotional">Subtle Promotional</SelectItem>
                <SelectItem value="educational">Educational</SelectItem>
                <SelectItem value="engagement">Engagement Focused</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom-instructions">Custom Instructions (Optional)</Label>
            <Textarea
              id="custom-instructions"
              placeholder="Add specific instructions for the AI response..."
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt-title">Save to Prompt Library (Optional)</Label>
            <Input
              id="prompt-title"
              placeholder="Enter title to save this prompt configuration..."
              value={promptTitle}
              onChange={(e) => setPromptTitle(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={generateSuggestion} disabled={loading}>
              <Sparkles className="h-4 w-4 mr-2" />
              {loading ? 'Generating...' : 'Generate Suggestion'}
            </Button>
            {promptTitle && (
              <Button variant="outline" onClick={() => savePromptToLibrary(buildPrompt())}>
                <Save className="h-4 w-4 mr-2" />
                Save Prompt
              </Button>
            )}
          </div>

          {suggestion && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">AI Suggestion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
                    {suggestion}
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={acceptSuggestion}>
                      <Send className="h-4 w-4 mr-2" />
                      Use This Response
                    </Button>
                    <Button variant="outline" onClick={generateSuggestion} disabled={loading}>
                      Generate Another
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}