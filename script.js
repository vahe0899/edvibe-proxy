const API_BASE = "https://progressme.ru/school-api";
let authToken = "";

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const login = document.getElementById("login").value;
  const password = document.getElementById("password").value;

  // Получение токена
  const loginResponse = await fetch(`${API_BASE}/api/UserAuth/LoginTeacher`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({login, password}),
  });

  const loginData = await loginResponse.json();
  if (!loginData.isSuccess) {
    alert("Ошибка авторизации: " + loginData.errorMessage);
    return;
  }

  authToken = loginData.data.token;

  // Получение расписания
  const teacherId = loginData.data.userId;
  const today = new Date();
  const startDate = today.toISOString().split("T")[0];
  const endDate = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0]; // +14 дней

  const scheduleResponse = await fetch(
    `${API_BASE}/api/Schedule/GetTeacherSchedule`,
    {
      method: "POST",
      headers: {
        Authorization: authToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        teacherId,
        startDate,
        endDate,
      }),
    }
  );

  const scheduleData = await scheduleResponse.json();
  if (!scheduleData.isSuccess) {
    alert("Ошибка загрузки расписания: " + scheduleData.errorMessage);
    return;
  }

  renderSchedule(scheduleData.data);
});

function renderSchedule(lessons) {
  const container = document.getElementById("scheduleContainer");
  container.innerHTML = "";

  lessons.forEach((lesson) => {
    const start = new Date(lesson.startTime);
    const end = new Date(lesson.endTime);
    const el = document.createElement("div");
    el.className = "lesson";
    el.innerHTML = `
      <strong>${lesson.title || "Без названия"}</strong><br />
      ${start.toLocaleDateString()} ${start.toLocaleTimeString()} — ${end.toLocaleTimeString()}
    `;
    container.appendChild(el);
  });
}
