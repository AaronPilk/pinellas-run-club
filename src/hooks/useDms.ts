import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';

import { queryKeys } from '@/hooks/queryKeys';
import {
  getOrCreateDm,
  listConversations,
  listMessages,
  markRead,
  searchMembers,
  sendMessage,
  unreadConversationsCount,
  type DmMessagesPage,
} from '@/services/dmService';
import type { DmMessage } from '@/types/models';

/** My DM inbox. MessagesScreen refetches on focus (see useFocusEffect there). */
export function useConversations() {
  return useQuery({
    queryKey: queryKeys.dms.conversations(),
    queryFn: listConversations,
  });
}

/** Debounced member search (pass the already-debounced term). */
export function useMemberSearch(term: string) {
  return useQuery({
    queryKey: queryKeys.dms.memberSearch(term),
    queryFn: () => searchMembers(term),
    enabled: term.trim().length >= 2,
  });
}

/** Infinite message history, newest first (feeds the inverted FlatList). */
export function useMessages(conversationId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.dms.messages(conversationId),
    queryFn: ({ pageParam }) => listMessages(conversationId, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(conversationId),
  });
}

function dedupeById(messages: DmMessage[]): DmMessage[] {
  const seen = new Set<string>();
  return messages.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}

/**
 * Prepend a message to the newest page of the cache (no-op if the id is
 * already there). Used by the ChatScreen realtime subscription and the
 * optimistic-send reconciliation.
 */
export function appendDmMessageToCache(
  qc: QueryClient,
  conversationId: string,
  message: DmMessage
): void {
  qc.setQueryData<InfiniteData<DmMessagesPage>>(
    queryKeys.dms.messages(conversationId),
    (data) => {
      if (!data) return data;
      const exists = data.pages.some((page) => page.messages.some((m) => m.id === message.id));
      if (exists) return data;
      return {
        ...data,
        pages: data.pages.map((page, index) =>
          index === 0 ? { ...page, messages: [message, ...page.messages] } : page
        ),
      };
    }
  );
}

/**
 * Optimistic send: the message appears instantly, is swapped for the server
 * row on success (deduped against realtime echoes), and rolls back on error.
 */
export function useSendMessage(conversationId: string, myProfileId: string | undefined) {
  const qc = useQueryClient();
  const messagesKey = queryKeys.dms.messages(conversationId);

  return useMutation({
    mutationFn: (content: string) => sendMessage(conversationId, content),
    onMutate: async (content) => {
      await qc.cancelQueries({ queryKey: messagesKey });

      const previous = qc.getQueryData<InfiniteData<DmMessagesPage>>(messagesKey);
      const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const optimistic: DmMessage = {
        id: optimisticId,
        conversation_id: conversationId,
        sender_profile_id: myProfileId ?? '',
        content: content.trim(),
        created_at: new Date().toISOString(),
        deleted_at: null,
      };

      qc.setQueryData<InfiniteData<DmMessagesPage>>(messagesKey, (data) =>
        data
          ? {
              ...data,
              pages: data.pages.map((page, index) =>
                index === 0 ? { ...page, messages: [optimistic, ...page.messages] } : page
              ),
            }
          : data
      );

      return { previous, optimisticId };
    },
    onSuccess: (message, _content, context) => {
      // Swap the optimistic row for the server row; dedupe in case the
      // realtime INSERT already landed it in the cache.
      qc.setQueryData<InfiniteData<DmMessagesPage>>(messagesKey, (data) =>
        data
          ? {
              ...data,
              pages: data.pages.map((page) => ({
                ...page,
                messages: dedupeById(
                  page.messages.map((m) => (m.id === context.optimisticId ? message : m))
                ),
              })),
            }
          : data
      );
      qc.invalidateQueries({ queryKey: queryKeys.dms.conversations() });
    },
    onError: (_err, _content, context) => {
      if (context?.previous) {
        qc.setQueryData(messagesKey, context.previous);
      }
    },
  });
}

/** Tap a member -> conversation id (created on first contact). */
export function useStartDm() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (otherProfileId: string) => getOrCreateDm(otherProfileId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.dms.conversations() });
    },
  });
}

export function useMarkDmRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) => markRead(conversationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.dms.conversations() });
      qc.invalidateQueries({ queryKey: queryKeys.dms.unreadCount() });
    },
  });
}

/** Conversations with unread messages — drives the header dot + badge row. */
export function useDmUnreadCount() {
  return useQuery({
    queryKey: queryKeys.dms.unreadCount(),
    queryFn: unreadConversationsCount,
    refetchInterval: 60_000,
  });
}
