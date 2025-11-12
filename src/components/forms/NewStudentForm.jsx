import {useState} from "react";
import {useAppState} from "../../state/AppStateContext.jsx";
import {useToasts} from "../../state/ToastContext.jsx";

const parseCurrency = (value, fallback = 0) => {
  if (typeof value === "number") return value;
  if (!value) return fallback;
  const normalized = value.toString().replace(/\s/g, "").replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : fallback;
};

export default function NewStudentForm() {
  const {
    actions: {addStudent}
  } = useAppState();
  const toasts = useToasts();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");
  const [balance, setBalance] = useState("");

  const resetForm = () => {
    setName("");
    setContact("");
    setNotes("");
    setBalance("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toasts.addWarning("Введите имя ученика.");
      return;
    }

    const initialBalance = Math.round(parseCurrency(balance, 0) * 100) / 100;

    const student = addStudent({
      name: trimmedName,
      contact,
      notes,
      balance: initialBalance
    });

    toasts.addSuccess(`Ученик «${student.name}» добавлен.`);
    resetForm();
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Новый ученик</h2>
      </div>
      <form className="panel-body" onSubmit={handleSubmit} onReset={resetForm}>
        <div className="panel-body-content">
          <div className="form-grid">
            <label className="form-field">
              <span>Имя ученика *</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                placeholder="Например, Мария"
              />
            </label>
            <label className="form-field">
              <span>Контакты</span>
              <input
                type="text"
                value={contact}
                onChange={(event) => setContact(event.target.value)}
                placeholder="Телефон, Telegram"
              />
            </label>
            <label className="form-field">
              <span>Стартовый баланс, ₽</span>
              <input
                type="number"
                min="0"
                step="50"
                value={balance}
                onChange={(event) => setBalance(event.target.value)}
                placeholder="Например, 1600"
              />
            </label>
            <label className="form-field form-field-wide">
              <span>Заметки</span>
              <textarea
                rows={2}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Уровень, пожелания, особенности"
              />
            </label>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn primary">
              Добавить ученика
            </button>
            <button type="reset" className="btn ghost">
              Очистить
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

