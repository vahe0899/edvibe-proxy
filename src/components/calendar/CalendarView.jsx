import {useMemo, useState} from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek
} from "date-fns";
import {ru} from "date-fns/locale";
import {useAppState} from "../../state/AppStateContext.jsx";

export default function CalendarView({onEditLesson}) {
  const {
    state: {lessons, students}
  } = useAppState();
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));

  const lessonsWithStudent = useMemo(() => {
    const studentMap = new Map(students.map((student) => [student.id, student]));
    return lessons.map((lesson) => ({
      ...lesson,
      student: studentMap.get(lesson.studentId)
    }));
  }, [lessons, students]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), {weekStartsOn: 1});
    const end = endOfWeek(endOfMonth(currentMonth), {weekStartsOn: 1});
    return eachDayOfInterval({start, end});
  }, [currentMonth]);

  const eventsByDay = useMemo(() => {
    const map = new Map();
    for (const lesson of lessonsWithStudent) {
      const dayKey = format(new Date(lesson.start), "yyyy-MM-dd");
      if (!map.has(dayKey)) map.set(dayKey, []);
      map.get(dayKey).push(lesson);
    }
    for (const [, dayLessons] of map.entries()) {
      dayLessons.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    }
    return map;
  }, [lessonsWithStudent]);

  const handlePrevMonth = () => setCurrentMonth((prev) => addMonths(prev, -1));
  const handleNextMonth = () => setCurrentMonth((prev) => addMonths(prev, 1));
  const handleToday = () => setCurrentMonth(startOfMonth(new Date()));

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Календарь</h2>
      </div>
      <div className="panel-body">
        <div className="calendar-controls">
          <h3 className="modal__title" style={{margin: 0}}>
            {format(currentMonth, "LLLL yyyy", {locale: ru})}
          </h3>
          <div className="calendar-controls__actions">
            <button type="button" className="btn ghost small" onClick={handlePrevMonth}>
              ←
            </button>
            <button type="button" className="btn ghost small" onClick={handleToday}>
              Сегодня
            </button>
            <button type="button" className="btn ghost small" onClick={handleNextMonth}>
              →
            </button>
          </div>
        </div>

        <div className="calendar-grid">
          {WEEKDAYS.map((day) => (
            <div key={day} className="calendar-grid__header-cell">
              {day}
            </div>
          ))}
          {days.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const dayEvents = eventsByDay.get(dayKey) ?? [];
            return (
              <div
                key={dayKey}
                className={`calendar-grid__cell ${
                  isSameMonth(day, currentMonth) ? "" : "calendar-grid__cell--other-month"
                }`}
              >
                <span className="calendar-grid__day-number">
                  {format(day, "d")}
                  {isSameDay(day, new Date()) && <span className="chip" style={{marginLeft: 8}}>Сегодня</span>}
                </span>
                {dayEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    className="calendar-event"
                    onClick={() => onEditLesson?.(event.id)}
                  >
                    <span className="calendar-event__time">
                      {format(new Date(event.start), "HH:mm")}
                    </span>
                    <span className="calendar-event__student">
                      {event.student?.name ?? "Неизвестный ученик"}
                    </span>
                    <span>{formatCurrency(event.price)}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function formatCurrency(amount) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0
  }).format(amount);
}

