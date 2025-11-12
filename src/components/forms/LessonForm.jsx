import {useEffect, useMemo, useState} from "react";
import {useAppState} from "../../state/AppStateContext.jsx";
import {useToasts} from "../../state/ToastContext.jsx";
import {format} from "date-fns";

const parseCurrency = (value, fallback = 0) => {
  if (typeof value === "number") return value;
  if (!value) return fallback;
  const normalized = value.toString().replace(/\s/g, "").replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : fallback;
};

export default function LessonForm({selectedStudentId, onStudentChange}) {
  const {
    state: {students, settings},
    actions: {addLesson}
  } = useAppState();
  const toasts = useToasts();

  const sortedStudents = useMemo(
    () => [...students].sort((a, b) => a.name.localeCompare(b.name, "ru")),
    [students]
  );

  const [studentId, setStudentId] = useState(selectedStudentId ?? sortedStudents[0]?.id ?? "");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState("10:00");
  const [duration, setDuration] = useState(settings.defaultLessonDuration);
  const [price, setPrice] = useState(
    settings.defaultLessonPrice != null ? String(settings.defaultLessonPrice) : ""
  );
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!selectedStudentId) return;
    setStudentId(selectedStudentId);
  }, [selectedStudentId]);

  const resetForm = () => {
    setStudentId(selectedStudentId ?? sortedStudents[0]?.id ?? "");
    setDate(format(new Date(), "yyyy-MM-dd"));
    setStartTime("10:00");
    setDuration(settings.defaultLessonDuration);
    setPrice(settings.defaultLessonPrice != null ? String(settings.defaultLessonPrice) : "");
    setNotes("");
  };

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
    setNotes("");
    setPrice(settings.defaultLessonPrice != null ? String(settings.defaultLessonPrice) : "");
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Запланировать урок</h2>
      </div>
      <form className="panel-body" onSubmit={handleSubmit} onReset={resetForm}>
        <div className="panel-body-content">
          <div className="form-grid">
            <label className="form-field">
              <span>Ученик *</span>
              <select
                value={studentId}
                onChange={(event) => {
                  setStudentId(event.target.value);
                  onStudentChange?.(event.target.value);
                }}
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

            <label className="form-field">
              <span>Дата урока *</span>
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
            </label>

            <label className="form-field">
              <span>Начало *</span>
              <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} required />
            </label>

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
              <span>Планируемая стоимость, ₽</span>
              <input
                type="number"
                min="0"
                step="50"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="Например, 1800"
              />
            </label>

            <label className="form-field form-field-wide">
              <span>Комментарий</span>
              <textarea
                rows={2}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Темы занятия, домашнее задание..."
              />
            </label>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn primary">
              Добавить урок
            </button>
            <button type="reset" className="btn ghost">
              Очистить
            </button>
          </div>
          <p className="form-hint">
            После проведения урока отметьте его в расписании как «Проведён» и укажите фактическую
            сумму списания.
          </p>
        </div>
      </form>
    </section>
  );
}
