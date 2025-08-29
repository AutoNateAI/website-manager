import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ConversationInterfaceProps {
  onGenerateOutline: (conversationId: string, messages: Message[]) => void;
}

const ConversationInterface: React.FC<ConversationInterfaceProps> = ({ onGenerateOutline }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const turnCount = Math.floor(messages.length / 2);
  const canGenerateOutline = turnCount >= 2;

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('conversation-chat', {
        body: {
          message: userMessage,
          conversationId,
          messages
        }
      });

      if (error) throw error;

      setMessages(data.messages);
      if (!conversationId) {
        setConversationId(data.conversation.id);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleGenerateOutline = () => {
    if (conversationId && canGenerateOutline) {
      onGenerateOutline(conversationId, messages);
    }
  };

  return (
    <div className="flex flex-col h-[600px] border border-border rounded-lg">
      {/* Header */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">AutoNateAI Presentation Assistant</h3>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Let's discuss your presentation needs to create the perfect slide deck
        </p>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-lg font-medium mb-2">Welcome to AutoNateAI!</p>
            <p>I'm here to help you create an engaging presentation. Tell me about your upcoming speaking opportunity, your audience, and what you'd like to accomplish.</p>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <Card className={`max-w-[80%] p-3 ${
                message.role === 'user' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted/50'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </Card>
            </div>
          ))}
        </div>

        {isLoading && (
          <div className="flex justify-start">
            <Card className="bg-muted/50 p-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            </Card>
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe your presentation needs..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={sendMessage} 
            disabled={!inputValue.trim() || isLoading}
            size="sm"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Generate Outline Button */}
        {canGenerateOutline && (
          <div className="mt-3 pt-3 border-t border-border">
            <Button 
              onClick={handleGenerateOutline}
              className="w-full"
              variant="default"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Slide Outline
            </Button>
          </div>
        )}

        {/* Turn counter */}
        <div className="mt-2 text-xs text-muted-foreground text-center">
          {turnCount < 2 ? (
            `${2 - turnCount} more conversation turn${2 - turnCount !== 1 ? 's' : ''} needed to generate outline`
          ) : (
            'Ready to generate your slide outline!'
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationInterface;