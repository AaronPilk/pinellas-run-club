import { supabase } from '@/lib/supabase';
import { getCurrentProfileId } from '@/services/profileService';
import type {
  DmConversation,
  DmConversationListItem,
  DmMessage,
  ProfileSummary,
} from '@/types/models';

export const DM_PAGE_SIZE = 50;

const CONVERSATION_SELECT = `
  last_read_at,
  conversation:dm_conversations(
    *,
    participants:dm_participants(
      profile_id,
      profile:profiles(id, full_name, username, avatar_url)
    )
  )
`;

type RawParticipantRow = {
  last_read_at: string | null;
  conversation: DmConversation & {
    participants: { profile_id: string; profile: ProfileSummary }[];
  };
};

function isUnread(
  conversation: Pick<DmConversation, 'last_message_at' | 'last_message_sender_profile_id'>,
  lastReadAt: string | null,
  myProfileId: string
): boolean {
  return Boolean(
    conversation.last_message_at &&
      conversation.last_message_sender_profile_id !== myProfileId &&
      (!lastReadAt || conversation.last_message_at > lastReadAt)
  );
}

/**
 * My inbox: every conversation I'm in, with the other member joined,
 * ordered by last_message_at desc (empty conversations last).
 */
export async function listConversations(): Promise<DmConversationListItem[]> {
  const myProfileId = await getCurrentProfileId();

  const { data, error } = await supabase
    .from('dm_participants')
    .select(CONVERSATION_SELECT)
    .eq('profile_id', myProfileId);

  if (error) throw error;

  const rows = (data ?? []) as unknown as RawParticipantRow[];

  const items = rows
    .map((row): DmConversationListItem | null => {
      const other = row.conversation.participants.find(
        (p) => p.profile_id !== myProfileId
      )?.profile;
      if (!other) return null;

      const { participants: _participants, ...conversation } = row.conversation;

      return {
        conversation,
        other,
        unread: isUnread(conversation, row.last_read_at, myProfileId),
      };
    })
    .filter((item): item is DmConversationListItem => item !== null);

  // last_message_at desc, nulls (never-messaged) last by created_at desc.
  items.sort((a, b) => {
    const aTime = a.conversation.last_message_at;
    const bTime = b.conversation.last_message_at;
    if (aTime && bTime) return bTime.localeCompare(aTime);
    if (aTime) return -1;
    if (bTime) return 1;
    return b.conversation.created_at.localeCompare(a.conversation.created_at);
  });

  return items;
}

/** Find or create the 1:1 conversation with another member. Returns its id. */
export async function getOrCreateDm(otherProfileId: string): Promise<string> {
  const { data, error } = await supabase.rpc('get_or_create_dm', {
    p_other_profile_id: otherProfileId,
  });

  if (error) throw error;
  return data as string;
}

export interface DmMessagesPage {
  /** Newest first — matches the inverted chat FlatList. */
  messages: DmMessage[];
  /** created_at cursor for the next (older) page; null when no more pages */
  nextCursor: string | null;
}

/** Cursor-paginated messages, newest first. Pass the previous nextCursor. */
export async function listMessages(
  conversationId: string,
  before?: string | null
): Promise<DmMessagesPage> {
  let query = supabase
    .from('dm_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(DM_PAGE_SIZE);

  if (before) query = query.lt('created_at', before);

  const { data, error } = await query;
  if (error) throw error;

  const messages = (data ?? []) as DmMessage[];

  return {
    messages,
    nextCursor:
      messages.length === DM_PAGE_SIZE ? messages[messages.length - 1].created_at : null,
  };
}

export async function sendMessage(
  conversationId: string,
  content: string
): Promise<DmMessage> {
  const profileId = await getCurrentProfileId();

  const { data, error } = await supabase
    .from('dm_messages')
    .insert({
      conversation_id: conversationId,
      sender_profile_id: profileId,
      content: content.trim(),
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as DmMessage;
}

/** Stamp my read receipt (RPC-only — no direct dm_participants updates). */
export async function markRead(conversationId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_dm_read', {
    p_conversation_id: conversationId,
  });

  if (error) throw error;
}

/** Approved members matching the term by name or username (excludes me). */
export async function searchMembers(term: string): Promise<ProfileSummary[]> {
  const myProfileId = await getCurrentProfileId();

  // Strip PostgREST filter metacharacters so the ilike pattern stays safe.
  const safe = term.trim().replace(/[%_,().]/g, '');
  if (!safe) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, username, avatar_url')
    .eq('status', 'approved')
    .is('deleted_at', null)
    .neq('id', myProfileId)
    .or(`full_name.ilike.%${safe}%,username.ilike.%${safe}%`)
    .order('full_name', { ascending: true })
    .limit(20);

  if (error) throw error;
  return (data ?? []) as ProfileSummary[];
}

/** How many of my conversations have unread messages (for badges/dots). */
export async function unreadConversationsCount(): Promise<number> {
  const myProfileId = await getCurrentProfileId();

  const { data, error } = await supabase
    .from('dm_participants')
    .select(
      'last_read_at, conversation:dm_conversations(last_message_at, last_message_sender_profile_id)'
    )
    .eq('profile_id', myProfileId);

  if (error) throw error;

  const rows = (data ?? []) as unknown as {
    last_read_at: string | null;
    conversation: Pick<
      DmConversation,
      'last_message_at' | 'last_message_sender_profile_id'
    > | null;
  }[];

  return rows.filter(
    (row) => row.conversation && isUnread(row.conversation, row.last_read_at, myProfileId)
  ).length;
}
