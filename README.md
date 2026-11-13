# 🍛 BiteShare - Community Food Rescue & Relief Platform

BiteShare is a full-stack community food rescue and relief ecosystem connecting surplus meals from bakeries, caterers, and homes to nearby shelters, NGOs, and food seekers in real-time.

---

## 🚀 Quick Start Guide

### 1. Environment Configuration
The backend uses secrets from `server/.env`. A template is provided in `server/.env.example`.

```env
PORT=5000
NODE_ENV=development

MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/biteshare

JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d

DEMO_MODE=true

OPENAI_API_KEY=your_openai_api_key_here
GCP_API_KEY=your_gcp_api_key_here

CLIENT_URL=http://localhost:5000
FRONTEND_ORIGIN=http://localhost:5000
```

### 2. Run the Server & Web App
```bash
cd server
npm start
```
The server serves both the RESTful API and the static frontend simultaneously on:
- **Web App:** http://localhost:5000
- **Live Delivery Tracking:** http://localhost:5000/tracking.html
- **Customer Login:** http://localhost:5000/customer%20login.html
- **Community Login:** http://localhost:5000/community%20login.html
- **Rider Login:** http://localhost:5000/rider%20login.html
- **Health Check:** http://localhost:5000/api/health

## ⚡ Core Features & Endpoints

### 1. Demo OTP Login with Auto-Login
- **Send OTP**: `POST /api/auth/otp/request` with `{ "phone": "9876543210" }`
  - Generates a 6-digit numeric OTP, bcrypt-hashes the code with a 5-minute expiry.
  - In `DEMO_MODE=true`, returns the OTP directly in the JSON response and prints it to the console.
  - Rate limited to 3 OTP requests per phone per 10 minutes and max 5 verification attempts.
- **Verify OTP**: `POST /api/auth/otp/verify` with `{ "phone": "9876543210", "code": "123456", "role": "customer" }`
  - Creates the user account if new, creates a signed JWT token, and logs the login event in `LoginLog`.
- **Auto-Login**: When a valid JWT is saved in `localStorage`, the frontend calls `GET /api/auth/me`. If valid, it redirects automatically; if expired, it clears storage and stays on the login page.

### 2. Meal Listings (RESTful API)
- `GET /api/listings` (Auth required): Lists active surplus meals. Supports `category` (`veg` | `non-veg`), `status`, and distance filtering (`lat`, `lng`, `radiusKm` via MongoDB 2dsphere `$near`). Expired listings are automatically hidden.
- `GET /api/listings/:id`: Retrieves one listing.
- `POST /api/listings` (Community role only): Posts surplus meals. Automatically sets the poster's GPS coordinates as the pickup point if not overridden.
- `PATCH /api/listings/:id`: Edits listing (owner only).
- `DELETE /api/listings/:id`: Soft delete (sets `status: "removed"`, owner or admin only).

### 3. Second Listing Type (`/api/other-listings`)
- Supports non-food community relief items (warm clothes, blankets, books, and household essentials).
- Features the exact same CRUD endpoints, validation, and role restrictions under `/api/other-listings`.

### 4. Live Location Sharing & Shared MapSection
- Embedded Leaflet + OpenStreetMap component showing user's live position via `navigator.geolocation.watchPosition` and surplus meal pins.
- **"Share My Location" Toggle**: When toggled off, location updates are paused and marker is removed from map.
- Displays bilingual warning message (English + Hindi) if geolocation permission is denied by the user.

### 5. OpenAI `gpt-4o-mini` Food Nutrition & Shelf-Life Analysis
- `POST /api/ai/analyze` with `{ "foodName": "Cooked Rice" }` (Auth required).
- Directly calls OpenAI's `gpt-4o-mini` with strict JSON response format (`response_format: { type: "json_object" }`).
- Returns:
  - `explanation`: Detailed culinary and nutritional description.
  - `protein`: Grams per typical serving.
  - `calories`: Estimated energy content.
  - `mainNutrients`: Key vitamins, minerals, fiber, and healthy fats.
  - `shelfLife`: Clear room temperature vs. refrigerator safety guidance.
- Rate-limited to 20 queries per user per hour and saved in `SearchHistory`.
- Header search bar on `index.html` and **"🔬 Analyze"** buttons on all listing cards.

---

## 🧪 Verification Checklist

| Test Item | Endpoint / Action | Status |
| :--- | :--- | :--- |
| **Demo OTP Request** | `POST /api/auth/otp/request` | ✅ Generates 6-digit code on-screen |
| **Demo OTP Verify** | `POST /api/auth/otp/verify` | ✅ Returns JWT, creates user, logs LoginLog |
| **Auto-Login** | `GET /api/auth/me` | ✅ Validates token on load |
| **Community Post Meal** | `POST /api/listings` | ✅ Validates inputs & coordinates |
| **Filter Listings** | `GET /api/listings?category=veg` | ✅ Filters veg / distance |
| **Edit Listing** | `PATCH /api/listings/:id` | ✅ Owner-only restriction verified |
| **Soft Delete Listing** | `DELETE /api/listings/:id` | ✅ Marks status as 'removed' |
| **Other Listings CRUD** | `/api/other-listings` | ✅ Full CRUD operational |
| **Live Leaflet Map** | `MapSection` in `index.html` | ✅ OSM tiles + GPS watchPosition + Toggle |
| **OpenAI `gpt-4o-mini` Analysis** | `POST /api/ai/analyze` | ✅ Returns JSON with protein, calories, shelf life |
