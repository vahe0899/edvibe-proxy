import {useEffect, useRef} from "react";
import {createPortal} from "react-dom";
import {useToasts} from "../state/ToastContext.jsx";

export default function ToastContainer() {
  const {toasts} = useToasts();
  const containerRef = useRef(null);

  useEffect(() => {
    containerRef.current = document.getElementById("toast-container");
    if (!containerRef.current) {
      const element = document.createElement("div");
      element.id = "toast-container";
      document.body.appendChild(element);
      containerRef.current = element;
    }
  }, []);

  if (!containerRef.current) return null;

  return createPortal(
    <>
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.type} is-visible`}>
          {toast.message}
        </div>
      ))}
    </>,
    containerRef.current
  );
}

