import {useMemo, useState} from "react";
import {useAppState} from "../../state/AppStateContext.jsx";
import StudentCard from "./StudentCard.jsx";
import EditStudentModal from "./EditStudentModal.jsx";

export default function StudentList({onSelectStudentForLesson}) {
  const {
    state: {students, lessons}
  } = useAppState();

  const [editingStudentId, setEditingStudentId] = useState(null);

  const filteredStudents = useMemo(() => {
    return [...students].sort((a, b) => a.name.localeCompare(b.name, "ru"));
  }, [students]);

  const lessonsByStudent = useMemo(() => {
    const map = new Map();
    for (const lesson of lessons) {
      if (!map.has(lesson.studentId)) {
        map.set(lesson.studentId, []);
      }
      map.get(lesson.studentId).push(lesson);
    }
    for (const [, studentLessons] of map.entries()) {
      studentLessons.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    }
    return map;
  }, [lessons]);

  const editingStudent = editingStudentId
    ? students.find((student) => student.id === editingStudentId)
    : null;

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Ученики</h2>
      </div>
      <div className="panel-body">
        {filteredStudents.length === 0 ? (
          <p className="empty-state">
            Пока нет учеников. Добавьте первого с помощью формы выше.
          </p>
        ) : (
          <div className="cards">
            {filteredStudents.map((student) => (
              <StudentCard
                key={student.id}
                student={student}
                lessons={lessonsByStudent.get(student.id) ?? []}
                onEdit={() => setEditingStudentId(student.id)}
                onSelectForLesson={() => onSelectStudentForLesson?.(student.id)}
              />
            ))}
          </div>
        )}
      </div>

      {editingStudent && (
        <EditStudentModal
          student={editingStudent}
          onClose={() => setEditingStudentId(null)}
        />
      )}
    </section>
  );
}

