import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Loader2 } from 'lucide-react';
import { useAgent } from '../store';
import { api } from '../../../lib/api';

const spring = [0.34, 1.56, 0.64, 1] as [number, number, number, number];
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

export default function ProfileModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { state, dispatch } = useAgent();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Sync form values from store each time the modal opens
  const [initializedFor, setInitializedFor] = useState(false);
  if (isOpen && !initializedFor) {
    setName(state.currentAgentName || '');
    setAvatar(state.currentAgentAvatar);
    setError('');
    setInitializedFor(true);
  } else if (!isOpen && initializedFor) {
    setInitializedFor(false);
  }

  const displayName = name.trim() || state.currentAgentId || '';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setError('图片不能超过 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatar(reader.result as string);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!state.currentAgentId) return;
    if (!name.trim()) {
      setError('名称不能为空');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      const res = await api.updateProfile({
        username: state.currentAgentId,
        displayName: name.trim(),
        avatar,
      });
      const user = res.user!;
      dispatch({
        type: 'SET_PROFILE',
        payload: { name: user.displayName, avatar: user.avatar ?? null },
      });
      dispatch({
        type: 'ADD_TOAST',
        payload: {
          id: `profile-${Date.now()}`,
          type: 'system',
          title: '资料已更新',
          autoDismiss: true,
        },
      });
      onClose();
    } catch (err: any) {
      setError(err.message || '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: spring }}
            className="relative w-full max-w-[380px] rounded-2xl bg-white p-6 shadow-xl"
          >
            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">编辑资料</h3>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Avatar */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group relative h-20 w-20 overflow-hidden rounded-full bg-[#EEF4FF]"
              >
                {avatar ? (
                  <img src={avatar} alt="头像" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-2xl font-semibold text-[#4F7BF7]">
                    {(displayName || '客').slice(0, 1)}
                  </span>
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <Camera className="h-6 w-6 text-white" />
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              {avatar && (
                <button
                  type="button"
                  onClick={() => setAvatar(null)}
                  className="mt-2 text-xs text-gray-400 transition-colors hover:text-gray-600"
                >
                  恢复默认头像
                </button>
              )}
            </div>

            {/* Name */}
            <div className="mt-5">
              <label className="mb-1.5 block text-xs font-medium text-[#6B7280]">名称</label>
              <input
                type="text"
                value={name}
                maxLength={20}
                onChange={(e) => { setName(e.target.value); setError(''); }}
                placeholder="请输入显示名称"
                className="h-11 w-full rounded-[10px] border border-[#E5E7EB] bg-white px-4 text-[15px] text-[#374151] outline-none transition-all duration-200 placeholder:text-[#D1D5DB] focus:border-[#4F7BF7] focus:shadow-[0_0_0_3px_rgba(79,123,247,0.1)]"
              />
            </div>

            {error && (
              <p className="mt-3 text-center text-sm text-[#EF4444]">{error}</p>
            )}

            {/* Footer */}
            <div className="mt-5 flex gap-3">
              <button
                onClick={onClose}
                className="flex flex-1 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex flex-1 items-center justify-center rounded-xl bg-[#4F7BF7] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3B6AE8] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : '保存'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
