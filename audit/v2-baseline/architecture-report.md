# Architecture Report V2 — PV-ESS Engine

## Overview
The application is a deterministic, traceable photovoltaic and energy storage system (ESS) engineering platform complying with NOM-001-SEDE and NEC standards.

## Core Architectural Layers
1. **UI Layer**: React 19 + Tailwind CSS + Framer Motion.
2. **Application State / Canonical Model**: `ElectricalProjectModel` (single source of truth).
3. **Engineering Engine**: Deterministic calculation engine (`calculator.ts`, `standards.ts`) for ampacity, MPPT, voltage drop, conduit fill, protections, and grounding.
4. **Independent Verification Engine**: `verifier.ts` providing double calculation to ensure zero discrepancy between calculation logic and mathematical rules.
5. **API Client Layer**: Centralized `ApiClient` (`apiClient.ts`) ensuring all remote calls (AI, OCR, weather) go through structured endpoints with robust offline detection and health diagnostics.
