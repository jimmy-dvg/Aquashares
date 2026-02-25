# Aquashares – Copilot Development Instructions

## 📌 Project Overview
Aquashares is a multi-page social platform for aquarists.  
Users can register, log in, create posts (plants, fish, inhabitants, equipment), upload photos, comment, and manage profiles.  
Backend is powered by Supabase (DB, Auth, Storage).  
Frontend is built with HTML, CSS, JavaScript and Bootstrap.  
This is NOT an SPA.

---

# 🧱 Core Architecture Rules

## 1. Tech Stack (STRICT)

Frontend:
- HTML (multi-page)
- CSS
- JavaScript (ES Modules only)
- Bootstrap 5
- Optional UI libraries (icons, small UI helpers)

Backend:
- Supabase (DB, Auth, Storage)
- Supabase JS client

Build:
- Node.js
- npm
- Vite (multi-page setup)

NOT allowed:
- TypeScript
- React
- Vue
- Angular
- SPA routing frameworks

---

# 📂 Project Structure Rules

Use modular architecture. No monolithic JS files.
Organize files by feature, not by type.
Example structure:
/src
/pages
index.html
login.html
register.html
post-create.html
profile.html
admin.html

/js
main.js
auth/
login.js
register.js
logout.js
auth-guard.js
posts/
posts-service.js
posts-ui.js
post-form.js
comments/
comments-service.js
profile/
profile-service.js
services/
supabase-client.js
storage-service.js
utils/
validators.js
notifications.js
constants.js

/styles
main.css

supabase/
migrations/

.github/
copilot-instructions.md


Rules:
- Each feature must have:
  - service layer (Supabase communication)
  - UI layer (DOM manipulation)
- Separate concerns clearly.
- Use pure functions when possible.
- Follow SOLID principles.
- Avoid global variables.

---

# 🔐 Authentication Rules

Use Supabase Auth.

- Registration → email + password
- Login → email + password
- Logout → Supabase signOut
- JWT handled automatically by Supabase

Always:
- Protect restricted pages with `auth-guard.js`
- Redirect unauthenticated users to login
- Use role-based checks for admin pages

---

# 👥 Roles

Roles:
- user
- admin

Implementation:
- Table: user_roles
- Row Level Security enforced
- Admin panel visible only if role = admin

Never trust frontend role checks alone.

---

# 🗄 Database Rules

Minimum tables:
- profiles
- posts
- comments
- photos
- user_roles

Rules:
- All relations use foreign keys
- Use UUID primary keys
- Use created_at timestamps
- Index foreign keys
- Use migrations for every schema change
- Never modify schema directly in production

---

# 🛡 Row Level Security (RLS)

Copilot must always generate policies:

Profiles:
- Users can read all profiles
- Users can update only their own profile

Posts:
- Anyone can read posts
- Only author can update/delete own post
- Admin can delete any post

Comments:
- Anyone can read
- Only author can delete own comment
- Admin override allowed

Photos:
- Users can upload only to their own folder
- Public read access

---

# 📦 Storage Rules

- Use Supabase Storage bucket: `post-images`
- File path format:
  userId/postId/filename.jpg
- Validate file size and type
- Store public URL in photos table

---

# 🎨 UI/UX Rules

Minimum pages:
- Register
- Login
- Feed (Home)
- Create/Edit Post
- Profile
- Admin Panel

UI requirements:
- Responsive (mobile-first)
- Use Bootstrap grid
- Use icons (Bootstrap Icons or similar)
- Use cards for posts
- Use modals for confirmation
- Show loading states
- Show success/error notifications

Every page must:
- Have navbar
- Handle auth state
- Import only required JS modules

---

# 🧠 Code Quality Rules

Copilot must:

- Write small, focused functions
- Avoid duplicated code
- Use async/await
- Handle errors with try/catch
- Never leave console logs in production code
- Validate user input before DB calls
- Sanitize dynamic HTML

Naming:
- camelCase for variables/functions
- PascalCase for classes
- CONSTANT_CASE for constants

---

# 🔄 CRUD Pattern Standard

All Supabase interaction must follow:

Service Layer Example:
export async function createPost(data) {
const { data: result, error } = await supabase
.from('posts')
.insert([data])
.select()
.single();

if (error) throw error;
return result;
}


UI Layer handles:
- form submit
- validation
- calling service
- rendering result
- displaying errors

Never mix DOM logic with DB logic.

---

# 🧪 Demo Account

Provide seeded demo user:
email: demo@aquashares.com
password: demo123

---

# 🚀 Deployment Rules

- Environment variables via Vite
- Use import.meta.env
- Never hardcode Supabase keys
- Ensure RLS is enabled before production

---

# 📚 Documentation Requirements

README must include:
- Project description
- Architecture explanation
- Folder structure
- DB schema diagram
- Setup instructions
- Deployment steps
- Test account credentials

---

# 🧩 Future Extensibility

Code must be written to allow:
- Chat feature
- Marketplace
- Badges / reputation system
- Notifications
- Messaging

Avoid tight coupling between modules.

---

# ⚠️ Critical Constraints

- Multi-page app ONLY
- No SPA routing
- No frontend frameworks
- Supabase is the only backend
- Modular JavaScript architecture
- RLS must always be enforced
- All DB changes via migrations
- Clean, readable, secure code

---

Copilot must always prioritize:
Security → Modularity → Readability → Maintainability.