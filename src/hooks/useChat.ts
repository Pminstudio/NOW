import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'system';
  createdAt: string;
  sender?: {
    name: string;
    avatar: string;
  };
}

export interface Conversation {
  id: string;
  pulseId: string | null;
  type: 'pulse_group' | 'direct';
  name: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessage?: Message;
  unreadCount: number;
  participants: {
    userId: string;
    name: string;
    avatar: string;
  }[];
}

export function useConversations(userId: string | undefined) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!userId) {
      setConversations([]);
      setLoading(false);
      return;
    }

    try {
      // Get conversations where user is a participant
      const { data: participantData, error: participantError } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          last_read_at,
          conversations (
            id,
            pulse_id,
            type,
            name,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', userId);

      if (participantError) throw participantError;

      const conversationIds = participantData?.map(p => p.conversation_id) || [];

      if (conversationIds.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // Get participants for each conversation
      const { data: allParticipants, error: partError } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          profiles (
            id,
            name,
            avatar_url
          )
        `)
        .in('conversation_id', conversationIds);

      if (partError) throw partError;

      // Get last message for each conversation
      const { data: lastMessages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false });

      if (msgError) throw msgError;

      // Get unread counts
      const { data: unreadData, error: unreadError } = await supabase
        .from('messages')
        .select('conversation_id, id')
        .in('conversation_id', conversationIds)
        .neq('sender_id', userId);

      // Build conversation objects
      const convos: Conversation[] = (participantData || []).map(p => {
        const conv = p.conversations as any;
        const participants = (allParticipants || [])
          .filter(ap => ap.conversation_id === conv.id)
          .map(ap => ({
            userId: (ap.profiles as any).id,
            name: (ap.profiles as any).name,
            avatar: (ap.profiles as any).avatar_url
          }));

        const lastMsg = (lastMessages || []).find(m => m.conversation_id === conv.id);

        // Count unread (messages after last_read_at)
        const unreadCount = (unreadData || []).filter(m =>
          m.conversation_id === conv.id
        ).length;

        return {
          id: conv.id,
          pulseId: conv.pulse_id,
          type: conv.type,
          name: conv.name,
          createdAt: conv.created_at,
          updatedAt: conv.updated_at,
          participants,
          unreadCount,
          lastMessage: lastMsg ? {
            id: lastMsg.id,
            conversationId: lastMsg.conversation_id,
            senderId: lastMsg.sender_id,
            content: lastMsg.content,
            type: lastMsg.type,
            createdAt: lastMsg.created_at
          } : undefined
        };
      });

      // Sort by last activity
      convos.sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      setConversations(convos);
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Get conversation for a pulse
  const getConversationForPulse = async (pulseId: string): Promise<Conversation | null> => {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('pulse_id', pulseId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      pulseId: data.pulse_id,
      type: data.type,
      name: data.name,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      participants: [],
      unreadCount: 0
    };
  };

  // Get or create direct conversation with another user
  const getOrCreateDirectConversation = async (otherUserId: string): Promise<{ conversation: Conversation | null; error: Error | null }> => {
    if (!userId) {
      return { conversation: null, error: new Error('Not authenticated') };
    }

    try {
      // Check if direct conversation already exists between these two users
      const { data: existingParticipants, error: searchError } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          conversations!inner (
            id,
            type,
            name,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', userId);

      if (searchError) throw searchError;

      // Find a direct conversation where both users are participants
      for (const p of existingParticipants || []) {
        const conv = p.conversations as any;
        if (conv.type !== 'direct') continue;

        // Check if the other user is also in this conversation
        const { data: otherParticipant } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', p.conversation_id)
          .eq('user_id', otherUserId)
          .single();

        if (otherParticipant) {
          // Found existing conversation
          return {
            conversation: {
              id: conv.id,
              pulseId: null,
              type: 'direct',
              name: conv.name,
              createdAt: conv.created_at,
              updatedAt: conv.updated_at,
              participants: [],
              unreadCount: 0
            },
            error: null
          };
        }
      }

      // No existing conversation, create a new one
      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert({
          type: 'direct',
          name: null
        })
        .select()
        .single();

      if (createError) throw createError;

      // Add both participants
      const { error: participantError } = await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: newConv.id, user_id: userId },
          { conversation_id: newConv.id, user_id: otherUserId }
        ]);

      if (participantError) throw participantError;

      return {
        conversation: {
          id: newConv.id,
          pulseId: null,
          type: 'direct',
          name: null,
          createdAt: newConv.created_at,
          updatedAt: newConv.updated_at,
          participants: [],
          unreadCount: 0
        },
        error: null
      };
    } catch (err) {
      console.error('Error getting/creating direct conversation:', err);
      return {
        conversation: null,
        error: err instanceof Error ? err : new Error('Failed to get or create conversation')
      };
    }
  };

  return {
    conversations,
    loading,
    refreshConversations: fetchConversations,
    getConversationForPulse,
    getOrCreateDirectConversation
  };
}

export function useMessages(conversationId: string | undefined, userId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const subscriptionRef = useRef<any>(null);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          profiles:sender_id (
            name,
            avatar_url
          )
        `)
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const transformed: Message[] = (data || []).map(m => ({
        id: m.id,
        conversationId: m.conversation_id,
        senderId: m.sender_id,
        content: m.content,
        type: m.type,
        createdAt: m.created_at,
        sender: m.profiles ? {
          name: (m.profiles as any).name,
          avatar: (m.profiles as any).avatar_url
        } : undefined
      }));

      setMessages(transformed);

      // Update last_read_at
      if (userId) {
        await supabase
          .from('conversation_participants')
          .update({ last_read_at: new Date().toISOString() })
          .eq('conversation_id', conversationId)
          .eq('user_id', userId);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  }, [conversationId, userId]);

  // Send a message
  const sendMessage = async (content: string): Promise<{ error: Error | null }> => {
    if (!conversationId || !userId || !content.trim()) {
      return { error: new Error('Invalid message') };
    }

    setSending(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          content: content.trim(),
          type: 'text'
        });

      if (error) throw error;

      return { error: null };
    } catch (err) {
      console.error('Error sending message:', err);
      return { error: err instanceof Error ? err : new Error('Failed to send message') };
    } finally {
      setSending(false);
    }
  };

  // Delete a message (soft delete)
  const deleteMessage = async (messageId: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('sender_id', userId);

      if (error) throw error;

      setMessages(prev => prev.filter(m => m.id !== messageId));
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Failed to delete message') };
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Subscribe to new messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          // Fetch sender info for the new message
          const { data: senderData } = await supabase
            .from('profiles')
            .select('name, avatar_url')
            .eq('id', payload.new.sender_id)
            .single();

          const newMessage: Message = {
            id: payload.new.id,
            conversationId: payload.new.conversation_id,
            senderId: payload.new.sender_id,
            content: payload.new.content,
            type: payload.new.type,
            createdAt: payload.new.created_at,
            sender: senderData ? {
              name: senderData.name,
              avatar: senderData.avatar_url
            } : undefined
          };

          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [conversationId]);

  return {
    messages,
    loading,
    sending,
    sendMessage,
    deleteMessage,
    refreshMessages: fetchMessages
  };
}
