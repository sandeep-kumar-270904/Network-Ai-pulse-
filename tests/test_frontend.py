"""
NetPulse AI — Frontend Component & Logic Unit Tests
===================================================
Tests NOC UI component generators, Plotly visualizations, navigation,
status badges, and local network discovery helpers.
"""

import sys
import os
import pytest
import plotly.graph_objects as go

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import (
    APP_NAME,
    APP_FULL_NAME,
    APP_TAGLINE,
    APP_VERSION,
    APP_ENV,
    get_local_network_environment,
    get_host_compute_stats,
)
from frontend.components.sidebar import NAV_ITEMS
from frontend.components.metric_cards import render_kpi_card, render_status_badge
from frontend.components.gauges import create_gauge
from frontend.components.charts import create_performance_chart
from frontend.components.topology import create_topology_graph


class TestAppMetadata:
    def test_app_name(self):
        assert APP_NAME == "NETPULSE AI"

    def test_app_full_name(self):
        assert "Network Performance Testing" in APP_FULL_NAME

    def test_app_tagline(self):
        assert APP_TAGLINE == "Observe. Analyze. Optimize."

    def test_app_version(self):
        assert APP_VERSION == "1.0.0-day1"

    def test_app_env(self):
        assert APP_ENV == "Development"


class TestNavigationConfig:
    def test_nav_items_count(self):
        assert len(NAV_ITEMS) == 13

    def test_overview_is_first(self):
        assert NAV_ITEMS[0][1] == "NOC Overview"

    def test_settings_is_last(self):
        assert NAV_ITEMS[-1][1] == "Settings"

    def test_expected_pages_present(self):
        page_names = [item[1] for item in NAV_ITEMS]
        expected = [
            "NOC Overview",
            "Network Diagnostics",
            "Network Topology",
            "Infrastructure Inventory",
            "Performance Testing",
            "Test Automation",
            "AI Analysis",
            "Alerts & Events",
            "Test History",
            "Analytics",
            "Reports",
            "System Information",
            "Settings",
        ]
        for exp in expected:
            assert exp in page_names, f"{exp} must be present in navigation"


class TestMetricCardRenderer:
    def test_kpi_card_renders_label_and_value(self):
        html = render_kpi_card("Active Endpoints", "7", "🟢", "#00D69A", "All systems operational")
        assert "Active Endpoints" in html
        assert "7" in html
        assert "#00D69A" in html
        assert "noc-kpi-card" in html

    def test_kpi_card_renders_trend(self):
        html = render_kpi_card("Latency", "24ms", "⚡", "#22D3EE", "vs baseline", trend="-4.2ms")
        assert "-4.2ms" in html
        assert "24ms" in html

    def test_status_badge_success(self):
        badge = render_status_badge("ONLINE", "success")
        assert "pill-success" in badge
        assert "ONLINE" in badge

    def test_status_badge_critical(self):
        badge = render_status_badge("OFFLINE", "critical")
        assert "pill-critical" in badge
        assert "OFFLINE" in badge


class TestGauges:
    def test_gauge_with_real_value(self):
        fig = create_gauge("CPU", 45.0, "%", color_scheme="cyan")
        assert isinstance(fig, go.Figure)
        assert len(fig.data) > 0
        assert fig.data[0].value == 45.0

    def test_gauge_not_measured(self):
        fig = create_gauge("SLA Health", None, "%", not_measured=True)
        assert isinstance(fig, go.Figure)
        assert "NOT MEASURED" in str(fig.layout.annotations)

    def test_gauge_handles_zero(self):
        fig = create_gauge("Loss", 0.0, "%")
        assert isinstance(fig, go.Figure)
        assert fig.data[0].value == 0.0


class TestCharts:
    def test_performance_chart_empty_state(self):
        fig = create_performance_chart("Latency", "24h", data_points=None)
        assert isinstance(fig, go.Figure)
        assert len(fig.data) > 0  # Baseline gridline
        assert "NO ACTIVE LATENCY DATA" in str(fig.layout.annotations)

    def test_performance_chart_with_data(self):
        points = [
            {"timestamp": "2026-11-22 00:00:00", "value": 15.2},
            {"timestamp": "2026-11-22 01:00:00", "value": 18.4},
        ]
        fig = create_performance_chart("Latency", "1h", data_points=points)
        assert isinstance(fig, go.Figure)
        assert len(fig.data) == 1
        assert len(fig.data[0].x) == 2


class TestTopology:
    def test_topology_graph_renders(self):
        fig = create_topology_graph()
        assert isinstance(fig, go.Figure)
        # Should contain edge traces and node markers
        assert len(fig.data) >= 2


class TestLocalNetworkEnvironment:
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


class TestHostComputeStats:
    def test_returns_dict(self):
        stats = get_host_compute_stats()
        assert isinstance(stats, dict)
        assert "cpu_percent" in stats
        assert "memory_percent" in stats
        assert stats["network_health"] is None  # Day 1 honest not measured
        assert stats["avg_latency"] is None     # Day 1 honest not measured
