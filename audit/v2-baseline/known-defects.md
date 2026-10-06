# Known Defects V2 (Baseline)

1. **Silent Electrical Defaults**: Previous versions occasionally used fallback constants (e.g. 590W, 52.8V) when OCR data was partial. **Corrected in V2** via explicit `UNKNOWN` source tracking and provenance metadata.
2. **Scattered API calls**: Previous versions allowed relative `/api/...` fetch calls. **Corrected in V2** via centralized `ApiClient`.
3. **Implicit Ampacity Derating**: Previous versions lacked rigorous terminal temperature limit separation (60°C/75°C/90°C). **Corrected in V2**.
