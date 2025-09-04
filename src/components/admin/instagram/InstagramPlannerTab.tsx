import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format, addMinutes, startOfDay } from 'date-fns';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Calendar, 
  Clock, 
  User, 
  AlertTriangle, 
  Edit, 
  ChevronLeft, 
  ChevronRight,
  Save
} from 'lucide-react';
import { SocialMediaPost } from '../types';

interface ScheduledPost extends SocialMediaPost {
  target_user?: string;
  scheduled_for?: string;
}

interface TimeSlot {
  id: string;
  time: string;
  datetime: Date;
  post?: ScheduledPost;
}

interface PostCardProps {
  post: ScheduledPost;
  isDragging?: boolean;
}

// Draggable Post Card Component
function PostCard({ post, isDragging }: PostCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: post.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const hasNoTarget = !post.target_user;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing"
    >
      <Card className="border-l-4 border-l-primary hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="flex justify-between items-start">
              <h4 className="font-medium text-sm line-clamp-2">{post.title}</h4>
              {hasNoTarget && (
                <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-800">
                  No Target Yet
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {post.caption}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="px-2 py-1">
                {post.platform}
              </Badge>
              <Badge variant="outline" className="px-2 py-1">
                {post.style}
              </Badge>
            </div>
            {post.target_user && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span>{post.target_user}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Time Slot Component
interface TimeSlotProps {
  slot: TimeSlot;
  onPostClick?: (post: ScheduledPost) => void;
}

function TimeSlotComponent({ slot, onPostClick }: TimeSlotProps) {
  const {
    setNodeRef,
    isOver,
  } = useSortable({ id: slot.id });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[80px] border rounded-md p-2 transition-colors ${
        isOver ? 'bg-primary/10 border-primary' : 'bg-background border-border'
      }`}
    >
      <div className="flex justify-between items-center text-xs text-muted-foreground mb-2">
        <span className="font-medium">{slot.time}</span>
        <Clock className="h-3 w-3" />
      </div>
      
      {slot.post ? (
        <div 
          className="cursor-pointer"
          onClick={() => onPostClick?.(slot.post!)}
        >
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-2">
              <div className="space-y-1">
                <h5 className="font-medium text-xs line-clamp-1">{slot.post.title}</h5>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {slot.post.caption}
                </p>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    {slot.post.platform}
                  </Badge>
                  {!slot.post.target_user && (
                    <Badge variant="secondary" className="text-xs px-1 py-0 bg-orange-100 text-orange-800">
                      No Target
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
          Drop post here
        </div>
      )}
    </div>
  );
}

export function InstagramPlannerTab() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    generateTimeSlots();
  }, [selectedDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const { data: postsData, error } = await supabase
        .from('social_media_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPosts((postsData as SocialMediaPost[] || []).map(post => ({
        ...post,
        target_user: undefined,
        scheduled_for: undefined
      })));
    } catch (error: any) {
      console.error('Error loading posts:', error);
      toast({
        title: 'Error loading posts',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const generateTimeSlots = () => {
    const slots: TimeSlot[] = [];
    const startTime = startOfDay(selectedDate);
    
    // Generate 48 slots (24 hours * 2 slots per hour = 30min intervals)
    for (let i = 0; i < 48; i++) {
      const slotTime = addMinutes(startTime, i * 30);
      slots.push({
        id: `slot-${i}`,
        time: format(slotTime, 'HH:mm'),
        datetime: slotTime,
        post: undefined
      });
    }
    
    setTimeSlots(slots);
  };
  
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // If dropping on a time slot
    if (overId.startsWith('slot-')) {
      const post = posts.find(p => p.id === activeId);
      if (!post) return;

      const slotIndex = parseInt(overId.split('-')[1]);
      const updatedSlots = [...timeSlots];
      
      // Remove post from any existing slot
      updatedSlots.forEach(slot => {
        if (slot.post?.id === activeId) {
          slot.post = undefined;
        }
      });
      
      // Add post to new slot
      updatedSlots[slotIndex].post = post;
      setTimeSlots(updatedSlots);

      toast({
        title: 'Post scheduled',
        description: `Post scheduled for ${updatedSlots[slotIndex].time}`,
      });
    }
  };

  const handlePostEdit = (post: ScheduledPost) => {
    setEditingPost(post);
    setShowEditDialog(true);
  };

  const handleSavePost = async () => {
    if (!editingPost) return;

    try {
      const { error } = await supabase
        .from('social_media_posts')
        .update({
          title: editingPost.title,
          caption: editingPost.caption,
          target_user: editingPost.target_user,
        })
        .eq('id', editingPost.id);

      if (error) throw error;

      // Update local state
      setPosts(posts.map(p => p.id === editingPost.id ? editingPost : p));
      
      // Update scheduled slots
      setTimeSlots(timeSlots.map(slot => 
        slot.post?.id === editingPost.id 
          ? { ...slot, post: editingPost }
          : slot
      ));

      setShowEditDialog(false);
      setEditingPost(null);

      toast({
        title: 'Post updated',
        description: 'Post details have been saved',
      });
    } catch (error: any) {
      toast({
        title: 'Error saving post',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(newDate);
  };

  const availablePosts = posts.filter(post => 
    !timeSlots.some(slot => slot.post?.id === post.id)
  );

  const draggedPost = posts.find(p => p.id === activeId);

  if (loading) {
    return <div className="p-6">Loading planner...</div>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Instagram Planner</h2>
            <p className="text-muted-foreground">Schedule your posts throughout the day</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 px-3 py-2 border rounded-md">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">
                {format(selectedDate, 'MMM dd, yyyy')}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Time Slots - Left/Main Area */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Day Schedule - 30 Min Intervals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <SortableContext 
                    items={timeSlots.map(slot => slot.id)} 
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {timeSlots.map((slot) => (
                        <TimeSlotComponent 
                          key={slot.id} 
                          slot={slot} 
                          onPostClick={handlePostEdit}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Available Posts - Right Sidebar */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Available Posts ({availablePosts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <SortableContext 
                    items={availablePosts.map(post => post.id)} 
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {availablePosts.map((post) => (
                        <PostCard key={post.id} post={post} />
                      ))}
                      {availablePosts.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                          <p>No unscheduled posts available</p>
                          <p className="text-sm">Create posts in the Content Generation tab</p>
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {draggedPost && <PostCard post={draggedPost} isDragging />}
        </DragOverlay>

        {/* Edit Post Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Edit Post Details
              </DialogTitle>
            </DialogHeader>
            
            {editingPost && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={editingPost.title}
                    onChange={(e) => setEditingPost({
                      ...editingPost,
                      title: e.target.value
                    })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="caption">Caption</Label>
                  <Textarea
                    id="caption"
                    value={editingPost.caption}
                    onChange={(e) => setEditingPost({
                      ...editingPost,
                      caption: e.target.value
                    })}
                    rows={4}
                  />
                </div>
                
                <div>
                  <Label htmlFor="target_user">Target User</Label>
                  <Input
                    id="target_user"
                    value={editingPost.target_user || ''}
                    onChange={(e) => setEditingPost({
                      ...editingPost,
                      target_user: e.target.value
                    })}
                    placeholder="@username or leave empty"
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowEditDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSavePost}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DndContext>
  );
}