import {useEffect, useMemo, useState} from "react";
import {createPortal} from "react-dom";
import {format} from "date-fns";
import {useAppState} from "../../state/AppStateContext.jsx";
import {useToasts} from "../../state/ToastContext.jsx";

export default function EditLessonModal({lessonId, onClose}) {
  const {
    state: {lessons, students},
    actions: {updateLesson, consumeLessonSlot, restoreLessonSlot}
  } = useAppState();
  const toasts = useToasts();

  const lesson = lessons.find((item) => item.id === lessonId);
  const student = lesson ? students.find((item) => item.id === lesson.studentId) : null;

  const [packageId, setPackageId] = useState(lesson?.packageId ?? "");
  const [date, setDate] = useState(lesson ? format(new Date(lesson.start), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState(lesson ? format(new Date(lesson.start), "HH:mm") : "10:00");
  const [duration, setDuration] = useState(lesson?.durationMinutes ?? 60);
  const [price, setPrice] = useState(lesson?.price ?? 0);
  const [notes, setNotes] = useState(lesson?.notes ?? "");
  const [status, setStatus] = useState(
    lesson?.status === "cancelled" ? "scheduled" : lesson?.status ?? "scheduled"
  );
  const [refunded, setRefunded] = useState(lesson?.refunded ?? false);

  const availablePackages = useMemo(() => {
    if (!student) return [];
    return student.packages || [];
  }, [student]);

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
    setPackageId(lesson.packageId ?? "");
    setDate(format(new Date(lesson.start), "yyyy-MM-dd"));
    setTime(format(new Date(lesson.start), "HH:mm"));
    setDuration(lesson.durationMinutes);
    setPrice(lesson.price);
    setNotes(lesson.notes ?? "");
    setStatus(lesson.status === "cancelled" ? "scheduled" : lesson.status);
    setRefunded(lesson.refunded);
  }, [lesson]);

  if (!lesson || !student) {
    return null;
  }

  const handleSubmit = (event) => {
    event.preventDefault();

    const startIso = new Date(`${date}T${time}:00`).toISOString();
    const newPackageId = packageId || lesson.packageId;
    const oldPackageId = lesson.packageId;
    const oldRefunded = lesson.refunded;
    const newRefunded = refunded;

    const packagesById = new Map((student.packages || []).map((pkg) => [pkg.id, pkg]));

    const applyConsume = (pkgId) => {
      if (!pkgId) return;
      const pkg = packagesById.get(pkgId);
      if (!pkg) {
        toasts.addError("Пакет не найден. Сначала добавьте пакет ученику.");
        throw new Error("package-not-found");
      }
      if (pkg.remainingLessons <= 0) {
        toasts.addWarning("В выбранном пакете закончились уроки.");
        throw new Error("no-slots");
      }
      consumeLessonSlot(student.id, pkgId);
    };

    const applyRestore = (pkgId) => {
      if (!pkgId) return;
      restoreLessonSlot(student.id, pkgId);
    };

    try {
      if (newPackageId !== oldPackageId) {
        if (!oldRefunded && oldPackageId) {
          applyRestore(oldPackageId);
        }
        if (!newRefunded && newPackageId) {
          applyConsume(newPackageId);
        }
      } else {
        if (!oldRefunded && newRefunded && oldPackageId) {
          applyRestore(oldPackageId);
        }
        if (oldRefunded && !newRefunded && newPackageId) {
          applyConsume(newPackageId);
        }
      }

      updateLesson(lesson.id, {
        packageId: newPackageId,
        start: startIso,
        durationMinutes: Number(duration) || lesson.durationMinutes,
        price: Number(price) || lesson.price,
        notes: notes.trim(),
        status,
        refunded: newRefunded
      });

      toasts.addSuccess("Урок обновлён.");
      onClose();
    } catch (error) {
      if (error.message !== "package-not-found" && error.message !== "no-slots") {
        console.error(error);
        toasts.addError("Не удалось обновить урок.");
      }
    }
  };

  const handlePackageChange = (event) => {
    const value = event.target.value;
    setPackageId(value);
    const pkg = availablePackages.find((p) => p.id === value);
    if (pkg) {
      setPrice(pkg.price);
    }
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
            <span>Цена, ₽</span>
            <input
              type="number"
              min="0"
              step="50"
              value={price}
              onChange={(event) => setPrice(Number(event.target.value))}
            />
          </label>
        </div>

        <label className="form-field">
          <span>Пакет</span>
          <select value={packageId} onChange={handlePackageChange}>
            <option value="">Без пакета</option>
            {availablePackages.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>
                {`${formatCurrency(pkg.price)} • осталось ${pkg.remainingLessons}/${pkg.totalLessons}`}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span>Статус</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="scheduled">Запланирован</option>
            <option value="completed">Проведён</option>
          </select>
        </label>

        <label className="switch">
          <input
            type="checkbox"
            checked={refunded}
            onChange={(event) => setRefunded(event.target.checked)}
          />
          <span>Возврат в пакет</span>
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

function formatCurrency(amount) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 2
  }).format(amount);
}

