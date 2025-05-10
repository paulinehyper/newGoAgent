const express = require('express');
const app = express();
const port = 3000;

let command = "";
let latestResult = {};

app.use(express.json());
app.use(express.static('public')); // public/index.html 사용

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// 명령 요청 (에이전트가 주기적으로 호출)
app.get('/api/command', (req, res) => {
  if (command) {
    res.send(command);
    command = ""; // 한 번만 전달
  } else {
    res.status(204).send(); // No Content
  }
});

// 결과 수신 (에이전트가 전송)
app.post('/api/result', (req, res) => {
  console.log("📥 에이전트 결과 수신:", req.body);
  latestResult = req.body;
  res.send("결과 수신 완료");
});

// 명령 전송 버튼 (웹 UI에서 호출)
app.get('/send-command/:cmd', (req, res) => {
  command = req.params.cmd;
  res.send(`명령 [${command}] 설정됨`);
});

// 결과 조회 (웹 UI에서 폴링)
app.get('/latest-result', (req, res) => {
  res.json(latestResult);
});

// 기본 라우트
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.listen(port, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${port}`);
});
