"""
NetPulse AI — Core System Metrics & Local Introspection Module
==============================================================
Encapsulates host compute statistics, memory usage introspection,
and passive local network adapter enumeration.
Strictly local introspection; zero external scanning or packet injection.
"""

from __future__ import annotations

import os
import platform
import socket
from typing import Any, Dict, List, Optional


def format_memory_bytes(num_bytes: Optional[int]) -> str:
    """Format raw byte counts into human-readable gigabyte strings."""
    if num_bytes is None:
        return "N/A"
    gb = num_bytes / (1024 ** 3)
    return f"{gb:.2f} GB"


def get_local_network_environment() -> Dict[str, Any]:
    """
    Enumerate host network interfaces and local IPs strictly from OS tables.
    Does NOT send external packets or perform unauthorized network scanning.
    """
    hostname = socket.gethostname()
    try:
        primary_ip = socket.gethostbyname(hostname)
    except Exception:
        primary_ip = "127.0.0.1"

    interfaces: List[Dict[str, Any]] = []

    try:
        import psutil
        addrs = psutil.net_if_addrs()
        stats = psutil.net_if_stats()

        for name, addr_list in addrs.items():
            if_stat = stats.get(name)
            is_up = bool(if_stat.isup) if if_stat else False
            speed = if_stat.speed if if_stat else 0

            ipv4_list: List[Dict[str, Optional[str]]] = []
            ipv6_list: List[str] = []
            mac = "N/A"

            for a in addr_list:
                if a.family == socket.AF_INET:
                    ipv4_list.append({
                        "address": a.address,
                        "netmask": a.netmask or "N/A",
                    })
                elif hasattr(socket, "AF_INET6") and a.family == socket.AF_INET6:
                    clean_ip = a.address.split("%")[0]
                    ipv6_list.append(clean_ip)
                elif hasattr(psutil, "AF_LINK") and a.family == psutil.AF_LINK:
                    mac = a.address

            interfaces.append({
                "name": name,
                "is_up": is_up,
                "speed_mbps": speed,
                "mac_address": mac,
                "ipv4": ipv4_list,
                "ipv6": ipv6_list,
            })
    except ImportError:
        interfaces.append({
            "name": "default",
            "is_up": True,
            "speed_mbps": 0,
            "mac_address": "N/A",
            "ipv4": [{"address": primary_ip, "netmask": "255.255.255.0"}],
            "ipv6": [],
        })

    return {
        "hostname": hostname,
        "primary_ip": primary_ip,
        "interfaces": interfaces,
    }


def get_host_compute_stats() -> Dict[str, Any]:
    """Gather real host compute metrics."""
    stats: Dict[str, Any] = {
        "network_health": None,  # None means Not Measured in Day 1 baseline
        "avg_latency": None,     # None means Not Measured in Day 1 baseline
        "cpu_percent": 0.0,
        "memory_percent": 0.0,
    }
    try:
        import psutil
        stats["cpu_percent"] = float(psutil.cpu_percent(interval=None))
        stats["memory_percent"] = float(psutil.virtual_memory().percent)
    except ImportError:
        pass
    return stats
