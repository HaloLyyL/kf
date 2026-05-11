import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, PanelLeft } from 'lucide-react';
import { useAgent } from '../store';
import StatusDropdown from './StatusDropdown';

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number];

export default function TopNav() {
  const { state, dispatch } = useAgent();
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <motion.header
      initial={{ y: -56, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: easeOut }}
      className="flex h-14 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-5 z-10"
    >
      {/* Left: Menu toggle + Brand */}
      <div className="flex items-center gap-3">
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 lg:hidden"
          onClick={() => {
            dispatch({ type: 'SET_MOBILE_CHAT', payload: false });
          }}
        >
          <PanelLeft className="h-[22px] w-[22px]" />
        </button>
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="" className="h-7 w-7" />
          <span className="text-[15px] font-semibold text-gray-700">ConnectHub</span>
        </div>
      </div>

      {/* Center: Search (desktop) */}
      <div className="hidden sm:block">
        <div
          className="relative flex items-center transition-all duration-300"
          style={{ width: searchFocused ? 420 : 360 }}
        >
          <Search className="absolute left-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索会话..."
            value={state.searchQuery}
            onChange={(e) => dispatch({ type: 'SET_SEARCH', payload: e.target.value })}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="h-9 w-full rounded-full border-0 bg-gray-50 pl-9 pr-4 text-sm text-gray-700 outline-none transition-all duration-300 placeholder:text-gray-400 focus:ring-2 focus:ring-[#4F7BF7]/20"
          />
        </div>
      </div>

      {/* Right: Status + Agent */}
      <div className="flex items-center gap-3">
        <StatusDropdown />
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EEF4FF]">
          <span className="text-sm font-semibold text-[#4F7BF7]">客</span>
        </div>
      </div>
    </motion.header>
  );
}
