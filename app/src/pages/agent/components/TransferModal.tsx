import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserCheck } from 'lucide-react';
import { useAgent } from '../store';
import type { Agent } from '../types';

const spring = [0.34, 1.56, 0.64, 1] as [number, number, number, number];

function AgentItem({
  agent,
  selected,
  onSelect,
}: {
  agent: Agent;
  selected: boolean;
  onSelect: () => void;
}) {
  const statusColor =
    agent.status === 'online'
      ? '#10B981'
      : agent.status === 'away'
        ? '#F59E0B'
        : '#9CA3AF';

  const statusLabel =
    agent.status === 'online' ? '在线' : agent.status === 'away' ? '离开' : '离线';

  return (
    <button
      onClick={onSelect}
      disabled={agent.status === 'offline'}
      className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all duration-200 ${
        selected
          ? 'border border-[#4F7BF7]/30 bg-[#EEF4FF]'
          : agent.status === 'offline'
            ? 'cursor-not-allowed opacity-50'
            : 'hover:bg-gray-50'
      }`}
    >
      <div className="relative flex-shrink-0">
        <img src={agent.avatar} alt={agent.name} className="h-9 w-9 rounded-full" />
        <span
          className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white"
          style={{ backgroundColor: statusColor }}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-700">{agent.name}</p>
        <p className="text-[11px] text-gray-400">
          {statusLabel} · 当前 {agent.currentSessions} 个会话
        </p>
      </div>

      <div
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all ${
          selected
            ? 'border-[#4F7BF7] bg-[#4F7BF7]'
            : 'border-gray-300 bg-transparent'
        }`}
      >
        {selected && <UserCheck className="h-3 w-3 text-white" />}
      </div>
    </button>
  );
}

export default function TransferModal() {
  const { state, dispatch } = useAgent();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const currentSession = state.sessions.find((s) => s.id === state.currentSessionId);

  const sortedAgents = [...state.agents].sort((a, b) => {
    if (a.status === 'online' && b.status !== 'online') return -1;
    if (a.status !== 'online' && b.status === 'online') return 1;
    return 0;
  });

  const handleConfirm = () => {
    if (!selectedAgentId || !currentSession) return;
    dispatch({
      type: 'TRANSFER_SESSION',
      payload: { sessionId: currentSession.id, agentId: selectedAgentId },
    });
    setSelectedAgentId(null);
  };

  const handleClose = () => {
    dispatch({ type: 'SET_TRANSFER_OPEN', payload: false });
    setSelectedAgentId(null);
  };

  return (
    <AnimatePresence>
      {state.isTransferOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/40"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: spring }}
            className="relative w-full max-w-[480px] rounded-2xl bg-white p-6 shadow-xl"
          >
            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">转接会话</h3>
                <p className="mt-1 text-sm text-gray-400">
                  {currentSession ? `选择要转接 ${currentSession.userName} 的客服` : '选择要转接给的客服'}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Agent List */}
            <div className="max-h-[360px] overflow-y-auto py-2">
              {sortedAgents.map((agent) => (
                <div key={agent.id} className="mb-2">
                  <AgentItem
                    agent={agent}
                    selected={selectedAgentId === agent.id}
                    onSelect={() => setSelectedAgentId(agent.id)}
                  />
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-5 flex gap-3">
              <button
                onClick={handleClose}
                className="flex flex-1 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedAgentId}
                className="flex flex-1 items-center justify-center rounded-xl bg-[#4F7BF7] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3B6AE8] disabled:cursor-not-allowed disabled:opacity-40"
              >
                确认转接
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
