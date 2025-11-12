import {useMemo, useState} from "react";
import {format} from "date-fns";
import {useAppState} from "../../state/AppStateContext.jsx";
import {useToasts} from "../../state/ToastContext.jsx";

export default function LessonList({onEditLesson}) {
  const {
    state: {lessons, students},
    actions: {deleteLesson, adjustStudentBalance}
  } = useAppState();
  const toasts = useToasts();

  const [showPast, setShowPast] = useState(false);

  const lessonsWithStudent = useMemo(() => {
    const now = new Date();
    const items = lessons
      .map((lesson) => {
        const student = students.find((s) => s.id === lesson.studentId);
        return {
          ...lesson,
          studentName: student?.name ?? "Неизвестный ученик"
        };
      })
      .filter((lesson) => (showPast ? true : new Date(lesson.start) >= startOfDay(now)))
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    return items;
  }, [lessons, students, showPast]);

  const handleDelete = (lesson) => {
    const confirmed = window.confirm(
      "Удалить урок? Списанная сумма будет возвращена на баланс ученика."
    );
    if (!confirmed) return;
    if (lesson.status === "completed" && lesson.price > 0) {
      adjustStudentBalance(lesson.studentId, lesson.price);
    }
    deleteLesson(lesson.id);
    toasts.addWarning("Урок удалён.");
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Расписание</h2>
        <div className="panel-actions">
          <label className="switch">
            <input type="checkbox" checked={showPast} onChange={(event) => setShowPast(event.target.checked)} />
            <span>Показывать прошедшие уроки</span>
          </label>
        </div>
      </div>
      <div className="panel-body">
        {lessonsWithStudent.length === 0 ? (
          <p className="empty-state">
            {showPast ? "Прошедших уроков нет." : "Ближайших уроков нет. Запланируйте первый."}
          </p>
        ) : (
          <div className="cards">
            {lessonsWithStudent.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                onEdit={() => onEditLesson?.(lesson.id)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function LessonCard({lesson, onEdit, onDelete}) {
  const start = new Date(lesson.start);
  const end = new Date(start.getTime() + lesson.durationMinutes * 60 * 1000);
  return (
    <article className="lesson-item">
      <header className="lesson-item__header">
        <div>
          <p className="lesson-item__student">{lesson.studentName}</p>
          <p className="lesson-item__datetime">
            {format(start, "dd MMM yyyy, HH:mm")} — {format(end, "HH:mm")} • {lesson.durationMinutes} мин
          </p>
        </div>
        <span className={`lesson-item__status lesson-item__status--${lesson.status}`}>
          {statusLabel(lesson.status)}
        </span>
      </header>

      {lesson.notes && <p className="lesson-item__notes">{lesson.notes}</p>}

      <footer className="lesson-item__footer">
        <span>Стоимость: {formatCurrency(lesson.price)}</span>
        <span>Статус: {statusLabel(lesson.status)}</span>
      </footer>

      <div className="lesson-item__actions">
        <button className="btn secondary" type="button" onClick={onEdit}>
          Редактировать
        </button>
        <button className="btn danger" type="button" onClick={() => onDelete(lesson)}>
          Удалить
        </button>
      </div>
    </article>
  );
}

function statusLabel(status) {
  switch (status) {
    case "completed":
      return "Проведён";
    case "cancelled":
      return "Отменён";
    default:
      return "Запланирован";
  }
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 2
  }).format(amount);
}

function startOfDay(date) {
  const cloned = new Date(date);
  cloned.setHours(0, 0, 0, 0);
  return cloned;
}

