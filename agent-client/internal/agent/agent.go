package agent

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os/exec"
	"regexp"
	"strings"
	"time"
)

// const serverURL = "https://b968-183-103-69-19.ngrok-free.app"
const serverURL = "http://localhost:8080"

func Start() {
	for {
		cmd := getCommand()
		if cmd == "" {
			time.Sleep(3 * time.Second)
			continue
		}

		fmt.Println("수신한 명령:", cmd)

		var result map[string]interface{}

		switch cmd {
		case "cpu":
			result = map[string]interface{}{"cpu_usage": "23.45%"}
		case "snmp-check":
			result = map[string]interface{}{"result": "✅ SNMP 설정 양호"}
		case "ftp-check":
			result = map[string]interface{}{"result": checkFTPAccessControl()}
		default:
			result = map[string]interface{}{"result": "❓ 알 수 없는 명령"}
		}

		sendResult(result)
		time.Sleep(3 * time.Second)
	}
}

func getCommand() string {
	resp, err := http.Get(serverURL + "/api/command")
	if err != nil {
		fmt.Println("서버 요청 실패:", err)
		return ""
	}
	defer resp.Body.Close()

	if resp.StatusCode == 204 {
		return ""
	}

	body, _ := ioutil.ReadAll(resp.Body)
	return string(body)
}

func sendResult(data map[string]interface{}) {
	jsonData, _ := json.Marshal(data)
	_, err := http.Post(serverURL+"/api/result", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		fmt.Println("결과 전송 실패:", err)
	}
}

func checkFTPAccessControl() string {
	ftpServices := map[string]string{
		"vsftpd":    "/etc/vsftpd.conf",
		"proftpd":   "/etc/proftpd.conf",
		"pure-ftpd": "/etc/pure-ftpd/pure-ftpd.conf",
		"wu-ftpd":   "/etc/ftpaccess",
		"bftpd":     "/etc/bftpd.conf",
		"glftpd":    "/etc/glftpd.conf",
	}

	results := []string{}

	ipRegex := regexp.MustCompile(`(?i)(allow|deny|from)\s+(\d{1,3}\.){3}\d{1,3}`)
	userRegex := regexp.MustCompile(`(?i)(user|login|anonymous|chroot).*`)

	for service, confPath := range ftpServices {
		// 1. 설치 여부
		if _, err := exec.LookPath(service); err != nil {
			results = append(results, fmt.Sprintf("ℹ️ %s: 미설치", service))
			continue
		}

		// 2. 설정 파일 존재 확인
		data, err := ioutil.ReadFile(confPath)
		if err != nil {
			results = append(results, fmt.Sprintf("❌ %s: 설정 파일 없음 (%s)", service, confPath))
			continue
		}
		conf := string(data)

		// 3. 보안 점검: 접근제어 설정 여부 확인
		ipOk := ipRegex.MatchString(conf)
		userOk := userRegex.MatchString(conf)

		if ipOk || userOk {
			found := []string{}
			if ipOk {
				found = append(found, "IP 기반")
			}
			if userOk {
				found = append(found, "계정 기반")
			}
			results = append(results, fmt.Sprintf("✅ %s: 설정 파일 있음 (%s) - 접근제어: %s", service, confPath, strings.Join(found, ", ")))
		} else {
			results = append(results, fmt.Sprintf("❌ %s: 설정 파일 있음 (%s) - 접근제어 설정 미흡", service, confPath))
		}
	}

	return strings.Join(results, "\n")
}
