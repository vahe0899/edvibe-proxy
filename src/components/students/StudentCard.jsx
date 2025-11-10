import {format} from "date-fns";
import {ru} from "date-fns/locale";
import {useToasts} from "../../state/ToastContext.jsx";
import {useAppState} from "../../state/AppStateContext.jsx";

export default function StudentCard({student, lessons, onEdit, onSelectForLesson}) {
  const {
    actions: {deleteStudent}
  } = useAppState();
  const toasts = useToasts();

  const now = new Date();
  const totalLessons = lessons.length;
  const completedLessons = lessons.filter((lesson) => lesson.status === "completed").length;
  const upcomingLessons = lessons.filter(
    (lesson) => lesson.status === "scheduled" && new Date(lesson.start) >= now
  );
  const remainingLessons = (student.packages || []).reduce(
    (sum, pkg) => sum + (pkg.remainingLessons || 0),
    0
  );
  const totalPackageLessons = (student.packages || []).reduce(
    (sum, pkg) => sum + (pkg.totalLessons || 0),
    0
  );
  const consumedLessons = (student.packages || []).reduce(
    (sum, pkg) => sum + ((pkg.totalLessons || 0) - (pkg.remainingLessons || 0)),
    0
  );
  const consumedValue = (student.packages || []).reduce(
    (sum, pkg) =>
      sum + (Math.max(0, (pkg.totalLessons || 0) - (pkg.remainingLessons || 0)) * (pkg.price || 0)),
    0
  );
  const remainingValue = (student.packages || []).reduce(
    (sum, pkg) => sum + (Math.max(0, pkg.remainingLessons || 0) * (pkg.price || 0)),
    0
  );

  const handleDelete = () => {
    const confirmed = window.confirm(
      `Удалить ученика «${student.name}» и все связанные уроки?`
    );
    if (!confirmed) return;
    deleteStudent(student.id);
    toasts.addWarning("Ученик и все уроки удалены.");
  };

  return (
    <article className="student-card">
      <header className="student-card__header">
        <div>
          <h3 className="student-card__name">{student.name}</h3>
          {student.contact && <p className="student-card__contact">{student.contact}</p>}
        </div>
        <div className={`student-card__balance ${remainingLessons === 0 ? "empty" : ""}`}>
          {remainingLessons > 0
            ? `${remainingLessons} урок(ов) осталось`
            : totalPackageLessons > 0
            ? "Пакеты израсходованы"
            : "Пакеты не добавлены"}
        </div>
      </header>

      <div className="student-card__stats-grid">
        <StatBlock label="Стоимость урока" value={formatPackagesPrices(student.packages) || "—"} />
        <StatBlock
          label="Уроков в пакетах"
          value={totalPackageLessons > 0 ? `${remainingLessons}/${totalPackageLessons}` : "—"}
        />
        <StatBlock
          label="Проведено уроков"
          value={`${completedLessons} из ${totalLessons}`}
        />
        <StatBlock
          label="Ближайшие уроки"
          value={`${upcomingLessons.length}`}
        />
        <StatBlock
          label="Списано на сумму"
          value={consumedValue > 0 ? formatCurrency(consumedValue) : "—"}
        />
        <StatBlock
          label="Остаток на пакетах"
          value={remainingValue > 0 ? formatCurrency(remainingValue) : "—"}
        />
      </div>

      {student.notes && <p className="student-card__notes">{student.notes}</p>}

      <div className="student-card__actions">
        <button className="btn secondary" type="button" onClick={() => onEdit?.()}>
          Редактировать
        </button>
        <button className="btn primary" type="button" onClick={() => onSelectForLesson?.()}>
          Записать на урок
        </button>
        <button className="btn danger" type="button" onClick={handleDelete}>
          Удалить
        </button>
      </div>

      <StudentPackages packages={student.packages} />

      <div className="student-card__lessons">
        <strong>Ближайшие уроки</strong>
        {upcomingLessons.length === 0 ? (
          <p className="student-card__lessons-empty">Нет запланированных уроков.</p>
        ) : (
          <ul>
            {upcomingLessons.slice(0, 5).map((lesson) => (
              <li key={lesson.id}>
                {`${formatDateTime(lesson.start)} • ${formatCurrency(lesson.price)} • ${lesson.durationMinutes} мин`}
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

function StudentPackages({packages}) {
  if (!packages || packages.length === 0) {
    return <div className="student-card__packages student-card__packages--empty">Пакеты не добавлены.</div>;
  }

  const sorted = [...packages].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="student-card__packages">
      <strong>Пакеты уроков</strong>
      <ul className="packages-list">
        {sorted.map((pkg) => (
          <li
            key={pkg.id}
            className={`packages-list__item ${pkg.remainingLessons === 0 ? "packages-list__item--empty" : ""}`}
          >
            <div className="packages-list__header">
              <span className="packages-list__price">{formatCurrency(pkg.price)}</span>
              <span className="packages-list__count">
                {pkg.remainingLessons}/{pkg.totalLessons} уроков
              </span>
            </div>
            <div className="packages-list__meta">
              {pkg.remainingLessons > 0
                ? `Осталось ${pkg.remainingLessons}`
                : "Израсходован"}{" "}
              • обновлён {formatDate(pkg.updatedAt ?? pkg.createdAt)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatPackagesPrices(packages) {
  if (!packages || packages.length === 0) return "";
  const active = packages.filter((pkg) => pkg.remainingLessons > 0);
  if (active.length === 0) {
    const uniquePrices = Array.from(new Set(packages.map((pkg) => formatCurrency(pkg.price))));
    return uniquePrices.join(" • ");
  }
  const uniqueActive = Array.from(new Set(active.map((pkg) => formatCurrency(pkg.price))));
  return uniqueActive.join(" • ");
}

function formatDateTime(isoString) {
  return `${format(new Date(isoString), "dd MMM, HH:mm", {locale: ru})}`;
}

function formatDate(isoString) {
  return format(new Date(isoString), "dd MMM yyyy", {locale: ru});
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 2
  }).format(amount);
}

