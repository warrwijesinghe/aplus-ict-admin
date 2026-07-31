# A Plus ICT Admin

The A Plus ICT Admin application is a React/Vite foundation for managing the consolidated API's categories, courses, lessons, students, orders and private resources.

```powershell
copy .env.example .env
npm install
npm run dev
```

Set `VITE_API_URL=http://localhost:4000` for direct development. In Docker Compose, Nginx hosts Admin at `/admin/` and proxies its API calls to the same consolidated API.
