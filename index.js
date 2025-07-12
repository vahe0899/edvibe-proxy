import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());
const API_BASE = "https://progressme.ru/school-api";

app.post("/api/login", async (req, res) => {
  const r = await fetch(`${API_BASE}/api/UserAuth/LoginTeacher`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(req.body),
  });
  res.json(await r.json());
});

app.post("/api/schedule", async (req, res) => {
  const r = await fetch(`${API_BASE}/api/Schedule/GetTeacherSchedule`, {
    method: "POST",
    headers: {
      Authorization: req.headers.authorization,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(req.body),
  });
  res.json(await r.json());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy on port ${PORT}`));
