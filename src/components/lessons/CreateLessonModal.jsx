import {useEffect, useMemo, useState} from "react";
import {createPortal} from "react-dom";
import {format} from "date-fns";
import {useAppState} from "../../state/AppStateContext.jsx";
import {useToasts} from "../../state/ToastContext.jsx";

const parseCurrency = (value, fallback = 0) => {
  if (typeof value === "number") return value;
  if (!value) return fallback;
  const normalized = value.toString().replace(/\s/g, "").replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : fallback;
};

export default function CreateLessonModal({initialStudentId, initialStart, onClose}) {
  const {
    state: {students, settings},
    actions: {addLesson}
  } = useAppState();
  const toasts = useToasts();

  const sortedStudents = useMemo(
    () => [...students].sort((a, b) => a.name.localeCompare(b.name, "ru")),
    [students]
  );

  const safeStart = initialStart ? new Date(initialStart) : new Date();

  const [studentId, setStudentId] = useState(initialStudentId ?? sortedStudents[0]?.id ?? "");
  const [date, setDate] = useState(format(safeStart, "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState(format(safeStart, "HH:mm"));
  const [duration, setDuration] = useState(settings.defaultLessonDuration);
  const [price, setPrice] = useState(
    settings.defaultLessonPrice != null ? String(settings.defaultLessonPrice) : ""
  );
  const [notes, setNotes] = useState("");

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
    if (!studentId) {
      toasts.addWarning("Выберите ученика.");
      return;
    }
    if (!date || !startTime) {
      toasts.addWarning("Укажите дату и время урока.");
      return;
    }

    const startIso = new Date(`${date}T${startTime}:00`).toISOString();
    const normalizedPrice = Math.max(0, parseCurrency(price, settings.defaultLessonPrice));

    addLesson({
      studentId,
      start: startIso,
      durationMinutes: Number(duration) || settings.defaultLessonDuration,
      price: normalizedPrice,
      notes: notes.trim()
    });

    toasts.addSuccess("Урок добавлен в расписание.");
    onClose();
  };

  return createPortal(
    <div className="modal-backdrop">
      <form className="modal" onSubmit={handleSubmit}>
        <header className="modal__header">
          <h3 className="modal__title">Новый урок</h3>
          <button type="button" className="btn ghost small" onClick={onClose}>
            Закрыть
          </button>
        </header>

        <label className="form-field">
          <span>Ученик *</span>
          <select
            value={studentId}
            onChange={(event) => setStudentId(event.target.value)}
            required
          >
            <option value="">Выберите ученика</option>
            {sortedStudents.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid-two-columns">
          <label className="form-field">
            <span>Дата *</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
          </label>
          <label className="form-field">
            <span>Время *</span>
            <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} required />
          </label>
        </div>

        <div className="grid-two-columns">
          <label className="form-field">
            <span>Длительность, минут</span>
            <input
              type="number"
              min="15"
              step="15"
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
            />
          </label>
          <label className="form-field">
            <span>Стоимость, ₽</span>
            <input
              type="number"
              min="0"
              step="50"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="Например, 1800"
            />
          </label>
        </div>

        <label className="form-field">
          <span>Комментарий</span>
          <textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>

        <footer className="modal__footer">
          <button type="button" className="btn ghost" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className="btn primary">
            Добавить
          </button>
        </footer>
      </form>
    </div>,
    document.body
  );
}
