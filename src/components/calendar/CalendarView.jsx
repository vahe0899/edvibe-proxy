import {useMemo, useState} from "react";
import {
  addDays,
  addMinutes,
  differenceInCalendarDays,
  differenceInMinutes,
  endOfWeek,
  format,
  startOfWeek
} from "date-fns";
import {ru} from "date-fns/locale";
import {useAppState} from "../../state/AppStateContext.jsx";
import {useToasts} from "../../state/ToastContext.jsx";

const HOUR_START = 6;
const HOUR_END = 24;
const MINUTES_PER_SLOT = 30;
const SLOT_HEIGHT = 36;

const hoursRange = Array.from({length: HOUR_END - HOUR_START}, (_, idx) => HOUR_START + idx);

export default function CalendarView({onEditLesson, onCreateLesson}) {
  const {
    state: {lessons, students},
    actions: {deleteLesson, adjustStudentBalance}
  } = useAppState();
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), {weekStartsOn: 1}));
  const toasts = useToasts();

  const totalSlots = (HOUR_END - HOUR_START) * (60 / MINUTES_PER_SLOT);
  const slotsIndices = useMemo(() => Array.from({length: totalSlots}, (_, idx) => idx), [totalSlots]);
  const days = useMemo(() => Array.from({length: 7}, (_, idx) => addDays(weekStart, idx)), [weekStart]);
  const weekEnd = useMemo(() => endOfWeek(weekStart, {weekStartsOn: 1}), [weekStart]);

  const eventsByDay = useMemo(() => {
    const map = new Map();
    for (let idx = 0; idx < 7; idx += 1) {
      map.set(idx, []);
    }

    const intervalStart = weekStart;
    const intervalEnd = addDays(weekStart, 7);

    for (const lesson of lessons) {
      const startDate = new Date(lesson.start);
      if (startDate < intervalStart || startDate >= intervalEnd) continue;

      const dayIndex = differenceInCalendarDays(startDate, weekStart);
      if (dayIndex < 0 || dayIndex > 6) continue;

      const columnDayStart = startOfDayAtHour(addDays(weekStart, dayIndex));
      let offsetMinutes = differenceInMinutes(startDate, columnDayStart);
      let duration = lesson.durationMinutes || 60;

      if (offsetMinutes + duration <= 0) continue;

      if (offsetMinutes < 0) {
        duration += offsetMinutes;
        offsetMinutes = 0;
      }

      duration = Math.max(MINUTES_PER_SLOT, duration);

      const rowStart = Math.floor(offsetMinutes / MINUTES_PER_SLOT);
      let rowSpan = Math.max(1, Math.ceil(duration / MINUTES_PER_SLOT));
      if (rowStart >= totalSlots) continue;
      if (rowStart + rowSpan > totalSlots) {
        rowSpan = totalSlots - rowStart;
      }

      const top = rowStart * SLOT_HEIGHT;
      const height = Math.max(SLOT_HEIGHT - 4, rowSpan * SLOT_HEIGHT - 4);
      const student = students.find((item) => item.id === lesson.studentId);

      map.get(dayIndex).push({
        id: lesson.id,
        start: startDate,
        status: lesson.status,
        price: lesson.price,
        studentId: lesson.studentId,
        studentName: student?.name ?? "Неизвестный ученик",
        top,
        height
      });
    }

    return map;
  }, [lessons, students, totalSlots, weekStart]);

  const handleSlotClick = (dayIndex, slotIndex) => {
    if (!onCreateLesson) return;
    const day = addDays(weekStart, dayIndex);
    const minutesFromStart = slotIndex * MINUTES_PER_SLOT;
    const start = addMinutes(startOfDayAtHour(day), minutesFromStart);
    onCreateLesson({start});
  };

  const handleDeleteLesson = (eventData) => {
    const confirmed = window.confirm(
      "Удалить урок? Если он был проведён, стоимость вернётся на баланс ученика."
    );
    if (!confirmed) return;
    if (eventData.status === "completed" && eventData.price > 0) {
      adjustStudentBalance(eventData.studentId, eventData.price);
    }
    deleteLesson(eventData.id);
    toasts.addWarning("Урок удалён.");
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Календарь</h2>
        <div className="panel-actions">
          <button type="button" className="btn ghost" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            ← Неделя
          </button>
          <button type="button" className="btn ghost" onClick={() => setWeekStart(startOfWeek(new Date(), {weekStartsOn: 1}))}>
            Сегодня
          </button>
          <button type="button" className="btn ghost" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            Неделя →
          </button>
        </div>
      </div>
      <div className="panel-body">
        <div className="week-calendar">
          <div className="week-calendar__header">
            <div className="week-calendar__range">
              {format(weekStart, "d MMM", {locale: ru})} — {format(addDays(weekStart, 6), "d MMM yyyy", {locale: ru})}
            </div>
          </div>
          <div className="week-calendar__grid">
            <div className="week-grid__corner" />
            {days.map((day) => {
              const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
              return (
                <div key={`header-${day.toISOString()}`} className={`week-day-header ${isToday ? "is-today" : ""}`}>
                  <span className="week-day-header__name">{format(day, "EEE", {locale: ru})}</span>
                  <span className="week-day-header__date">{format(day, "d MMM", {locale: ru})}</span>
                </div>
              );
            })}
            <div className="week-hours" style={{height: totalSlots * SLOT_HEIGHT, gridTemplateRows: `repeat(${totalSlots}, var(--week-slot-height))`}}>
              {slotsIndices.map((slotIdx) => {
                const hourIndex = Math.floor(slotIdx / (60 / MINUTES_PER_SLOT));
                const minuteOffset = (slotIdx % (60 / MINUTES_PER_SLOT)) * MINUTES_PER_SLOT;
                const isHourStart = minuteOffset === 0;
                const label = isHourStart ? `${String(hoursRange[hourIndex]).padStart(2, "0")}:00` : "";
                return (
                  <div key={`hours-${slotIdx}`} className={`week-hours__slot ${isHourStart ? "week-hours__slot--label" : ""}`}>
                    {label}
                  </div>
                );
              })}
            </div>
            {days.map((day, dayIndex) => {
              const events = eventsByDay.get(dayIndex) ?? [];
              return (
                <div key={day.toISOString()} className="week-column" style={{height: totalSlots * SLOT_HEIGHT}}>
                  <div className="week-column__grid" style={{gridTemplateRows: `repeat(${totalSlots}, var(--week-slot-height))`}}>
                    {slotsIndices.map((slotIdx) => (
                      <button
                        key={`slot-${dayIndex}-${slotIdx}`}
                        type="button"
                        className="week-slot"
                        onClick={() => handleSlotClick(dayIndex, slotIdx)}
                        aria-label={`Создать урок ${format(day, "d MMM", {locale: ru})} ${formatSlotLabel(slotIdx)}`}
                      />
                    ))}
                  </div>
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className={`calendar-event week-event calendar-event--${event.status}`}
                      style={{top: event.top, height: event.height}}
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditLesson?.(event.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onEditLesson?.(event.id);
                        }
                      }}
                    >
                      <button
                        type="button"
                        className="calendar-event__delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLesson(event);
                        }}
                        aria-label="Удалить урок"
                      >
                        ✕
                      </button>
                      <span className="calendar-event__time">{format(event.start, "HH:mm")}</span>
                      <span className="calendar-event__student">{event.studentName}</span>
                      {event.price > 0 && <span>{formatCurrency(event.price)}</span>}
                      <span className={`chip ${statusChipClass(event.status)} calendar-event__status`}>
                        {statusLabel(event.status)}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function startOfDayAtHour(date) {
  const day = new Date(date);
  day.setHours(HOUR_START, 0, 0, 0);
  return day;
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

function statusChipClass(status) {
  switch (status) {
    case "completed":
      return "success";
    case "cancelled":
      return "danger";
    default:
      return "";
  }
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0
  }).format(amount);
}

function formatSlotLabel(slotIdx) {
  const totalMinutes = slotIdx * MINUTES_PER_SLOT;
  const hours = Math.floor(totalMinutes / 60) + HOUR_START;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

