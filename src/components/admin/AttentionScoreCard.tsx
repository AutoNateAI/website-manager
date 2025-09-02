import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Shield, 
  Target, 
  Network, 
  Calculator, 
  Clock,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface AttentionScores {
  attention_score: number;
  authenticity_score: number;
  market_fit_score: number;
  network_value_score: number;
  overall_attention_score: number;
}

interface ScoringMetadata {
  algorithm_used: string;
  component_scores: {
    attention_magnetism: {
      score: number;
      components: {
        commentScore: number;
        ratioScore: number;
        recencyScore: number;
        contentScore: number;
      };
    };
    authenticity: {
      score: number;
      factors: string[];
    };
    market_fit: {
      score: number;
      components: {
        locationScore: number;
        hashtagScore: number;
        businessScore: number;
      };
    };
    network_value: {
      score: number;
      components: {
        commenterQualityScore: number;
        crossPlatformScore: number;
        influenceScore: number;
      };
    };
  };
  calculation_date: string;
}

interface AttentionScoreCardProps {
  scores: AttentionScores;
  metadata?: ScoringMetadata;
  onRecalculate?: () => void;
  isCalculating?: boolean;
  compact?: boolean;
}

export const AttentionScoreCard: React.FC<AttentionScoreCardProps> = ({
  scores,
  metadata,
  onRecalculate,
  isCalculating = false,
  compact = false
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (compact) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-2xl font-bold">
                {scores.overall_attention_score.toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground">
                Attention Score
              </div>
            </div>
            <div className="text-right space-y-1">
              <Badge className={getScoreColor(scores.overall_attention_score)}>
                {getScoreLabel(scores.overall_attention_score)}
              </Badge>
              {metadata && (
                <div className="text-xs text-muted-foreground">
                  <Clock className="inline mr-1 h-3 w-3" />
                  {formatDate(metadata.calculation_date)}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Attention Intelligence
          </CardTitle>
          <div className="flex items-center gap-2">
            {metadata && (
              <Badge variant="outline" className="text-xs">
                <Clock className="mr-1 h-3 w-3" />
                {formatDate(metadata.calculation_date)}
              </Badge>
            )}
            {onRecalculate && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRecalculate}
                disabled={isCalculating}
              >
                <Calculator className="mr-1 h-3 w-3" />
                {isCalculating ? 'Calculating...' : 'Recalculate'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="text-center p-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg">
          <div className="text-4xl font-bold mb-2">
            {scores.overall_attention_score.toFixed(1)}
          </div>
          <Badge className={`${getScoreColor(scores.overall_attention_score)} text-lg px-3 py-1`}>
            {getScoreLabel(scores.overall_attention_score)}
          </Badge>
          <div className="text-sm text-muted-foreground mt-2">
            Overall Attention Score
          </div>
        </div>

        {/* Component Scores */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Attention</span>
              </div>
              <span className="text-sm font-bold">
                {scores.attention_score.toFixed(1)}
              </span>
            </div>
            <Progress value={scores.attention_score} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Shield className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Authenticity</span>
              </div>
              <span className="text-sm font-bold">
                {scores.authenticity_score.toFixed(1)}
              </span>
            </div>
            <Progress value={scores.authenticity_score} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Target className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Market Fit</span>
              </div>
              <span className="text-sm font-bold">
                {scores.market_fit_score.toFixed(1)}
              </span>
            </div>
            <Progress value={scores.market_fit_score} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Network className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Network Value</span>
              </div>
              <span className="text-sm font-bold">
                {scores.network_value_score.toFixed(1)}
              </span>
            </div>
            <Progress value={scores.network_value_score} className="h-2" />
          </div>
        </div>

        {/* Detailed Breakdown */}
        {metadata && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <span>Detailed Breakdown</span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="space-y-4 pt-4">
              {/* Attention Magnetism Breakdown */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  Attention Magnetism Components
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>Comments</span>
                    <span>{metadata.component_scores.attention_magnetism.components.commentScore.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>Like Ratio</span>
                    <span>{metadata.component_scores.attention_magnetism.components.ratioScore.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>Recency</span>
                    <span>{metadata.component_scores.attention_magnetism.components.recencyScore.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>Content</span>
                    <span>{metadata.component_scores.attention_magnetism.components.contentScore.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              {/* Market Fit Breakdown */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-1">
                  <Target className="h-4 w-4 text-orange-500" />
                  Market Fit Components
                </h4>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>Location</span>
                    <span>{metadata.component_scores.market_fit.components.locationScore.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>Hashtags</span>
                    <span>{metadata.component_scores.market_fit.components.hashtagScore.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>Business</span>
                    <span>{metadata.component_scores.market_fit.components.businessScore.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              {/* Network Value Breakdown */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-1">
                  <Network className="h-4 w-4 text-purple-500" />
                  Network Value Components
                </h4>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>Commenters</span>
                    <span>{metadata.component_scores.network_value.components.commenterQualityScore.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>Cross-Platform</span>
                    <span>{metadata.component_scores.network_value.components.crossPlatformScore.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>Influence</span>
                    <span>{metadata.component_scores.network_value.components.influenceScore.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              {/* Authenticity Factors */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-1">
                  <Shield className="h-4 w-4 text-green-500" />
                  Authenticity Factors
                </h4>
                <div className="flex flex-wrap gap-1">
                  {metadata.component_scores.authenticity.factors.map((factor, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {factor.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
};