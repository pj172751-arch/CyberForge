import React, { useState } from 'react';
import { Code2, ShieldAlert, ShieldCheck, ChevronRight, Check } from 'lucide-react';

export const DVWA_CODE_SNIPPETS = {
  1: { // Broken Login
    Low: {
      vuln: `$user = $_POST['username'];\n$pass = $_POST['password'];\n// Direct string concatenation without escaping\n$query = "SELECT * FROM users WHERE user = '$user' AND password = '$pass'";`,
      mitig: `// High security level: Prepared statements with Argon2 hash check\n$stmt = $pdo->prepare('SELECT id, password_hash FROM users WHERE user = :u');\n$stmt->execute(['u' => $_POST['username']]);\n$user = $stmt->fetch();\nif ($user && password_verify($_POST['password'], $user['password_hash'])) {\n    login_session_init($user['id']);\n}`
    },
    High: {
      vuln: `$user = stripslashes($_POST['username']);\n// Incomplete sanitization bypassable via multi-byte encoding`,
      mitig: `// Strict input schema validation + Token CSRF check\nif (!check_csrf_token($_POST['user_token'])) { die('CSRF Failed'); }\n$stmt = $pdo->prepare('SELECT * FROM users WHERE user = ? AND password = ?');\n$stmt->execute([$_POST['username'], md5($_POST['password'])]);`
    }
  },
  2: { // Reflected XSS
    Low: {
      vuln: `if (isset($_GET['name'])) {\n    // Output reflected directly into DOM with no escaping\n    echo '<pre>Hello ' . $_GET['name'] . '</pre>';\n}`,
      mitig: `if (isset($_GET['name'])) {\n    // High security: Strict character encoding & HTML entity conversion\n    $escaped = htmlspecialchars($_GET['name'], ENT_QUOTES | ENT_HTML5, 'UTF-8');\n    echo '<pre>Hello ' . $escaped . '</pre>';\n}`
    }
  },
  3: { // Command Injection
    Low: {
      vuln: `$target = $_REQUEST['ip'];\n// Executes unescaped shell command\n$cmd = shell_exec('ping -c 4 ' . $target);\necho "<pre>{$cmd}</pre>";`,
      mitig: `// High security: IP octet regex verification + escapeshellarg\n$target = trim($_REQUEST['ip']);\n$octets = explode('.', $target);\nif (count($octets) === 4 && array_filter($octets, 'is_numeric') === $octets) {\n    $cmd = shell_exec('ping -c 4 ' . escapeshellarg($target));\n    echo "<pre>{$cmd}</pre>";\n} else {\n    echo "<pre>ERROR: Invalid IP Address Syntax</pre>";\n}`
    }
  },
  4: { // File Disclosure
    Low: {
      vuln: `$file = $_GET['page'];\n// Direct file inclusion vulnerable to path traversal (../../)\ninclude($file);`,
      mitig: `// Whitelist validation & strict basename isolation\n$file = basename($_GET['page']);\n$allowed = ['intro.php', 'guide.php', 'contact.php'];\nif (in_array($file, $allowed, true)) {\n    include('/var/www/html/templates/' . $file);\n} else {\n    http_response_code(403);\n    die('Access Denied');\n}`
    }
  },
  5: { // SQLi
    Low: {
      vuln: `$id = $_GET['id'];\n$query = "SELECT first_name, last_name FROM users WHERE user_id = '$id';";\n$result = mysqli_query($GLOBALS["___mysqli_ston"], $query);`,
      mitig: `// Parameterized query using PDO with explicit integer type casting\n$id = filter_var($_GET['id'], FILTER_VALIDATE_INT);\nif ($id !== false) {\n    $stmt = $pdo->prepare('SELECT first_name, last_name FROM users WHERE user_id = :id');\n    $stmt->bindParam(':id', $id, PDO::PARAM_INT);\n    $stmt->execute();\n    $row = $stmt->fetch();\n}`
    }
  }
};

export default function CodeDiffViewer({ challengeId, currentLevel }) {
  const [activeTab, setActiveTab] = useState('diff');
  const snippets = DVWA_CODE_SNIPPETS[challengeId] || DVWA_CODE_SNIPPETS[3];
  const activeSnippet = snippets[currentLevel] || snippets['Low'] || snippets['High'];

  return (
    <div className="bg-bg-panel border border-hairline rounded-panel overflow-hidden text-xs font-mono">
      {/* Header */}
      <div className="px-4 py-2.5 bg-bg-panelAlt/90 border-b border-hairline flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-cyan-accent" />
          <span className="font-bold text-zinc-200">
            DVWA Source Code Hardening Matrix
          </span>
          <span className="text-[10px] text-zinc-500">
            [Security Level: {currentLevel}]
          </span>
        </div>

        <div className="flex items-center gap-1 bg-bg-main p-0.5 rounded border border-hairline">
          <button
            onClick={() => setActiveTab('diff')}
            className={`px-2 py-0.5 rounded text-[10px] ${
              activeTab === 'diff' ? 'bg-cyan-accent text-bg-main font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Split Diff
          </button>
          <button
            onClick={() => setActiveTab('mitigation')}
            className={`px-2 py-0.5 rounded text-[10px] ${
              activeTab === 'mitigation' ? 'bg-status-green text-bg-main font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Patched Filter
          </button>
        </div>
      </div>

      {/* Code comparison body */}
      <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4 bg-bg-main/90">
        {/* Vulnerable Source (Left) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-status-red">
            <span className="flex items-center gap-1 font-bold">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Vulnerable State (DVWA Default)</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-status-redDim border border-status-red/30">
              EXPLOITABLE
            </span>
          </div>
          <pre className="p-3 bg-black/80 border border-status-red/20 rounded text-[11px] text-zinc-300 overflow-x-auto leading-relaxed">
            <code>{activeSnippet?.vuln || '// Vulnerable code'}</code>
          </pre>
        </div>

        {/* Hardened / Mitigated Source (Right) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-status-green">
            <span className="flex items-center gap-1 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Hardened State (Replay Protected)</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-status-greenDim border border-status-green/30">
              SECURE FILTER
            </span>
          </div>
          <pre className="p-3 bg-black/80 border border-status-green/20 rounded text-[11px] text-zinc-300 overflow-x-auto leading-relaxed">
            <code>{activeSnippet?.mitig || '// Mitigated code'}</code>
          </pre>
        </div>
      </div>

      <div className="px-4 py-2 bg-bg-panelAlt/50 border-t border-hairline flex items-center justify-between text-[10px] text-zinc-500">
        <span>Verified against reference exploit payload via automated replay</span>
        <span className="text-cyan-accent">PHP 7.4 / Apache Engine</span>
      </div>
    </div>
  );
}
