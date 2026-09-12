import { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Users,

  Search,
  Trash2,
} from 'lucide-react';
import { useAgent } from '../store';
import type { Session, SidebarFilter } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number];

function formatTimeAgo(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true, locale: zhCN });
}

const FILTER_CONFIG: { key: SidebarFilter; label: string; icon: typeof MessageSquare }[] = [
  { key: 'all', label: '全部', icon: MessageSquare },
  { key: 'unread', label: '未读', icon: MessageSquare },
  { key: 'online', label: '在线', icon: Users },
];

const DELETE_WIDTH = 72;

function SessionCard({
  session,
  isActive,
  isSwipeOpen,
  onSwipeOpen,
  onSwipeClose,
  onClick,
  onDelete,
}: {
  session: Session;
  isActive: boolean;
  isSwipeOpen: boolean;
  onSwipeOpen: () => void;
  onSwipeClose: () => void;
  onClick: () => void;
  onDelete: () => void;
}) {
  const startX = useRef(0);
  const startY = useRef(0);
  const swiping = useRef<boolean | null>(null);
  const [dragX, setDragX] = useState<number | null>(null);
  const offset = dragX ?? (isSwipeOpen ? DELETE_WIDTH : 0);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    swiping.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    if (swiping.current === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      swiping.current = Math.abs(dx) > Math.abs(dy);
    }
    if (!swiping.current) return;
    const base = isSwipeOpen ? DELETE_WIDTH : 0;
    setDragX(Math.max(0, Math.min(DELETE_WIDTH, base + dx)));
  };

  const handleTouchEnd = () => {
    if (dragX === null) return;
    if (dragX > DELETE_WIDTH / 2) onSwipeOpen();
    else onSwipeClose();
    setDragX(null);
  };

  const handleClick = () => {
    if (isSwipeOpen) {
      onSwipeClose();
      return;
    }
    onClick();
  };

  return (
    <div className="relative mb-1 overflow-hidden rounded-xl">
      {/* Delete button revealed by swiping right */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute inset-y-0 left-0 flex w-[72px] flex-col items-center justify-center gap-1 bg-[#EF4444] text-white"
        style={{ visibility: offset > 0 ? 'visible' : 'hidden' }}
        aria-label="删除会话"
      >
        <Trash2 className="h-4 w-4" />
        <span className="text-[12px] font-semibold">删除</span>
      </button>

      <motion.div
        layout
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0, x: offset }}
        transition={{ duration: 0.25, ease: easeOut }}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`group relative flex cursor-pointer items-center rounded-xl px-3.5 py-3 transition-colors duration-200 ${
          isActive
            ? 'bg-white shadow-sm before:absolute before:left-0 before:top-2 before:h-[calc(100%-16px)] before:w-[3px] before:rounded-r-full before:bg-[#4F7BF7]'
            : 'bg-[#F8FAFC] hover:bg-gray-100'
        }`}
      >
        {/* Avatar with status dot */}
        <div className="relative mr-3 flex-shrink-0">
          <img
            src={session.userAvatar}
            alt={session.userName}
            className="h-11 w-11 rounded-full object-cover"
          />
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#F8FAFC] ${
              session.userStatus === 'online' ? 'bg-[#10B981]' : 'bg-gray-400'
            }`}
          />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <span
              className={`truncate text-[14px] ${
                session.unreadCount > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
              }`}
            >
              {session.userName}
            </span>
            <span className="ml-2 flex-shrink-0 text-[11px] font-medium text-gray-400 transition-opacity group-hover:opacity-0">
              {formatTimeAgo(session.lastMessageTime)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            {session.isTyping ? (
              <span className="truncate text-[12px] font-medium italic text-[#4F7BF7]">
                正在输入...
              </span>
            ) : (
              <span
                className={`truncate text-[12px] ${
                  session.unreadCount > 0 ? 'font-medium text-gray-700' : 'text-gray-400'
                }`}
              >
                {session.lastMessage.startsWith('data:image') ? '图片' : session.lastMessage}
              </span>
            )}
            {session.unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 15, delay: 0.1 }}
                className="ml-2 flex h-[18px] min-w-[18px] flex-shrink-0 items-center justify-center rounded-full bg-[#EF4444] px-1 text-[11px] font-semibold text-white"
              >
                {session.unreadCount}
              </motion.span>
            )}
          </div>
        </div>

        {/* Desktop: hover delete button (covers the timestamp) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute right-2 top-1.5 hidden h-6 w-6 items-center justify-center rounded-md text-gray-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-[#EF4444] group-hover:opacity-100 sm:flex"
          aria-label="删除会话"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </motion.div>
    </div>
  );
}

export default function Sidebar() {
  const { state, dispatch, deleteSession } = useAgent();
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);

  const handleDelete = (session: Session) => {
    setOpenSwipeId(null);
    deleteSession(session.id);
    dispatch({
      type: 'ADD_TOAST',
      payload: {
        id: `del-${session.id}-${Date.now()}`,
        type: 'system',
        title: '会话已删除',
        message: session.userName,
        autoDismiss: true,
      },
    });
  };

  const mySessions = useMemo(() => {
    if (!state.currentAgentId) return state.sessions;
    return state.sessions.filter((s) => s.agentId === state.currentAgentId);
  }, [state.sessions, state.currentAgentId]);

  const filteredSessions = useMemo(() => {
    let filtered = mySessions.filter((s) => {
      if (state.sessionTab === 'active' && s.status !== 'active') return false;
      if (state.sessionTab === 'ended' && s.status !== 'ended') return false;
      return true;
    });

    if (state.sidebarFilter === 'unread') {
      filtered = filtered.filter((s) => s.unreadCount > 0);
    } else if (state.sidebarFilter === 'online') {
      filtered = filtered.filter((s) => s.userStatus === 'online');
    }

    if (state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase();
      filtered = filtered.filter((s) => s.userName.toLowerCase().includes(q));
    }

    // Sort: unread first, then by last message time
    filtered.sort((a, b) => {
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
    });

    return filtered;
  }, [mySessions, state.sessionTab, state.sidebarFilter, state.searchQuery]);

  const activeCount = mySessions.filter((s) => s.status === 'active').length;

  return (
    <motion.aside
      initial={{ x: -320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: easeOut }}
      className="flex h-full w-full flex-col border-r border-gray-200 bg-[#F8FAFC] sm:w-[280px] lg:w-[320px]"
    >
      {/* Sidebar Header */}
      <div className="flex h-[52px] flex-shrink-0 items-center justify-between border-b border-gray-200 px-4">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-semibold text-gray-700">会话列表</h2>
          <span className="rounded-full bg-[#4F7BF7] px-2 py-0.5 text-[11px] font-semibold text-white">
            {activeCount}
          </span>
        </div>
      </div>

      {/* Mobile Search */}
      <div className="px-3 pt-3 sm:hidden">
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索会话..."
            value={state.searchQuery}
            onChange={(e) => dispatch({ type: 'SET_SEARCH', payload: e.target.value })}
            className="h-9 w-full rounded-full border-0 bg-gray-100 pl-9 pr-4 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-[#4F7BF7]/20"
          />
        </div>
      </div>

      {/* Tabs: Active / Ended */}
      <div className="flex border-b border-gray-200 px-4">
        <button
          onClick={() => dispatch({ type: 'SET_SESSION_TAB', payload: 'active' })}
          className={`relative flex-1 pb-2.5 pt-3 text-[13px] font-medium transition-colors ${
            state.sessionTab === 'active' ? 'text-[#4F7BF7]' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          当前会话
          {state.sessionTab === 'active' && (
            <motion.div
              layoutId="sessionTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4F7BF7]"
            />
          )}
        </button>
        <button
          onClick={() => dispatch({ type: 'SET_SESSION_TAB', payload: 'ended' })}
          className={`relative flex-1 pb-2.5 pt-3 text-[13px] font-medium transition-colors ${
            state.sessionTab === 'ended' ? 'text-[#4F7BF7]' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          已结束
          {state.sessionTab === 'ended' && (
            <motion.div
              layoutId="sessionTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4F7BF7]"
            />
          )}
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 px-4 pt-3">
        {FILTER_CONFIG.map((f) => (
          <button
            key={f.key}
            onClick={() => dispatch({ type: 'SET_SIDEBAR_FILTER', payload: f.key })}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium transition-all duration-200 ${
              state.sidebarFilter === f.key
                ? 'bg-[#EEF4FF] text-[#4F7BF7]'
                : 'bg-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <f.icon className="h-3.5 w-3.5" />
            {f.label}
          </button>
        ))}
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <AnimatePresence mode="popLayout">
          {filteredSessions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <MessageSquare className="h-12 w-12 text-gray-300" />
              <p className="mt-3 text-sm text-gray-400">暂无会话</p>
              <p className="mt-1 text-xs text-gray-400">等待用户接入...</p>
            </motion.div>
          ) : (
            filteredSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                isActive={state.currentSessionId === session.id}
                isSwipeOpen={openSwipeId === session.id}
                onSwipeOpen={() => setOpenSwipeId(session.id)}
                onSwipeClose={() => setOpenSwipeId(null)}
                onClick={() => {
                  dispatch({ type: 'SELECT_SESSION', payload: session.id });
                  dispatch({ type: 'SET_MOBILE_CHAT', payload: true });
                }}
                onDelete={() => handleDelete(session)}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}
