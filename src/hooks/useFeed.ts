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
  listPosts,
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
 * Optimistic like toggle: flips liked_by_me/like_count in the cache
 * immediately, rolls back on error, settles with the server count.
 */
export function useToggleLike() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, liked }: { postId: string; liked: boolean }) =>
      toggleLike(postId, liked),
    onMutate: async ({ postId, liked }) => {
      await qc.cancelQueries({ queryKey: queryKeys.feed.list() });
      const previous = qc.getQueryData<InfiniteData<FeedPage>>(queryKeys.feed.list());

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
      qc.setQueryData<FeedPostWithAuthor>(
        queryKeys.feed.post(postId),
        (post: FeedPostWithAuthor | undefined) => (post ? patch(post) : post)
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKeys.feed.list(), context.previous);
      }
    },
    onSettled: (_data, _err, { postId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.feed.list() });
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

export function useAdminHidePost() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => adminHidePost(postId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.feed.all });
    },
  });
}
