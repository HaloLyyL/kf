import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useAgent } from '../store';
import { socket } from '../../../lib/socket';
import type { AgentStatus } from '../types';

const STATUS_CONFIG: Record<AgentStatus, { label: string; color: string; bg: string }> = {
  online: { label: '在线', color: '#10B981', bg: '#D1FAE5' },
  away: { label: '离开', color: '#F59E0B', bg: '#FEF3C7' },
  offline: { label: '离线', color: '#9CA3AF', bg: '#F3F4F6' },
};

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number];

export default function StatusDropdown() {
  const { state, dispatch } = useAgent();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = STATUS_CONFIG[state.agentStatus];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleStatusChange = (status: AgentStatus) => {
    dispatch({ type: 'SET_STATUS', payload: status });
    socket.emit('agent:status', { status });
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium transition-all duration-200 hover:bg-gray-50"
      >
        <span
          className="relative h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: current.color }}
        >
          {state.agentStatus === 'online' && (
            <span
              className="absolute inset-0 rounded-full animate-ping"
              style={{ backgroundColor: current.color, opacity: 0.4 }}
            />
          )}
        </span>
        <span style={{ color: current.color }}>{current.label}</span>
        <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.2, ease: easeOut }}
            className="absolute right-0 top-full z-50 mt-1.5 w-36 rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg"
          >
            {(Object.entries(STATUS_CONFIG) as [AgentStatus, typeof STATUS_CONFIG[AgentStatus]][]).map(
              ([status, config]) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors duration-150 hover:bg-gray-50"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: config.color }}
                  />
                  <span style={{ color: config.color }} className="font-medium">
                    {config.label}
                  </span>
                </button>
              )
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
