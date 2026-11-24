"""
NetPulse AI — Core Network Diagnostics & Active Probing Engine
===============================================================
Executes genuine ICMP socket pings, gateway discovery, ARP table
enumeration, and latency/jitter calculations using real OS networking.
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


def _init_db() -> None:
    """Ensure the SQLite test history database and table exist."""
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
        conn.commit()


_init_db()


def get_default_gateway() -> Optional[Dict[str, str]]:
    """
    Detect the active default gateway and outbound interface IP from OS tables.
    """
    # 1. Determine outbound local interface IP using socket routing query
    local_ip = "127.0.0.1"
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
    except Exception:
        pass
    finally:
        s.close()

    # 2. Parse default gateway from Windows route print
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
        # Fallback heuristic: usually .1 on current subnet
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
                # Exclude broadcast/multicast (224.0.0.*, 255.255.255.255, *.255)
                if not ip.startswith("224.") and not ip.startswith("239.") and not ip.endswith(".255") and ip != "255.255.255.255":
                    neighbors.append({
                        "ip": ip,
                        "mac": mac,
                        "type": arp_type.lower(),
                    })
    except Exception:
        pass

    return neighbors


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
    # Sanitize input: allow only hostnames, domains, and IP addresses
    clean_target = target.strip()
    if not re.match(r"^[a-zA-Z0-9.-]+$", clean_target):
        raise ValueError(f"Invalid target address: '{target}'")

    count = max(1, min(count, 10))
    packet_size = max(16, min(packet_size, 1472))
    timeout_ms = max(200, min(timeout_ms, 5000))

    # Resolve IP if hostname
    resolved_ip = clean_target
    try:
        resolved_ip = socket.gethostbyname(clean_target)
    except Exception:
        pass

    # Windows ping command
    cmd = f"ping -n {count} -l {packet_size} -w {timeout_ms} {clean_target}"
    start_time = time.perf_counter()

    res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    total_duration_ms = round((time.perf_counter() - start_time) * 1000, 1)

    raw_output = res.stdout

    # Parse replies
    replies: List[Dict[str, Any]] = []
    rtt_values: List[float] = []

    # Windows replies format: "Reply from 8.8.8.8: bytes=32 time=31ms TTL=118"
    # or "Reply from 8.8.8.8: bytes=32 time<1ms TTL=118"
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

    # Calculate RFC 3550 jitter: mean deviation between successive packets
    jitter_ms = 0.0
    if len(rtt_values) > 1:
        diffs = [abs(rtt_values[i] - rtt_values[i - 1]) for i in range(1, len(rtt_values))]
        jitter_ms = round(sum(diffs) / len(diffs), 2)

    status = "passed" if packets_received > 0 else "failed"
    test_id = f"test-{int(time.time() * 1000)}"
    utc_timestamp = datetime.now(timezone.utc).isoformat()

    summary = (
        f"{packets_received}/{packets_sent} packets received ({packet_loss_pct}% loss). "
        f"Avg RTT: {avg_rtt if avg_rtt is not None else 'N/A'}ms, Jitter: {jitter_ms}ms"
    )

    # Record in SQLite database
    try:
        with sqlite3.connect(DB_PATH) as conn:
            conn.execute("""
                INSERT INTO test_history (
                    id, timestamp, test_type, target, resolved_ip, status, duration_ms,
                    packets_sent, packets_received, packet_loss_pct, min_rtt_ms, avg_rtt_ms, max_rtt_ms, jitter_ms, summary
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                test_id, utc_timestamp, "icmp_ping", clean_target, resolved_ip, status,
                total_duration_ms, packets_sent, packets_received, packet_loss_pct,
                min_rtt, avg_rtt, max_rtt, jitter_ms, summary
            ))
            conn.commit()
    except Exception as e:
        print(f"Error persisting test history: {e}")

    return {
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
        "replies": replies,
        "summary": summary,
        "raw_output": raw_output.strip(),
    }


def get_test_history(limit: int = 50) -> List[Dict[str, Any]]:
    """Retrieve executed test history records from SQLite."""
    records: List[Dict[str, Any]] = []
    try:
        with sqlite3.connect(DB_PATH) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("""
                SELECT * FROM test_history ORDER BY timestamp DESC LIMIT ?
            """, (limit,))
            for row in cursor.fetchall():
                records.append(dict(row))
    except Exception as e:
        print(f"Error fetching test history: {e}")
    return records
