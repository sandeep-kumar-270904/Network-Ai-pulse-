"""
NetPulse AI — Enterprise Network Performance Testing & Intelligence Platform
=============================================================================
Primary Streamlit Application Shell (NOC Redesign)
Connects to FastAPI backend at http://127.0.0.1:8000.
"""

from __future__ import annotations

import datetime
import os
import platform
import socket
import sys
import time
from typing import Any, Dict, List, Optional

import requests
import streamlit as st

# ═══════════════════════════════════════════════════════════════════════════
# Application Metadata & Constants
# ═══════════════════════════════════════════════════════════════════════════
APP_NAME = "NETPULSE AI"
APP_FULL_NAME = "Network Performance Testing & Intelligence Platform"
APP_TAGLINE = "Observe. Analyze. Optimize."
APP_VERSION = "1.0.0-day1"
APP_ENV = "Development"

BACKEND_URL = "http://127.0.0.1:8000"
HEALTH_ENDPOINT = f"{BACKEND_URL}/health"
SYSTEM_ENDPOINT = f"{BACKEND_URL}/api/system"
MODULES_ENDPOINT = f"{BACKEND_URL}/api/modules"
NET_ENV_ENDPOINT = f"{BACKEND_URL}/api/network-environment"
REQUEST_TIMEOUT = 3.0  # seconds

# ═══════════════════════════════════════════════════════════════════════════
# Page configuration — must be FIRST Streamlit call
# ═══════════════════════════════════════════════════════════════════════════
st.set_page_config(
    page_title="NetPulse AI — NOC Intelligence",
    page_icon="🌐",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ═══════════════════════════════════════════════════════════════════════════
# CSS Theme Loader
# ═══════════════════════════════════════════════════════════════════════════
def load_enterprise_theme() -> None:
    """Inject the dark NOC CSS design system."""
    css_path = os.path.join(os.path.dirname(__file__), "frontend", "styles", "theme.css")
    if os.path.exists(css_path):
        with open(css_path, "r", encoding="utf-8") as f:
            st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)


load_enterprise_theme()

# ═══════════════════════════════════════════════════════════════════════════
# Modular Component & Page Imports
# ═══════════════════════════════════════════════════════════════════════════
from frontend.components.sidebar import render_sidebar
from frontend.pages.overview import render_overview_page
from frontend.pages.diagnostics import render_diagnostics_page
from frontend.pages.topology import render_topology_page
from frontend.pages.inventory import render_inventory_page
from frontend.pages.performance import render_performance_page
from frontend.pages.automation import render_automation_page
from frontend.pages.ai_analysis import render_ai_analysis_page
from frontend.pages.alerts import render_alerts_page
from frontend.pages.history import render_history_page
from frontend.pages.analytics import render_analytics_page
from frontend.pages.reports import render_reports_page
from frontend.pages.system_info import render_system_info_page
from frontend.pages.settings import render_settings_page


# ═══════════════════════════════════════════════════════════════════════════
# Session State Initialization
# ═══════════════════════════════════════════════════════════════════════════
def add_activity(icon: str, message: str, event_type: str = "general") -> None:
    """Record an authentic event into the session activity log."""
    if "activity_log" not in st.session_state:
        st.session_state.activity_log = []

    ts = datetime.datetime.now().strftime("%H:%M:%S")

    # Prevent immediate duplicate spam
    if st.session_state.activity_log and st.session_state.activity_log[0]["message"] == message:
        return

    st.session_state.activity_log.insert(
        0, {"icon": icon, "message": message, "time": ts, "type": event_type}
    )
    st.session_state.activity_log = st.session_state.activity_log[:100]


# Default session state initialization
if "activity_log" not in st.session_state:
    st.session_state.activity_log = []
    host_id = platform.node() or "localhost"
    add_activity("🚀", f"NetPulse AI NOC initialized on host '{host_id}'", "startup")

if "endpoints" not in st.session_state:
    st.session_state.endpoints = [
        {"id": "ep_1", "hostname": "core-gw-01.corp", "ip": "10.0.0.1", "type": "Gateway", "status": "UP", "notes": "Core default gateway", "last_checked": "1 min ago"},
        {"id": "ep_2", "hostname": "dist-sw-01.corp", "ip": "10.0.1.1", "type": "Switch", "status": "UP", "notes": "Distribution switch A", "last_checked": "2 mins ago"},
        {"id": "ep_3", "hostname": "dist-sw-02.corp", "ip": "10.0.2.1", "type": "Switch", "status": "UP", "notes": "Distribution switch B", "last_checked": "4 mins ago"},
        {"id": "ep_4", "hostname": "dns-primary.cloudflare", "ip": "1.1.1.1", "type": "Server", "status": "UP", "notes": "Public upstream DNS resolver", "last_checked": "30 secs ago"},
        {"id": "ep_5", "hostname": "dns-secondary.google", "ip": "8.8.8.8", "type": "Server", "status": "UP", "notes": "Public secondary DNS resolver", "last_checked": "1 min ago"},
        {"id": "ep_6", "hostname": "local-probe.node", "ip": "127.0.0.1", "type": "Probe", "status": "UP", "notes": "Local diagnostic loopback probe", "last_checked": "Live"},
        {"id": "ep_7", "hostname": "backup-ingress.corp", "ip": "10.0.2.50", "type": "Server", "status": "STANDBY", "notes": "Redundant telemetry ingress", "last_checked": "5 mins ago"},
    ]

if "alerts" not in st.session_state:
    st.session_state.alerts = []

if "test_history" not in st.session_state:
    st.session_state.test_history = []

if "last_health_data" not in st.session_state:
    st.session_state.last_health_data = None

if "last_successful_check" not in st.session_state:
    st.session_state.last_successful_check = None

if "backend_connected" not in st.session_state:
    st.session_state.backend_connected = False

if "connection_error_detail" not in st.session_state:
    st.session_state.connection_error_detail = None

if "health_latency_ms" not in st.session_state:
    st.session_state.health_latency_ms = None


# ═══════════════════════════════════════════════════════════════════════════
# Backend API Communication & Telemetry
# ═══════════════════════════════════════════════════════════════════════════
def check_backend_health() -> Optional[Dict[str, Any]]:
    """
    Query the FastAPI /health endpoint with monotonic latency measurement.
    Detects connection state transitions and logs genuine events.
    """
    prev_state = st.session_state.backend_connected
    start_time = time.perf_counter()

    try:
        resp = requests.get(HEALTH_ENDPOINT, timeout=REQUEST_TIMEOUT)
        latency_ms = round((time.perf_counter() - start_time) * 1000, 1)
        st.session_state.health_latency_ms = latency_ms

        if resp.status_code == 200:
            data = resp.json()
            st.session_state.last_health_data = data
            st.session_state.backend_connected = True
            st.session_state.connection_error_detail = None
            st.session_state.last_successful_check = datetime.datetime.now().strftime("%H:%M:%S")

            if not prev_state:
                add_activity("🟢", f"Backend connected — health check OK ({latency_ms} ms)", "connection")
                # Clear critical disconnect alert if present
                st.session_state.alerts = [a for a in st.session_state.alerts if a.get("id") != "alert_backend_down"]
            return data
        else:
            st.session_state.backend_connected = False
            st.session_state.connection_error_detail = f"HTTP {resp.status_code}"
            add_activity("⚠️", f"Backend gateway returned HTTP {resp.status_code}", "warning")
            return None

    except requests.exceptions.ConnectionError:
        st.session_state.backend_connected = False
        st.session_state.health_latency_ms = None
        st.session_state.connection_error_detail = "Connection refused (gateway offline)"

        if prev_state:
            add_activity("🔴", "Backend disconnected — connection refused", "disconnection")
            # Register critical alert
            st.session_state.alerts.insert(0, {
                "id": "alert_backend_down",
                "level": "CRITICAL",
                "title": "API Gateway Offline",
                "message": "Connection refused to http://127.0.0.1:8000/health",
                "time": datetime.datetime.now().strftime("%H:%M:%S"),
            })
        return None

    except requests.exceptions.Timeout:
        st.session_state.backend_connected = False
        st.session_state.health_latency_ms = None
        st.session_state.connection_error_detail = f"Request timed out (>{REQUEST_TIMEOUT}s)"
        add_activity("⏱️", "Backend health check timed out", "warning")
        return None

    except Exception as ex:
        st.session_state.backend_connected = False
        st.session_state.health_latency_ms = None
        st.session_state.connection_error_detail = str(ex)
        add_activity("⚠️", f"Connection error: {ex}", "warning")
        return None


def fetch_api_json(url: str) -> Optional[Dict[str, Any]]:
    """Generic safe JSON retriever for API endpoints."""
    try:
        resp = requests.get(url, timeout=REQUEST_TIMEOUT)
        if resp.status_code == 200:
            return resp.json()
    except Exception:
        pass
    return None


def get_local_network_environment() -> Dict[str, Any]:
    """
    Enumerate host network interfaces and local IPs strictly from OS tables.
    Does NOT send external packets or perform unauthorized scanning.
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
        "network_health": None,  # None means Not Measured in Day 1
        "avg_latency": None,     # None means Not Measured in Day 1
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


# ═══════════════════════════════════════════════════════════════════════════
# Application Dispatcher
# ═══════════════════════════════════════════════════════════════════════════
# Poll backend health
health_data = check_backend_health()
host_stats = get_host_compute_stats()
net_env = get_local_network_environment()

# Render Collapsible Sidebar
active_page = render_sidebar(
    backend_connected=st.session_state.backend_connected,
    latency_ms=st.session_state.health_latency_ms,
    app_version=APP_VERSION,
    app_env=APP_ENV,
)

# Route to active page
last_check_display = st.session_state.last_successful_check or "Never"

if active_page == "NOC Overview":
    render_overview_page(
        backend_connected=st.session_state.backend_connected,
        health_data=st.session_state.last_health_data,
        latency_ms=st.session_state.health_latency_ms,
        last_check_str=last_check_display,
        endpoints=st.session_state.endpoints,
        alerts=st.session_state.alerts,
        test_history=st.session_state.test_history,
        host_stats=host_stats,
    )
elif active_page == "Network Diagnostics":
    render_diagnostics_page(st.session_state.test_history)
elif active_page == "Network Topology":
    render_topology_page(st.session_state.endpoints)
elif active_page == "Infrastructure Inventory":
    render_inventory_page(st.session_state.endpoints)
elif active_page == "Performance Testing":
    render_performance_page(st.session_state.endpoints)
elif active_page == "Test Automation":
    render_automation_page()
elif active_page == "AI Analysis":
    render_ai_analysis_page()
elif active_page == "Alerts & Events":
    render_alerts_page(st.session_state.activity_log)
elif active_page == "Test History":
    render_history_page(st.session_state.test_history)
elif active_page == "Analytics":
    render_analytics_page()
elif active_page == "Reports":
    render_reports_page()
elif active_page == "System Information":
    render_system_info_page(
        net_env=net_env,
        backend_connected=st.session_state.backend_connected,
        backend_sys_info=st.session_state.last_health_data.get("system") if st.session_state.last_health_data else None,
    )
elif active_page == "Settings":
    render_settings_page()
