import {useEffect, useMemo, useState} from "react";
import Header from "./components/Header.jsx";
import ToastContainer from "./components/ToastContainer.jsx";
import NavigationTabs from "./components/layout/NavigationTabs.jsx";
import Dashboard from "./components/dashboard/Dashboard.jsx";
import NewStudentForm from "./components/forms/NewStudentForm.jsx";
import StudentList from "./components/students/StudentList.jsx";
import LessonForm from "./components/forms/LessonForm.jsx";
import LessonList from "./components/lessons/LessonList.jsx";
import CalendarView from "./components/calendar/CalendarView.jsx";
import EditLessonModal from "./components/lessons/EditLessonModal.jsx";
import {AppStateProvider, useAppState} from "./state/AppStateContext.jsx";
import {ToastProvider} from "./state/ToastContext.jsx";

function AppShell() {
  const {
    state: {lessons},
  } = useAppState();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [lessonStudentId, setLessonStudentId] = useState("");
  const [editingLessonId, setEditingLessonId] = useState(null);

  const selectedLessonExists = useMemo(
    () => lessons.some((lesson) => lesson.id === editingLessonId),
    [lessons, editingLessonId]
  );

  useEffect(() => {
    if (editingLessonId && !selectedLessonExists) {
      setEditingLessonId(null);
    }
  }, [editingLessonId, selectedLessonExists]);

  const handleOpenLessonEditor = (lessonId) => {
    setEditingLessonId(lessonId);
    setActiveTab("lessons");
  };

  const handleSelectStudent = (studentId) => {
    setLessonStudentId(studentId);
    setActiveTab("lessons");
  };

  return (
    <>
      <Header />
      <NavigationTabs activeTab={activeTab} onChange={setActiveTab} />
      <main className="app-content container">
        {activeTab === "dashboard" && (
          <div className="content-section">
            <Dashboard onSelectStudent={handleSelectStudent} />
          </div>
        )}

        {activeTab === "students" && (
          <div className="content-section">
            <NewStudentForm />
            <StudentList onSelectStudentForLesson={handleSelectStudent} />
          </div>
        )}

        {activeTab === "lessons" && (
          <div className="content-section">
            <LessonForm
              selectedStudentId={lessonStudentId}
              onStudentChange={setLessonStudentId}
            />
            <LessonList onEditLesson={handleOpenLessonEditor} />
          </div>
        )}

        {activeTab === "calendar" && (
          <div className="content-section">
            <CalendarView onEditLesson={handleOpenLessonEditor} />
          </div>
        )}
      </main>
      {editingLessonId && selectedLessonExists && (
        <EditLessonModal
          lessonId={editingLessonId}
          onClose={() => setEditingLessonId(null)}
        />
      )}
      <ToastContainer />
    </>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppStateProvider>
        <AppShell />
      </AppStateProvider>
    </ToastProvider>
  );
}
