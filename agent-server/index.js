const express = require('express');
const { Pool } = require('pg');
const app = express();
const port = 8080;

// PostgreSQL 연결 설정
const pool = new Pool({
  user: 'goagent',
  host: 'localhost',
  database: 'goagent',
  password: '7637op2337!',
  port: 5432,
});

let command = "";
let results = {};

app.use(express.json());
app.use(express.static('public'));

// 메인 페이지
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// 에이전트 명령 요청
app.get('/api/command', (req, res) => {
  if (command) {
    res.send(command);
    command = "";
  } else {
    res.status(204).send();
  }
});

// 에이전트 결과 수신
app.post('/api/result', (req, res) => {
  const { item, result } = req.body;
  console.log("📥 에이전트 결과 수신:", req.body);
  if (item && result) {
    results[item] = result;
  }
  res.send("결과 수신 완료");
});

// 명령 전송
app.get('/send-command/:cmd', (req, res) => {
  command = req.params.cmd;
  res.send(`명령 [${command}] 설정됨`);
});

// 결과 조회
app.get('/latest-result', (req, res) => {
  res.json(results);
});

// 템플릿 단건 등록 API
app.post('/api/template', async (req, res) => {
  const {
    templateid, templatename,
    vulnid, serverName, hostName, ip,
    vulName, result, assessYN
  } = req.body;

  console.log("📨 받은 템플릿 데이터:", req.body);

  try {
    const query = `
      INSERT INTO template 
      (templateid, templatename, vulnid, servername, hostname, ip, vulname, result, assessyn)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
    const values = [
      templateid, templatename,
      vulnid, serverName, hostName, ip,
      vulName, result, assessYN
    ];

    await pool.query(query, values);
    res.send("DB 저장 완료");
  } catch (err) {
    console.error("❌ 템플릿 저장 실패:", err);
    res.status(500).send("DB 오류");
  }
});

// 서버 실행
app.listen(port, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${port}`);
});
