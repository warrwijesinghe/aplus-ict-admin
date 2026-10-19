# A Plus ICT Admin

The A Plus ICT Admin application is a React/Vite foundation for managing the consolidated API's categories, courses, lessons, students, orders and private resources.

The application is organised into `src/app`, `src/api`, `src/auth`, `src/layouts`, and `src/pages`. It retains the existing `aplus_admin_token` handling and API routes while preparing the UI for future LMS authoring features.

Staff management and authoring live here. Use **Courses → Course setup** to create a course and its medium, then open the medium to manage lessons, topics and activities. The **Legacy lesson editor** retains access to ungrouped lesson sections and catalogue order. Student dashboards and the learning experience remain in Web.

```powershell
copy .env.example .env
npm install
npm run dev
```

Admin development runs at http://localhost:5174; Web runs at http://localhost:5173. If its port is occupied, the server exits instead of switching ports. Stop the existing server before restarting.

Set `VITE_API_URL=http://localhost:4000` for direct development. In Docker Compose, Nginx hosts Admin at `/admin/` and proxies its API calls to the same consolidated API.
## Resource Library

## Lesson prices

Open **Products** (or **Course setup → Manage course lesson prices**), find the course, medium and lesson, and click **Edit price**. Save the LKR amount to update that product's price on the lesson cards, landing page and checkout. Prices support up to two decimal places. Draft products must be published before students can buy them. Updating prices requires `products.update`; existing orders retain their original totals.

### Printed tutorial images

Upload a public image with public access in the Resource Library (Lesson Image, Site Asset, or Course Thumbnail). In **Courses → Course setup → Course tutorial images**, choose the course's image and click **Save course tutorial image**. This default appears on every lesson landing page and purchase page in that course. In **Open content → Edit mode → Edit lesson**, optionally choose a lesson-specific tutorial image and save the lesson to override the course default. Remove the lesson image to inherit the course image again. If neither is set, Web displays its default illustration.

`/resources` is the secure Resource Library. It obtains its categories, accepted MIME types, limits, default visibility and access policies from the API, reports upload progress and safe validation errors, and never displays storage keys or server paths. The embedded `ResourcePicker` is reusable by the Course Builder: pass compatible category codes and receive the selected safe Resource record.
