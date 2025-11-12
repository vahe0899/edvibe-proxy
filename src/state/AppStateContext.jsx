import {createContext, useContext, useEffect, useMemo, useReducer} from "react";

const STORAGE_KEY = "kitya-calendar-state-v4";
const LATEST_VERSION = 4;

const AppStateContext = createContext(null);

const defaultState = () => ({
  version: LATEST_VERSION,
  students: [],
  lessons: [],
  settings: {
    defaultLessonDuration: 60,
    defaultLessonPrice: 1800
  }
});

function generateId() {
  return (
    (window.crypto?.randomUUID && window.crypto.randomUUID()) ||
    `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

function appReducer(state, action) {
  switch (action.type) {
    case "ADD_STUDENT": {
      const students = [...state.students, action.payload];
      students.sort((a, b) => a.name.localeCompare(b.name, "ru"));
      return {...state, students};
    }
    case "UPDATE_STUDENT": {
      const students = state.students.map((student) =>
        student.id === action.payload.id ? {...student, ...action.payload.update} : student
      );
      return {...state, students};
    }
    case "DELETE_STUDENT": {
      const students = state.students.filter((student) => student.id !== action.payload);
      const lessons = state.lessons.filter((lesson) => lesson.studentId !== action.payload);
      return {...state, students, lessons};
    }
    case "ADD_LESSON": {
      const lessons = [...state.lessons, action.payload];
      lessons.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      return {...state, lessons};
    }
    case "UPDATE_LESSON": {
      const lessons = state.lessons.map((lesson) =>
        lesson.id === action.payload.id ? {...lesson, ...action.payload.update} : lesson
      );
      lessons.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      return {...state, lessons};
    }
    case "DELETE_LESSON": {
      const lessons = state.lessons.filter((lesson) => lesson.id !== action.payload);
      return {...state, lessons};
    }
    case "UPDATE_SETTINGS": {
      const settings = {
        ...state.settings,
        ...action.payload
      };
      return {...state, settings};
    }
    case "SET_STATE": {
      return action.payload;
    }
    default:
      return state;
  }
}

function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return migrateState(parsed);
  } catch (error) {
    console.error("Не удалось прочитать сохранённые данные:", error);
    return defaultState();
  }
}

function migrateState(state) {
  if (!state || typeof state !== "object") {
    return defaultState();
  }

  const base = defaultState();
  const merged = {...base, ...state};

  merged.students = Array.isArray(merged.students) ? merged.students : [];
  merged.lessons = Array.isArray(merged.lessons) ? merged.lessons : [];
  merged.settings = {...base.settings, ...merged.settings};

  const nowIso = new Date().toISOString();

  const students = merged.students.map((student) => {
    const balance =
      typeof student.balance === "number"
        ? student.balance
        : Array.isArray(student.packages)
        ? student.packages.reduce((sum, pkg) => {
            const remaining = Number(pkg.remainingLessons ?? pkg.rest ?? 0);
            const price = Number(pkg.price ?? 0);
            return sum + remaining * price;
          }, 0)
        : 0;

    return {
      id: student.id || generateId(),
      name: student.name || "Без имени",
      contact: student.contact || "",
      notes: student.notes || "",
      balance,
      archived: Boolean(student.archived),
      createdAt: student.createdAt || nowIso,
      updatedAt: student.updatedAt || nowIso
    };
  });

  const lessons = merged.lessons
    .map((lesson) => {
      if (!lesson.studentId || !lesson.start) return null;
      return {
        id: lesson.id || generateId(),
        studentId: lesson.studentId,
        start: lesson.start,
        durationMinutes: Number(lesson.durationMinutes) || merged.settings.defaultLessonDuration,
        price: Number(lesson.price) || 0,
        notes: lesson.notes || "",
        status:
          lesson.status === "cancelled" ? "scheduled" : lesson.status || "scheduled",
        createdAt: lesson.createdAt || nowIso,
        updatedAt: lesson.updatedAt || nowIso
      };
    })
    .filter(Boolean);

  return {
    ...base,
    ...merged,
    students,
    lessons,
    settings: {
      ...base.settings,
      ...merged.settings,
      defaultLessonPrice:
        typeof merged.settings?.defaultLessonPrice === "number"
          ? merged.settings.defaultLessonPrice
          : base.settings.defaultLessonPrice
    },
    version: LATEST_VERSION
  };
}

export function AppStateProvider({children}) {
  const [state, dispatch] = useReducer(appReducer, undefined, loadState);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const actions = useMemo(() => {
    return {
      addStudent: ({name, contact, notes, balance = 0}) => {
        const nowIso = new Date().toISOString();
        const student = {
          id: generateId(),
          name: name.trim(),
          contact: contact.trim(),
          notes: notes.trim(),
          balance: Math.round(Number(balance || 0) * 100) / 100,
          archived: false,
          createdAt: nowIso,
          updatedAt: nowIso
        };
        dispatch({type: "ADD_STUDENT", payload: student});
        return student;
      },
      updateStudent: (studentId, update) => {
        dispatch({
          type: "UPDATE_STUDENT",
          payload: {id: studentId, update: {...update, updatedAt: new Date().toISOString()}}
        });
      },
      deleteStudent: (studentId) => dispatch({type: "DELETE_STUDENT", payload: studentId}),
      adjustStudentBalance: (studentId, delta) => {
        const student = state.students.find((item) => item.id === studentId);
        if (!student) return;
        const nextBalance = Math.round((student.balance + delta) * 100) / 100;
        dispatch({
          type: "UPDATE_STUDENT",
          payload: {
            id: studentId,
            update: {balance: nextBalance, updatedAt: new Date().toISOString()}
          }
        });
      },
      addLesson: (lessonData) => {
        const nowIso = new Date().toISOString();
        const lesson = {
          id: generateId(),
          studentId: lessonData.studentId,
          start: lessonData.start,
          durationMinutes:
            Number(lessonData.durationMinutes) || state.settings.defaultLessonDuration,
          price: Number(lessonData.price ?? 0),
          notes: (lessonData.notes || "").trim(),
          status: lessonData.status || "scheduled",
          createdAt: nowIso,
          updatedAt: nowIso
        };
        dispatch({type: "ADD_LESSON", payload: lesson});
        return lesson;
      },
      updateLesson: (lessonId, update) => {
        dispatch({
          type: "UPDATE_LESSON",
          payload: {id: lessonId, update: {...update, updatedAt: new Date().toISOString()}}
        });
      },
      deleteLesson: (lessonId) => dispatch({type: "DELETE_LESSON", payload: lessonId}),
      setStateFromImport: (newState) => {
        dispatch({type: "SET_STATE", payload: migrateState(newState)});
      },
      updateDefaultLessonPrice: (price) => {
        dispatch({type: "UPDATE_SETTINGS", payload: {defaultLessonPrice: price}});
      }
    };
  }, [state]);

  const value = useMemo(
    () => ({
      state,
      actions
    }),
    [state, actions]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error("useAppState должен вызываться внутри AppStateProvider");
  }
  return ctx;
}

