export interface SocialMediaPost {
  id: string;
  title: string;
  platform: string;
  style: string;
  voice: string;
  source_items: any[];
  caption: string;
  hashtags: string[];
  image_seed_url?: string;
  image_seed_instructions?: string;
  is_published: boolean;
  status?: string;
  generation_progress?: any;
  assigned_user_id?: string;
  post_status?: 'draft' | 'assigned' | 'scheduled' | 'posted' | 'failed';
  scheduled_at?: string;
  posted_at?: string;
  caused_dm?: boolean;
  post_url?: string;
  created_at: string;
  updated_at: string;
}

export interface InstagramUser {
  id: string;
  username: string;
  display_name?: string;
  bio?: string;
  profile_image_url?: string;
  follower_count?: number;
  following_count?: number;
  engagement_rate?: number;
  influence_score?: number;
  follows_me?: boolean;
  discovered_through?: string;
  notes?: string;
  company_id?: string;
  person_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ScheduledPost {
  id: string;
  account_id: string;
  social_media_post_id?: string;
  scheduled_for: string;
  status: 'pending' | 'scheduled' | 'posted' | 'failed';
  payload: any;
  error?: string;
  created_at: string;
  updated_at: string;
}

export interface SocialMediaComment {
  id: string;
  post_id: string;
  parent_comment_id?: string;
  commenter_username: string;
  commenter_display_name?: string;
  comment_text: string;
  comment_timestamp: string;
  like_count: number;
  reply_count: number;
  is_my_comment: boolean;
  is_reply_to_my_comment: boolean;
  thread_depth: number;
  status?: string;
  scheduled_for?: string;
  notification_sent?: boolean;
  caused_dm?: boolean;
  created_at: string;
  updated_at: string;
  replies?: SocialMediaComment[];
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface Person {
  id: string;
  name: string;
  instagram_username?: string;
  instagram_profile_url?: string;
  location?: string;
  bio?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SocialMediaImage {
  id: string;
  post_id: string;
  carousel_index: number;
  image_index: number;
  image_url: string;
  image_prompt: string;
  alt_text?: string;
}