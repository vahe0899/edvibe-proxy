import {format} from "date-fns";
import {ru} from "date-fns/locale";
import {useToasts} from "../../state/ToastContext.jsx";
import {useAppState} from "../../state/AppStateContext.jsx";

const parseCurrency = (value, fallback = 0) => {
  if (typeof value === "number") return value;
  if (!value) return fallback;
  const normalized = value.toString().replace(/\s/g, "").replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : fallback;
};

export default function StudentCard({student, lessons, onEdit, onSelectForLesson}) {
  const {
    state: {settings},
    actions: {deleteStudent, adjustStudentBalance}
  } = useAppState();
  const toasts = useToasts();

  const now = new Date();
  const completedLessons = lessons.filter((lesson) => lesson.status === "completed");
  const totalEarned = completedLessons.reduce((sum, lesson) => sum + (lesson.price || 0), 0);
  const upcomingLessons = lessons
    .filter((lesson) => lesson.status === "scheduled" && new Date(lesson.start) >= now)
    .sort((a, b) => new Date(a.start) - new Date(b.start));
  const nextLesson = upcomingLessons[0];
  const lastLesson = completedLessons
    .slice()
    .sort((a, b) => new Date(b.start) - new Date(a.start))[0];

  const currentRate = settings.defaultLessonPrice || 0;
  const lessonsAtRate = currentRate > 0 ? Math.floor(student.balance / currentRate) : null;
  const remainderAmount =
    currentRate > 0 ? Math.round((student.balance - (lessonsAtRate || 0) * currentRate) * 100) / 100 : 0;

  const handleDelete = () => {
    const confirmed = window.confirm(
      `Удалить ученика «${student.name}» и все связанные уроки?`
    );
    if (!confirmed) return;
    deleteStudent(student.id);
    toasts.addWarning("Ученик и все уроки удалены.");
  };

  const handleAdjustBalance = (mode) => {
    const promptText =
      mode === "topup"
        ? `На сколько пополнить баланс ученика «${student.name}»?`
        : `Сколько списать с баланса ученика «${student.name}»?`;

    const input = window.prompt(promptText, "1000");
    if (input === null) return;

    const amount = Math.round(parseCurrency(input, 0) * 100) / 100;
    if (amount === 0) {
      toasts.addInfo("Изменение баланса отменено.");
      return;
    }

    const delta = mode === "topup" ? amount : -Math.abs(amount);
    adjustStudentBalance(student.id, delta);
    toasts.addSuccess("Баланс обновлён.");
  };

  return (
    <article className="student-card">
      <header className="student-card__header">
        <div>
          <h3 className="student-card__name">{student.name}</h3>
          {student.contact && <p className="student-card__contact">{student.contact}</p>}
        </div>
        <div className="student-card__balance">{formatCurrency(student.balance)}</div>
      </header>

      {student.notes && <p className="student-card__notes">{student.notes}</p>}

      <div className="student-card__stats-grid">
        <StatBlock label="Баланс" value={formatCurrency(student.balance)} />
        <StatBlock label="Проведено уроков" value={formatNumber(completedLessons.length)} />
        <StatBlock label="Заработано" value={formatCurrency(totalEarned)} />
        <StatBlock label="Предстоящие уроки" value={formatNumber(upcomingLessons.length)} />
        <StatBlock
          label="Ближайшее занятие"
          value={nextLesson ? formatDateTime(nextLesson.start) : "—"}
        />
        <StatBlock
          label="Прошлое занятие"
          value={lastLesson ? formatDateTime(lastLesson.start) : "—"}
        />
        <StatBlock
          label={`При тарифе ${currentRate > 0 ? formatCurrency(currentRate) : "—"}`}
          value={
            currentRate > 0
              ? `${formatNumber(lessonsAtRate || 0)} урок(ов)` +
                (remainderAmount > 0 ? ` + ${formatCurrency(remainderAmount)}` : "")
              : "—"
          }
        />
      </div>

      <div className="student-card__actions">
        <button className="btn secondary" type="button" onClick={() => handleAdjustBalance("topup")}>
          Пополнить баланс
        </button>
        <button className="btn secondary" type="button" onClick={() => handleAdjustBalance("charge")}>
          Списать вручную
        </button>
        <button className="btn primary" type="button" onClick={() => onSelectForLesson?.()}>
          Записать на урок
        </button>
        <button className="btn ghost" type="button" onClick={() => onEdit?.()}>
          Редактировать
        </button>
        <button className="btn danger" type="button" onClick={handleDelete}>
          Удалить
        </button>
      </div>

      <div className="student-card__lessons">
        <strong>Ближайшие уроки</strong>
        {upcomingLessons.length === 0 ? (
          <p className="student-card__lessons-empty">Нет запланированных уроков.</p>
        ) : (
          <ul>
            {upcomingLessons.slice(0, 5).map((lesson) => (
              <li key={lesson.id}>
                {formatDateTime(lesson.start)} • {lesson.durationMinutes} мин
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

function StatBlock({label, value}) {
  return (
    <div className="student-card__stat">
      <span className="student-card__stat-label">{label}</span>
      <span className="student-card__stat-value">{value}</span>
    </div>
  );
}

function formatNumber(value) {
  return value.toLocaleString("ru-RU");
}

function formatDateTime(isoString) {
  return `${format(new Date(isoString), "dd MMM, HH:mm", {locale: ru})}`;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 2
  }).format(amount);
}

