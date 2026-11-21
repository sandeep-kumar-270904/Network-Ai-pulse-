"""
NetPulse AI — FastAPI Backend
=============================
Provides the REST API for health checks, system metadata,
and passive local network environment enumeration.
"""

from __future__ import annotations

import os
import platform
import socket
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# ---------------------------------------------------------------------------
# Application metadata
# ---------------------------------------------------------------------------
APP_NAME = "NetPulse AI"
APP_VERSION = "1.0.0-day1"
APP_DESCRIPTION = "Intelligent Network Performance Testing & Analysis Platform"

# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------
app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description=APP_DESCRIPTION,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Allow the Streamlit frontend to call the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup timestamp
_startup_time: str = datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _utc_now() -> str:
    """Return the current UTC time as an ISO-8601 string."""
    return datetime.now(timezone.utc).isoformat()


def _system_info() -> Dict[str, Any]:
    """Gather genuine local system information using Python standard libraries."""
    info: Dict[str, Any] = {
        "os": platform.system(),
        "os_version": platform.version(),
        "os_release": platform.release(),
        "architecture": platform.machine(),
        "processor": platform.processor() or "N/A",
        "python_version": sys.version,
        "hostname": platform.node(),
        "cpu_count_logical": os.cpu_count() or 1,
    }

    try:
        import psutil
        info["cpu_count_physical"] = psutil.cpu_count(logical=False) or info["cpu_count_logical"]
        vm = psutil.virtual_memory()
        info["memory_total_bytes"] = vm.total
        info["memory_available_bytes"] = vm.available
        info["memory_used_percent"] = vm.percent
    except ImportError:
        info["cpu_count_physical"] = info["cpu_count_logical"]
        info["memory_total_bytes"] = None
        info["memory_available_bytes"] = None
        info["memory_used_percent"] = None

    return info


def _network_environment() -> Dict[str, Any]:
    """
    Enumerate local network interfaces and IP addresses safely.
    Strictly reads OS local interface configuration; performs zero external scanning.
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

            ipv4_addrs: List[Dict[str, Optional[str]]] = []
            ipv6_addrs: List[Dict[str, Optional[str]]] = []
            mac_address = "N/A"

            for a in addr_list:
                if a.family == socket.AF_INET:
                    ipv4_addrs.append({
                        "address": a.address,
                        "netmask": a.netmask,
                        "broadcast": a.broadcast,
                    })
                elif hasattr(socket, "AF_INET6") and a.family == socket.AF_INET6:
                    # Strip interface scope ID if present (e.g. fe80::...%12)
                    clean_ip = a.address.split("%")[0]
                    ipv6_addrs.append({
                        "address": clean_ip,
                        "netmask": a.netmask,
                    })
                elif hasattr(psutil, "AF_LINK") and a.family == psutil.AF_LINK:
                    mac_address = a.address

            interfaces.append({
                "name": name,
                "is_up": is_up,
                "speed_mbps": speed,
                "mac_address": mac_address,
                "ipv4_addresses": ipv4_addrs,
                "ipv6_addresses": ipv6_addrs,
            })
    except ImportError:
        # Fallback if psutil is unavailable
        interfaces.append({
            "name": "default",
            "is_up": True,
            "speed_mbps": 0,
            "mac_address": "N/A",
            "ipv4_addresses": [{"address": primary_ip, "netmask": "N/A", "broadcast": None}],
            "ipv6_addresses": [],
        })

    return {
        "hostname": hostname,
        "primary_ip": primary_ip,
        "interfaces": interfaces,
        "scan_performed": False,
        "method": "passive_local_enumeration",
    }


# ---------------------------------------------------------------------------
# Global exception handler
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def _global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Return a consistent JSON error for any unhandled exception."""
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "message": "An internal server error occurred.",
            "detail": str(exc),
            "timestamp": _utc_now(),
        },
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/", tags=["Root"])
def root() -> Dict[str, Any]:
    """Return basic application metadata."""
    return {
        "application": APP_NAME,
        "version": APP_VERSION,
        "description": APP_DESCRIPTION,
        "status": "running",
        "timestamp": _utc_now(),
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health_check() -> Dict[str, Any]:
    """
    Health-check endpoint consumed by the Streamlit dashboard.
    Returns operational status, uptime reference, and system metadata.
    """
    return {
        "status": "healthy",
        "application": APP_NAME,
        "version": APP_VERSION,
        "environment": "development",
        "timestamp": _utc_now(),
        "uptime_since": _startup_time,
        "system": _system_info(),
        "services": {
            "api": "operational",
            "database": "not_configured",
        },
    }


@app.get("/api/system", tags=["System"])
def system_information() -> Dict[str, Any]:
    """Return detailed system information for the System Information page."""
    return {
        "status": "ok",
        "timestamp": _utc_now(),
        "system": _system_info(),
        "application": {
            "name": APP_NAME,
            "version": APP_VERSION,
            "python_version": sys.version,
            "fastapi_docs": "/docs",
        },
    }


@app.get("/api/network-environment", tags=["Network Environment"])
def network_environment() -> Dict[str, Any]:
    """
    Return local network interface configurations and host IP information.
    Strictly passive local enumeration; no external scanning is performed.
    """
    return {
        "status": "ok",
        "timestamp": _utc_now(),
        "network_environment": _network_environment(),
    }


@app.get("/api/modules", tags=["Modules"])
def module_status() -> Dict[str, Any]:
    """Return the development status of each platform module."""
    modules = [
        {
            "name": "Network Diagnostics",
            "description": "Ping, traceroute, DNS lookup, and port scanning tools.",
            "status": "coming_soon",
            "icon": "🔍",
        },
        {
            "name": "Performance Testing",
            "description": "Throughput, latency, and bandwidth measurement tests.",
            "status": "coming_soon",
            "icon": "⚡",
        },
        {
            "name": "Test Automation",
            "description": "Scheduled and scripted network test execution.",
            "status": "planned",
            "icon": "🤖",
        },
        {
            "name": "AI Anomaly Detection",
            "description": "Machine-learning-based detection of unusual network behaviour.",
            "status": "planned",
            "icon": "🧠",
        },
        {
            "name": "Performance Analytics",
            "description": "Historical trend analysis and performance dashboards.",
            "status": "planned",
            "icon": "📊",
        },
        {
            "name": "Report Generation",
            "description": "Automated PDF and HTML network performance reports.",
            "status": "planned",
            "icon": "📄",
        },
    ]
    return {
        "status": "ok",
        "timestamp": _utc_now(),
        "modules": modules,
    }
