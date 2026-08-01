# Railway Shutdown Status — galeon / production

**Last updated:** 2026-08-01
**Action by:** Mateo (via Claude Code)
**Reason:** No active users; Alchemy RPC costs (Ponder indexer polling) were too high to keep paying.

**Timeline:**

- **2026-07-01** — all services `railway down`'d to cut costs.
- **2026-07-15** — all services RESTORED for the UNICEF demo (23 July).
- **2026-08-01** — all services `railway down`'d again (demo over).

## Current state: STOPPED (reversible, data preserved)

All 7 services in the `galeon` / `production` Railway project have their deployments
removed (`railway down`), verified 2026-08-01. **No containers are running → no compute
billing and no RPC calls to Alchemy.** Env vars, service configs, and data volumes are
untouched.

> ⚠️ **Auto-redeploy gotcha:** `worker` and `scheduler` have **no watch-path filter**, so
> **any push to `main` auto-redeploys them** (this is why the July 1 shutdown was never
> fully complete). `@galeon/api` and `@galeon/indexer` skip non-matching pushes. After
> stopping, avoid pushing to `main` — or expect to re-stop worker + scheduler afterward.

| Service         | Service ID                             | State      | Notes                                  |
| --------------- | -------------------------------------- | ---------- | -------------------------------------- |
| @galeon/indexer | `877b740c-69bc-4e20-99a1-22d224a0e7a8` | ⬛ stopped | Ponder indexer — main Alchemy consumer |
| @galeon/api     | `1bb79723-edea-4b3f-ad2a-1e66694955fe` | ⬛ stopped | AdonisJS backend                       |
| worker          | `2189adc5-3dd1-4c51-a26b-141c81942eeb` | ⬛ stopped | Background jobs                        |
| scheduler       | `d0cf8a0b-65ad-4162-abcb-346c4adb1642` | ⬛ stopped | Cron/scheduler                         |
| Postgres        | `bddc7ed2-7e0b-4604-bc67-73398dcbebc6` | ⬛ stopped | App DB                                 |
| PonderPostgres  | `5109bde5-1fca-48e2-9b4e-3f796d935412` | ⬛ stopped | Indexer DB                             |
| Redis           | `7e2a8089-1d0f-41bc-845f-b980d69be1f9` | ⬛ stopped | Was already stopped before this        |

- Project ID: `934f29da-a687-43eb-84bd-31d1e3f2dbad`
- Production env ID: `5396a01a-46aa-4be1-b0d8-77c50f5828a2`
- Services show status `FAILED` in the Railway UI — that's just how Railway labels a
  removed deployment, **not** an actual crash.

## Data is preserved (nothing deleted)

Volumes remain intact — `railway down` removes containers, not volumes:

| Volume                 | Attached to    | Used   |
| ---------------------- | -------------- | ------ |
| `postgres-volume`      | Postgres       | 217 MB |
| `postgres-2vce-volume` | PonderPostgres | 760 MB |
| `redis-volume`         | Redis          | 150 MB |

## Cost expectations

- **Alchemy → ~$0.** Nothing is polling anymore. The indexer was the driver.
- **Railway compute → ~$0.** No running containers.
- **Residual:** Railway still charges a small amount for volume storage (~1.1 GB total).
  Zeroing that out would require deleting the project/volumes — deliberately **not** done,
  since we'll likely redeploy for the Base migration / demos.

## Alchemy usage check — NOT verified programmatically

The Alchemy usage/billing dashboard is behind an account login (dashboard.alchemy.com);
there is no CLI/usage API reachable without account auth, and pulling the RPC key from
Railway prod is blocked. **To confirm the spend actually dropped, log in to
dashboard.alchemy.com and check the Compute Units graph flatlines** over the hours after
2026-07-01. The Railway side (nothing running) is the real guarantee.

Optional hard cutoff: disable or rotate the Alchemy API key in the Alchemy dashboard so
nothing can hit it even by accident. Belt-and-suspenders — not required while everything
is stopped.

## How to bring it back

Redeploy the last image per service (or click "Redeploy" in the Railway dashboard).
Bring up databases first, then the app services:

```bash
railway redeploy -s bddc7ed2-7e0b-4604-bc67-73398dcbebc6 -e production -y  # Postgres
railway redeploy -s 5109bde5-1fca-48e2-9b4e-3f796d935412 -e production -y  # PonderPostgres
railway redeploy -s 7e2a8089-1d0f-41bc-845f-b980d69be1f9 -e production -y  # Redis (if needed)
railway redeploy -s 1bb79723-edea-4b3f-ad2a-1e66694955fe -e production -y  # @galeon/api
railway redeploy -s 2189adc5-3dd1-4c51-a26b-141c81942eeb -e production -y  # worker
railway redeploy -s d0cf8a0b-65ad-4162-abcb-346c4adb1642 -e production -y  # scheduler
railway redeploy -s 877b740c-69bc-4e20-99a1-22d224a0e7a8 -e production -y  # @galeon/indexer (Alchemy cost resumes)
```

Note: redeploying `@galeon/indexer` restarts the Alchemy RPC polling and the associated
cost. Leave it stopped until you actually need indexed data.

> ⚠️ **`railway redeploy` fails on a stopped (REMOVED) deployment** — it errors with
> "No deployment found". The July 15 restore instead called the Railway GraphQL API
> `deploymentRedeploy(id:)` against each service's last REMOVED deployment ID, using the
> CLI token from `~/.railway/config.json`. Easiest alternative: click **Redeploy** on the
> last deployment in the Railway dashboard.
