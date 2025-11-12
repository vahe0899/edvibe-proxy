import {useState} from "react";
import {useAppState} from "../../state/AppStateContext.jsx";
import {useToasts} from "../../state/ToastContext.jsx";

const parseCurrency = (value, fallback = 0) => {
  if (typeof value === "number") return value;
  if (!value) return fallback;
  const normalized = value.toString().replace(/\s/g, "").replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : fallback;
};

export default function LessonPriceSettings() {
  const {
    state: {settings},
    actions: {updateDefaultLessonPrice}
  } = useAppState();
  const toasts = useToasts();
  const [value, setValue] = useState(String(settings.defaultLessonPrice ?? 0));
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const parsed = Math.round(parseCurrency(value, settings.defaultLessonPrice) * 100) / 100;
    if (parsed <= 0) {
      toasts.addWarning("Стоимость урока должна быть больше нуля.");
      return;
    }
    if (parsed === settings.defaultLessonPrice) {
      toasts.addInfo("Стоимость урока не изменилась.");
      return;
    }

    setIsSaving(true);
    try {
      updateDefaultLessonPrice(parsed);
      toasts.addSuccess("Стоимость урока обновлена.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Тариф</h2>
      </div>
      <form className="panel-body" onSubmit={handleSubmit}>
        <div className="panel-body-content">
          <div className="form-grid">
            <label className="form-field">
              <span>Стоимость стандартного урока, ₽</span>
              <input
                type="number"
                min="0"
                step="50"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="Например, 1800"
              />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn primary" disabled={isSaving}>
              Сохранить тариф
            </button>
          </div>
          <p className="form-hint">
            Стоимость используется по умолчанию при создании и списании уроков, а также для расчёта,
            на сколько занятий хватит баланса ученика.
          </p>
        </div>
      </form>
    </section>
  );
}
