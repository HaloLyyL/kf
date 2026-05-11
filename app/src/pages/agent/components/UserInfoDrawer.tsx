import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, MapPin, Monitor, MessageSquare, PhoneOff, PhoneForwarded } from 'lucide-react';
import { useAgent } from '../store';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number];

export default function UserInfoDrawer() {
  const { state, dispatch } = useAgent();
  const drawerRef = useRef<HTMLDivElement>(null);
  const currentSession = state.sessions.find((s) => s.id === state.currentSessionId);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && state.isUserInfoOpen) {
        dispatch({ type: 'SET_USER_INFO_OPEN', payload: false });
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state.isUserInfoOpen, dispatch]);

  if (!currentSession) return null;

  const { userInfo, messages } = currentSession;
  const messageCount = messages.filter((m) => m.sender !== 'system').length;

  const infoItems = [
    { icon: Clock, label: '接入时间', value: userInfo.joinTime.toLocaleString('zh-CN') },
    {
      icon: Clock,
      label: '会话时长',
      value: formatDistanceToNow(new Date(Date.now() - userInfo.duration * 1000), {
        addSuffix: false,
        locale: zhCN,
      }),
    },
    { icon: MessageSquare, label: '消息数量', value: `${messageCount} 条` },
    { icon: MapPin, label: '所在地区', value: userInfo.location },
    { icon: Monitor, label: '设备信息', value: userInfo.device },
  ];

  return (
    <AnimatePresence>
      {state.isUserInfoOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[80] bg-black/40"
            onClick={() => dispatch({ type: 'SET_USER_INFO_OPEN', payload: false })}
          />

          {/* Drawer */}
          <motion.div
            ref={drawerRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.35, ease: easeOut }}
            className="fixed bottom-0 right-0 top-0 z-[90] w-full bg-white sm:top-14 sm:w-[360px] sm:border-l sm:border-gray-200"
          >
            {/* Header */}
            <div className="flex h-14 items-center justify-between border-b border-gray-200 px-5">
              <h3 className="text-[15px] font-semibold text-gray-700">用户信息</h3>
              <button
                onClick={() => dispatch({ type: 'SET_USER_INFO_OPEN', payload: false })}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Profile */}
            <div className="flex flex-col items-center border-b border-gray-100 px-6 py-6">
              <img
                src={currentSession.userAvatar}
                alt={currentSession.userName}
                className="h-[72px] w-[72px] rounded-full"
              />
              <h4 className="mt-4 text-lg font-semibold text-gray-900">
                {currentSession.userName}
              </h4>
              <p className="mt-1 text-xs text-gray-400">ID: {userInfo.userId}</p>
            </div>

            {/* Info Fields */}
            <div className="px-6 py-5">
              {infoItems.map((item) => (
                <div key={item.label} className="mb-4 flex items-start gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-50">
                    <item.icon className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-sm text-gray-700">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Notes */}
            <div className="border-t border-gray-100 px-6 py-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">备注</p>
              <textarea
                value={userInfo.notes}
                onChange={(e) =>
                  dispatch({
                    type: 'UPDATE_USER_NOTES',
                    payload: { sessionId: currentSession.id, notes: e.target.value },
                  })
                }
                placeholder="添加备注..."
                rows={4}
                className="mt-2 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none transition-all focus:border-[#4F7BF7] focus:bg-white focus:ring-2 focus:ring-[#4F7BF7]/10 placeholder:text-gray-400"
              />
            </div>

            {/* Actions */}
            <div className="absolute bottom-0 left-0 right-0 border-t border-gray-100 bg-white p-5">
              <button
                onClick={() => {
                  dispatch({ type: 'END_SESSION', payload: currentSession.id });
                  dispatch({ type: 'SET_USER_INFO_OPEN', payload: false });
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-500 transition-colors hover:bg-red-100"
              >
                <PhoneOff className="h-4 w-4" />
                结束会话
              </button>
              <button
                onClick={() => {
                  dispatch({ type: 'SET_TRANSFER_OPEN', payload: true });
                  dispatch({ type: 'SET_USER_INFO_OPEN', payload: false });
                }}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
              >
                <PhoneForwarded className="h-4 w-4" />
                转接客服
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
