"""
NetPulse AI — FastAPI Backend
=============================
Provides the REST API for health checks, system metadata,
and passive local network environment enumeration.
"""

from __future__ import annotations

import asyncio
import contextlib
import os
import platform
import socket
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from core.diagnostics import (
    execute_ping,
    execute_tcp_probe,
    execute_traceroute,
    get_database_info,
    get_default_gateway,
    get_arp_neighbors,
    get_test_history,
    log_event,
)
from core.engines import (
    acknowledge_event,
    add_inventory_node,
    bulk_update_event_state,
    clear_events,
    compute_global_health,
    create_automation_job,
    delete_automation_job,
    delete_inventory_node,
    execute_performance_benchmark,
    get_analytics_summary,
    get_automation_jobs,
    get_events,
    get_inventory_nodes,
    run_ai_anomaly_analysis,
    run_automation_job_now,
    set_anomaly_false_positive,
    tick_automation_scheduler,
    toggle_automation_job,
    update_event_state,
)

# ---------------------------------------------------------------------------
# Application metadata
# ---------------------------------------------------------------------------
APP_NAME = "NetPulse AI"
APP_VERSION = "1.0.0-day1"
APP_DESCRIPTION = "Intelligent Network Performance Testing & Analysis Platform"

# ---------------------------------------------------------------------------
# Lifespan Background Scheduler
# ---------------------------------------------------------------------------
@contextlib.asynccontextmanager
async def _lifespan(app: FastAPI):
    log_event("success", "FastAPI Backend Core", "Uvicorn REST gateway online; SQLite telemetry engine active.")
    stop_event = asyncio.Event()

    async def _scheduler_loop():
        while not stop_event.is_set():
            try:
                await asyncio.to_thread(tick_automation_scheduler)
            except Exception as e:
                print(f"Background scheduler tick error: {e}")
            try:
                await asyncio.wait_for(stop_event.wait(), timeout=5.0)
            except asyncio.TimeoutError:
                pass

    task = asyncio.create_task(_scheduler_loop())
    try:
        yield
    finally:
        stop_event.set()
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task


# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------
app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description=APP_DESCRIPTION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=_lifespan,
)

# Allow React frontend and API clients to call the REST endpoints.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",
    ],
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

    gateway_info = get_default_gateway()
    arp_neighbors = get_arp_neighbors()

    return {
        "hostname": hostname,
        "primary_ip": primary_ip,
        "default_gateway": gateway_info.get("gateway_ip") if gateway_info else None,
        "outbound_interface_ip": gateway_info.get("interface_ip") if gateway_info else None,
        "interfaces": interfaces,
        "arp_neighbors": arp_neighbors,
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
def health_check(gateway_latency_ms: Optional[float] = None) -> Dict[str, Any]:
    """
    Health-check endpoint consumed by the dashboard.
    Returns service availability plus real probe-derived operational health and database info.
    """
    db_info = get_database_info()
    probe_health = compute_global_health(gateway_latency_ms=gateway_latency_ms)
    return {
        "status": "healthy",
        "overall_status": probe_health["status"],
        "application": APP_NAME,
        "version": APP_VERSION,
        "environment": "development",
        "timestamp": _utc_now(),
        "uptime_since": _startup_time,
        "system": _system_info(),
        "services": {
            "api": "operational",
            "database": "sqlite_active",
        },
        "database_info": db_info,
        "probe_health": probe_health,
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
            "description": "Real ICMP socket ping, TCP handshake probe, traceroute, and jitter analysis.",
            "status": "active",
            "icon": "🔍",
        },
        {
            "name": "Performance Testing",
            "description": "Multi-stream TCP socket throughput, jitter burst, and Path MTU discovery.",
            "status": "active",
            "icon": "⚡",
        },
        {
            "name": "Test Automation",
            "description": "Scheduled background jobs executing periodic network tests.",
            "status": "active",
            "icon": "🤖",
        },
        {
            "name": "AI Anomaly Detection",
            "description": "Scikit-learn IsolationForest anomaly scoring over recorded telemetry.",
            "status": "active",
            "icon": "🧠",
        },
        {
            "name": "Performance Analytics",
            "description": "Real-time P50/P95/P99 latency percentiles and time-series visualization.",
            "status": "active",
            "icon": "📊",
        },
        {
            "name": "Report Generation",
            "description": "Live CSV and JSON technical telemetry audit export.",
            "status": "active",
            "icon": "📄",
        },
    ]
    return {
        "status": "ok",
        "timestamp": _utc_now(),
        "modules": modules,
    }


# ---------------------------------------------------------------------------
# Diagnostics & Topology Routes
# ---------------------------------------------------------------------------
class PingRequest(BaseModel):
    target: str = Field(default="8.8.8.8", description="Target hostname or IP address")
    count: int = Field(default=4, ge=1, le=10, description="Packet count (1-10)")
    packet_size: int = Field(default=32, ge=16, le=1472, description="Packet payload size in bytes")
    timeout_ms: int = Field(default=2000, ge=200, le=5000, description="Socket response timeout in ms")


@app.post("/api/diagnostics/ping", tags=["Diagnostics"])
def run_ping_diagnostic(req: PingRequest) -> Dict[str, Any]:
    """Execute real ICMP probe and record the telemetry run."""
    try:
        result = execute_ping(
            target=req.target,
            count=req.count,
            packet_size=req.packet_size,
            timeout_ms=req.timeout_ms,
        )
        return {
            "status": "ok",
            "timestamp": _utc_now(),
            "data": result,
        }
    except Exception as exc:
        return JSONResponse(
            status_code=400,
            content={
                "status": "error",
                "message": str(exc),
                "timestamp": _utc_now(),
            },
        )


@app.get("/api/diagnostics/history", tags=["Diagnostics"])
def diagnostic_history(limit: int = 500) -> Dict[str, Any]:
    """Return historical records of executed diagnostic probes."""
    return {
        "status": "ok",
        "timestamp": _utc_now(),
        "records": get_test_history(limit=limit),
    }


@app.get("/api/network-topology", tags=["Topology"])
def dynamic_topology() -> Dict[str, Any]:
    """Return dynamic node-link graph based on real gateway, host, and neighbors."""
    gw_info = get_default_gateway() or {"gateway_ip": "192.168.1.1", "interface_ip": "127.0.0.1"}
    gw_ip = gw_info.get("gateway_ip", "192.168.1.1")
    host_ip = gw_info.get("interface_ip", "127.0.0.1")
    hostname = socket.gethostname()
    arp_neighbors = get_arp_neighbors()

    nodes = [
        {
            "id": "node-gw",
            "type": "default",
            "position": {"x": 300, "y": 40},
            "data": {
                "label": "Core Default Gateway",
                "ip": gw_ip,
                "type": "gateway",
                "status": "online",
                "interface": "uplink0",
            },
            "style": {
                "background": "#13243A",
                "color": "#EAF3FF",
                "border": "1px solid #22D3EE",
                "borderRadius": "10px",
                "padding": "10px",
                "fontFamily": "JetBrains Mono",
                "fontSize": "11px",
                "width": 190,
            },
        },
        {
            "id": "node-host",
            "type": "default",
            "position": {"x": 140, "y": 180},
            "data": {
                "label": f"Local Host ({hostname})",
                "ip": host_ip,
                "type": "server",
                "status": "online",
                "interface": "wlan0",
            },
            "style": {
                "background": "#0D192B",
                "color": "#EAF3FF",
                "border": "1px solid #00D69A",
                "borderRadius": "10px",
                "padding": "10px",
                "fontFamily": "JetBrains Mono",
                "fontSize": "11px",
                "width": 200,
            },
        },
        {
            "id": "node-public-dns",
            "type": "default",
            "position": {"x": 460, "y": 180},
            "data": {
                "label": "Cloudflare DNS (Edge)",
                "ip": "1.1.1.1",
                "type": "probe",
                "status": "online",
                "interface": "wan",
            },
            "style": {
                "background": "#111E30",
                "color": "#EAF3FF",
                "border": "1px solid #287EFF",
                "borderRadius": "10px",
                "padding": "10px",
                "fontFamily": "JetBrains Mono",
                "fontSize": "11px",
                "width": 180,
            },
        },
    ]

    edges = [
        {
            "id": "edge-gw-host",
            "source": "node-gw",
            "target": "node-host",
            "animated": True,
            "style": {"stroke": "#00D69A", "strokeWidth": 2},
        },
        {
            "id": "edge-gw-dns",
            "source": "node-gw",
            "target": "node-public-dns",
            "animated": True,
            "style": {"stroke": "#287EFF", "strokeWidth": 2},
        },
    ]

    # Add real dynamic ARP neighbors if detected
    for idx, neighbor in enumerate(arp_neighbors[:2]):
        if neighbor["ip"] != gw_ip and neighbor["ip"] != host_ip:
            n_id = f"node-neighbor-{idx+1}"
            nodes.append({
                "id": n_id,
                "type": "default",
                "position": {"x": 80 + idx * 240, "y": 300},
                "data": {
                    "label": f"LAN Host {idx+1}",
                    "ip": neighbor["ip"],
                    "type": "switch",
                    "status": "online",
                    "interface": neighbor.get("mac", "dynamic"),
                },
                "style": {
                    "background": "#111E30",
                    "color": "#EAF3FF",
                    "border": "1px solid #203750",
                    "borderRadius": "10px",
                    "padding": "10px",
                    "fontFamily": "JetBrains Mono",
                    "fontSize": "11px",
                    "width": 180,
                },
            })
            edges.append({
                "id": f"edge-gw-neighbor-{idx+1}",
                "source": "node-gw",
                "target": n_id,
                "style": {"stroke": "#203750", "strokeWidth": 1.5},
            })

    return {
        "status": "ok",
        "timestamp": _utc_now(),
        "nodes": nodes,
        "edges": edges,
        "gateway": gw_info,
    }


# ---------------------------------------------------------------------------
# TCP Probe & Traceroute Routes
# ---------------------------------------------------------------------------
class TcpProbeRequest(BaseModel):
    target: str = Field(default="8.8.8.8")
    port: int = Field(default=443, ge=1, le=65535)
    count: int = Field(default=4, ge=1, le=10)
    timeout_ms: int = Field(default=2000, ge=200, le=5000)


class TracerouteRequest(BaseModel):
    target: str = Field(default="8.8.8.8")
    max_hops: int = Field(default=12, ge=3, le=20)


@app.post("/api/diagnostics/tcp-probe", tags=["Diagnostics"])
def run_tcp_probe(req: TcpProbeRequest) -> Dict[str, Any]:
    """Execute real Layer 4 TCP handshake probe against target:port."""
    try:
        result = execute_tcp_probe(target=req.target, port=req.port, count=req.count, timeout_ms=req.timeout_ms)
        return {"status": "ok", "timestamp": _utc_now(), "data": result}
    except Exception as exc:
        return JSONResponse(status_code=400, content={"status": "error", "message": str(exc), "timestamp": _utc_now()})


@app.post("/api/diagnostics/traceroute", tags=["Diagnostics"])
def run_traceroute(req: TracerouteRequest) -> Dict[str, Any]:
    """Execute real Layer 3 traceroute path discovery."""
    try:
        result = execute_traceroute(target=req.target, max_hops=req.max_hops)
        return {"status": "ok", "timestamp": _utc_now(), "data": result}
    except Exception as exc:
        return JSONResponse(status_code=400, content={"status": "error", "message": str(exc), "timestamp": _utc_now()})


# ---------------------------------------------------------------------------
# Performance Benchmarking Route
# ---------------------------------------------------------------------------
class BenchmarkRequest(BaseModel):
    mode: str = Field(default="throughput_tcp")
    target: str = Field(default="127.0.0.1")
    duration: int = Field(default=3, ge=1, le=8)
    streams: int = Field(default=4, ge=1, le=8)


@app.post("/api/performance/benchmark", tags=["Performance"])
def run_benchmark(req: BenchmarkRequest) -> Dict[str, Any]:
    """Execute real socket throughput, jitter burst, or Path MTU discovery benchmark."""
    try:
        result = execute_performance_benchmark(mode=req.mode, target=req.target, duration=req.duration, streams=req.streams)
        return {"status": "ok", "timestamp": _utc_now(), "data": result}
    except Exception as exc:
        return JSONResponse(status_code=400, content={"status": "error", "message": str(exc), "timestamp": _utc_now()})


# ---------------------------------------------------------------------------
# Test Automation Scheduler Routes
# ---------------------------------------------------------------------------
class AutomationJobCreate(BaseModel):
    name: str
    target: str
    test_type: str = Field(default="icmp_ping")
    interval_seconds: int = Field(default=60, ge=15, le=86400)


class AutomationJobToggle(BaseModel):
    enabled: bool


@app.get("/api/automation/jobs", tags=["Automation"])
def list_automation_jobs() -> Dict[str, Any]:
    return {"status": "ok", "timestamp": _utc_now(), "jobs": get_automation_jobs()}


@app.post("/api/automation/jobs", tags=["Automation"])
def add_automation_job(req: AutomationJobCreate) -> Dict[str, Any]:
    try:
        job = create_automation_job(req.name, req.target, req.test_type, req.interval_seconds)
        return {"status": "ok", "timestamp": _utc_now(), "job": job}
    except Exception as exc:
        return JSONResponse(status_code=400, content={"status": "error", "message": str(exc), "timestamp": _utc_now()})


@app.patch("/api/automation/jobs/{job_id}", tags=["Automation"])
def set_automation_job_state(job_id: str, req: AutomationJobToggle) -> Dict[str, Any]:
    ok = toggle_automation_job(job_id, req.enabled)
    return {"status": "ok" if ok else "not_found", "timestamp": _utc_now(), "enabled": req.enabled}


@app.post("/api/automation/jobs/{job_id}/run", tags=["Automation"])
def trigger_automation_job(job_id: str) -> Dict[str, Any]:
    res = run_automation_job_now(job_id)
    if res is None:
        return JSONResponse(status_code=404, content={"status": "error", "message": "Job not found", "timestamp": _utc_now()})
    return {"status": "ok", "timestamp": _utc_now(), "data": res}


@app.delete("/api/automation/jobs/{job_id}", tags=["Automation"])
def remove_automation_job(job_id: str) -> Dict[str, Any]:
    ok = delete_automation_job(job_id)
    return {"status": "ok" if ok else "not_found", "timestamp": _utc_now()}


# ---------------------------------------------------------------------------
# Alerts & Events Routes
# ---------------------------------------------------------------------------
class AlertStateRequest(BaseModel):
    state: str = "acknowledged"
    snooze_minutes: Optional[int] = None


class BulkAlertStateRequest(BaseModel):
    event_ids: List[str]
    state: str = "acknowledged"
    snooze_minutes: Optional[int] = None


@app.get("/api/alerts", tags=["Alerts"])
def list_alerts(limit: int = 500) -> Dict[str, Any]:
    return {"status": "ok", "timestamp": _utc_now(), "events": get_events(limit=limit)}


@app.post("/api/alerts/{event_id}/acknowledge", tags=["Alerts"])
def ack_alert(event_id: str) -> Dict[str, Any]:
    ok = acknowledge_event(event_id)
    return {"status": "ok" if ok else "not_found", "timestamp": _utc_now()}


@app.post("/api/alerts/{event_id}/state", tags=["Alerts"])
def set_alert_state(event_id: str, payload: AlertStateRequest) -> Dict[str, Any]:
    ok = update_event_state(event_id, state=payload.state, snooze_minutes=payload.snooze_minutes)
    return {"status": "ok" if ok else "not_found", "timestamp": _utc_now()}


@app.post("/api/alerts/bulk-state", tags=["Alerts"])
def bulk_set_alert_state(payload: BulkAlertStateRequest) -> Dict[str, Any]:
    count = bulk_update_event_state(
        payload.event_ids,
        state=payload.state,
        snooze_minutes=payload.snooze_minutes,
    )
    return {"status": "ok", "updated": count, "timestamp": _utc_now()}


@app.delete("/api/alerts", tags=["Alerts"])
def purge_alerts() -> Dict[str, Any]:
    clear_events()
    return {"status": "ok", "timestamp": _utc_now()}


class FalsePositiveRequest(BaseModel):
    false_positive: bool = True
    note: str = ""


# ---------------------------------------------------------------------------
# Analytics & AI Anomaly Detection Routes
# ---------------------------------------------------------------------------
@app.get("/api/analytics", tags=["Analytics"])
def analytics_summary(window: str = "1h", limit: int = 500) -> Dict[str, Any]:
    return {
        "status": "ok",
        "timestamp": _utc_now(),
        "analytics": get_analytics_summary(window=window, limit=limit),
    }


@app.post("/api/ai/analyze", tags=["AI Analysis"])
def ai_anomaly_scan(limit: int = 500) -> Dict[str, Any]:
    return {"status": "ok", "timestamp": _utc_now(), "analysis": run_ai_anomaly_analysis(limit=limit)}


@app.post("/api/ai/false-positive/{test_id}", tags=["AI Analysis"])
def ai_toggle_false_positive(test_id: str, payload: FalsePositiveRequest) -> Dict[str, Any]:
    updated = set_anomaly_false_positive(
        test_id=test_id,
        false_positive=payload.false_positive,
        note=payload.note,
    )
    if not updated:
        raise HTTPException(status_code=404, detail=f"Test run '{test_id}' not found")
    return {
        "status": "ok",
        "timestamp": _utc_now(),
        "test_id": test_id,
        "false_positive": payload.false_positive,
        "analysis": run_ai_anomaly_analysis(),
    }


# ---------------------------------------------------------------------------
# Dynamic Inventory Routes
# ---------------------------------------------------------------------------
class InventoryNodeCreate(BaseModel):
    name: str
    ip: str
    node_type: str = Field(default="probe")
    interface: str = Field(default="eth0")


@app.get("/api/inventory", tags=["Inventory"])
def list_inventory() -> Dict[str, Any]:
    return {"status": "ok", "timestamp": _utc_now(), "nodes": get_inventory_nodes()}


@app.post("/api/inventory", tags=["Inventory"])
def create_inventory_node(req: InventoryNodeCreate) -> Dict[str, Any]:
    try:
        node = add_inventory_node(req.name, req.ip, req.node_type, req.interface)
        return {"status": "ok", "timestamp": _utc_now(), "node": node}
    except Exception as exc:
        return JSONResponse(status_code=400, content={"status": "error", "message": str(exc), "timestamp": _utc_now()})


@app.delete("/api/inventory/{node_id}", tags=["Inventory"])
def remove_inventory_node(node_id: str) -> Dict[str, Any]:
    ok = delete_inventory_node(node_id)
    return {"status": "ok" if ok else "not_found", "timestamp": _utc_now()}
