import {createContext, useContext, useEffect, useMemo, useReducer} from "react";

const STORAGE_KEY = "kitya-calendar-state-v2";
const LATEST_VERSION = 2;

const AppStateContext = createContext(null);

const defaultState = () => ({
  version: LATEST_VERSION,
  students: [],
  lessons: [],
  settings: {
    defaultLessonDuration: 60
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
  if (!state || typeof state !== "object") return defaultState();
  const merged = {...defaultState(), ...state};

  if (!Array.isArray(merged.students)) merged.students = [];
  if (!Array.isArray(merged.lessons)) merged.lessons = [];
  merged.settings = {...defaultState().settings, ...merged.settings};

  const nowIso = new Date().toISOString();

  merged.students = merged.students.map((student) => {
    const normalized = {
      id: student.id || generateId(),
      name: student.name || "Без имени",
      contact: student.contact || "",
      notes: student.notes || "",
      archived: Boolean(student.archived),
      createdAt: student.createdAt || nowIso,
      updatedAt: student.updatedAt || nowIso,
      packages: Array.isArray(student.packages) ? student.packages : []
    };

    normalized.packages = normalized.packages
      .map((pkg) => {
        const price = Number(pkg.price) || 0;
        const totalLessons = Number(pkg.totalLessons || pkg.count) || 0;
        const remainingLessons =
          Number(pkg.remainingLessons ?? pkg.rest ?? totalLessons) || totalLessons;
        const consumedLessons =
          Number(
            pkg.consumedLessons ??
              Math.max(0, totalLessons - remainingLessons)
          ) || Math.max(0, totalLessons - remainingLessons);

        if (totalLessons <= 0) return null;

        return {
          id: pkg.id || generateId(),
          price,
          totalLessons,
          remainingLessons: Math.max(0, Math.min(totalLessons, remainingLessons)),
          consumedLessons: Math.max(0, Math.min(totalLessons, consumedLessons)),
          createdAt: pkg.createdAt || nowIso,
          updatedAt: pkg.updatedAt || nowIso
        };
      })
      .filter(Boolean);

    return normalized;
  });

  merged.lessons = merged.lessons.map((lesson) => {
    const price = Number(lesson.price) || 0;
    return {
      id: lesson.id || generateId(),
      studentId: lesson.studentId,
      packageId: lesson.packageId || null,
      start: lesson.start,
      durationMinutes: Number(lesson.durationMinutes) || merged.settings.defaultLessonDuration,
      price,
      notes: lesson.notes || "",
      status: lesson.status || "scheduled",
      refunded: Boolean(lesson.refunded),
      createdAt: lesson.createdAt || nowIso,
      updatedAt: lesson.updatedAt || nowIso
    };
  });

  merged.version = LATEST_VERSION;
  return merged;
}

export function AppStateProvider({children}) {
  const [state, dispatch] = useReducer(appReducer, undefined, loadState);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const actions = useMemo(() => {
    const updateStudentPackages = (studentId, updater) => {
      const student = state.students.find((item) => item.id === studentId);
      if (!student) return;
      const updatedPackages = updater(student.packages).map((pkg) => ({
        ...pkg,
        updatedAt: new Date().toISOString()
      }));
      dispatch({
        type: "UPDATE_STUDENT",
        payload: {id: studentId, update: {packages: updatedPackages, updatedAt: new Date().toISOString()}}
      });
    };

    return {
      addStudent: (data) => {
        const nowIso = new Date().toISOString();
        const student = {
          id: generateId(),
          name: data.name.trim(),
          contact: data.contact.trim(),
          notes: data.notes.trim(),
          archived: false,
          createdAt: nowIso,
          updatedAt: nowIso,
          packages: data.packages.map((pkg) => ({
            id: generateId(),
            price: pkg.price,
            totalLessons: pkg.count,
            remainingLessons: pkg.count,
            consumedLessons: 0,
            createdAt: nowIso,
            updatedAt: nowIso
          }))
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
      addPackageToStudent: (studentId, pkg) => {
        updateStudentPackages(studentId, (packages) => [
          ...packages,
          {
            id: generateId(),
            price: pkg.price,
            totalLessons: pkg.count,
            remainingLessons: pkg.count,
            consumedLessons: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]);
      },
      updateStudentPackage: (studentId, packageId, update) => {
        updateStudentPackages(studentId, (packages) =>
          packages.map((pkg) =>
            pkg.id === packageId
              ? {
                  ...pkg,
                  ...update,
                  totalLessons: update.totalLessons ?? pkg.totalLessons,
                  remainingLessons: update.remainingLessons ?? pkg.remainingLessons,
                  price: update.price ?? pkg.price
                }
              : pkg
          )
        );
      },
      deleteStudentPackage: (studentId, packageId) => {
        updateStudentPackages(studentId, (packages) => packages.filter((pkg) => pkg.id !== packageId));
      },
      addLesson: (lessonData) => {
        const nowIso = new Date().toISOString();
        const lesson = {
          id: generateId(),
          ...lessonData,
          createdAt: nowIso,
          updatedAt: nowIso,
          refunded: false,
          status: "scheduled"
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
      consumeLessonSlot: (studentId, packageId) => {
        updateStudentPackages(studentId, (packages) =>
          packages.map((pkg) => {
            if (pkg.id !== packageId) return pkg;
            if (pkg.remainingLessons <= 0) return pkg;
            const remainingLessons = pkg.remainingLessons - 1;
            return {
              ...pkg,
              remainingLessons,
              consumedLessons: Math.max(0, pkg.totalLessons - remainingLessons)
            };
          })
        );
      },
      restoreLessonSlot: (studentId, packageId) => {
        updateStudentPackages(studentId, (packages) =>
          packages.map((pkg) => {
            if (pkg.id !== packageId) return pkg;
            const remainingLessons = Math.min(pkg.totalLessons, pkg.remainingLessons + 1);
            return {
              ...pkg,
              remainingLessons,
              consumedLessons: Math.max(0, pkg.totalLessons - remainingLessons)
            };
          })
        );
      },
      setStateFromImport: (newState) => {
        dispatch({type: "SET_STATE", payload: migrateState(newState)});
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

