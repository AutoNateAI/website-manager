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