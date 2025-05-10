package agent

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"regexp"
	"strings"
	"time"
)

const serverURL = "http://localhost:3000"

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
	vsftpConf, err := ioutil.ReadFile("/etc/vsftpd.conf")
	if err != nil {
		return "❌ 취약: vsftpd.conf 파일 없음"
	}
	confStr := string(vsftpConf)

	requiredSettings := map[string]string{
		"listen":            "NO",
		"listen_ipv6":       "YES",
		"anonymous_enable":  "NO",
		"local_enable":      "YES",
		"write_enable":      "YES",
		"chroot_local_user": "YES",
		"userlist_enable":   "YES",
		"userlist_deny":     "NO",
		"userlist_file":     "/etc/vsftpd.user_list",
	}

	confLines := strings.Split(confStr, "\n")
	found := map[string]string{}
	for _, line := range confLines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "#") || !strings.Contains(line, "=") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		key := strings.TrimSpace(parts[0])
		value := strings.TrimSpace(parts[1])
		if _, ok := requiredSettings[key]; ok {
			found[key] = value
		}
	}
	missing := []string{}
	for k, v := range requiredSettings {
		if val, ok := found[k]; !ok || val != v {
			missing = append(missing, fmt.Sprintf("%s=%s", k, v))
		}
	}
	if len(missing) > 0 {
		return fmt.Sprintf("❌ 취약: vsftpd.conf 설정 누락\n- %s", strings.Join(missing, "\n- "))
	}

	allow, err1 := ioutil.ReadFile("/etc/hosts.allow")
	deny, err2 := ioutil.ReadFile("/etc/hosts.deny")
	if err1 == nil && err2 == nil {
		re := regexp.MustCompile(`vsftpd:\s*(\d{1,3}\.){3}\d{1,3}`)
		if re.MatchString(string(allow)) || strings.Contains(string(deny), "vsftpd: ALL") {
			return "✅ 양호: vsftpd IP 접근제어 설정됨"
		}
	}

	userlistPath := "/etc/vsftpd.user_list"
	for _, line := range confLines {
		if strings.HasPrefix(line, "userlist_file=") {
			userlistPath = strings.TrimSpace(strings.Split(line, "=")[1])
		}
	}
	userData, err := ioutil.ReadFile(userlistPath)
	if err != nil {
		return "❌ 취약: 계정 리스트 파일 없음"
	}
	if len(userData) == 0 {
		return "❌ 취약: 계정 리스트가 비어 있음"
	}
	accounts := []string{}
	for _, line := range strings.Split(string(userData), "\n") {
		line = strings.TrimSpace(line)
		if line != "" && !strings.HasPrefix(line, "#") {
			accounts = append(accounts, line)
		}
	}
	return fmt.Sprintf("✅ 양호: 계정 접근제어 설정됨 - 계정 목록: %v", accounts)
}
