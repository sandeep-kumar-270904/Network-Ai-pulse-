"""
NetPulse AI — Core Introspection & Networking Unit Tests
=========================================================
Tests system metrics, memory byte formatting, and local network discovery helpers.
"""

import os
import sys
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.system_metrics import (
    format_memory_bytes,
    get_local_network_environment,
    get_host_compute_stats,
)


class TestMemoryByteFormatting:
    def test_format_none_returns_na(self):
        assert format_memory_bytes(None) == "N/A"

    def test_format_one_gigabyte(self):
        one_gb = 1024 * 1024 * 1024
        assert format_memory_bytes(one_gb) == "1.00 GB"

    def test_format_sixteen_gigabytes(self):
        sixteen_gb = 16 * 1024 * 1024 * 1024
        assert format_memory_bytes(sixteen_gb) == "16.00 GB"


class TestLocalNetworkEnvironmentCore:
    def test_returns_dict(self):
        env = get_local_network_environment()
        assert isinstance(env, dict)

    def test_contains_hostname(self):
        env = get_local_network_environment()
        assert "hostname" in env
        assert isinstance(env["hostname"], str)
        assert len(env["hostname"]) > 0

    def test_contains_primary_ip(self):
        env = get_local_network_environment()
        assert "primary_ip" in env
        assert isinstance(env["primary_ip"], str)

    def test_contains_interfaces_list(self):
        env = get_local_network_environment()
        assert "interfaces" in env
        assert isinstance(env["interfaces"], list)
        assert len(env["interfaces"]) > 0

    def test_interface_attributes(self):
        env = get_local_network_environment()
        for iface in env["interfaces"]:
            assert "name" in iface
            assert "is_up" in iface
            assert "ipv4" in iface
            assert isinstance(iface["ipv4"], list)


class TestHostComputeStatsCore:
    def test_returns_dict(self):
        stats = get_host_compute_stats()
        assert isinstance(stats, dict)
        assert "cpu_percent" in stats
        assert "memory_percent" in stats
        assert stats["network_health"] is None  # Day 1 honest not measured
        assert stats["avg_latency"] is None     # Day 1 honest not measured
