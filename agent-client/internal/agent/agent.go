package agent

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
)

const serverURL = "http://localhost:5000" // 실제 서버 IP로 변경

func Start() {
	for {
		checkAndRun()
		time.Sleep(3 * time.Second)
	}
}

func checkAndRun() {
	resp, err := http.Get(serverURL + "/api/command")
	if err != nil {
		fmt.Println("서버 요청 실패:", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == 204 {
		return
	}

	body, _ := ioutil.ReadAll(resp.Body)
	command := string(body)

	if command == "cpu" {
		cpuPercent, _ := cpu.Percent(0, false)
		result := map[string]interface{}{
			"cpu_usage": fmt.Sprintf("%.2f%%", cpuPercent[0]),
		}
		sendResult(result)
	}
}

func sendResult(data map[string]interface{}) {
	jsonData, _ := json.Marshal(data)
	resp, err := http.Post(serverURL+"/api/result", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		fmt.Println("결과 전송 실패:", err)
		return
	}
	defer resp.Body.Close()
	fmt.Println("결과 전송 완료")
}
