import {useEffect, useMemo, useState} from "react";
import Header from "./components/Header.jsx";
import ToastContainer from "./components/ToastContainer.jsx";
import NavigationTabs from "./components/layout/NavigationTabs.jsx";
import Dashboard from "./components/dashboard/Dashboard.jsx";
import NewStudentForm from "./components/forms/NewStudentForm.jsx";
import StudentList from "./components/students/StudentList.jsx";
import CalendarView from "./components/calendar/CalendarView.jsx";
import EditLessonModal from "./components/lessons/EditLessonModal.jsx";
import CreateLessonModal from "./components/lessons/CreateLessonModal.jsx";
import {AppStateProvider, useAppState} from "./state/AppStateContext.jsx";
import {ToastProvider} from "./state/ToastContext.jsx";
import LessonPriceSettings from "./components/forms/LessonPriceSettings.jsx";

const roundToSlot = (date) => {
  const result = new Date(date);
  result.setSeconds(0, 0);
  const remainder = result.getMinutes() % 30;
  if (remainder !== 0) {
    result.setMinutes(result.getMinutes() + (30 - remainder));
  }
  return result;
};

function AppShell() {
  const {
    state: {lessons, students}
  } = useAppState();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [lessonStudentId, setLessonStudentId] = useState("");
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [creatingLesson, setCreatingLesson] = useState(null);

  const selectedLessonExists = useMemo(
    () => lessons.some((lesson) => lesson.id === editingLessonId),
    [lessons, editingLessonId]
  );

  useEffect(() => {
    if (editingLessonId && !selectedLessonExists) {
      setEditingLessonId(null);
    }
  }, [editingLessonId, selectedLessonExists]);

  const defaultStudentId = students[0]?.id ?? "";

  const handleOpenLessonEditor = (lessonId) => {
    setEditingLessonId(lessonId);
    setActiveTab("calendar");
  };

  const handleRequestLessonCreation = ({studentId, start}) => {
    const targetStudentId = studentId ?? lessonStudentId ?? defaultStudentId;
    if (targetStudentId) {
      setLessonStudentId(targetStudentId);
    }
    const baseStart = roundToSlot(start ?? new Date());
    setCreatingLesson({
      studentId: targetStudentId || "",
      start: baseStart
    });
    setActiveTab("calendar");
  };

  const handleCreateLessonClose = () => {
    setCreatingLesson(null);
  };

  const handleSelectStudentFromDashboard = (studentId) => {
    setLessonStudentId(studentId);
    setActiveTab("students");
  };

  return (
    <>
      <Header />
      <NavigationTabs activeTab={activeTab} onChange={setActiveTab} />
      <main className="app-content container">
        {activeTab === "dashboard" && (
          <div className="content-section">
            <Dashboard onSelectStudent={handleSelectStudentFromDashboard} />
          </div>
        )}

        {activeTab === "students" && (
          <div className="content-section">
            <LessonPriceSettings />
            <NewStudentForm />
            <StudentList onRequestLessonCreation={(studentId) => handleRequestLessonCreation({studentId})} />
          </div>
        )}

        {activeTab === "calendar" && (
          <div className="content-section">
            <CalendarView
              onEditLesson={handleOpenLessonEditor}
              onCreateLesson={({start}) => handleRequestLessonCreation({start})}
            />
          </div>
        )}
      </main>
      {creatingLesson && (
        <CreateLessonModal
          initialStudentId={creatingLesson.studentId}
          initialStart={creatingLesson.start}
          onClose={handleCreateLessonClose}
        />
      )}
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
