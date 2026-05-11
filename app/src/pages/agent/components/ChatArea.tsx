import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  UserCircle,
  Send,
  Image as ImageIcon,
  Check,
  CheckCheck,
  Clock,
  X,
} from 'lucide-react';
import { useAgent } from '../store';
import { QUICK_REPLIES } from '../mockData';
import type { Message } from '../types';

const spring = [0.34, 1.56, 0.64, 1] as [number, number, number, number];

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-2">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-2 w-2 rounded-full bg-[#4F7BF7]"
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
      <span className="text-xs text-gray-400">正在输入...</span>
    </div>
  );
}

function MessageStatus({ status }: { status: Message['status'] }) {
  if (status === 'sending') return <Clock className="h-3 w-3 text-gray-300" />;
  if (status === 'sent') return <Check className="h-3 w-3 text-gray-300" />;
  if (status === 'delivered') return <CheckCheck className="h-3 w-3 text-gray-300" />;
  return <CheckCheck className="h-3 w-3 text-[#4F7BF7]" />;
}

function MessageBubble({ message, showAvatar, agentAvatar, onAvatarClick, onImageClick }: { message: Message; showAvatar: boolean; agentAvatar?: string; onAvatarClick?: (url: string) => void; onImageClick?: (url: string) => void }) {
  const isAgent = message.sender === 'agent';
  const isSystem = message.sender === 'system';

  if (isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex justify-center py-2"
      >
        <span className="text-xs italic text-gray-400">{message.content}</span>
      </motion.div>
    );
  }

  const avatarUrl = isAgent ? (agentAvatar || '/avatar-placeholder.png') : '/avatar-placeholder.png';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: spring }}
      className={`flex items-end gap-2 px-5 py-1 ${isAgent ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      {showAvatar ? (
        <img
          src={avatarUrl}
          alt=""
          className="h-8 w-8 flex-shrink-0 cursor-pointer rounded-full"
          onClick={() => onAvatarClick?.(avatarUrl)}
        />
      ) : (
        <div className="h-8 w-8 flex-shrink-0" />
      )}

      <div className={`flex max-w-[70%] flex-col ${isAgent ? 'items-end' : 'items-start'}`}>
        <div
          className={`relative px-4 py-2.5 text-sm leading-relaxed ${
            isAgent
              ? 'rounded-2xl rounded-br-md bg-[#4F7BF7] text-white'
              : 'rounded-2xl rounded-bl-md border border-gray-200 bg-white text-gray-700 shadow-sm'
          }`}
        >
          {message.type === 'image' ? (
            <img
              src={message.content}
              alt="图片消息"
              className="max-w-full cursor-pointer rounded-lg"
              onClick={() => onImageClick?.(message.content)}
            />
          ) : (
            message.content
          )}
        </div>
        <div className="mt-1 flex items-center gap-1 px-1">
          <span className="text-[11px] text-gray-400">
            {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {isAgent && <MessageStatus status={message.status} />}
        </div>
      </div>
    </motion.div>
  );
}

export default function ChatArea() {
  const { state, dispatch, sendMessage } = useAgent();
  const [input, setInput] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentSession = state.sessions.find((s) => s.id === state.currentSessionId);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages.length, currentSession?.isTyping, scrollToBottom]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || !currentSession) return;
    sendMessage(currentSession.id, trimmed);
    setInput('');
    inputRef.current?.focus();
  }, [input, currentSession, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickReply = (text: string) => {
    if (!currentSession) return;
    sendMessage(currentSession.id, text);
  };

  const handleEndSession = () => {
    if (!currentSession) return;
    dispatch({ type: 'END_SESSION', payload: currentSession.id });
    dispatch({ type: 'SELECT_SESSION', payload: null });
  };

  const handleImageSelect = () => {
    fileInputRef.current?.click();
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxWidth = 1024;
          const scale = Math.min(1, maxWidth / img.width);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas not supported'));
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = reject;
        img.src = event.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentSession) return;
    try {
      const base64 = await compressImage(file);
      sendMessage(currentSession.id, base64, 'image');
    } catch (err) {
      console.error('Image compression failed', err);
    } finally {
      e.target.value = '';
    }
  };

  // Empty state
  if (!currentSession) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-1 flex-col items-center justify-center bg-[#F3F4F6]"
      >
        <img src="/empty-state-chat.png" alt="" className="h-32 w-32 object-contain opacity-50" />
        <p className="mt-4 text-base font-medium text-gray-400">选择一个会话开始聊天</p>
        <p className="mt-1 text-sm text-gray-400">从左侧列表选择一个用户</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      key={currentSession.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex flex-1 flex-col bg-[#F3F4F6]"
    >
      {/* Chat Header */}
      <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => dispatch({ type: 'SET_MOBILE_CHAT', payload: false })}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 sm:hidden"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <img
            src={currentSession.userAvatar}
            alt={currentSession.userName}
            className="h-9 w-9 rounded-full"
          />
          <div>
            <p className="text-sm font-semibold text-gray-700">{currentSession.userName}</p>
            <p className="text-[11px] text-gray-400">
              {currentSession.userStatus === 'online' ? '在线' : '离线'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => dispatch({ type: 'SET_USER_INFO_OPEN', payload: true })}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            <UserCircle className="h-4 w-4" />
            <span className="hidden sm:inline">用户信息</span>
          </button>

          <button
            onClick={handleEndSession}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 text-sm font-medium text-red-500 transition-colors hover:bg-red-50"
          >
            <span className="hidden sm:inline">结束会话</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4">
        {currentSession.messages.map((msg, i) => {
          const prevMsg = currentSession.messages[i - 1];
          const showAvatar = !prevMsg || prevMsg.sender !== msg.sender || msg.sender === 'system';
          const agentAvatar = state.agents.find((a) => a.id === state.currentAgentId)?.avatar;
          return <MessageBubble key={msg.id} message={msg} showAvatar={showAvatar} agentAvatar={agentAvatar} onAvatarClick={setPreviewImage} onImageClick={setPreviewImage} />;
        })}

        {currentSession.isTyping && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Replies */}
      <div className="flex-shrink-0 overflow-x-auto border-t border-gray-100 bg-white/50 px-4 py-2 scrollbar-hide">
        <div className="flex gap-2">
          {QUICK_REPLIES.map((reply, i) => (
            <motion.button
              key={reply}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04 }}
              onClick={() => handleQuickReply(reply)}
              className="flex-shrink-0 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-[12px] font-medium text-gray-600 transition-all duration-200 hover:border-[#4F7BF7]/30 hover:bg-[#EEF4FF] hover:text-[#4F7BF7]"
            >
              {reply}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Avatar Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
            onClick={() => setPreviewImage(null)}
          >
            <motion.img
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              src={previewImage}
              alt="头像预览"
              className="max-h-[80vh] max-w-[80vw] rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              className="absolute right-4 top-4 rounded-full bg-black/40 p-2 text-white transition-colors hover:bg-black/60"
              onClick={() => setPreviewImage(null)}
            >
              <X className="h-6 w-6" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            onClick={handleImageSelect}
            aria-label="发送图片"
          >
            <ImageIcon className="h-5 w-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleFileChange}
          />

          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息..."
              rows={1}
              className="max-h-24 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 outline-none transition-all duration-200 placeholder:text-gray-400 focus:border-[#4F7BF7] focus:bg-white focus:ring-2 focus:ring-[#4F7BF7]/10"
              style={{ minHeight: 40 }}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#4F7BF7] text-white shadow-sm transition-all duration-200 hover:bg-[#3B6AE8] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
