# 🍛 BiteShare - Community Food Rescue & Relief Ecosystem

> **"Connecting Extra Bites to Needy Hearts"**  
> BiteShare is a full-stack community food rescue and relief platform that bridges surplus meals from caterers, bakeries, restaurants, and households to nearby shelters, verified NGOs, and food seekers in real time.

---

## 🌟 Key Highlights & Features

- 🍲 **Complete Food & Meal CRUD**: Community members can post surplus meals with auto-calculated expiry, view listings with veg/non-veg filters, and delete meals directly from cards.
- 📦 **Non-Food Community Essentials (Other Listings)**: Donate and manage items like warm blankets, winter clothes, textbooks, toys, and household utensils.
- 🗺️ **Live Interactive Maps & Tracking**:
  - Multi-layer interactive map powered by **Google Maps Roadmap**, **Satellite**, **Terrain**, and **OpenStreetMap (HOT)**.
  - Live order tracking (`tracking.html`) with real-time delivery route, active rider animation, and live ETA calculation.
- 🔐 **Multi-Role OTP Authentication**:
  - Roles: `Customer`, `Community / Food Donor`, `Rider Partner`, `Super Admin`.
  - Secure phone-based OTP verification with JWT session tokens and auto-login support.
- 🤝 **Dual 4-Digit Handoff Verification Codes**:
  - **Pickup OTP**: Shared between Community and Rider.
  - **Delivery OTP**: Shared between Customer and Rider to verify drop-off.
- 🤖 **AI-Powered Nutrition & Shelf-Life Analysis**:
  - Integrated with **OpenAI (GPT-4o-mini)** & **Google Gemini** for intelligent food nutrition breakdown, protein/calorie estimates, and storage advice.
- 💳 **Payments & Live Donations**: Razorpay gateway + Cash on Delivery (COD) for rider delivery tips.

---

## 🏗️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | HTML5, CSS3 (Modern Flex/Grid, Custom Components), Vanilla JavaScript, Leaflet.js |
| **Backend** | Node.js, Express.js (RESTful API architecture) |
| **Database** | MongoDB Atlas (Cloud) with Mongoose ODM & 2dsphere Geospatial Indexing |
| **Realtime** | Socket.io (Live order status updates & GPS pinging) |
| **AI Integration** | Google Generative AI (Gemini) & OpenAI API |
| **Security** | Helmet, CORS, Rate-Limiting, Bcrypt.js, JSON Web Tokens (JWT) |

---

## 🚀 Quick Setup & Installation

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **MongoDB Atlas** account or local MongoDB instance

### 2. Clone the Repository
```bash
git clone https://github.com/nitindubey06450-arch/Bite-Share.git
cd Bite-Share
```

### 3. Environment Setup
Create a `.env` file inside the `server/` folder based on `.env.example`:

```bash
# Inside server/.env
PORT=5000
NODE_ENV=development

# MongoDB Connection
MONGO_URI=your_mongodb_atlas_connection_string

# Authentication & Security
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# Demo Mode (displays OTP in response for testing)
DEMO_MODE=true

# AI Keys (Optional / Safe)
OPENAI_API_KEY=your_openai_api_key
AI_API_KEY=your_gemini_api_key

# Google Maps API Key (Optional - Maps default to Roadmap without key)
GOOGLE_MAPS_API_KEY=your_google_maps_key
```

> ⚠️ **Security Note**: Never commit your `.env` file. It is already included in `.gitignore`.

### 4. Install Dependencies
```bash
cd server
npm install
```

### 5. Seed Initial Data (Optional)
Populate the database with sample users, multi-category meals, non-food donations, and completed orders:
```bash
node seed/seed.js
```

### 6. Run the Server
```bash
npm start
# or for auto-reload during development:
npm run dev
```

Visit the app in your browser at: **[http://localhost:5000](http://localhost:5000)**

---

## 🌐 Application Routes & Pages

| Route / File | Description |
| :--- | :--- |
| **`http://localhost:5000/`** | Main Landing Page, Live Rescue Map, Surplus Meals Hub, Post a Meal Form |
| **`http://localhost:5000/tracking.html`** | Live Delivery Simulation, Socket.io Tracking & 4-Digit OTP Display |
| **`http://localhost:5000/other page.html`** | Non-Food Community Donations (Clothes, Books, Utensils) |
| **`http://localhost:5000/ngo page.html`** | Verified NGO Portals & Food Distribution Shelters |
| **`http://localhost:5000/customer login.html`** | Customer Portal Login & Registration |
| **`http://localhost:5000/community login.html`** | Food Donors & Caterers Portal |
| **`http://localhost:5000/rider login.html`** | Delivery Fleet & Rider Partner Portal |
| **`http://localhost:5000/api/health`** | System & Database Health Check Endpoint |

---

## 📡 API Overview

### 🔐 Authentication (`/api/auth`)
- `POST /api/auth/otp/request` — Request 6-digit verification code
- `POST /api/auth/otp/verify` — Verify code & receive JWT token
- `GET /api/auth/me` — Auto-login & session validation

### 🍲 Meal Listings (`/api/listings`)
- `GET /api/listings` — Fetch available surplus meals (filters: category, status, geolocation `$near`)
- `POST /api/listings` — Post a new surplus meal (Community role)
- `PATCH /api/listings/:id` — Update listing details (Owner only)
- `DELETE /api/listings/:id` — Remove/delete meal listing
- `POST /api/listings/:id/reserve` — Customer reserves meal (generates 4-digit OTP)
- `POST /api/listings/:id/handoff` — Verify 4-digit code at pickup

### 🎁 Non-Food Essentials (`/api/other-listings`)
- Full CRUD for community relief donations (clothes, blankets, books, household supplies).

### 🤖 AI Analysis (`/api/ai`)
- `POST /api/ai/analyze` — Nutritional and safety breakdown of dishes.

---

## 👥 Default Demo Credentials (Post-Seed)

| Role | Phone | Password |
| :--- | :--- | :--- |
| **Super Admin** | `9999900000` | `AdminPassword123` |
| **Community (NGO / Kitchen)** | `9810011111` | `CommunityPass123` |
| **Customer** | `9876543210` | `CustomerPass123` |
| **Rider Partner** | `9820033333` | `RiderPass123` |

---

## 🤝 Contributing
Contributions are always welcome! Feel free to open an Issue or submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License
This project is licensed under the **ISC License**.
