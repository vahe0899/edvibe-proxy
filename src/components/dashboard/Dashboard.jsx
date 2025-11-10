import {useMemo, useState} from "react";
import {endOfMonth, endOfYear, startOfMonth, startOfYear} from "date-fns";
import {useAppState} from "../../state/AppStateContext.jsx";

export default function Dashboard({onSelectStudent}) {
  const {
    state: {students, lessons}
  } = useAppState();

  const [metric, setMetric] = useState("earnings"); // earnings | lessons
  const [period, setPeriod] = useState("month"); // month | year

  const now = useMemo(() => new Date(), []);

  const range = useMemo(() => {
    if (period === "year") {
      return {start: startOfYear(now), end: endOfYear(now)};
    }
    return {start: startOfMonth(now), end: endOfMonth(now)};
  }, [now, period]);

  const completedLessons = useMemo(
    () =>
      lessons.filter((lesson) => {
        if (lesson.status !== "completed") return false;
        const lessonDate = new Date(lesson.start);
        return lessonDate >= range.start && lessonDate <= range.end;
      }),
    [lessons, range]
  );

  const totalEarnings = useMemo(
    () => completedLessons.reduce((sum, lesson) => sum + (lesson.price || 0), 0),
    [completedLessons]
  );
  const totalLessons = completedLessons.length;

  const summary = useMemo(() => {
    const totalStudents = students.length;
    const upcomingLessons = lessons.filter(
      (lesson) => lesson.status === "scheduled" && new Date(lesson.start) >= now
    ).length;
    const averagePrice =
      totalLessons > 0 ? Math.round((totalEarnings / totalLessons) * 100) / 100 : null;

    return {
      totalStudents,
      upcomingLessons,
      averagePrice
    };
  }, [students, lessons, now, totalEarnings, totalLessons]);

  const studentsStats = useMemo(() => {
    return students
      .map((student) => {
        const studentLessons = completedLessons.filter((lesson) => lesson.studentId === student.id);
        const earnings = studentLessons.reduce((sum, lesson) => sum + (lesson.price || 0), 0);
        const lessonsCount = studentLessons.length;

        return {
          id: student.id,
          name: student.name,
          contact: student.contact,
          earnings,
          lessonsCount
        };
      })
      .sort((a, b) =>
        metric === "earnings" ? b.earnings - a.earnings : b.lessonsCount - a.lessonsCount
      );
  }, [students, completedLessons, metric]);

  const metricLabel = metric === "earnings" ? "Заработано" : "Проведено уроков";
  const metricValue =
    metric === "earnings" ? formatCurrency(totalEarnings) : formatNumber(totalLessons);
  const secondaryMetric =
    metric === "earnings"
      ? {label: "Проведено уроков", value: formatNumber(totalLessons)}
      : {label: "Заработано", value: formatCurrency(totalEarnings)};

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Статистика</h2>
      </div>
      <div className="panel-body dashboard">
        <div className="dashboard-controls">
          <div className="segmented-control">
            <button
              type="button"
              className={`segmented-control__button ${metric === "earnings" ? "is-active" : ""}`}
              onClick={() => setMetric("earnings")}
            >
              Заработок
            </button>
            <button
              type="button"
              className={`segmented-control__button ${metric === "lessons" ? "is-active" : ""}`}
              onClick={() => setMetric("lessons")}
            >
              Уроки
            </button>
          </div>
          <div className="segmented-control">
            <button
              type="button"
              className={`segmented-control__button ${period === "month" ? "is-active" : ""}`}
              onClick={() => setPeriod("month")}
            >
              Текущий месяц
            </button>
            <button
              type="button"
              className={`segmented-control__button ${period === "year" ? "is-active" : ""}`}
              onClick={() => setPeriod("year")}
            >
              Текущий год
            </button>
          </div>
        </div>

        <div className="stats-grid">
          <StatCard label="Ученики" value={summary.totalStudents} />
          <StatCard label={metricLabel} value={metricValue} />
          <StatCard label={secondaryMetric.label} value={secondaryMetric.value} />
          <StatCard label="Ближайшие уроки" value={formatNumber(summary.upcomingLessons)} />
          <StatCard
            label="Средний чек"
            value={summary.averagePrice ? formatCurrency(summary.averagePrice) : "—"}
          />
        </div>

        <div className="students-table-wrapper">
          <h3>Ученики за выбранный период</h3>
          {studentsStats.length === 0 ? (
            <p className="empty-state">
              За выбранный период проведённых уроков пока не было.
            </p>
          ) : (
            <table className="students-table">
              <thead>
                <tr>
                  <th>Ученик</th>
                  <th>Контакты</th>
                  <th>{metric === "earnings" ? "Заработано" : "Проведено уроков"}</th>
                  <th>{metric === "earnings" ? "Проведено уроков" : "Заработано"}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {studentsStats.map((stat) => (
                  <tr key={stat.id}>
                    <td>{stat.name}</td>
                    <td>{stat.contact || "—"}</td>
                    <td>
                      {metric === "earnings"
                        ? formatCurrency(stat.earnings)
                        : formatNumber(stat.lessonsCount)}
                    </td>
                    <td>
                      {metric === "earnings"
                        ? formatNumber(stat.lessonsCount)
                        : formatCurrency(stat.earnings)}
                    </td>
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
  const displayValue = typeof value === "number" ? formatNumber(value) : value;
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

function formatNumber(value) {
  return value.toLocaleString("ru-RU");
}

