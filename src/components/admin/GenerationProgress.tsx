import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Sparkles, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GenerationSession {
  id: string;
  batch_id: string;
  total_images: number;
  completed_images: number;
  status: string;
  created_at: string;
  updated_at: string;
}

const GenerationProgress = () => {
  const [sessions, setSessions] = useState<GenerationSession[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Fetch active sessions
    fetchActiveSessions();

    // Set up real-time subscription for session updates
    const sessionChannel = supabase
      .channel('generation-sessions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'generation_sessions'
        },
        (payload) => {
          console.log('Session update:', payload);
          if (payload.eventType === 'INSERT') {
            setSessions(prev => [...prev, payload.new as GenerationSession]);
          } else if (payload.eventType === 'UPDATE') {
            setSessions(prev => 
              prev.map(session => 
                session.id === payload.new.id 
                  ? { ...session, ...payload.new } 
                  : session
              )
            );
            
            // Check if session completed
            const updatedSession = payload.new as GenerationSession;
            if (updatedSession.status === 'completed') {
              toast({
                title: "Bulk Generation Complete!",
                description: `Generated ${updatedSession.total_images} images successfully`,
              });
              
              // Remove completed session after a delay
              setTimeout(() => {
                setSessions(prev => prev.filter(s => s.id !== updatedSession.id));
              }, 5000);
            }
          } else if (payload.eventType === 'DELETE') {
            setSessions(prev => prev.filter(session => session.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionChannel);
    };
  }, [toast]);

  const fetchActiveSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('generation_sessions')
        .select('*')
        .in('status', ['active', 'completed'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter out completed sessions older than 5 minutes
      const recentSessions = data?.filter(session => {
        if (session.status === 'completed') {
          const completedTime = new Date(session.updated_at).getTime();
          const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
          return completedTime > fiveMinutesAgo;
        }
        return true;
      }) || [];

      setSessions(recentSessions);
    } catch (error: any) {
      console.error('Failed to fetch active sessions:', error);
    }
  };

  const dismissSession = async (sessionId: string) => {
    try {
      await supabase
        .from('generation_sessions')
        .delete()
        .eq('id', sessionId);
    } catch (error: any) {
      console.error('Failed to dismiss session:', error);
    }
  };

  if (sessions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6">
      {sessions.map((session) => {
        const progress = (session.completed_images / session.total_images) * 100;
        const isCompleted = session.status === 'completed';
        
        return (
          <Card key={session.id} className="glass-card border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {isCompleted ? (
                    <Sparkles className="h-4 w-4 text-green-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-primary animate-pulse" />
                  )}
                  <span className="text-sm font-medium">
                    {isCompleted ? 'Generation Complete' : 'Generating Images'}
                  </span>
                  <Badge variant={isCompleted ? "default" : "secondary"} className="text-xs">
                    {session.completed_images}/{session.total_images}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => dismissSession(session.id)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Batch: {session.batch_id.slice(0, 8)}...</span>
                  <span>{Math.round(progress)}% complete</span>
                </div>
                <Progress value={progress} className="h-2" />
                {!isCompleted && (
                  <p className="text-xs text-muted-foreground">
                    Images will appear in your library as they complete
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default GenerationProgress;