const TABS = [
  {id: "dashboard", label: "Сводка"},
  {id: "students", label: "Ученики"},
  {id: "lessons", label: "Уроки"},
  {id: "calendar", label: "Календарь"}
];

export default function NavigationTabs({activeTab, onChange}) {
  return (
    <nav className="app-nav">
      <div className="container">
        <ul className="app-nav__list">
          {TABS.map((tab) => (
            <li key={tab.id}>
              <button
                type="button"
                className={`app-nav__button ${activeTab === tab.id ? "is-active" : ""}`}
                onClick={() => onChange?.(tab.id)}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

