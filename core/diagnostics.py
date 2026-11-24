"""
NetPulse AI — Core Network Diagnostics & Active Probing Engine
===============================================================
Executes genuine ICMP socket pings, TCP 3-way handshake probes,
traceroute path discovery, gateway discovery, ARP table enumeration,
and latency/jitter calculations using real OS networking.
"""

from __future__ import annotations

import os
import re
import socket
import sqlite3
import subprocess
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

# Persistent SQLite database path
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "netpulse.db")


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _init_db() -> None:
    """Ensure all SQLite tables for diagnostics, events, automation, and inventory exist."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS test_history (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                test_type TEXT NOT NULL,
                target TEXT NOT NULL,
                resolved_ip TEXT,
                status TEXT NOT NULL,
                duration_ms REAL NOT NULL,
                packets_sent INTEGER,
                packets_received INTEGER,
                packet_loss_pct REAL,
                min_rtt_ms REAL,
                avg_rtt_ms REAL,
                max_rtt_ms REAL,
                jitter_ms REAL,
                summary TEXT
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                level TEXT NOT NULL,
                source TEXT NOT NULL,
                message TEXT NOT NULL,
                acknowledged INTEGER DEFAULT 0
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS automation_jobs (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                target TEXT NOT NULL,
                test_type TEXT NOT NULL,
                interval_seconds INTEGER NOT NULL,
                enabled INTEGER DEFAULT 0,
                last_run TEXT,
                last_status TEXT,
                run_count INTEGER DEFAULT 0
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS inventory_nodes (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                ip TEXT NOT NULL,
                node_type TEXT NOT NULL,
                interface TEXT,
                notes TEXT,
                created_at TEXT NOT NULL
            )
        """)

        # Seed default automation jobs if empty (disabled by default until operator enables)
        cur = conn.execute("SELECT COUNT(*) FROM automation_jobs")
        if cur.fetchone()[0] == 0:
            gw = get_default_gateway()
            gw_ip = gw["gateway_ip"] if gw else "192.168.1.1"
            conn.executemany("""
                INSERT INTO automation_jobs (id, name, target, test_type, interval_seconds, enabled, last_run, last_status, run_count)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, [
                ("job-gateway", "Local Gateway Keepalive", gw_ip, "icmp_ping", 60, 0, None, "idle", 0),
                ("job-dns-google", "Public DNS Reachability (8.8.8.8)", "8.8.8.8", "icmp_ping", 120, 0, None, "idle", 0),
                ("job-tcp-web", "HTTPS Port 443 Handshake Check", "1.1.1.1", "tcp_probe", 180, 0, None, "idle", 0),
            ])

        conn.commit()


def log_event(level: str, source: str, message: str) -> Dict[str, Any]:
    """Persist an operational event or alert into SQLite."""
    evt_id = f"EVT-{int(time.time() * 1000) % 1000000}"
    ts = _utc_now()
    try:
        with sqlite3.connect(DB_PATH) as conn:
            conn.execute(
                "INSERT INTO events (id, timestamp, level, source, message, acknowledged) VALUES (?, ?, ?, ?, ?, 0)",
                (evt_id, ts, level, source, message),
            )
            conn.commit()
    except Exception as e:
        print(f"Error logging event: {e}")
    return {"id": evt_id, "timestamp": ts, "level": level, "source": source, "message": message, "acknowledged": 0}


def get_default_gateway() -> Optional[Dict[str, str]]:
    """
    Detect the active default gateway and outbound interface IP from OS tables.
    """
    local_ip = "127.0.0.1"
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
    except Exception:
        pass
    finally:
        s.close()

    gateway_ip = None
    try:
        output = subprocess.check_output("route print 0.0.0.0", shell=True, text=True, stderr=subprocess.DEVNULL)
        for line in output.splitlines():
            parts = line.strip().split()
            if len(parts) >= 5 and parts[0] == "0.0.0.0" and parts[1] == "0.0.0.0":
                gateway_ip = parts[2]
                break
    except Exception:
        pass

    if not gateway_ip:
        if local_ip != "127.0.0.1":
            octets = local_ip.split(".")
            if len(octets) == 4:
                gateway_ip = f"{octets[0]}.{octets[1]}.{octets[2]}.1"
        else:
            gateway_ip = "127.0.0.1"

    return {
        "gateway_ip": gateway_ip,
        "interface_ip": local_ip,
    }


def get_arp_neighbors() -> List[Dict[str, str]]:
    """
    Parse the local operating system ARP cache (`arp -a`) for active LAN neighbors.
    """
    neighbors: List[Dict[str, str]] = []
    try:
        output = subprocess.check_output("arp -a", shell=True, text=True, stderr=subprocess.DEVNULL)
        ip_mac_pattern = re.compile(r"(\d{1,3}(?:\.\d{1,3}){3})\s+([0-9a-fA-F-]{17})\s+(\w+)")
        for line in output.splitlines():
            match = ip_mac_pattern.search(line)
            if match:
                ip, mac, arp_type = match.groups()
                if not ip.startswith("224.") and not ip.startswith("239.") and not ip.endswith(".255") and ip != "255.255.255.255":
                    neighbors.append({
                        "ip": ip,
                        "mac": mac,
                        "type": arp_type.lower(),
                    })
    except Exception:
        pass

    return neighbors


def _sanitize_target(target: str) -> str:
    clean_target = target.strip()
    if not clean_target or not re.match(r"^[a-zA-Z0-9.-]+$", clean_target):
        raise ValueError(f"Invalid target address: '{target}'")
    return clean_target


def _save_test_record(record: Dict[str, Any]) -> None:
    try:
        with sqlite3.connect(DB_PATH) as conn:
            conn.execute("""
                INSERT INTO test_history (
                    id, timestamp, test_type, target, resolved_ip, status, duration_ms,
                    packets_sent, packets_received, packet_loss_pct, min_rtt_ms, avg_rtt_ms, max_rtt_ms, jitter_ms, summary
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                record["id"], record["timestamp"], record["test_type"], record["target"], record["resolved_ip"],
                record["status"], record["duration_ms"], record["packets_sent"], record["packets_received"],
                record["packet_loss_pct"], record["min_rtt_ms"], record["avg_rtt_ms"], record["max_rtt_ms"],
                record["jitter_ms"], record["summary"]
            ))
            conn.commit()
    except Exception as e:
        print(f"Error persisting test history: {e}")


def execute_ping(
    target: str,
    count: int = 4,
    packet_size: int = 32,
    timeout_ms: int = 2000,
) -> Dict[str, Any]:
    """
    Execute a real ICMP Echo probe against a target IP or domain name.
    Calculates RTT minimum, maximum, average, and RFC 3550 jitter.
    """
    clean_target = _sanitize_target(target)
    count = max(1, min(count, 15))
    packet_size = max(16, min(packet_size, 1472))
    timeout_ms = max(200, min(timeout_ms, 5000))

    resolved_ip = clean_target
    try:
        resolved_ip = socket.gethostbyname(clean_target)
    except Exception:
        pass

    cmd = f"ping -n {count} -l {packet_size} -w {timeout_ms} {clean_target}"
    start_time = time.perf_counter()

    res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    total_duration_ms = round((time.perf_counter() - start_time) * 1000, 1)
    raw_output = res.stdout

    replies: List[Dict[str, Any]] = []
    rtt_values: List[float] = []

    reply_regex = re.compile(r"Reply from ([^:]+):\s+bytes=(\d+)\s+time[=<](\d+)ms\s+TTL=(\d+)", re.IGNORECASE)
    timeout_regex = re.compile(r"Request timed out", re.IGNORECASE)

    seq = 1
    for line in raw_output.splitlines():
        reply_match = reply_regex.search(line)
        if reply_match:
            src_ip, b_size, rtt, ttl = reply_match.groups()
            rtt_val = float(rtt)
            rtt_values.append(rtt_val)
            replies.append({
                "seq": seq,
                "ip": src_ip,
                "bytes": int(b_size),
                "rtt_ms": rtt_val,
                "ttl": int(ttl),
                "status": "ok",
            })
            seq += 1
        elif timeout_regex.search(line):
            replies.append({
                "seq": seq,
                "ip": clean_target,
                "bytes": packet_size,
                "rtt_ms": None,
                "ttl": None,
                "status": "timed_out",
            })
            seq += 1

    packets_sent = count
    packets_received = len(rtt_values)
    packets_lost = packets_sent - packets_received
    packet_loss_pct = round((packets_lost / packets_sent) * 100, 1)

    min_rtt = min(rtt_values) if rtt_values else None
    max_rtt = max(rtt_values) if rtt_values else None
    avg_rtt = round(sum(rtt_values) / len(rtt_values), 1) if rtt_values else None

    jitter_ms = 0.0
    if len(rtt_values) > 1:
        diffs = [abs(rtt_values[i] - rtt_values[i - 1]) for i in range(1, len(rtt_values))]
        jitter_ms = round(sum(diffs) / len(diffs), 2)

    status = "passed" if packets_received > 0 else "failed"
    test_id = f"test-{int(time.time() * 1000)}"
    utc_timestamp = _utc_now()

    summary = (
        f"{packets_received}/{packets_sent} packets received ({packet_loss_pct}% loss). "
        f"Avg RTT: {avg_rtt if avg_rtt is not None else 'N/A'}ms, Jitter: {jitter_ms}ms"
    )

    record = {
        "id": test_id,
        "timestamp": utc_timestamp,
        "test_type": "icmp_ping",
        "target": clean_target,
        "resolved_ip": resolved_ip,
        "status": status,
        "duration_ms": total_duration_ms,
        "packets_sent": packets_sent,
        "packets_received": packets_received,
        "packet_loss_pct": packet_loss_pct,
        "min_rtt_ms": min_rtt,
        "avg_rtt_ms": avg_rtt,
        "max_rtt_ms": max_rtt,
        "jitter_ms": jitter_ms,
        "summary": summary,
    }
    _save_test_record(record)

    # Generate automated alerts for real anomalies
    if packet_loss_pct > 0 and packet_loss_pct < 100:
        log_event("warning", "ICMP Probe Engine", f"Partial packet loss ({packet_loss_pct}%) detected reaching {clean_target}.")
    elif packet_loss_pct == 100:
        log_event("critical", "ICMP Probe Engine", f"Host {clean_target} unreachable: 100% packet loss.")
    elif avg_rtt is not None and avg_rtt > 120:
        log_event("warning", "Latency Monitor", f"High latency ({avg_rtt}ms) observed to {clean_target}.")

    record["replies"] = replies
    record["raw_output"] = raw_output.strip()
    return record


def execute_tcp_probe(
    target: str,
    port: int = 443,
    count: int = 4,
    timeout_ms: int = 2000,
) -> Dict[str, Any]:
    """
    Execute real Layer 4 TCP 3-way handshake probes against target:port.
    Measures true TCP connect round-trip time and port reachability.
    """
    clean_target = _sanitize_target(target)
    port = max(1, min(port, 65535))
    count = max(1, min(count, 10))
    timeout_sec = max(0.2, min(timeout_ms / 1000.0, 5.0))

    resolved_ip = clean_target
    try:
        resolved_ip = socket.gethostbyname(clean_target)
    except Exception:
        pass

    replies: List[Dict[str, Any]] = []
    rtt_values: List[float] = []
    start_total = time.perf_counter()

    for seq in range(1, count + 1):
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout_sec)
        t0 = time.perf_counter()
        try:
            sock.connect((resolved_ip, port))
            rtt_ms = round((time.perf_counter() - t0) * 1000, 2)
            rtt_values.append(rtt_ms)
            replies.append({
                "seq": seq,
                "ip": resolved_ip,
                "port": port,
                "rtt_ms": rtt_ms,
                "status": "open",
            })
        except socket.timeout:
            replies.append({
                "seq": seq,
                "ip": resolved_ip,
                "port": port,
                "rtt_ms": None,
                "status": "timed_out",
            })
        except Exception as exc:
            replies.append({
                "seq": seq,
                "ip": resolved_ip,
                "port": port,
                "rtt_ms": None,
                "status": f"refused ({type(exc).__name__})",
            })
        finally:
            sock.close()
        if seq < count:
            time.sleep(0.15)

    total_duration_ms = round((time.perf_counter() - start_total) * 1000, 1)
    packets_sent = count
    packets_received = len(rtt_values)
    packet_loss_pct = round(((packets_sent - packets_received) / packets_sent) * 100, 1)

    min_rtt = min(rtt_values) if rtt_values else None
    max_rtt = max(rtt_values) if rtt_values else None
    avg_rtt = round(sum(rtt_values) / len(rtt_values), 2) if rtt_values else None

    jitter_ms = 0.0
    if len(rtt_values) > 1:
        diffs = [abs(rtt_values[i] - rtt_values[i - 1]) for i in range(1, len(rtt_values))]
        jitter_ms = round(sum(diffs) / len(diffs), 2)

    status = "passed" if packets_received > 0 else "failed"
    test_id = f"tcp-{int(time.time() * 1000)}"
    utc_timestamp = _utc_now()
    summary = (
        f"TCP/{port} {packets_received}/{packets_sent} handshakes succeeded ({packet_loss_pct}% fail). "
        f"Avg SYN-ACK: {avg_rtt if avg_rtt is not None else 'N/A'}ms"
    )

    record = {
        "id": test_id,
        "timestamp": utc_timestamp,
        "test_type": f"tcp_port_{port}",
        "target": f"{clean_target}:{port}",
        "resolved_ip": resolved_ip,
        "status": status,
        "duration_ms": total_duration_ms,
        "packets_sent": packets_sent,
        "packets_received": packets_received,
        "packet_loss_pct": packet_loss_pct,
        "min_rtt_ms": min_rtt,
        "avg_rtt_ms": avg_rtt,
        "max_rtt_ms": max_rtt,
        "jitter_ms": jitter_ms,
        "summary": summary,
    }
    _save_test_record(record)

    if packets_received == 0:
        log_event("warning", "TCP Port Probe", f"TCP handshake failed on {clean_target}:{port}.")

    record["replies"] = replies
    record["port"] = port
    return record


def execute_traceroute(target: str, max_hops: int = 12) -> Dict[str, Any]:
    """
    Execute a real Layer 3 path traceroute (`tracert -d -h <max_hops> -w 500`)
    to enumerate real router hops from local host to destination.
    """
    clean_target = _sanitize_target(target)
    max_hops = max(3, min(max_hops, 20))

    resolved_ip = clean_target
    try:
        resolved_ip = socket.gethostbyname(clean_target)
    except Exception:
        pass

    cmd = f"tracert -d -h {max_hops} -w 500 {clean_target}"
    start_time = time.perf_counter()
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=25)
    total_duration_ms = round((time.perf_counter() - start_time) * 1000, 1)

    hops: List[Dict[str, Any]] = []
    # Windows tracert -d lines look like:
    #   1     2 ms     1 ms     1 ms  192.168.1.1
    #   2     *        *        *     Request timed out.
    hop_regex = re.compile(r"^\s*(\d+)\s+(.+)$")
    ip_regex = re.compile(r"(\d{1,3}(?:\.\d{1,3}){3})")
    rtt_regex = re.compile(r"(<1|\d+)\s*ms")

    for line in res.stdout.splitlines():
        m = hop_regex.match(line)
        if not m:
            continue
        hop_num = int(m.group(1))
        rest = m.group(2)
        ip_m = ip_regex.search(rest)
        hop_ip = ip_m.group(1) if ip_m else "*"
        rtts = [1.0 if r == "<1" else float(r) for r in rtt_regex.findall(rest)]
        avg_hop_rtt = round(sum(rtts) / len(rtts), 1) if rtts else None
        hops.append({
            "hop": hop_num,
            "ip": hop_ip,
            "rtts_ms": rtts,
            "avg_rtt_ms": avg_hop_rtt,
            "status": "ok" if hop_ip != "*" else "timeout",
        })

    reached = any(h["ip"] == resolved_ip for h in hops) or (len(hops) > 0 and hops[-1]["ip"] != "*")
    status = "passed" if len(hops) > 0 else "failed"
    test_id = f"trace-{int(time.time() * 1000)}"
    utc_timestamp = _utc_now()

    valid_rtts = [h["avg_rtt_ms"] for h in hops if h["avg_rtt_ms"] is not None]
    last_rtt = valid_rtts[-1] if valid_rtts else None

    summary = f"Traced {len(hops)} router hops toward {clean_target} ({resolved_ip})."
    record = {
        "id": test_id,
        "timestamp": utc_timestamp,
        "test_type": "traceroute",
        "target": clean_target,
        "resolved_ip": resolved_ip,
        "status": status,
        "duration_ms": total_duration_ms,
        "packets_sent": len(hops) * 3,
        "packets_received": sum(len(h["rtts_ms"]) for h in hops),
        "packet_loss_pct": 0.0,
        "min_rtt_ms": min(valid_rtts) if valid_rtts else None,
        "avg_rtt_ms": last_rtt,
        "max_rtt_ms": max(valid_rtts) if valid_rtts else None,
        "jitter_ms": 0.0,
        "summary": summary,
    }
    _save_test_record(record)
    record["hops"] = hops
    record["raw_output"] = res.stdout.strip()
    record["reached"] = reached
    return record


def get_test_history(limit: int = 50) -> List[Dict[str, Any]]:
    """Retrieve executed test history records from SQLite."""
    records: List[Dict[str, Any]] = []
    try:
        with sqlite3.connect(DB_PATH) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute(
                "SELECT * FROM test_history ORDER BY timestamp DESC LIMIT ?",
                (limit,),
            )
            for row in cursor.fetchall():
                records.append(dict(row))
    except Exception as e:
        print(f"Error fetching test history: {e}")
    return records


# Initialize tables on module load
_init_db()
