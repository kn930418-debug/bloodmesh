# 🩸 BloodMesh — The Living Donor Network

A location-aware, real-time blood rescue network built on the **MERN stack**. Fire an SOS and BloodMesh
instantly pings every *immunologically compatible* donor within your radius — over WebSockets, on a live map.

> No phone trees. No Facebook groups. Just a network that answers.

---

## ✨ What makes it different

| Feature | How it works |
|---|---|
| **SOS Broadcast Engine** | A request geofences the hospital, runs a MongoDB `$geoNear` query filtered by a real transfusion-compatibility table (O− patients only get pinged at O− donors, etc.), and pushes a live Socket.IO notification to every matched donor. |
| **Live Mesh Map** | Donor availability, presence (online/offline) and new SOS appear on a dark Leaflet map in real time — pulsing pins, radius circles, nearest-SOS ticker. |
| **Pledge workflow** | Donors accept/decline in one tap; requester is notified instantly; phone numbers unlock only after a pledge; requester marks the mission fulfilled and every hero is notified. |
| **Eligibility engine** | 90-day whole-blood cooldown tracked per donor, shown as a countdown ring on the dashboard and an "eligible in Xd" chip on donor cards. |
| **Rare-type finder** | One-tap search for golden-blood (O−/AB−) heroes; rare donors get a special marker + `rare-guardian` badge. |
| **Gamification** | Donation milestones (1/5/10/25/50 donation clubs), lives-impacted counter (×3 per donation), badge shelf on the profile. |
| **Community camps** | Host or join donation drives with live slot counters. |
| **Compatibility explorer** | Interactive landing-page widget showing exactly which donor groups the mesh will alert for any patient type. |

## 🧱 Tech Stack

**Frontend** — React 18, Vite, TailwindCSS, Framer Motion, React-Leaflet (OpenStreetMap + dark CSS-filter tiles), Socket.IO client, Axios, React Router 6, react-hot-toast, lucide-react

**Backend** — Node.js, Express, MongoDB 2dsphere geospatial queries, Mongoose, JWT (bcrypt password hashing), Socket.IO (presence + targeted rooms)

## 🚀 Run it

Prerequisite: MongoDB running locally (default `mongodb://127.0.0.1:27017/bloodmesh`).

```bash
# 1. install everything (root + server + client)
npm run install:all

# 2. configure the server environment
cp server/.env.example server/.env   # (Windows: copy server\.env.example server\.env)

# 3. seed the demo Bengaluru mesh (50 donors, 3 live SOS, 2 camps)
npm run seed

# 4. start API (:5000) + web app (:5173) together
npm run dev
```

Open **http://localhost:5173**.

### Demo accounts (password: `demo1234`)
- `demo@bloodmesh.app` — Aarav, a requester in Koramangala
- `donor@bloodmesh.app` — Diya, an O− rare-type donor in Indiranagar

> Tip: open two browsers (one per account) — fire an SOS as Aarav and watch it ping Diya's notification bell **live**.

## 📁 Structure

```
bloodmesh/
├── server/                 Express + Socket.IO API
│   └── src/
│       ├── models/         User (2dsphere), BloodRequest, Notification, Camp
│       ├── routes/         auth · users (geo search) · requests (SOS engine) · notifications · camps
│       ├── middleware/     JWT auth
│       ├── utils/          transfusion compatibility table
│       ├── sockets.js      presence + per-user rooms
│       └── seed/           demo dataset generator
└── client/                 React SPA
    └── src/
        ├── pages/          Landing · Auth · Mesh (live map) · Donors · SOS wizard · Requests · RequestDetail · Dashboard · Profile · Camps
        ├── components/     Navbar (live bell) · DonorCard · RequestCard · MapPicker · DropCanvas (particle mesh)
        ├── context/        AuthContext (JWT + socket lifecycle)
        └── lib/            api · socket · geo · compat · format
```

## 🔌 API overview

| Method & path | Purpose |
|---|---|
| `POST /api/auth/register` `/login` · `GET /me` | JWT auth |
| `GET /api/users/nearby?lat&lng&radiusKm&neededFor` | `$geoNear` donor search with compatibility filter |
| `GET /api/users/stats` | public mesh vitals (landing page) |
| `PATCH /api/users/me` · `POST /api/users/me/donated` | profile, availability broadcast, donation log + badges |
| `POST /api/requests` | **fire SOS** → geo-match → socket-ping every compatible donor |
| `POST /api/requests/:id/respond` | accept / decline a pledge |
| `PATCH /api/requests/:id` | requester closes the loop (fulfilled / cancelled) |
| `GET /api/requests/nearby` `/mine` `/:id` | live SOS board |
| `GET /api/notifications` + read endpoints | ping inbox |
| `GET/POST /api/camps` + `/:id/join` | community drives |

**Socket.IO events:** `presence`, `donor:status`, `request:new`, `request:response`, `request:status`, `notification:new`

## 🛡️ Notes
- Demo-grade app: for production add rate-limiting, helmet, refresh-token rotation, phone-verification of donors, and hospital-partner moderation.
- `JWT_SECRET` lives in `server/.env` — change it before deploying anywhere.
