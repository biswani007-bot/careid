# CAREID — Test Execution & Quality Gate Report

**Date:** November 10, 2026  
**Auditor:** Antigravity Senior Principal Backend Engineer  
**Test Runner:** Jest 29 / ts-jest  
**Target:** Monolithic Backend API

---

## 1. Automated Test Results Summary

| Test Suite File | Category | Tests Executed | Tests Passed | Tests Failed | Execution Time |
|---|---|---|---|---|---|
| `appointment-stages-11-16.spec.ts` | Stages 11, 14, 15, 16 (Holds, Readiness, Check-In, WHO Checklist) | 8 | 8 | 0 | 54.6s |
| `treatment-offer-stage8-9.spec.ts` | Stages 8 & 9 (Acceptance Certificate & Clearance) | 5 | 5 | 0 | 6.1s |
| `encounter.service.spec.ts` | Stages 17 & 18 (Procedures & Hemodynamics) | 4 | 4 | 0 | 5.6s |
| `cpt.service.spec.ts` | Phase 8 (CPT Catalogue Listing, Search, Detail) | 6 | 6 | 0 | 2.5s |
| `doctor.service.spec.ts` | Phase 2 Regression (Patient List, Security Audit, Access) | 34 | 34 | 0 | 28.1s |
| **Total Test Suites** | **Comprehensive Quality Gate** | **57** | **57** | **0** | **100% Pass** |

---

## 2. Compilation & Typecheck Verification

- **Command Executed:** `npm run build` (`nest build`)
- **Result:** Exit Code 0 (Success)
- **Output:** Built bundle generated cleanly in `dist/` with 0 compilation errors and 0 type errors.

---

## 3. Database Persistence Verification

- **Target Database:** PostgreSQL 16 on `127.0.0.1:5432` (`hvapi_db`)
- **Tables Verified:** 152 public tables active and schema-consistent.
- **Transactions & Concurrency:** Verified that temporary slot holds block concurrent bookings with 409 Conflict.

