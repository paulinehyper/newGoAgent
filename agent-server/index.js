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

// 점검 명령과 결과 관리
let command = "";
let results = {}; // 각 명령별 결과 저장

// 미들웨어 설정
app.use(express.json());
app.use(express.static('public')); // public 디렉토리 내 정적 파일 서빙

// 메인 페이지
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// 에이전트가 명령 요청
app.get('/api/command', (req, res) => {
  if (command) {
    res.send(command);
    command = ""; // 명령은 1회성
  } else {
    res.status(204).send(); // No Content
  }
});

// 에이전트가 결과 전송
app.post('/api/result', (req, res) => {
  const { item, result } = req.body;
  console.log("📥 에이전트 결과 수신:", req.body);
  if (item && result) {
    results[item] = result;
  }
  res.send("결과 수신 완료");
});

// 사용자 명령 전송 (예: /send-command/snmp-check)
app.get('/send-command/:cmd', (req, res) => {
  command = req.params.cmd;
  res.send(`명령 [${command}] 설정됨`);
});

// 점검 결과 전체 조회
app.get('/latest-result', (req, res) => {
  res.json(results);
});

// 템플릿 추가 API (createTime은 DB에서 자동 생성됨)
app.post('/api/template', async (req, res) => {
  const {
    vulnid, serverName, hostName, ip,
    vulName, result, assessYN
  } = req.body;

  console.log("📨 받은 템플릿 데이터:", req.body);

  try {
    const query = `
      INSERT INTO template 
      (vulnid, servername, hostname, ip, vulname, result, assessyn)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    const values = [
      vulnid, serverName, hostName, ip,
      vulName, result, assessYN
    ];

    await pool.query(query, values);
    console.log("✅ DB에 정상 삽입 완료");
    res.send("DB 저장 완료");
  } catch (err) {
    console.error("❌ 템플릿 저장 실패:", err);
    res.status(500).send("DB 오류");
  }
});

// 템플릿 목록 조회 API
app.get('/api/template/list', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM template ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error("❌ 템플릿 목록 조회 실패:", err);
    res.status(500).send("DB 오류");
  }
});


// 서버 실행
app.listen(port, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${port}`);
});
