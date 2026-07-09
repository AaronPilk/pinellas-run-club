import { supabase } from '@/lib/supabase';
import { uploadToBucket } from '@/services/mediaService';
import { getCurrentProfileId } from '@/services/profileService';
import type {
  FeedComment,
  FeedCommentWithAuthor,
  FeedPost,
  FeedPostMedia,
  FeedPostWithAuthor,
  ProfileSummary,
} from '@/types/models';

export const FEED_PAGE_SIZE = 20;

const POST_SELECT = `
  *,
  author:profiles(id, full_name, username, avatar_url),
  media:feed_post_media(*),
  my_likes:feed_post_likes(profile_id)
`;

type RawPostRow = FeedPost & {
  author: ProfileSummary;
  media: FeedPostMedia[];
  my_likes: { profile_id: string }[];
};

function toPost(row: RawPostRow, myProfileId: string | null): FeedPostWithAuthor {
  const { my_likes, ...rest } = row;
  return {
    ...rest,
    media: [...(row.media ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    liked_by_me: myProfileId ? (my_likes ?? []).some((l) => l.profile_id === myProfileId) : false,
  };
}

export interface FeedPage {
  posts: FeedPostWithAuthor[];
  /** created_at cursor for the next page; null when no more pages */
  nextCursor: string | null;
}

/**
 * Cursor-paginated feed (newest first). Pass the previous page's nextCursor.
 */
export async function listPosts(cursor?: string | null): Promise<FeedPage> {
  const myProfileId = await getCurrentProfileId();

  let query = supabase
    .from('feed_posts')
    .select(POST_SELECT)
    .is('deleted_at', null)
    .is('hidden_at', null)
    .order('created_at', { ascending: false })
    .limit(FEED_PAGE_SIZE);

  if (cursor) query = query.lt('created_at', cursor);

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as unknown as RawPostRow[];
  const posts = rows.map((row) => toPost(row, myProfileId));

  return {
    posts,
    nextCursor: rows.length === FEED_PAGE_SIZE ? rows[rows.length - 1].created_at : null,
  };
}

/** Pinned announcements shown above the feed (newest pin first, max 5). */
export async function listPinnedPosts(): Promise<FeedPostWithAuthor[]> {
  const myProfileId = await getCurrentProfileId();

  const { data, error } = await supabase
    .from('feed_posts')
    .select(POST_SELECT)
    .not('pinned_at', 'is', null)
    .is('deleted_at', null)
    .is('hidden_at', null)
    .order('pinned_at', { ascending: false })
    .limit(5);

  if (error) throw error;

  const rows = (data ?? []) as unknown as RawPostRow[];
  return rows.map((row) => toPost(row, myProfileId));
}

export async function getPost(postId: string): Promise<FeedPostWithAuthor> {
  const myProfileId = await getCurrentProfileId();

  const { data, error } = await supabase
    .from('feed_posts')
    .select(POST_SELECT)
    .eq('id', postId)
    .single();

  if (error) throw error;
  return toPost(data as unknown as RawPostRow, myProfileId);
}

/**
 * Create a post: uploads images (compressed) to the feed-media bucket,
 * inserts the post row, then the media rows.
 */
export async function createPost(input: {
  caption?: string;
  locationName?: string;
  eventId?: string;
  imageUris: string[];
}): Promise<FeedPost> {
  const profileId = await getCurrentProfileId();

  const { data, error } = await supabase
    .from('feed_posts')
    .insert({
      profile_id: profileId,
      caption: input.caption?.trim() || null,
      location_name: input.locationName?.trim() || null,
      event_id: input.eventId ?? null,
    })
    .select('*')
    .single();

  if (error) throw error;
  const post = data as FeedPost;

  if (input.imageUris.length > 0) {
    const mediaRows = await Promise.all(
      input.imageUris.map(async (uri, index) => {
        const path = `${profileId}/${post.id}/${index}-${Date.now()}.jpg`;
        const url = await uploadToBucket({ bucket: 'feed-media', path, uri });
        return {
          post_id: post.id,
          media_url: url,
          media_type: 'image' as const,
          sort_order: index,
        };
      })
    );

    const { error: mediaError } = await supabase.from('feed_post_media').insert(mediaRows);
    if (mediaError) throw mediaError;
  }

  return post;
}

/**
 * Like/unlike. `like_count` is maintained by DB triggers — never client math.
 */
export async function toggleLike(postId: string, currentlyLiked: boolean): Promise<void> {
  const profileId = await getCurrentProfileId();

  if (currentlyLiked) {
    const { error } = await supabase
      .from('feed_post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('profile_id', profileId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('feed_post_likes')
      .insert({ post_id: postId, profile_id: profileId });
    // Ignore double-tap duplicates
    if (error && error.code !== '23505') throw error;
  }
}

export async function listComments(postId: string): Promise<FeedCommentWithAuthor[]> {
  const { data, error } = await supabase
    .from('feed_comments')
    .select('*, author:profiles(id, full_name, username, avatar_url)')
    .eq('post_id', postId)
    .is('deleted_at', null)
    .is('hidden_at', null)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as FeedCommentWithAuthor[];
}

export async function addComment(postId: string, content: string): Promise<FeedComment> {
  const profileId = await getCurrentProfileId();

  const { data, error } = await supabase
    .from('feed_comments')
    .insert({ post_id: postId, profile_id: profileId, content: content.trim() })
    .select('*')
    .single();

  if (error) throw error;
  return data as FeedComment;
}

/** Soft-delete my own post (RLS restricts to the author). */
export async function deleteOwnPost(postId: string): Promise<void> {
  const { error } = await supabase
    .from('feed_posts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', postId);

  if (error) throw error;
}

/** Admin: pin a post to the top of the feed (or unpin it). */
export async function setPostPinned(postId: string, pinned: boolean): Promise<void> {
  const { error } = await supabase.rpc('admin_set_post_pinned', {
    p_post_id: postId,
    p_pinned: pinned,
  });
  if (error) throw error;
}

/** Admin moderation: hide a post from the feed. */
export async function adminHidePost(postId: string): Promise<void> {
  const profileId = await getCurrentProfileId();

  const { error } = await supabase
    .from('feed_posts')
    .update({ hidden_at: new Date().toISOString(), hidden_by_profile_id: profileId })
    .eq('id', postId);

  if (error) throw error;
}
