import {useEffect, useState} from "react";
import {createPortal} from "react-dom";
import {useAppState} from "../../state/AppStateContext.jsx";
import {useToasts} from "../../state/ToastContext.jsx";

const newPackageTemplate = () => {
  const nowIso = new Date().toISOString();
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `pkg-${Date.now()}-${Math.random()}`,
    price: 1600,
    totalLessons: 10,
    remainingLessons: 10,
    consumedLessons: 0,
    createdAt: nowIso,
    updatedAt: nowIso
  };
};

export default function EditStudentModal({student, onClose}) {
  const {
    actions: {updateStudent}
  } = useAppState();
  const toasts = useToasts();

  const [name, setName] = useState(student.name);
  const [contact, setContact] = useState(student.contact);
  const [notes, setNotes] = useState(student.notes);
  const [packages, setPackages] = useState(
    student.packages.length > 0
      ? student.packages.map((pkg) => ({
          id: pkg.id,
          price: pkg.price,
          totalLessons: pkg.totalLessons,
          remainingLessons: pkg.remainingLessons,
          consumedLessons: pkg.consumedLessons ?? Math.max(0, pkg.totalLessons - pkg.remainingLessons),
          createdAt: pkg.createdAt,
          updatedAt: pkg.updatedAt
        }))
      : [newPackageTemplate()]
  );

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handlePackageChange = (id, key, value) => {
    setPackages((prev) =>
      prev.map((pkg) => {
        if (pkg.id !== id) return pkg;
        const next = {...pkg, [key]: value};
        if (key === "totalLessons" && Number(value) < next.remainingLessons) {
          next.remainingLessons = Number(value);
        }
        if (key === "remainingLessons" && Number(value) > next.totalLessons) {
          next.remainingLessons = next.totalLessons;
        }
        next.consumedLessons = Math.max(
          0,
          next.totalLessons - Math.min(next.remainingLessons, next.totalLessons)
        );
        return next;
      })
    );
  };

  const handleAddPackage = () => {
    setPackages((prev) => [...prev, newPackageTemplate()]);
  };

  const handleRemovePackage = (id) => {
    setPackages((prev) => (prev.length <= 1 ? prev : prev.filter((pkg) => pkg.id !== id)));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toasts.addWarning("Имя ученика не может быть пустым.");
      return;
    }

    const normalizedPackages = packages
      .map((pkg) => ({
        id: pkg.id,
        price: Math.max(0, Number(pkg.price) || 0),
        totalLessons: Math.max(0, Math.round(Number(pkg.totalLessons) || 0)),
        remainingLessons: Math.max(0, Math.round(Number(pkg.remainingLessons) || 0))
      }))
      .filter((pkg) => pkg.totalLessons > 0 && pkg.price > 0);

    if (normalizedPackages.length === 0) {
      toasts.addWarning("Добавьте хотя бы один корректный пакет уроков.");
      return;
    }

    const nowIso = new Date().toISOString();

    updateStudent(student.id, {
      name: trimmedName,
      contact: contact.trim(),
      notes: notes.trim(),
      archived: student.archived,
      packages: normalizedPackages.map((pkg) => ({
        ...pkg,
        remainingLessons: Math.min(pkg.remainingLessons, pkg.totalLessons),
        consumedLessons: Math.max(0, pkg.totalLessons - Math.min(pkg.remainingLessons, pkg.totalLessons)),
        createdAt:
          packages.find((item) => item.id === pkg.id)?.createdAt ?? nowIso,
        updatedAt: nowIso
      }))
    });

    toasts.addSuccess("Данные ученика обновлены.");
    onClose();
  };

  return createPortal(
    <div className="modal-backdrop">
      <form className="modal" onSubmit={handleSubmit}>
        <header className="modal__header">
          <h3 className="modal__title">Редактирование ученика</h3>
          <button type="button" className="btn ghost small" onClick={onClose}>
            Закрыть
          </button>
        </header>

        <div className="grid-two-columns">
          <label className="form-field">
            <span>Имя</span>
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="form-field">
            <span>Контакты</span>
            <input value={contact} onChange={(event) => setContact(event.target.value)} />
          </label>
        </div>

        <label className="form-field">
          <span>Заметки</span>
          <textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>

        <section>
          <h4 className="section-title">Пакеты уроков</h4>
          <div className="editable-list">
            {packages.map((pkg) => (
              <div key={pkg.id} className="editable-list__item">
                <div className="grid-two-columns">
                  <label className="form-field">
                    <span>Цена за урок, ₽</span>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={pkg.price}
                      onChange={(event) => handlePackageChange(pkg.id, "price", Number(event.target.value))}
                    />
                  </label>
                  <label className="form-field">
                    <span>Всего уроков</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={pkg.totalLessons}
                      onChange={(event) =>
                        handlePackageChange(pkg.id, "totalLessons", Number(event.target.value))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Осталось уроков</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={pkg.remainingLessons}
                      onChange={(event) =>
                        handlePackageChange(pkg.id, "remainingLessons", Number(event.target.value))
                      }
                    />
                  </label>
                </div>
                <div className="modal__footer" style={{justifyContent: "space-between"}}>
                  <span className="chip">
                    Израсходовано: {Math.max(0, pkg.totalLessons - pkg.remainingLessons)}
                  </span>
                  <button
                    type="button"
                    className="btn ghost small"
                    onClick={() => handleRemovePackage(pkg.id)}
                    disabled={packages.length <= 1}
                  >
                    Удалить пакет
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="btn secondary" onClick={handleAddPackage}>
            Добавить пакет
          </button>
        </section>

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

