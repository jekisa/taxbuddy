# TaxBuddy SaaS Workspace Wireframe

## Global App Shell

```text
+ Sidebar 260px -------------------------------- + Topbar -------------------------------------+
| Logo + Brand Card                              | Status text          KPI pills   Bell  User |
|                                                +----------------------------------------------+
| Dashboard                                      |                                              |
| - Dashboard                                    | Page content                                  |
|                                                |                                              |
| Proses                                         |                                              |
| - Pajak Keluaran                              |                                              |
| - Doc Lain Masukan                            |                                              |
| - SPT Dokumen Lain                            |                                              |
|                                                |                                              |
| Data                                           |                                              |
| - Database                                     |                                              |
| - Arsip Dokumen                               |                                              |
|                                                |                                              |
| Pengaturan remains in existing theme/account   |                                              |
+------------------------------------------------+----------------------------------------------+
```

## Dashboard

```text
+ Welcome Hero ----------------------------------------------------------------------+
| Selamat Datang, {Nama User}                         Subscription status / package |
| Status langganan, paket saat ini, sisa masa aktif                                  |
+------------------------------------------------------------------------------------+

+ KPI Grid --------------------------------------------------------------------------+
| Paket Enterprise | Invoice Usage + progress | Invoice Bulan Ini | Invoice Diproses |
| Doc Lain Masukan | SPT Dokumen Lain         | Total Export XML  |                  |
+------------------------------------------------------------------------------------+

+ Analytics / Status ----------------------------------------------------------------+
| Tren Invoice Diproses area chart: 7 / 30 / 90 hari     | Donut Status Pemrosesan |
|                                                         | Berhasil Pending Error  |
+------------------------------------------------------------------------------------+

+ Insight / Activity ----------------------------------------------------------------+
| Insight Hari Ini                                       | Aktivitas Terbaru       |
| - invoice berhasil diproses                            | timeline feed           |
| - NPWP invalid                                         |                         |
| - kuota tersisa                                        |                         |
+------------------------------------------------------------------------------------+

+ Riwayat Export XML ----------------------------------------------------------------+
| Search | Filter | Export | meta                                                    |
| Sticky header table, zebra row, hover row, pagination                              |
+------------------------------------------------------------------------------------+
```

## Shared Components

- Cards: 16px radius, soft shadow, hover lift.
- Buttons: 10px radius, icon-first actions.
- Inputs: 10px radius, focus ring from existing brand color.
- Tables: sticky header, rounded shell, search, filter affordance, CSV export, pagination.
- Sidebar: grouped navigation, active indicator, collapsible animation.
- Modal/forms: same radius, spacing, input, and shadow tokens.
