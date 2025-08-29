import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Check, X, RotateCcw, Trophy, Brain } from 'lucide-react';
import { toast } from 'sonner';

interface AssessmentViewerProps {
  deckId: string;
}

export const AssessmentViewer = ({ deckId }: AssessmentViewerProps) => {
  const [assessments, setAssessments] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  useEffect(() => {
    fetchAssessments();
  }, [deckId]);

  const fetchAssessments = async () => {
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('deck_id', deckId)
        .order('question_type', { ascending: true });

      if (error) throw error;
      setAssessments(data || []);
    } catch (error) {
      console.error('Error fetching assessments:', error);
      toast.error('Failed to fetch assessments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async (assessment) => {
    const answer = answers[assessment.id];
    if (!answer) {
      toast.error('Please provide an answer');
      return;
    }

    let isCorrect = false;
    
    if (assessment.question_type === 'multiple-choice') {
      isCorrect = answer === assessment.correct_answer;
    } else {
      // For short answer, we'll mark it as correct for demo purposes
      // In a real implementation, you might use AI to evaluate the answer
      isCorrect = answer.length > 10; // Simple heuristic
    }

    // Save response to database
    try {
      await supabase
        .from('assessment_responses')
        .insert({
          assessment_id: assessment.id,
          deck_id: deckId,
          user_response: answer,
          is_correct: isCorrect,
          response_time_seconds: Math.floor(Math.random() * 30) + 10 // Random time for demo
        });
    } catch (error) {
      console.error('Error saving response:', error);
    }

    setShowResults(prev => ({ ...prev, [assessment.id]: true }));
    
    if (isCorrect) {
      setScore(prev => ({ ...prev, correct: prev.correct + 1, total: prev.total + 1 }));
    } else {
      setScore(prev => ({ ...prev, total: prev.total + 1 }));
    }
  };

  const resetAssessment = () => {
    setAnswers({});
    setShowResults({});
    setCurrentIndex(0);
    setScore({ correct: 0, total: 0 });
  };

  const handleAnswerChange = (assessmentId, value) => {
    setAnswers(prev => ({ ...prev, [assessmentId]: value }));
  };

  const getDifficultyColor = (level) => {
    switch (level) {
      case 1:
        return 'bg-green-500/20 text-green-700 dark:text-green-400';
      case 2:
        return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400';
      case 3:
        return 'bg-red-500/20 text-red-700 dark:text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-700 dark:text-gray-400';
    }
  };

  const getDifficultyLabel = (level) => {
    switch (level) {
      case 1: return 'Easy';
      case 2: return 'Medium';
      case 3: return 'Hard';
      default: return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (assessments.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📝</div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No assessments generated yet</h3>
        <p className="text-muted-foreground">
          Assessment questions will appear here once the slide deck is fully generated.
        </p>
      </div>
    );
  }

  const multipleChoice = assessments.filter(a => a.question_type === 'multiple-choice');
  const shortAnswer = assessments.filter(a => a.question_type === 'short-answer');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Brain className="h-6 w-6" />
            Knowledge Assessment
          </h2>
          {score.total > 0 && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Trophy className="h-3 w-3" />
              {score.correct}/{score.total} correct
            </Badge>
          )}
        </div>
        
        <Button variant="outline" onClick={resetAssessment}>
          <RotateCcw className="h-4 w-4 mr-1" />
          Reset
        </Button>
      </div>

      {/* Multiple Choice Section */}
      {multipleChoice.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-foreground">Multiple Choice Questions</h3>
          
          {multipleChoice.map((assessment, index) => (
            <Card key={assessment.id} className="bg-card/80 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="text-lg">Question {index + 1}</span>
                  <Badge className={getDifficultyColor(assessment.difficulty_level)}>
                    {getDifficultyLabel(assessment.difficulty_level)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-foreground font-medium">{assessment.question_text}</p>
                
                <RadioGroup 
                  value={answers[assessment.id] || ''} 
                  onValueChange={(value) => handleAnswerChange(assessment.id, value)}
                  disabled={showResults[assessment.id]}
                >
                  {assessment.options && Object.entries(assessment.options as Record<string, string>).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <RadioGroupItem value={key} id={`${assessment.id}-${key}`} />
                      <Label 
                        htmlFor={`${assessment.id}-${key}`}
                        className={`flex-1 ${showResults[assessment.id] ? 
                          (key === assessment.correct_answer ? 'text-green-600 font-medium' : 
                           key === answers[assessment.id] && key !== assessment.correct_answer ? 'text-red-600' : '') 
                          : ''}`}
                      >
                        {key}. {value}
                        {showResults[assessment.id] && key === assessment.correct_answer && (
                          <Check className="h-4 w-4 text-green-600 inline ml-2" />
                        )}
                        {showResults[assessment.id] && key === answers[assessment.id] && key !== assessment.correct_answer && (
                          <X className="h-4 w-4 text-red-600 inline ml-2" />
                        )}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                {showResults[assessment.id] ? (
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong>Explanation:</strong> {assessment.explanation}
                    </p>
                  </div>
                ) : (
                  <Button 
                    onClick={() => handleSubmitAnswer(assessment)}
                    disabled={!answers[assessment.id]}
                  >
                    Submit Answer
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Short Answer Section */}
      {shortAnswer.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-foreground">Short Answer Questions</h3>
          
          {shortAnswer.map((assessment, index) => (
            <Card key={assessment.id} className="bg-card/80 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="text-lg">Question {multipleChoice.length + index + 1}</span>
                  <Badge className={getDifficultyColor(assessment.difficulty_level)}>
                    {getDifficultyLabel(assessment.difficulty_level)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-foreground font-medium">{assessment.question_text}</p>
                
                <Textarea
                  placeholder="Type your answer here..."
                  value={answers[assessment.id] || ''}
                  onChange={(e) => handleAnswerChange(assessment.id, e.target.value)}
                  disabled={showResults[assessment.id]}
                  className="min-h-24"
                />

                {showResults[assessment.id] ? (
                  <div className="space-y-3">
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-sm text-green-800 dark:text-green-200">
                        <strong>Sample Answer:</strong> {assessment.correct_answer}
                      </p>
                    </div>
                    
                    {assessment.explanation && (
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          <strong>Key Points:</strong> {assessment.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <Button 
                    onClick={() => handleSubmitAnswer(assessment)}
                    disabled={!answers[assessment.id] || answers[assessment.id].length < 5}
                  >
                    Submit Answer
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Final Score */}
      {score.total === assessments.length && score.total > 0 && (
        <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
          <CardContent className="text-center py-8">
            <Trophy className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-foreground mb-2">Assessment Complete!</h3>
            <p className="text-lg text-muted-foreground">
              You scored <strong>{score.correct}</strong> out of <strong>{score.total}</strong> ({Math.round((score.correct / score.total) * 100)}%)
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};