const express = require('express');
const { Pool } = require('pg');
const app = express();
const port = 8080;

const pool = new Pool({
  user: 'goagent',
  host: 'localhost',
  database: 'goagent',
  password: '7637op2337!',
  port: 5432,
});

let commandQueue = [];

app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// agent가 주기적으로 명령 가져감
app.get('/api/command', (req, res) => {
  if (commandQueue.length > 0) {
    const cmd = commandQueue.shift();
    res.json(cmd);
  } else {
    res.status(204).send(); // No command
  }
});

// 클라이언트에서 점검 요청 → 명령 큐에 등록
app.post('/api/send-command', (req, res) => {
  const { id, vulnid, hostname } = req.body;
  commandQueue.push({ id, vulnid, hostname });
  console.log(`📩 명령 대기열 추가됨: ${vulnid} (${hostname})`);
  res.send('명령 등록됨');
});

// agent가 점검 결과 전송
app.post('/api/result', async (req, res) => {
  const { id, result } = req.body;
  try {
    await pool.query(
      'UPDATE template SET result = $1, assessyn = $2, createtime = NOW() WHERE id = $3',
      [result, 'Y', id]
    );
    console.log(`✅ DB 업데이트 완료 (id=${id}) → ${result}`);
    res.send('DB 업데이트 완료');
  } catch (err) {
    console.error('❌ DB 업데이트 실패:', err);
    res.status(500).send('DB 오류');
  }
});

// 템플릿 등록
app.post('/api/template', async (req, res) => {
  const {
    templateid, templatename, vulnid,
    serverName, hostName, ip, vulName, result, assessYN
  } = req.body;

  try {
    const query = `
      INSERT INTO template 
      (templateid, templatename, vulnid, servername, hostname, ip, vulname, result, assessyn)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `;
    const values = [
      templateid, templatename, vulnid,
      serverName, hostName, ip, vulName, result, assessYN
    ];
    await pool.query(query, values);
    res.send('DB 저장 완료');
  } catch (err) {
    console.error('❌ 템플릿 저장 실패:', err);
    res.status(500).send('DB 오류');
  }
});

// 템플릿 항목 목록 조회
app.get('/api/template/by-id/:templateid', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM template WHERE templateid = $1 ORDER BY id',
      [req.params.templateid]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).send('DB 조회 실패');
  }
});

app.listen(port, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${port}`);
});
