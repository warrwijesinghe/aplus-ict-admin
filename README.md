# A Plus ICT Admin

The A Plus ICT Admin application is a React/Vite foundation for managing the consolidated API's categories, courses, lessons, students, orders and private resources.

The application is organised into `src/app`, `src/api`, `src/auth`, `src/layouts`, and `src/pages`. It retains the existing `aplus_admin_token` handling and API routes while preparing the UI for future LMS authoring features.

```powershell
copy .env.example .env
npm install
npm run dev
```

Set `VITE_API_URL=http://localhost:4000` for direct development. In Docker Compose, Nginx hosts Admin at `/admin/` and proxies its API calls to the same consolidated API.
## Resource Library

`/resources` is the secure Resource Library. It obtains its categories, accepted MIME types, limits, default visibility and access policies from the API, reports upload progress and safe validation errors, and never displays storage keys or server paths. The embedded `ResourcePicker` is reusable by the Course Builder: pass compatible category codes and receive the selected safe Resource record.
