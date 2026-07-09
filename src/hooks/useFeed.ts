import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';

import { queryKeys } from '@/hooks/queryKeys';
import {
  addComment,
  adminHidePost,
  createPost,
  deleteOwnPost,
  getPost,
  listComments,
  listPinnedPosts,
  listPosts,
  setPostPinned,
  toggleLike,
  type FeedPage,
} from '@/services/feedService';
import type { FeedPostWithAuthor } from '@/types/models';

/** Infinite feed. Use `data.pages.flatMap(p => p.posts)` for the FlatList. */
export function useFeed() {
  return useInfiniteQuery({
    queryKey: queryKeys.feed.list(),
    queryFn: ({ pageParam }) => listPosts(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

/** Pinned announcements rendered above the feed list. */
export function usePinnedPosts() {
  return useQuery({
    queryKey: queryKeys.feed.pinned(),
    queryFn: listPinnedPosts,
  });
}

export function usePost(postId: string) {
  return useQuery({
    queryKey: queryKeys.feed.post(postId),
    queryFn: () => getPost(postId),
    enabled: Boolean(postId),
  });
}

export function useCreatePost() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.feed.all });
    },
  });
}

/**
 * Optimistic like toggle: flips liked_by_me/like_count in the feed list,
 * pinned posts, and post detail caches immediately. Rolls back (and resyncs
 * with the server) on error. No invalidation on success — the optimistic
 * counts are kept so pinned posts don't trigger a jarring feed refetch.
 */
export function useToggleLike() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, liked }: { postId: string; liked: boolean }) =>
      toggleLike(postId, liked),
    onMutate: async ({ postId, liked }) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: queryKeys.feed.list() }),
        qc.cancelQueries({ queryKey: queryKeys.feed.pinned() }),
        qc.cancelQueries({ queryKey: queryKeys.feed.post(postId) }),
      ]);
      const previousFeed = qc.getQueryData<InfiniteData<FeedPage>>(queryKeys.feed.list());
      const previousPinned = qc.getQueryData<FeedPostWithAuthor[]>(queryKeys.feed.pinned());
      const previousPost = qc.getQueryData<FeedPostWithAuthor>(queryKeys.feed.post(postId));

      const patch = (post: FeedPostWithAuthor): FeedPostWithAuthor =>
        post.id === postId
          ? {
              ...post,
              liked_by_me: !liked,
              like_count: Math.max(0, post.like_count + (liked ? -1 : 1)),
            }
          : post;

      qc.setQueryData<InfiniteData<FeedPage>>(
        queryKeys.feed.list(),
        (data: InfiniteData<FeedPage> | undefined) =>
          data
            ? {
                ...data,
                pages: data.pages.map((page: FeedPage) => ({
                  ...page,
                  posts: page.posts.map(patch),
                })),
              }
            : data
      );
      qc.setQueryData<FeedPostWithAuthor[]>(
        queryKeys.feed.pinned(),
        (posts: FeedPostWithAuthor[] | undefined) => posts?.map(patch)
      );
      qc.setQueryData<FeedPostWithAuthor>(
        queryKeys.feed.post(postId),
        (post: FeedPostWithAuthor | undefined) => (post ? patch(post) : post)
      );

      return { previousFeed, previousPinned, previousPost };
    },
    onError: (_err, { postId }, context) => {
      if (context?.previousFeed) {
        qc.setQueryData(queryKeys.feed.list(), context.previousFeed);
      }
      if (context?.previousPinned) {
        qc.setQueryData(queryKeys.feed.pinned(), context.previousPinned);
      }
      if (context?.previousPost) {
        qc.setQueryData(queryKeys.feed.post(postId), context.previousPost);
      }
      // Resync with the server since the optimistic state may be stale.
      qc.invalidateQueries({ queryKey: queryKeys.feed.list() });
      qc.invalidateQueries({ queryKey: queryKeys.feed.pinned() });
      qc.invalidateQueries({ queryKey: queryKeys.feed.post(postId) });
    },
  });
}

export function useComments(postId: string) {
  return useQuery({
    queryKey: queryKeys.feed.comments(postId),
    queryFn: () => listComments(postId),
    enabled: Boolean(postId),
  });
}

export function useAddComment(postId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (content: string) => addComment(postId, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.feed.comments(postId) });
      qc.invalidateQueries({ queryKey: queryKeys.feed.list() });
      qc.invalidateQueries({ queryKey: queryKeys.feed.post(postId) });
    },
  });
}

export function useDeleteOwnPost() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => deleteOwnPost(postId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.feed.all });
    },
  });
}

/** Admin: pin/unpin a post. Invalidates the feed list, pinned section, and post. */
export function useSetPostPinned() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, pinned }: { postId: string; pinned: boolean }) =>
      setPostPinned(postId, pinned),
    onSuccess: (_data, { postId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.feed.list() });
      qc.invalidateQueries({ queryKey: queryKeys.feed.pinned() });
      qc.invalidateQueries({ queryKey: queryKeys.feed.post(postId) });
    },
  });
}

export function useAdminHidePost() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => adminHidePost(postId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.feed.all });
    },
  });
}
