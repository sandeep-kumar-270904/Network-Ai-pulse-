"""
NetPulse AI — Core Business Logic & Introspection Engine
=========================================================
Reusable networking, telemetry calculation, and platform introspection modules.
"""

from .system_metrics import (
    get_local_network_environment,
    get_host_compute_stats,
    format_memory_bytes,
)

__all__ = [
    "get_local_network_environment",
    "get_host_compute_stats",
    "format_memory_bytes",
]
