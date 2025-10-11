type SessionListener = () => void;

const listeners = new Set<SessionListener>();

export const subscribeSessionChange = (listener: SessionListener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const emitSessionChange = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Listener failures should not break subsequent listeners.
    }
  });
};
