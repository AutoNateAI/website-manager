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
import { format, addMinutes, startOfDay, parseISO } from 'date-fns';
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
  Save,
  Filter,
  X
} from 'lucide-react';
import { SocialMediaPost, SocialMediaImage } from '../types';

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
  images?: SocialMediaImage[];
  isDragging?: boolean;
  isScheduled?: boolean;
  onUnschedule?: () => void;
}

// Image Carousel Component
function ImageCarousel({ images }: { images: SocialMediaImage[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="h-20 bg-muted rounded-md flex items-center justify-center">
        <span className="text-xs text-muted-foreground">No images</span>
      </div>
    );
  }

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="relative h-20 rounded-md overflow-hidden bg-muted">
      <img
        src={images[currentIndex].image_url}
        alt={images[currentIndex].alt_text || 'Post image'}
        className="w-full h-full object-cover"
      />
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prevImage(); }}
            className="absolute left-1 top-1/2 -translate-y-1/2 w-5 h-5 bg-black/50 text-white rounded-full flex items-center justify-center text-xs hover:bg-black/70"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); nextImage(); }}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 bg-black/50 text-white rounded-full flex items-center justify-center text-xs hover:bg-black/70"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, idx) => (
              <div
                key={idx}
                className={`w-1 h-1 rounded-full ${
                  idx === currentIndex ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Draggable Post Card Component
function PostCard({ post, images, isDragging, isScheduled, onUnschedule }: PostCardProps) {
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
        <CardContent className="p-3 space-y-2">
          {/* Image Carousel */}
          <ImageCarousel images={images || []} />
          
          <div className="space-y-2">
            <div className="flex justify-between items-start gap-2">
              <h4 className="font-medium text-sm line-clamp-2 flex-1">{post.title}</h4>
              <div className="flex flex-wrap gap-1 items-center">
                {hasNoTarget && (
                  <Badge variant="secondary" className="text-xs px-2 py-0 bg-orange-100 text-orange-800 whitespace-nowrap">
                    No Target Yet
                  </Badge>
                )}
                {isScheduled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnschedule?.();
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {post.caption}
            </p>
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="outline" className="px-2 py-0">
                {post.platform}
              </Badge>
              <Badge variant="outline" className="px-2 py-0">
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
  images?: Record<string, SocialMediaImage[]>;
  onPostClick?: (post: ScheduledPost) => void;
  onUnschedule?: (postId: string) => void;
}

function TimeSlotComponent({ slot, images, onPostClick, onUnschedule }: TimeSlotProps) {
  const {
    setNodeRef,
    isOver,
  } = useSortable({ id: slot.id });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[120px] border rounded-md p-2 transition-colors ${
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
          <PostCard 
            post={slot.post} 
            images={images?.[slot.post.id] || []}
            isScheduled={true}
            onUnschedule={() => onUnschedule?.(slot.post!.id)}
          />
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
  const [images, setImages] = useState<Record<string, SocialMediaImage[]>>({});
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  // Filter states
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterStyle, setFilterStyle] = useState<string>('all');
  const [filterTarget, setFilterTarget] = useState<string>('all');

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
    loadScheduledPosts();
  }, [selectedDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [postsData, imagesData] = await Promise.all([
        supabase
          .from('social_media_posts')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('social_media_images')
          .select('*')
          .order('carousel_index')
          .order('image_index')
      ]);

      if (postsData.error) throw postsData.error;
      if (imagesData.error) throw imagesData.error;

      setPosts((postsData.data as SocialMediaPost[] || []).map(post => ({
        ...post,
        target_user: undefined,
        scheduled_for: undefined
      })));

      // Group images by post_id
      const imagesByPost = (imagesData.data || []).reduce((acc, img) => {
        if (!acc[img.post_id]) acc[img.post_id] = [];
        acc[img.post_id].push(img);
        return acc;
      }, {} as Record<string, SocialMediaImage[]>);
      setImages(imagesByPost);

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

  const loadScheduledPosts = async () => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data: scheduledData, error } = await supabase
        .from('scheduled_posts')
        .select('*')
        .gte('scheduled_for', `${dateStr}T00:00:00`)
        .lt('scheduled_for', `${dateStr}T23:59:59`);

      if (error) throw error;

      // Map scheduled posts to time slots
      const newSlots = [...timeSlots];
      scheduledData?.forEach(scheduled => {
        const scheduleTime = parseISO(scheduled.scheduled_for);
        const slotIndex = Math.floor(
          (scheduleTime.getHours() * 60 + scheduleTime.getMinutes()) / 30
        );
        
        if (slotIndex >= 0 && slotIndex < 48) {
          const post = posts.find(p => p.id === scheduled.social_media_post_id);
          if (post) {
            newSlots[slotIndex].post = {
              ...post,
              target_user: (scheduled.payload as any)?.target_user,
              scheduled_for: scheduled.scheduled_for
            };
          }
        }
      });
      
      setTimeSlots(newSlots);
    } catch (error: any) {
      console.error('Error loading scheduled posts:', error);
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the post being dragged
    let draggedPost = posts.find(p => p.id === activeId);
    if (!draggedPost) {
      // Check if it's from a scheduled slot
      for (const slot of timeSlots) {
        if (slot.post?.id === activeId) {
          draggedPost = slot.post;
          break;
        }
      }
    }

    if (!draggedPost) return;

    // If dropping on a time slot
    if (overId.startsWith('slot-')) {
      const slotIndex = parseInt(overId.split('-')[1]);
      const targetSlot = timeSlots[slotIndex];
      
      // Don't allow dropping on occupied slots (unless it's the same slot)
      if (targetSlot.post && targetSlot.post.id !== activeId) {
        toast({
          title: 'Slot occupied',
          description: 'This time slot already has a post scheduled',
          variant: 'destructive'
        });
        return;
      }

      // Save to database
      try {
        const scheduledDateTime = targetSlot.datetime.toISOString();
        
        await supabase
          .from('scheduled_posts')
          .upsert({
            account_id: '00000000-0000-0000-0000-000000000000', // Default account for now
            social_media_post_id: draggedPost.id,
            scheduled_for: scheduledDateTime,
            status: 'pending',
            payload: { target_user: draggedPost.target_user }
          });

        const updatedSlots = [...timeSlots];
        
        // Remove post from any existing slot
        updatedSlots.forEach(slot => {
          if (slot.post?.id === activeId) {
            slot.post = undefined;
          }
        });
        
        // Add post to new slot
        updatedSlots[slotIndex].post = {
          ...draggedPost,
          scheduled_for: scheduledDateTime
        };
        setTimeSlots(updatedSlots);

        toast({
          title: 'Post scheduled',
          description: `Post scheduled for ${targetSlot.time}`,
        });
      } catch (error: any) {
        toast({
          title: 'Error scheduling post',
          description: error.message,
          variant: 'destructive'
        });
      }
    } 
    // If dropping outside any droppable area (unscheduling)
    else if (!overId.startsWith('slot-') && draggedPost.scheduled_for) {
      handleUnschedule(draggedPost.id);
    }
  };

  const handleUnschedule = async (postId: string) => {
    try {
      await supabase
        .from('scheduled_posts')
        .delete()
        .eq('social_media_post_id', postId);

      // Remove from time slots
      const updatedSlots = timeSlots.map(slot => 
        slot.post?.id === postId ? { ...slot, post: undefined } : slot
      );
      setTimeSlots(updatedSlots);

      toast({
        title: 'Post unscheduled',
        description: 'Post moved back to available queue',
      });
    } catch (error: any) {
      toast({
        title: 'Error unscheduling post',
        description: error.message,
        variant: 'destructive'
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
        })
        .eq('id', editingPost.id);

      if (error) throw error;

      // Update scheduled post if it has target_user changes
      if (editingPost.scheduled_for) {
        await supabase
          .from('scheduled_posts')
          .update({
            payload: { target_user: editingPost.target_user }
          })
          .eq('social_media_post_id', editingPost.id);
      }

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

  // Filter available posts
  const availablePosts = posts.filter(post => {
    const isScheduled = timeSlots.some(slot => slot.post?.id === post.id);
    if (isScheduled) return false;
    
    if (filterPlatform !== 'all' && post.platform !== filterPlatform) return false;
    if (filterStyle !== 'all' && post.style !== filterStyle) return false;
    if (filterTarget === 'with_target' && !post.target_user) return false;
    if (filterTarget === 'no_target' && post.target_user) return false;
    
    return true;
  });

  // Find the currently dragged post (could be from queue or scheduled)
  const draggedPost = posts.find(p => p.id === activeId) || 
    timeSlots.find(slot => slot.post?.id === activeId)?.post;

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
                <ScrollArea className="h-[700px]">
                  <SortableContext 
                    items={timeSlots.map(slot => slot.id)} 
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {timeSlots.map((slot) => (
                        <TimeSlotComponent 
                          key={slot.id} 
                          slot={slot}
                          images={images}
                          onPostClick={handlePostEdit}
                          onUnschedule={handleUnschedule}
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
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Available Posts ({availablePosts.length})
                  </CardTitle>
                  <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                    <SelectTrigger className="w-20">
                      <Filter className="h-4 w-4" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex gap-2 mt-2">
                  <Select value={filterStyle} onValueChange={setFilterStyle}>
                    <SelectTrigger>
                      <SelectValue placeholder="Style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Styles</SelectItem>
                      <SelectItem value="Photo">Photo</SelectItem>
                      <SelectItem value="Story">Story</SelectItem>
                      <SelectItem value="Reel">Reel</SelectItem>
                      <SelectItem value="Carousel">Carousel</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={filterTarget} onValueChange={setFilterTarget}>
                    <SelectTrigger>
                      <SelectValue placeholder="Target" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="with_target">With Target</SelectItem>
                      <SelectItem value="no_target">No Target</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[700px]">
                  <SortableContext 
                    items={availablePosts.map(post => post.id)} 
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {availablePosts.map((post) => (
                        <PostCard 
                          key={post.id} 
                          post={post} 
                          images={images[post.id] || []}
                        />
                      ))}
                      {availablePosts.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                          <p>No posts match your filters</p>
                          <p className="text-sm">Try adjusting your filters or create posts in Content Generation</p>
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
          {draggedPost && (
            <PostCard 
              post={draggedPost} 
              images={images[draggedPost.id] || []}
              isDragging 
            />
          )}
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