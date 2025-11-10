import {useEffect, useMemo, useState} from "react";
import {useAppState} from "../../state/AppStateContext.jsx";
import {useToasts} from "../../state/ToastContext.jsx";
import {format} from "date-fns";

export default function LessonForm({selectedStudentId, onStudentChange}) {
  const {
    state: {students, settings},
    actions: {addLesson, consumeLessonSlot}
  } = useAppState();
  const toasts = useToasts();

  const sortedStudents = useMemo(
    () => [...students].sort((a, b) => a.name.localeCompare(b.name, "ru")),
    [students]
  );

  const [studentId, setStudentId] = useState(selectedStudentId ?? sortedStudents[0]?.id ?? "");
  const [packageId, setPackageId] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState("10:00");
  const [duration, setDuration] = useState(settings.defaultLessonDuration);
  const [notes, setNotes] = useState("");

  const availablePackages = useMemo(() => {
    const student = students.find((item) => item.id === studentId);
    if (!student) return [];
    return (student.packages || []).filter((pkg) => pkg.remainingLessons > 0);
  }, [students, studentId]);

  useEffect(() => {
    if (!selectedStudentId) return;
    setStudentId(selectedStudentId);
  }, [selectedStudentId]);

  useEffect(() => {
    if (availablePackages.length === 0) {
      setPackageId("");
      return;
    }
    if (!packageId || !availablePackages.some((pkg) => pkg.id === packageId)) {
      setPackageId(availablePackages[0].id);
    }
  }, [studentId, availablePackages, packageId]);

  const resetForm = () => {
    setStudentId(selectedStudentId ?? sortedStudents[0]?.id ?? "");
    setPackageId("");
    setDate(format(new Date(), "yyyy-MM-dd"));
    setStartTime("10:00");
    setDuration(settings.defaultLessonDuration);
    setNotes("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!studentId) {
      toasts.addWarning("Выберите ученика.");
      return;
    }
    if (!packageId) {
      toasts.addWarning("Выберите пакет уроков.");
      return;
    }
    if (!date || !startTime) {
      toasts.addWarning("Укажите дату и время урока.");
      return;
    }

    const student = students.find((s) => s.id === studentId);
    const pkg = availablePackages.find((p) => p.id === packageId);
    if (!student || !pkg) {
      toasts.addError("Не удалось найти выбранного ученика или пакет.");
      return;
    }

    const startIso = new Date(`${date}T${startTime}:00`).toISOString();

    const lesson = addLesson({
      studentId,
      packageId,
      start: startIso,
      durationMinutes: Number(duration) || settings.defaultLessonDuration,
      price: pkg.price,
      notes: notes.trim()
    });

    consumeLessonSlot(studentId, packageId);

    toasts.addSuccess("Урок добавлен и списан из пакета.");
    setNotes("");
    setPackageId("");
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
                  setPackageId("");
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
              <span>Пакет уроков *</span>
              <select
                value={packageId}
                onChange={(event) => setPackageId(event.target.value)}
                required
                disabled={!studentId || availablePackages.length === 0}
              >
                <option value="">
                  {availablePackages.length === 0
                    ? "Нет доступных пакетов"
                    : "Выберите пакет"}
                </option>
                {availablePackages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {`${formatCurrency(pkg.price)} • ${pkg.remainingLessons}/${pkg.totalLessons} уроков`}
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
            После сохранения количество уроков в выбранном пакете уменьшится на один. Для переноса
            занятия воспользуйтесь кнопкой «Редактировать» в списке или календаре.
          </p>
        </div>
      </form>
    </section>
  );
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 2
  }).format(amount);
}

