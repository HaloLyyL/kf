export function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  } catch {
    // Audio not supported or autoplay blocked
  }
}

// Title flashing for background messages
let unreadCount = 0;
let originalTitle = document.title;
let flashTimer: number | null = null;

export function notifyNewMessage() {
  if (!document.hidden) return;
  unreadCount++;
  if (flashTimer) clearInterval(flashTimer);
  flashTimer = window.setInterval(() => {
    const hasPrefix = document.title.startsWith('【');
    document.title = hasPrefix ? originalTitle : `【${unreadCount}条新消息】${originalTitle}`;
  }, 800);
}

export function resetNotification() {
  if (flashTimer) {
    clearInterval(flashTimer);
    flashTimer = null;
  }
  unreadCount = 0;
  document.title = originalTitle;
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    resetNotification();
  }
});

// Desktop notification
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch {
    return false;
  }
}

export function showDesktopNotification(title: string, body: string, icon?: string) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (!document.hidden) return;

  try {
    const notification = new Notification(title, {
      body,
      icon: icon || '/logo.png',
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch {
    // Notification failed
  }
}
