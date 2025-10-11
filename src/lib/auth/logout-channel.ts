export type LogoutReason = 'logout' | 'logout_failed';

type LogoutListener = (reason: LogoutReason) => void;

const CHANNEL_NAME = 'fe-moderator:logout';
const STORAGE_KEY = `${CHANNEL_NAME}:storage`;

const listeners = new Set<LogoutListener>();

let broadcastChannel: BroadcastChannel | null = null;
let storageListenerAttached = false;

const notifyListeners = (reason: LogoutReason) => {
  listeners.forEach((listener) => {
    try {
      listener(reason);
    } catch {
      // Swallow listener errors so other callbacks still run.
    }
  });
};

const handleStorageEvent = (event: StorageEvent) => {
  if (event.key === STORAGE_KEY && event.newValue) {
    try {
      const parsed = JSON.parse(event.newValue) as { reason?: LogoutReason };
      const reason = parsed.reason === 'logout_failed' ? 'logout_failed' : 'logout';
      notifyListeners(reason);
    } catch {
      notifyListeners('logout');
    }
  }
};

const ensureBroadcastChannel = () => {
  if (typeof window === 'undefined') {
    return;
  }

  if (!broadcastChannel && typeof BroadcastChannel !== 'undefined') {
    try {
      broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
      broadcastChannel.onmessage = (event) => {
        if (!event) {
          return;
        }
        const { data } = event;
        if (typeof data === 'string') {
          notifyListeners(data === 'logout_failed' ? 'logout_failed' : 'logout');
          return;
        }
        if (data && typeof data === 'object' && 'reason' in data) {
          const reason = (data as { reason?: LogoutReason }).reason === 'logout_failed' ? 'logout_failed' : 'logout';
          notifyListeners(reason);
        }
      };
    } catch (error) {
      console.warn('BroadcastChannel unavailable for logout events', error);
      broadcastChannel = null;
    }
  }

  if (!storageListenerAttached) {
    try {
      window.addEventListener('storage', handleStorageEvent);
      storageListenerAttached = true;
    } catch {
      storageListenerAttached = false;
    }
  }
};

export const subscribeLogout = (listener: LogoutListener): (() => void) => {
  listeners.add(listener);
  ensureBroadcastChannel();
  return () => {
    listeners.delete(listener);
  };
};

export const broadcastLogout = (reason: LogoutReason = 'logout') => {
  if (typeof window === 'undefined') {
    return;
  }

  ensureBroadcastChannel();

  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ reason });
    } catch {
      // Ignore BroadcastChannel errors and fall back to storage events.
    }
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ reason, at: Date.now() }));
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage access issues (e.g., private mode).
  }
};
