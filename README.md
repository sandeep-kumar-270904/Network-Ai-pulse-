# 🌐 NetPulse AI — Intelligent Network Performance Testing & Analysis Platform

> **Day 1 Release (v1.0.0-day1)** — Modular architecture with dark-navy engineering dashboard, FastAPI backend API, passive network environment discovery, and scaffolding for future network diagnostics, performance benchmarks, and AI-driven anomaly detection modules.

---

## Table of Contents

1. [Introduction](#introduction)
2. [Problem Statement](#problem-statement)
3. [Objectives](#objectives)
4. [Technology Stack](#technology-stack)
5. [Architecture](#architecture)
6. [Project Structure](#project-structure)
7. [Installation](#installation)
8. [Running the Application](#running-the-application)
9. [API Endpoints](#api-endpoints)
10. [Current Functionality (Day 1)](#current-functionality-day-1)
11. [Known Limitations](#known-limitations)
12. [Future Development Roadmap](#future-development-roadmap)

---

## Introduction

**NetPulse AI** is an independent network diagnostics and performance analysis platform designed for network engineers and DevOps professionals. It provides a unified interface for inspecting network environments, running diagnostic tests, measuring throughput and latency, detecting anomalies with machine learning, and generating technical reports.

The platform follows a modular client-server architecture with a **FastAPI** backend and a **Streamlit** frontend, ensuring high performance, responsive visualization, and clean separation of concerns.

> **Disclaimer:** NetPulse AI is an independent engineering project. It is not affiliated with or endorsed by any commercial network testing vendor.

---

## Problem Statement

Network engineers frequently rely on fragmented command-line utilities, manual spreadsheets, and disparate monitoring tools. There is a need for:

- A **unified platform** to inspect host network environments and run tests.
- **Automated analysis** of performance metrics to identify degradation trends.
- **AI-driven anomaly detection** to flag unusual behaviour before outages occur.
- **Structured reporting** to document test findings and historical trends.
- A **modern, high-contrast engineering dashboard** that presents network data clearly and truthfully.

---

## Objectives

| # | Objective | Day 1 Status |
|---|-----------|-------------|
| 1 | Professional dark-theme dashboard with collapsible sidebar | ✅ Complete |
| 2 | FastAPI backend with health, system, & network environment APIs | ✅ Complete |
| 3 | Frontend–backend health telemetry with latency measurement | ✅ Complete |
| 4 | Real system information display (OS, Python, CPU, Memory) | ✅ Complete |
| 5 | Passive local network interface & IP enumeration (no scanning) | ✅ Complete |
| 6 | Genuine application activity logging (lifecycle events) | ✅ Complete |
| 7 | Navigation across all 8 planned modules | ✅ Complete |
| 8 | Network diagnostic tools (ping, traceroute, DNS) | 🟡 Coming Soon |
| 9 | Performance testing (throughput, latency, jitter) | 🟡 Coming Soon |
| 10 | Test automation & scheduling | 🔵 Planned |
| 11 | AI anomaly detection | 🔵 Planned |
| 12 | Analytics & report generation | 🔵 Planned |

---

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Backend REST API | Python 3.11+, FastAPI, Uvicorn (Port 8000) |
| Production Frontend (React NOC) | React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Apache ECharts, React Flow (@xyflow/react), Axios (Port 5173) |
| Core Introspection Engine | Python standard library, `psutil`, `socket`, `platform` |
| Data Processing | Pandas, NumPy |
| Machine Learning | scikit-learn |
| Testing | pytest (52 unit & integration tests) |

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                              Operator Browser                          │
│                     React NOC Dashboard (Port 5173)                    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP REST (port 8000)
┌───────────────────────────────────▼────────────────────────────────────┐
│                   FastAPI Backend Core (backend/main.py)               │
│   • GET /                    • GET /health                             │
│   • GET /api/system          • GET /api/network-environment            │
│   • GET /api/modules         • CORS & global exception handlers        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                 Core Introspection Logic (core/)                       │
│   • core/system_metrics.py: get_local_network_environment()            │
│   • core/system_metrics.py: get_host_compute_stats()                   │
└────────────────────────────────────────────────────────────────────────┘
```



---

## Project Structure

```
netpulse-ai/
├── requirements.txt        # Python backend & core dependencies
├── pyproject.toml          # Pytest configuration
├── README.md               # Architecture and documentation
│
├── backend/
│   ├── __init__.py
│   └── main.py             # FastAPI REST application & endpoints
│
├── core/
│   ├── __init__.py
│   └── system_metrics.py   # Reusable host compute & network introspection
│
├── data/                   # Persistent data & SQLite storage
├── reports/                # Exported diagnostic reports
│
├── frontend/               # React + TypeScript + Vite NOC frontend
│   ├── src/
│   │   ├── components/     # NOC dashboard, gauges, charts, topology, inventory
│   │   ├── pages/          # 13 NOC routes (Overview, Diagnostics, Topology, etc.)
│   │   ├── services/       # Axios API client & telemetry latency sampler
│   │   ├── styles/         # Tailwind CSS & NOC dark design tokens
│   │   ├── types/          # TypeScript interface contracts
│   │   ├── App.tsx         # Central layout & routing
│   │   └── main.tsx        # React entry point
│   ├── public/             # Static public assets
│   ├── package.json
│   ├── vite.config.ts      # Vite dev server configuration (Port 5173)
│   └── tsconfig.json
│
└── tests/
    ├── __init__.py
    ├── test_backend.py     # FastAPI endpoint and schema tests (43 tests)
    └── test_core.py        # Core networking and introspection tests (9 tests)
```

---

## Installation

### Prerequisites

- **Python 3.10+** (tested with 3.11 and 3.12)
- **Node.js 18+** & **npm**

### 1. Setup Backend Dependencies
`ash
cd netpulse-ai
pip install -r requirements.txt
`

### 2. Setup Frontend Dependencies
`ash
cd frontend
npm install
`

---

## Running the Application

You need **two terminal sessions** — one for the backend, one for the frontend.

### Terminal 1 — Start the FastAPI Backend

`ash
cd netpulse-ai
python -m uvicorn backend.main:app --reload
`

- Local API URL: http://127.0.0.1:8000
- Interactive OpenAPI Docs: http://127.0.0.1:8000/docs

### Terminal 2 — Start the React NOC Frontend

`ash
cd frontend
npm run dev
`

- Local Dashboard URL: http://localhost:5173

### Running the Automated Test Suite

`ash
cd netpulse-ai
pytest tests/ -v -p no:asyncio -p no:anyio
`

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Application metadata (name, version, status, docs) |
| `GET` | `/health` | Health check with system info, uptime, and service status |
| `GET` | `/api/system` | Detailed host machine OS, hardware, and runtime specs |
| `GET` | `/api/network-environment` | Local network adapters, IP/MAC addresses (passive discovery) |
| `GET` | `/api/modules` | Development status of all 6 platform modules |
| `GET` | `/docs` | Interactive Swagger API documentation |
| `GET` | `/redoc` | ReDoc API documentation |

### Example: Health Check Response

```json
{
  "status": "healthy",
  "application": "NetPulse AI",
  "version": "1.0.0-day1",
  "environment": "development",
  "timestamp": "2026-11-22T02:25:00+00:00",
  "uptime_since": "2026-11-22T02:19:18+00:00",
  "system": {
    "os": "Windows",
    "architecture": "AMD64",
    "python_version": "3.11.9 ...",
    "hostname": "SANJU_SANDY",
    "cpu_count_logical": 16,
    "cpu_count_physical": 8
  },
  "services": {
    "api": "operational",
    "database": "not_configured"
  }
}
```

---

## Current Functionality (Day 1)

### ✅ Implemented

1. **Collapsible Sidebar & Navigation**:
   - Collapsible sidebar with high-contrast `#101827` dark styling.
   - 8-module navigation: `Overview`, `Network Diagnostics`, `Performance Testing`, `Test Automation`, `AI Analysis`, `Analytics`, `Reports`, and `System Information`.
   - Explicit development status badges (`[Coming Soon]` / `[Planned]`).
   - Live backend status indicator with real-time round-trip latency (ms).
   - Instant "Refresh Status" button.

2. **System Information Page**:
   - **Operating System**: OS name, release, build, architecture, hostname.
   - **Python Runtime**: Version, compiler, implementation, executable.
   - **CPU Hardware**: Processor model, physical and logical core counts, live CPU load percentage.
   - **Memory Usage**: Installed RAM, available RAM, used RAM, % utilization, and swap memory.
   - Notice clearly distinguishing local machine specs from network telemetry.

3. **Network Environment & Interfaces**:
   - Enumerates local host network interfaces (`psutil.net_if_addrs`, `socket`).
   - Displays adapter name, operational state (`UP / Active` vs `DOWN / Inactive`), IPv4 and subnet mask, IPv6, MAC address, and link speed (Mbps).
   - **Safety compliant**: Strictly passive local enumeration; zero unauthorized network scanning or port sweeps performed.

4. **Backend Monitoring & Recovery Resilience**:
   - Round-trip latency benchmarking on every health check.
   - Detects connection state transitions (Online ↔ Offline).
   - Graceful degradation: handles connection refused, timeouts, and invalid responses without crashing.
   - Automatic recovery: re-establishes telemetry when the backend server restarts.

5. **Application Activity Logging**:
   - Real-time session event log tracking genuine lifecycle events.
   - Records application startup, backend connections, disconnections, health checks, and manual refreshes.
   - Timestamped event feed with clear icons and a log reset mechanism.

6. **Automated Test Suite**:
   - 62 comprehensive pytest unit tests covering backend endpoints, helper functions, frontend components, and network environment discovery.

### ⛔ Not Implemented (by design for Day 1)

- No active packet injection or synthetic load tests.
- Performance metrics show `—` / `Not Measured` (never fabricated).
- No simulated AI predictions or anomaly scores.
- Advanced diagnostic tools (ping, traceroute, iperf-style throughput) are planned for Day 2.

---

## Known Limitations

1. **In-Memory Session State** — Activity logs are stored in Streamlit session state; restarting the browser session resets the log.
2. **Local Environment Only** — Single-host execution for development; authentication and multi-node testing are planned for future milestones.
3. **Passive Enumeration** — Only local network adapter configuration is enumerated; routing topology discovery is deferred to Day 2 diagnostics.

---

## Future Development Roadmap

| Phase | Milestone | Planned Features |
|-------|-----------|-----------------|
| **Day 2** | Network Diagnostics | ICMP ping latency, Traceroute hop analysis, DNS lookup benchmarks, TCP socket verification |
| **Day 3** | Performance Testing | Bandwidth saturation, jitter variance analysis, bidirectional packet throughput |
| **Day 4** | Persistence & History | SQLite database schema, test run storage, historical telemetry queries |
| **Day 5** | Test Automation | Scheduled test suites, cron-based recurrence, SLA violation triggers |
| **Day 6** | AI Anomaly Detection | scikit-learn Isolation Forests, latency baseline drift detection |
| **Day 7** | Analytics & Reports | Interactive Plotly dashboards, PDF/HTML executive report export |

---

<p align="center">
  <b>NetPulse AI</b> — Built for engineers who demand clarity from their networks.
</p>
