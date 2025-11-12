import {useEffect, useState} from "react";
import {createPortal} from "react-dom";
import {format} from "date-fns";
import {useAppState} from "../../state/AppStateContext.jsx";
import {useToasts} from "../../state/ToastContext.jsx";

export default function EditLessonModal({lessonId, onClose}) {
  const {
    state: {lessons, students},
    actions: {updateLesson, adjustStudentBalance}
  } = useAppState();
  const toasts = useToasts();

  const lesson = lessons.find((item) => item.id === lessonId);
  const student = lesson ? students.find((item) => item.id === lesson.studentId) : null;

  const [date, setDate] = useState(lesson ? format(new Date(lesson.start), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState(lesson ? format(new Date(lesson.start), "HH:mm") : "10:00");
  const [duration, setDuration] = useState(lesson?.durationMinutes ?? 60);
  const [price, setPrice] = useState(lesson?.price != null ? String(lesson.price) : "");
  const [notes, setNotes] = useState(lesson?.notes ?? "");
  const [status, setStatus] = useState(
    lesson?.status === "cancelled" ? "scheduled" : lesson?.status ?? "scheduled"
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

  useEffect(() => {
    if (!lesson) return;
    setDate(format(new Date(lesson.start), "yyyy-MM-dd"));
    setTime(format(new Date(lesson.start), "HH:mm"));
    setDuration(lesson.durationMinutes);
    setPrice(lesson.price != null ? String(lesson.price) : "");
    setNotes(lesson.notes ?? "");
    setStatus(lesson.status === "cancelled" ? "scheduled" : lesson.status);
  }, [lesson]);

  if (!lesson || !student) {
    return null;
  }

  const handleSubmit = (event) => {
    event.preventDefault();

    const startIso = new Date(`${date}T${time}:00`).toISOString();
    const normalizedPrice = Math.max(0, parseCurrency(price, 0));

    const previousStatus = lesson.status === "cancelled" ? "scheduled" : lesson.status;
    const previousPrice = lesson.price || 0;

    let balanceDelta = 0;
    if (previousStatus === "completed") {
      balanceDelta += previousPrice;
    }
    if (status === "completed") {
      balanceDelta -= normalizedPrice;
    }

    updateLesson(lesson.id, {
      start: startIso,
      durationMinutes: Number(duration) || lesson.durationMinutes,
      price: normalizedPrice,
      notes: notes.trim(),
      status
    });

    if (balanceDelta !== 0) {
      adjustStudentBalance(student.id, balanceDelta);
    }

    toasts.addSuccess("Урок обновлён.");
    onClose();
  };

  return createPortal(
    <div className="modal-backdrop">
      <form className="modal" onSubmit={handleSubmit}>
        <header className="modal__header">
          <h3 className="modal__title">Редактирование урока</h3>
          <button type="button" className="btn ghost small" onClick={onClose}>
            Закрыть
          </button>
        </header>

        <div className="form-field">
          <span>Ученик</span>
          <input value={student.name} disabled />
        </div>

        <div className="grid-two-columns">
          <label className="form-field">
            <span>Дата</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <label className="form-field">
            <span>Время</span>
            <input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
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
            <span>Списать при проведении, ₽</span>
            <input
              type="number"
              min="0"
              step="50"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
          </label>
        </div>

        <label className="form-field">
          <span>Статус</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="scheduled">Запланирован</option>
            <option value="completed">Проведён</option>
          </select>
        </label>

        <label className="form-field">
          <span>Комментарий</span>
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

function parseCurrency(value, fallback = 0) {
  if (typeof value === "number") return value;
  if (!value) return fallback;
  const normalized = value.toString().replace(/\s/g, "").replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : fallback;
}

function formatCurrency(amount) {
}
