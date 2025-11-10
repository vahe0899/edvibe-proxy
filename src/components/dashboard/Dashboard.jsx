import {useMemo} from "react";
import {format} from "date-fns";
import {ru} from "date-fns/locale";
import {useAppState} from "../../state/AppStateContext.jsx";

export default function Dashboard({onSelectStudent}) {
  const {
    state: {students, lessons}
  } = useAppState();

  const summary = useMemo(() => {
    const totalStudents = students.length;
    const totalPackages = students.reduce((sum, student) => sum + (student.packages?.length || 0), 0);
    const totalRemainingLessons = students.reduce(
      (sum, student) =>
        sum + (student.packages || []).reduce((acc, pkg) => acc + (pkg.remainingLessons || 0), 0),
      0
    );
    const totalConsumedLessons = students.reduce(
      (sum, student) =>
        sum +
        (student.packages || []).reduce(
          (acc, pkg) => acc + Math.max(0, (pkg.totalLessons || 0) - (pkg.remainingLessons || 0)),
          0
        ),
      0
    );
    const totalConsumedValue = students.reduce(
      (sum, student) =>
        sum +
        (student.packages || []).reduce(
          (acc, pkg) =>
            acc +
            Math.max(0, (pkg.totalLessons || 0) - (pkg.remainingLessons || 0)) * (pkg.price || 0),
          0
        ),
      0
    );
    const totalRemainingValue = students.reduce(
      (sum, student) =>
        sum +
        (student.packages || []).reduce(
          (acc, pkg) => acc + Math.max(0, pkg.remainingLessons || 0) * (pkg.price || 0),
          0
        ),
      0
    );
    const upcomingLessons = lessons.filter((lesson) => new Date(lesson.start) >= new Date()).length;

    return {
      totalStudents,
      totalPackages,
      totalRemainingLessons,
      totalConsumedLessons,
      totalConsumedValue,
      totalRemainingValue,
      upcomingLessons
    };
  }, [students, lessons]);

  const studentsStats = useMemo(() => {
    return students
      .map((student) => {
        const studentLessons = lessons.filter((lesson) => lesson.studentId === student.id);
        const upcoming = studentLessons
          .filter((lesson) => new Date(lesson.start) >= new Date())
          .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
        const lastLesson = studentLessons
          .filter((lesson) => new Date(lesson.start) < new Date())
          .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())[0];

        const remainingLessons = (student.packages || []).reduce(
          (sum, pkg) => sum + (pkg.remainingLessons || 0),
          0
        );
        const consumedLessons = (student.packages || []).reduce(
          (sum, pkg) => sum + Math.max(0, (pkg.totalLessons || 0) - (pkg.remainingLessons || 0)),
          0
        );

        return {
          id: student.id,
          name: student.name,
          contact: student.contact,
          remainingLessons,
          consumedLessons,
          upcomingCount: upcoming.length,
          nextLesson: upcoming[0] ? new Date(upcoming[0].start) : null,
          lastLesson: lastLesson ? new Date(lastLesson.start) : null
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "ru"));
  }, [students, lessons]);

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Сводка</h2>
      </div>
      <div className="panel-body dashboard">
        <div className="stats-grid">
          <StatCard label="Ученики" value={summary.totalStudents} />
          <StatCard label="Пакетов уроков" value={summary.totalPackages} />
          <StatCard
            label="Осталось уроков"
            value={summary.totalRemainingLessons}
          />
          <StatCard
            label="Списано уроков"
            value={summary.totalConsumedLessons}
          />
          <StatCard
            label="На сумму проведено"
            value={summary.totalConsumedValue > 0 ? formatCurrency(summary.totalConsumedValue) : "—"}
          />
          <StatCard
            label="Остаток по пакетам"
            value={summary.totalRemainingValue > 0 ? formatCurrency(summary.totalRemainingValue) : "—"}
          />
          <StatCard label="Ближайшие уроки" value={summary.upcomingLessons} />
        </div>

        <div className="students-table-wrapper">
          <h3>Ученики</h3>
          {studentsStats.length === 0 ? (
            <p className="empty-state">Данных ещё нет — добавьте первого ученика.</p>
          ) : (
            <table className="students-table">
              <thead>
                <tr>
                  <th>Ученик</th>
                  <th>Контакты</th>
                  <th>Осталось уроков</th>
                  <th>Проведено</th>
                  <th>Следующий урок</th>
                  <th>Прошлый урок</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {studentsStats.map((stat) => (
                  <tr key={stat.id}>
                    <td>{stat.name}</td>
                    <td>{stat.contact || "—"}</td>
                    <td>{stat.remainingLessons}</td>
                    <td>{stat.consumedLessons}</td>
                    <td>{stat.nextLesson ? format(stat.nextLesson, "dd MMM HH:mm", {locale: ru}) : "—"}</td>
                    <td>{stat.lastLesson ? format(stat.lastLesson, "dd MMM HH:mm", {locale: ru}) : "—"}</td>
                    <td>
                      <button
                        type="button"
                        className="btn ghost small"
                        onClick={() => onSelectStudent?.(stat.id)}
                      >
                        Открыть
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}

function StatCard({label, value}) {
  const displayValue = typeof value === "number" ? value.toLocaleString("ru-RU") : value;
  return (
    <div className="stat-card">
      <span className="stat-card__label">{label}</span>
      <span className="stat-card__value">{displayValue}</span>
    </div>
  );
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0
  }).format(amount);
}

