import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMessages, Message } from '../src/hooks/useChat';

interface ChatViewProps {
  conversationId: string;
  conversationName: string;
  userId: string;
  onBack: () => void;
}

const ChatView: React.FC<ChatViewProps> = ({
  conversationId,
  conversationName,
  userId,
  onBack
}) => {
  const { messages, loading, sending, sendMessage } = useMessages(conversationId, userId);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    const content = newMessage;
    setNewMessage('');
    inputRef.current?.focus();

    await sendMessage(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    } else {
      return date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
    }
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = [];
  let currentDate = '';

  messages.forEach(msg => {
    const msgDate = new Date(msg.createdAt).toDateString();
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedMessages.push({ date: msg.createdAt, messages: [msg] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      className="absolute inset-0 bg-[#FAFAFA] z-[90] flex flex-col"
    >
      {/* Header */}
      <div className="p-6 flex items-center gap-4 bg-white border-b border-gray-100 shadow-sm">
        <button
          onClick={onBack}
          className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center active:scale-90 transition-all"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-5 h-5 text-gray-700">
            <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="font-black text-xl text-gray-900 truncate">{conversationName}</h1>
          <p className="text-xs text-gray-400 font-bold">Chat du groupe</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex gap-2">
              <div className="w-3 h-3 bg-violet-400 rounded-full animate-bounce" />
              <div className="w-3 h-3 bg-violet-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-3 h-3 bg-violet-400 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-20 h-20 bg-violet-100 rounded-full flex items-center justify-center mb-6">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-10 h-10 text-violet-400">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-gray-500 font-bold">Aucun message</p>
            <p className="text-gray-400 text-sm mt-2">Sois le premier à envoyer un message !</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedMessages.map((group, groupIdx) => (
              <div key={groupIdx}>
                {/* Date separator */}
                <div className="flex items-center justify-center my-6">
                  <div className="bg-gray-200 text-gray-500 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full">
                    {formatDate(group.date)}
                  </div>
                </div>

                {/* Messages for this date */}
                <div className="space-y-3">
                  {group.messages.map((msg, msgIdx) => {
                    const isOwn = msg.senderId === userId;
                    const showAvatar = !isOwn && (msgIdx === 0 || group.messages[msgIdx - 1].senderId !== msg.senderId);

                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isOwn && (
                          <div className="w-10 mr-2 flex-shrink-0">
                            {showAvatar && msg.sender && (
                              <img
                                src={msg.sender.avatar}
                                alt={msg.sender.name}
                                className="w-10 h-10 rounded-2xl object-cover"
                              />
                            )}
                          </div>
                        )}
                        <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                          {showAvatar && !isOwn && msg.sender && (
                            <p className="text-[10px] font-bold text-gray-400 mb-1 ml-1">
                              {msg.sender.name}
                            </p>
                          )}
                          <div
                            className={`px-5 py-3 rounded-3xl ${
                              isOwn
                                ? 'bg-violet-600 text-white rounded-br-lg'
                                : 'bg-white text-gray-800 rounded-bl-lg shadow-sm border border-gray-100'
                            }`}
                          >
                            <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                              {msg.content}
                            </p>
                          </div>
                          <p className={`text-[10px] text-gray-400 mt-1 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>
                            {formatTime(msg.createdAt)}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex gap-3 items-end">
          <div className="flex-1 bg-gray-100 rounded-3xl p-1">
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Écris un message..."
              className="w-full bg-transparent border-none p-3 focus:ring-0 text-gray-800 placeholder:text-gray-400 resize-none max-h-32"
              rows={1}
              style={{ minHeight: '44px' }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="w-14 h-14 bg-violet-600 rounded-2xl flex items-center justify-center text-white disabled:opacity-50 active:scale-90 transition-all shadow-lg shadow-violet-600/30"
          >
            {sending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-6 h-6">
                <line x1="22" y1="2" x2="11" y2="13" strokeLinecap="round" strokeLinejoin="round"/>
                <polygon points="22,2 15,22 11,13 2,9" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ChatView;
