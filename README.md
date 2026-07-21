# UI Common

Shared runtime, API, and cross-application utilities for ControleOnline clients.

## Device request identity

Authenticated device requests send the `DEVICE` identifier and, when available, its matching operational `DEVICE-TYPE`. The runtime resolves the `POS` application view to the canonical sales device type `PDV` before persisting the device context.
