import {useState} from "react";
import {useAppState} from "../../state/AppStateContext.jsx";
import {useToasts} from "../../state/ToastContext.jsx";

const defaultPackage = () => ({
  id: crypto.randomUUID ? crypto.randomUUID() : `pkg-${Date.now()}-${Math.random()}`,
  count: 10,
  price: 1600
});

const packageValidator = (pkg) =>
  Number.isFinite(pkg.count) && pkg.count > 0 && Number.isFinite(pkg.price) && pkg.price > 0;

export default function NewStudentForm() {
  const {
    actions: {addStudent}
  } = useAppState();
  const toasts = useToasts();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");
  const [packages, setPackages] = useState([defaultPackage()]);

  const resetForm = () => {
    setName("");
    setContact("");
    setNotes("");
    setPackages([defaultPackage()]);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toasts.addWarning("Введите имя ученика.");
      return;
    }

    const preparedPackages = packages
      .map((pkg) => ({
        count: Number(pkg.count),
        price: Math.round(Number(pkg.price) * 100) / 100
      }))
      .filter(packageValidator);

    if (preparedPackages.length === 0) {
      toasts.addWarning("Добавьте хотя бы один корректный пакет уроков.");
      return;
    }

    const student = addStudent({
      name: trimmedName,
      contact,
      notes,
      packages: preparedPackages
    });

    toasts.addSuccess(`Ученик «${student.name}» добавлен.`);
    resetForm();
  };

  const handleAddPackage = () => {
    setPackages((prev) => [...prev, defaultPackage()]);
  };

  const handlePackageChange = (id, key, value) => {
    setPackages((prev) =>
      prev.map((pkg) => (pkg.id === id ? {...pkg, [key]: value} : pkg))
    );
  };

  const handleRemovePackage = (id) => {
    setPackages((prev) => (prev.length <= 1 ? prev : prev.filter((pkg) => pkg.id !== id)));
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Новый ученик</h2>
      </div>
      <form className="panel-body" onSubmit={handleSubmit} onReset={resetForm}>
        <div className="panel-body-content">
          <div className="form-grid">
            <label className="form-field">
              <span>Имя ученика *</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                placeholder="Например, Мария"
              />
            </label>
            <label className="form-field">
              <span>Контакты</span>
              <input
                type="text"
                value={contact}
                onChange={(event) => setContact(event.target.value)}
                placeholder="Телефон, Telegram"
              />
            </label>
            <label className="form-field form-field-wide">
              <span>Заметки</span>
              <textarea
                rows={2}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Уровень, пожелания, особенности"
              />
            </label>
          </div>

          <div className="packages-block">
            <div className="packages-header">
              <h3>Пакеты уроков</h3>
              <button type="button" className="btn secondary" onClick={handleAddPackage}>
                Добавить пакет
              </button>
            </div>
            <div className="packages-rows">
              {packages.map((pkg) => (
                <div className="package-row" key={pkg.id}>
                  <label>
                    <span>Количество</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={pkg.count}
                      onChange={(event) =>
                        handlePackageChange(pkg.id, "count", Number(event.target.value))
                      }
                    />
                  </label>
                  <label>
                    <span>Цена, ₽</span>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={pkg.price}
                      onChange={(event) =>
                        handlePackageChange(pkg.id, "price", Number(event.target.value))
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="btn ghost package-remove-btn"
                    onClick={() => handleRemovePackage(pkg.id)}
                    title="Удалить пакет"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <p className="form-hint">
              Добавьте один или несколько пакетов: количество уроков и цена за один урок.
              Остаток будет списываться автоматически при записи занятия.
            </p>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn primary">
              Добавить ученика
            </button>
            <button type="reset" className="btn ghost">
              Очистить
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

