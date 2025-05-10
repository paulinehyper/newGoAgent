const express = require('express');
const app = express();
const port = 5000;

app.use(express.json());
app.use(express.static('public'));

let command = "";
let latestResult = null;

// 에이전트가 명령 요청
app.get('/api/command', (req, res) => {
  if (command) {
    res.send(command);
    command = "";
  } else {
    res.status(204).send();
  }
});

// 에이전트가 결과 전송
app.post('/api/result', (req, res) => {
  console.log("에이전트로부터 수신:", req.body);
  latestResult = req.body;
  res.send("결과 수신 완료");
});

// 웹에서 명령 전송
app.get('/send-command/:cmd', (req, res) => {
  command = req.params.cmd;
  console.log(`명령 [${command}] 설정됨`);
  res.json({ status: "ok" });
});

// 결과 조회
app.get('/latest-result', (req, res) => {
  res.json(latestResult || { status: "대기 중" });
});

app.listen(port, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${port}`);
});
