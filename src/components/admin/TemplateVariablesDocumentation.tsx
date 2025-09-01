import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Code, Info } from 'lucide-react';
import { useState } from 'react';

interface VariableInfo {
  name: string;
  description: string;
  example?: string;
  type: 'string' | 'object' | 'conditional';
}

interface TemplateVariablesDocumentationProps {
  templateType: 'concept' | 'caption' | 'image_prompts';
}

const CONCEPT_VARIABLES: VariableInfo[] = [
  { name: '{{title}}', description: 'Overarching title/theme provided by user', example: '"AI Tools for Local Businesses"', type: 'string' },
  { name: '{{platform}}', description: 'Target social media platform', example: '"instagram"', type: 'string' },
  { name: '{{style}}', description: 'Post style preference', example: '"Carousel"', type: 'string' },
  { name: '{{voice}}', description: 'Content voice/tone', example: '"Authoritative Expert"', type: 'string' },
  { name: '{{media_type}}', description: 'Media type classification', example: '"company_targeting"', type: 'string' },
  { name: '{{context_direction}}', description: 'Additional context provided by user', example: '"Focus on small retail businesses"', type: 'string' },
  { name: '{{source_content}}', description: 'Summary of selected blogs/ads/builds', example: 'Summary of 3 selected items', type: 'string' },
  { name: '{{#if context_direction}}...{{/if}}', description: 'Conditional block - shows content only if context_direction exists', type: 'conditional' },
  { name: '{{#if source_content}}...{{/if}}', description: 'Conditional block - shows content only if source_content exists', type: 'conditional' },
];

const CAPTION_VARIABLES: VariableInfo[] = [
  { name: '{{platform}}', description: 'Target social media platform', example: '"instagram"', type: 'string' },
  { name: '{{style}}', description: 'Post style preference', example: '"Carousel"', type: 'string' },
  { name: '{{voice}}', description: 'Content voice/tone', example: '"Authoritative Expert"', type: 'string' },
  { name: '{{concept.title}}', description: 'Title/hook from generated concept', example: '"Why Hi Supply Needs Smarter Tools"', type: 'string' },
  { name: '{{concept.targetAudience}}', description: 'Target audience from concept', example: '"Decision-makers at retail businesses"', type: 'string' },
  { name: '{{concept.angle}}', description: 'Content angle from concept', example: '"Focus on identifying inefficiencies"', type: 'string' },
  { name: '{{concept.keyMessages}}', description: 'Key messages from concept', example: '"Current tools are fragmented"', type: 'string' },
  { name: '{{concept.callToAction}}', description: 'Call to action from concept', example: '"Explore our research findings"', type: 'string' },
  { name: '{{context_direction}}', description: 'Additional context provided by user', example: '"Focus on small retail businesses"', type: 'string' },
  { name: '{{source_content}}', description: 'Summary of selected source items', example: 'Summary of 3 selected items', type: 'string' },
  { name: '{{#if context_direction}}...{{/if}}', description: 'Conditional block - shows content only if context_direction exists', type: 'conditional' },
  { name: '{{#if source_content}}...{{/if}}', description: 'Conditional block - shows content only if source_content exists', type: 'conditional' },
];

const IMAGE_PROMPT_VARIABLES: VariableInfo[] = [
  ...CAPTION_VARIABLES,
  { name: '{{captionData.caption}}', description: 'Generated caption text from caption step', example: '"🔥 Transform your workflow with AI insights..."', type: 'string' },
];

const RETURN_SCHEMAS = {
  concept: {
    description: 'Returns an array of 3 distinct post concepts',
    schema: `{
  "concepts": [
    {
      "id": "1",
      "title": "Why Hi Supply Needs Smarter Tools Now!",
      "hook": "🔥 Tool overload is killing productivity...",
      "angle": "Focus on identifying inefficiencies within Hi Supply",
      "targetAudience": "Decision-makers at retail businesses like Hi Supply",
      "keyMessages": "Current tools are too complex and fragmented.",
      "callToAction": "Explore our research findings to streamline your business!"
    }
  ]
}`
  },
  caption: {
    description: 'Returns caption text with hashtags array',
    schema: `{
  "caption": "🔥 Transform your workflow with AI insights that actually work for local businesses like Hi Supply...",
  "hashtags": [
    "#AIForBusiness",
    "#LocalBusiness", 
    "#ProductivityHacks",
    "#SmallBizTech"
  ]
}`
  },
  image_prompts: {
    description: 'Returns 9 image prompts with alt text for carousel',
    schema: `{
  "images": [
    {
      "prompt": "A visually striking cyberpunk-themed slide with bold neon motifs showcasing 'Tool Overload Slowing Growth?'",
      "alt_text": "Slide showing cluttered digital workspace representing tool overload"
    }
  ]
}`
  }
};

export default function TemplateVariablesDocumentation({ templateType }: TemplateVariablesDocumentationProps) {
  const [isVariablesOpen, setIsVariablesOpen] = useState(true);
  const [isSchemaOpen, setIsSchemaOpen] = useState(false);

  const getVariables = () => {
    switch (templateType) {
      case 'concept':
        return CONCEPT_VARIABLES;
      case 'caption':
        return CAPTION_VARIABLES;
      case 'image_prompts':
        return IMAGE_PROMPT_VARIABLES;
      default:
        return [];
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'string':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'object':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'conditional':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const variables = getVariables();
  const schema = RETURN_SCHEMAS[templateType];

  return (
    <div className="space-y-4">
      <Collapsible open={isVariablesOpen} onOpenChange={setIsVariablesOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            <span className="font-medium">Available Variables ({variables.length})</span>
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${isVariablesOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <div className="grid gap-2 max-h-64 overflow-y-auto">
            {variables.map((variable, index) => (
              <div key={index} className="flex items-start justify-between p-2 bg-background border rounded">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-sm font-mono bg-muted px-1 rounded">{variable.name}</code>
                    <Badge variant="outline" className={`text-xs ${getTypeColor(variable.type)}`}>
                      {variable.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{variable.description}</p>
                  {variable.example && (
                    <code className="text-xs text-muted-foreground bg-muted px-1 rounded mt-1 inline-block">
                      Example: {variable.example}
                    </code>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={isSchemaOpen} onOpenChange={setIsSchemaOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
          <div className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            <span className="font-medium">Expected JSON Response</span>
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${isSchemaOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">
                {schema.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                {schema.schema}
              </pre>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
        <strong>Usage Tips:</strong>
        <ul className="mt-1 space-y-1 ml-4 list-disc">
          <li>Use <code>{`{{variable}}`}</code> syntax for simple replacements</li>
          <li>Use <code>{`{{#if variable}}content{{/if}}`}</code> for conditional sections</li>
          <li>Concept variables are only available in caption and image prompt templates</li>
          <li>Source content is optional and only populated when items are selected</li>
        </ul>
      </div>
    </div>
  );
}