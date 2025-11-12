import {useEffect, useState} from "react";
import {createPortal} from "react-dom";
import {useAppState} from "../../state/AppStateContext.jsx";
import {useToasts} from "../../state/ToastContext.jsx";

const parseCurrency = (value, fallback = 0) => {
  if (typeof value === "number") return value;
  if (!value) return fallback;
  const normalized = value.toString().replace(/\s/g, "").replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : fallback;
};

export default function EditStudentModal({student, onClose}) {
  const {
    actions: {updateStudent}
  } = useAppState();
  const toasts = useToasts();

  const [name, setName] = useState(student.name);
  const [contact, setContact] = useState(student.contact);
  const [notes, setNotes] = useState(student.notes);
  const [balance, setBalance] = useState(
    student.balance != null ? String(student.balance) : "0"
  );

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toasts.addWarning("Имя ученика не может быть пустым.");
      return;
    }

    const normalizedBalance = Math.round(parseCurrency(balance, student.balance) * 100) / 100;

    updateStudent(student.id, {
      name: trimmedName,
      contact: contact.trim(),
      notes: notes.trim(),
      balance: normalizedBalance
    });

    toasts.addSuccess("Данные ученика обновлены.");
    onClose();
  };

  return createPortal(
    <div className="modal-backdrop">
      <form className="modal" onSubmit={handleSubmit}>
        <header className="modal__header">
          <h3 className="modal__title">Редактирование ученика</h3>
          <button type="button" className="btn ghost small" onClick={onClose}>
            Закрыть
          </button>
        </header>

        <div className="grid-two-columns">
          <label className="form-field">
            <span>Имя</span>
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="form-field">
            <span>Контакты</span>
            <input value={contact} onChange={(event) => setContact(event.target.value)} />
          </label>
        </div>

        <label className="form-field">
          <span>Баланс, ₽</span>
          <input
            type="number"
            step="50"
            value={balance}
            onChange={(event) => setBalance(event.target.value)}
          />
        </label>

        <label className="form-field">
          <span>Заметки</span>
          <textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>

        <footer className="modal__footer">
          <button type="button" className="btn ghost" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className="btn primary">
            Сохранить
          </button>
        </footer>
      </form>
    </div>,
    document.body
  );
}

