import {createContext, useContext, useMemo, useState} from "react";

const ToastContext = createContext(null);
let toastId = 0;

export function ToastProvider({children}) {
  const [toasts, setToasts] = useState([]);

  const api = useMemo(() => {
    const addToast = (message, type = "info", duration = 4000) => {
      const id = toastId++;
      setToasts((prev) => [...prev, {id, message, type}]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, duration);
    };

    return {
      toasts,
      addSuccess: (message) => addToast(message, "success"),
      addError: (message) => addToast(message, "error", 5000),
      addWarning: (message) => addToast(message, "warning"),
      addInfo: (message) => addToast(message, "info")
    };
  }, [toasts]);

  return <ToastContext.Provider value={api}>{children}</ToastContext.Provider>;
}

export function useToasts() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToasts должен вызываться внутри ToastProvider");
  }
  return ctx;
}

