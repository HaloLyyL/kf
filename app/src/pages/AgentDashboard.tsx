import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentProvider, useAgent } from './agent/store';
import TopNav from './agent/components/TopNav';
import Sidebar from './agent/components/Sidebar';
import ChatArea from './agent/components/ChatArea';
import UserInfoDrawer from './agent/components/UserInfoDrawer';
import TransferModal from './agent/components/TransferModal';
import ToastContainer from './agent/components/ToastContainer';

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number];

function DashboardInner() {
  const { state, dispatch } = useAgent();

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        searchInput?.focus();
      }
      if (e.key === 'Escape') {
        if (state.isTransferOpen) dispatch({ type: 'SET_TRANSFER_OPEN', payload: false });
      }
      if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        const activeSessions = state.sessions.filter((s) => s.status === 'active');
        if (activeSessions[index]) {
          dispatch({ type: 'SELECT_SESSION', payload: activeSessions[index].id });
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        const nextUnread = state.sessions.find((s) => s.unreadCount > 0 && s.status === 'active');
        if (nextUnread) {
          dispatch({ type: 'SELECT_SESSION', payload: nextUnread.id });
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state.sessions, state.isTransferOpen, dispatch]);

  // Title update with unread count
  useEffect(() => {
    const totalUnread = state.sessions.reduce((sum, s) => sum + s.unreadCount, 0);
    document.title = totalUnread > 0 ? `(${totalUnread}) 客服工作台 - ConnectHub` : '客服工作台 - ConnectHub';
    return () => {
      document.title = 'ConnectHub';
    };
  }, [state.sessions]);

  return (
    <div className="flex h-[100dvh] w-screen flex-col overflow-hidden bg-white">
      {/* Top Navigation */}
      <TopNav />

      {/* Main Content */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Desktop: left sidebar + right chat */}
        <div className="hidden h-full sm:flex">
          <Sidebar />
        </div>
        <div className="hidden h-full flex-1 sm:flex">
          <ChatArea />
        </div>

        {/* Mobile: toggle between sidebar and chat */}
        <div className="flex h-full w-full sm:hidden">
          <AnimatePresence mode="wait">
            {state.isMobileChatOpen && state.currentSessionId ? (
              <motion.div
                key="chat"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ duration: 0.3, ease: easeOut }}
                className="absolute inset-0 z-20 flex w-full"
              >
                <ChatArea />
              </motion.div>
            ) : (
              <motion.div
                key="sidebar"
                initial={{ x: 0 }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ duration: 0.3, ease: easeOut }}
                className="flex w-full"
              >
                <Sidebar />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Overlays */}
      <UserInfoDrawer />
      <TransferModal />
      <ToastContainer />
    </div>
  );
}

export default function AgentDashboard() {
  return (
    <AgentProvider>
      <DashboardInner />
    </AgentProvider>
  );
}
