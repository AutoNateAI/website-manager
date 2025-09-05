import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Clock, 
  Globe, 
  Users, 
  ChevronLeft, 
  ChevronRight,
  Zap,
  Target,
  Plus,
  Trash2,
  AlertCircle,
  X
} from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format, addHours } from 'date-fns';

interface InstagramTarget {
  id: string;
  username: string;
  display_name: string;
  location?: string;
  follower_count?: number;
  bio?: string;
  timezone?: string;
}

interface CampaignTarget {
  id: string;
  instagram_user_id: string;
  wave_assignment: number;
  target_timezone: string;
  wave_status: string;
  instagram_users: InstagramTarget;
}

interface BlitzCampaign {
  id: string;
  campaign_date: string;
  status: string;
  campaign_targets: CampaignTarget[];
}

interface TimeWave {
  id: number;
  name: string;
  timeRange: string;
  description: string;
  hstRange: string;
  etRange: string;
  ptRange: string;
  color: string;
  targets: CampaignTarget[];
}

// Draggable Target Component
function DraggableTarget({ target, onRemove }: { target: CampaignTarget; onRemove?: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: target.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group relative bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-md hover:border-primary/50 ${
        isDragging ? 'opacity-50 shadow-lg scale-105 z-50' : 'hover:scale-[1.02]'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center">
            <span className="text-xs font-semibold text-primary">
              {target.instagram_users.username.charAt(1).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">@{target.instagram_users.username}</div>
            <div className="text-xs text-muted-foreground truncate">
              {target.target_timezone} • {target.instagram_users.follower_count || 0} followers
            </div>
          </div>
        </div>
        {onRemove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(target.id);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Droppable Wave Component
function DroppableWave({ wave, onRemove }: { wave: TimeWave; onRemove: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `wave-${wave.id}`,
  });

  return (
    <Card 
      className={`border-2 border-dashed transition-colors ${
        isOver 
          ? 'border-primary bg-primary/5' 
          : 'border-muted hover:border-primary/50'
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: wave.color }}
            />
            <h3 className="font-semibold">{wave.name}</h3>
          </div>
          <Badge 
            variant={wave.targets.length >= 4 ? "default" : "outline"} 
            className="text-xs"
          >
            {wave.targets.length}/4
          </Badge>
        </div>
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="font-medium">{wave.timeRange}</div>
          <div>HST: {wave.hstRange}</div>
          <div>PT: {wave.ptRange}</div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div
          ref={setNodeRef}
          className={`min-h-[128px] p-2 border-2 border-dashed rounded-md transition-colors ${
            isOver
              ? 'border-primary bg-primary/10'
              : 'border-muted-foreground/20'
          }`}
        >
          <SortableContext 
            items={wave.targets.map(t => t.id)} 
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {wave.targets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-24 text-muted-foreground">
                  <Target className="h-6 w-6 mb-1" />
                  <p className="text-xs text-center">
                    {isOver ? 'Drop target here!' : 'Drop targets here'}
                  </p>
                </div>
              ) : (
                wave.targets.map((target) => (
                  <DraggableTarget 
                    key={target.id} 
                    target={target}
                    onRemove={onRemove}
                  />
                ))
              )}
              {wave.targets.length >= 4 && (
                <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-md">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="text-xs text-amber-700 dark:text-amber-400">
                    Wave at capacity
                  </span>
                </div>
              )}
            </div>
          </SortableContext>
        </div>
      </CardContent>
    </Card>
  );
}
function AvailableTarget({ target }: { target: InstagramTarget }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: target.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`p-2 border rounded-md hover:bg-muted cursor-move text-sm ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="font-medium">@{target.username}</div>
      <div className="text-xs text-muted-foreground">
        {target.display_name || target.username}
      </div>
    </div>
  );
}

const WAVE_CONFIGS = [
  {
    id: 1,
    name: 'Wave 1',
    timeRange: '6-9 AM ET',
    hstRange: '12-3 AM HST',
    etRange: '6-9 AM ET',
    ptRange: '3-6 AM PT',
    description: 'East Coast Morning Prime',
    color: 'hsl(var(--primary))',
  },
  {
    id: 2,
    name: 'Wave 2', 
    timeRange: '9 AM-12 PM ET',
    hstRange: '3-6 AM HST',
    etRange: '9 AM-12 PM ET',
    ptRange: '6-9 AM PT',
    description: 'Cross-Timezone Business Hours',
    color: 'hsl(var(--secondary))',
  },
  {
    id: 3,
    name: 'Wave 3',
    timeRange: '12-6 PM ET',
    hstRange: '6 AM-12 PM HST',
    etRange: '12-6 PM ET',
    ptRange: '9 AM-3 PM PT',
    description: 'Afternoon Peak Engagement',
    color: 'hsl(var(--accent))',
  },
  {
    id: 4,
    name: 'Wave 4',
    timeRange: '6 PM+ ET',
    hstRange: '12 PM-12 AM HST',
    etRange: '6 PM-12 AM ET',
    ptRange: '3-9 PM PT',
    description: 'Hawaii Prime + Mainland Evening',
    color: 'hsl(var(--muted-foreground))',
  }
];

export function TimePlannerTab() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentCampaign, setCurrentCampaign] = useState<BlitzCampaign | null>(null);
  const [availableTargets, setAvailableTargets] = useState<InstagramTarget[]>([]);
  const [waves, setWaves] = useState<TimeWave[]>(
    WAVE_CONFIGS.map(config => ({ ...config, targets: [] }))
  );
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadCampaignData();
  }, [selectedDate]);

  const loadCampaignData = async () => {
    try {
      setLoading(true);
      
      // Load today's blitz campaign and targets
      const campaignDate = format(selectedDate, 'yyyy-MM-dd');
      
      const { data: campaigns, error: campaignError } = await supabase
        .from('blitz_campaigns')
        .select(`
          *,
          campaign_targets (
            *,
            instagram_users (*)
          )
        `)
        .eq('campaign_date', campaignDate)
        .order('created_at', { ascending: false });

      if (campaignError) throw campaignError;

      const campaign = campaigns?.[0] || null;
      setCurrentCampaign(campaign);

      // Organize targets into waves
      const newWaves = WAVE_CONFIGS.map(config => ({ 
        ...config, 
        targets: campaign?.campaign_targets.filter(t => t.wave_assignment === config.id) || []
      }));
      setWaves(newWaves);

      // Load available Instagram users that aren't in today's campaign
      const usedUserIds = campaign?.campaign_targets.map(t => t.instagram_user_id) || [];
      
      const { data: users, error: usersError } = await supabase
        .from('instagram_users')
        .select('*')
        .not('id', 'in', usedUserIds.length > 0 ? `(${usedUserIds.join(',')})` : '()')
        .limit(50);

      if (usersError) throw usersError;

      setAvailableTargets(users || []);

    } catch (error: any) {
      console.error('Error loading campaign data:', error);
      toast({
        title: 'Error loading data',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const detectTimezone = (target: InstagramTarget): string => {
    // Simple timezone detection based on location
    const location = target.location?.toLowerCase() || '';
    if (location.includes('hawaii') || location.includes('hi')) return 'HST';
    if (location.includes('pacific') || location.includes('ca') || location.includes('california') || 
        location.includes('wa') || location.includes('oregon') || location.includes('or')) return 'PT';
    if (location.includes('mountain') || location.includes('denver') || location.includes('utah') || 
        location.includes('arizona') || location.includes('colorado')) return 'MT';
    if (location.includes('central') || location.includes('texas') || location.includes('chicago') ||
        location.includes('il') || location.includes('tx')) return 'CT';
    if (location.includes('eastern') || location.includes('new york') || location.includes('ny') ||
        location.includes('florida') || location.includes('fl')) return 'ET';
    return 'ET'; // Default to Eastern
  };

  const assignTargetToWave = async (targetId: string, waveId: number) => {
    if (!currentCampaign) return;
    
    try {
      const target = availableTargets.find(t => t.id === targetId);
      if (!target) {
        console.log('Target not found:', targetId);
        return;
      }

      console.log('Assigning target to wave:', targetId, waveId, target.username);

      // Immediately update UI to prevent visual glitch
      setAvailableTargets(prev => prev.filter(t => t.id !== targetId));

      const timezone = detectTimezone(target);
      
      const { data, error } = await supabase
        .from('campaign_targets')
        .insert({
          blitz_campaign_id: currentCampaign.id,
          instagram_user_id: targetId,
          wave_assignment: waveId,
          target_timezone: timezone,
          wave_status: 'pending'
        })
        .select(`
          *,
          instagram_users (*)
        `)
        .single();

      if (error) {
        console.error('Database error:', error);
        // Revert UI change on error
        setAvailableTargets(prev => [...prev, target]);
        throw error;
      }

      console.log('Target assigned successfully:', data);

      // Update waves with the new target
      setWaves(prev => prev.map(wave => 
        wave.id === waveId 
          ? { ...wave, targets: [...wave.targets, data] }
          : wave
      ));

      toast({
        title: 'Target assigned',
        description: `@${target.username} assigned to ${WAVE_CONFIGS[waveId - 1].name}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error assigning target',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const moveTargetBetweenWaves = async (campaignTargetId: string, sourceWaveId: number, targetWaveId: number) => {
    try {
      console.log('Moving target between waves:', campaignTargetId, sourceWaveId, '→', targetWaveId);

      // Update the database
      const { error } = await supabase
        .from('campaign_targets')
        .update({ 
          wave_assignment: targetWaveId,
          wave_status: 'pending' 
        })
        .eq('id', campaignTargetId);

      if (error) throw error;

      // Update local state
      setWaves(prev => {
        let targetToMove: CampaignTarget | null = null;
        
        // Remove from source wave and find the target
        const updatedWaves = prev.map(wave => {
          if (wave.id === sourceWaveId) {
            const targetIndex = wave.targets.findIndex(t => t.id === campaignTargetId);
            if (targetIndex !== -1) {
              targetToMove = { ...wave.targets[targetIndex], wave_assignment: targetWaveId };
              return { 
                ...wave, 
                targets: wave.targets.filter(t => t.id !== campaignTargetId) 
              };
            }
          }
          return wave;
        });

        // Add to target wave
        if (targetToMove) {
          return updatedWaves.map(wave => 
            wave.id === targetWaveId 
              ? { ...wave, targets: [...wave.targets, targetToMove] }
              : wave
          );
        }

        return updatedWaves;
      });

      toast({
        title: 'Target moved',
        description: `Target moved from ${WAVE_CONFIGS[sourceWaveId - 1].name} to ${WAVE_CONFIGS[targetWaveId - 1].name}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error moving target',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const removeTargetFromWave = async (campaignTargetId: string) => {
    try {
      const { error } = await supabase
        .from('campaign_targets')
        .delete()
        .eq('id', campaignTargetId);

      if (error) throw error;

      // Find the target to move back to available
      let removedTarget: CampaignTarget | null = null;
      
      setWaves(prev => prev.map(wave => {
        const targetIndex = wave.targets.findIndex(t => t.id === campaignTargetId);
        if (targetIndex !== -1) {
          removedTarget = wave.targets[targetIndex];
          return { 
            ...wave, 
            targets: wave.targets.filter(t => t.id !== campaignTargetId) 
          };
        }
        return wave;
      }));

      if (removedTarget) {
        setAvailableTargets(prev => [...prev, removedTarget.instagram_users]);
      }

      toast({
        title: 'Target removed',
        description: 'Target moved back to available pool',
      });
    } catch (error: any) {
      toast({
        title: 'Error removing target',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if dropping onto a wave
    const targetWaveId = parseInt(overId.replace('wave-', ''));
    if (overId.startsWith('wave-') && !isNaN(targetWaveId)) {
      // Check if it's from available targets
      const isFromAvailable = availableTargets.some(t => t.id === activeId);
      
      if (isFromAvailable) {
        assignTargetToWave(activeId, targetWaveId);
      } else {
        // Check if it's from another wave
        const sourceWave = waves.find(wave => wave.targets.some(t => t.id === activeId));
        if (sourceWave && sourceWave.id !== targetWaveId) {
          moveTargetBetweenWaves(activeId, sourceWave.id, targetWaveId);
        }
      }
    }

    setActiveId(null);
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(newDate);
  };

  const createNewCampaign = async () => {
    try {
      const campaignDate = format(selectedDate, 'yyyy-MM-dd');
      
      // First create a parent campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          name: `Daily Blitz - ${format(selectedDate, 'MMM dd, yyyy')}`,
          description: 'Automated daily blitz campaign',
          start_date: selectedDate.toISOString(),
          end_date: addHours(selectedDate, 24).toISOString(),
          status: 'active'
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Create the blitz campaign
      const { data: blitzCampaign, error: blitzError } = await supabase
        .from('blitz_campaigns')
        .insert({
          campaign_id: campaign.id,
          campaign_date: campaignDate,
          status: 'planning'
        })
        .select()
        .single();

      if (blitzError) throw blitzError;

      toast({
        title: 'Campaign created',
        description: `New blitz campaign created for ${format(selectedDate, 'MMM dd')}`
      });

      loadCampaignData();
    } catch (error: any) {
      toast({
        title: 'Error creating campaign',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Loading time planner...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        {/* Date Navigation */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                4-Wave Time Planner
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2 px-3 py-2 border rounded-md">
                  <Globe className="h-4 w-4" />
                  <span className="font-medium">
                    {format(selectedDate, 'EEE, MMM dd, yyyy')}
                  </span>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {currentCampaign && (
              <div className="flex items-center gap-4 text-sm">
                <Badge variant="secondary">
                  Campaign Active
                </Badge>
                <div className="text-muted-foreground">
                  Total targets: {waves.reduce((acc, wave) => acc + wave.targets.length, 0)}/16
                </div>
              </div>
            )}
          </CardHeader>
        </Card>

      {/* Wave Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {waves.map((wave) => (
          <DroppableWave 
            key={wave.id}
            wave={wave} 
            onRemove={removeTargetFromWave}
          />
        ))}
      </div>

      {/* Available Targets */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Available Targets ({availableTargets.length})
            </CardTitle>
            {!currentCampaign && (
              <Button onClick={createNewCampaign} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Today's Campaign
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!currentCampaign ? (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="h-8 w-8 mx-auto mb-2" />
              <h3 className="font-medium mb-1">No campaign for today</h3>
              <p className="text-sm">Create a new blitz campaign to start planning</p>
            </div>
          ) : (
            <SortableContext 
              items={availableTargets.map(t => t.id)} 
              strategy={verticalListSortingStrategy}
            >
              <ScrollArea className="h-40">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {availableTargets.slice(0, 16).map((target) => (
                    <AvailableTarget key={target.id} target={target} />
                  ))}
                </div>
              </ScrollArea>
            </SortableContext>
          )}
        </CardContent>
      </Card>

      <DragOverlay>
        {activeId ? (
          <div className="p-2 bg-card rounded-md shadow-lg border text-sm">
            <div className="font-medium">Dragging target...</div>
          </div>
        ) : null}
      </DragOverlay>
      </div>
    </DndContext>
  );
}