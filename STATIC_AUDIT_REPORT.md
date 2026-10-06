# STATIC AUDIT REPORT — V2

| File | Line | Category | Severity | Finding | Risk | Recommended Action | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `src/services/apiClient.ts` | 1 | API Architecture | CRITICAL | Scattered relative API calls | Network failures in Capacitor APK | Centralize via ApiClient | FIXED |
| `src/engine/schemas.ts` | 50 | Data Provenance | HIGH | Silent defaults in OCR extraction | False technical certainty | Introduce provenance & `UNKNOWN` state | FIXED |
| `src/engine/calculator.ts` | 80 | Electrical Engine | CRITICAL | Simplified ampacity derating | Thermal overload in high temps | Rigorous NEC/NOM ampacity chain | FIXED |
| `capacitor.config.ts` | 9 | Security | HIGH | Cleartext traffic allowed in debug | Mixed content risk | Restrict HTTPS in release | FIXED |
