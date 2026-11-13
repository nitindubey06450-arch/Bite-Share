

# 🍛 BiteShare Backend API (Node.js + Express + MongoDB)

BiteShare is a community food rescue and relief platform connecting surplus meals to hungry hearts and verified NGOs in real time.

---

## 🚀 Quick Setup & Installation

### 1. Requirements
- Node.js (v18 or higher)
- npm or pnpm
- MongoDB Atlas account (configured in `.env`)

### 2. Install Dependencies

```bash
cd server
npm install
```

### 3. Environment Variables Configuration

Create a `.env` file inside the `server` directory. Add your actual credentials locally. **Never upload this file to GitHub.**

A template is available in `.env.example`.

```env
PORT=5000
NODE_ENV=development

# MongoDB Atlas Connection
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/biteshare?retryWrites=true&w=majority

# Authentication & JWT
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d

# AI API Keys
OPENAI_API_KEY=your_openai_api_key_here
GCP_API_KEY=your_gcp_api_key_here

# Client URL
CLIENT_URL=http://localhost:5173
```

> **Important: MongoDB Atlas Network Access**
>
> If a connection error occurs, open your MongoDB Atlas dashboard:
> **Security → Network Access → Add IP Address**
>
> Add your current IP address. Avoid allowing access from anywhere (`0.0.0.0/0`) unless absolutely necessary.

### 4. Start the Server

```bash
# Production start
npm start

# Development with auto-reload (nodemon)
npm run dev
```

Server will start at:

`http://localhost:5000`

---

## 📊 Live Terminal Data Logger

BiteShare includes a custom visual logger that displays color-coded information in the backend terminal whenever data is added or searched.

1. **User Registration & Login:** Document ID, Name, Email, Role, and IP Address.
2. **Demo OTP Generation:** Highlighted OTP with a 5-minute countdown.
3. **GPS Real-Time Updates:** Latitude, Longitude, and formatted street address.
4. **AI Search Bar:** User question, generated AI answer, and category tag.

---

## 📡 API Endpoints & Frontend Integration Guide

Base URL: `http://localhost:5000/api`

### 1. Authentication (`/api/auth`)

#### A. Customer Registration
- **Endpoint:** `POST /api/auth/customer/register`
- **Frontend Fetch Example:**

```javascript
const res = await fetch('http://localhost:5000/api/auth/customer/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: "Aarav Sharma",
    email: "aarav@example.com",
    phone: "+919876543210",
    password: "Password@123",
    dietaryPreference: "veg"
  })
});

const data = await res.json();
localStorage.setItem('token', data.token);
```

#### B. Community Registration (NGO / Volunteer / Food Donor)
- **Endpoint:** `POST /api/auth/community/register`
- **Sample Request:**

```json
{
  "name": "Pooja Verma",
  "email": "pooja@feedinghope.org",
  "phone": "+919123456780",
  "password": "Password@123",
  "organizationName": "Feeding Hope Foundation",
  "ngoRegistrationNumber": "NGO-2026-99",
  "communityType": "ngo"
}
```

#### C. Login (Customer & Community)
- **Endpoint:** `POST /api/auth/login`
- **Sample Request:**


```json
{
  "identifier": "aarav@example.com",
  "password": "Password@123",
  "expectedRole": "customer"
}
```

#### D. Request Demo OTP (5-Minute TTL)
- **Endpoint:** `POST /api/auth/otp/send`
- **Sample Request:**

```json
{
  "identifier": "+919876543210",
  "role": "customer"
}
```

- **Response:** In demo mode, the OTP is printed in the backend terminal and may be returned in the response.

```json
{
  "success": true,
  "message": "Demo OTP generated! Check the backend terminal.",
  "demoOtp": "839102",
  "expiresInMinutes": 5
}
```

#### E. Verify OTP & Login
- **Endpoint:** `POST /api/auth/otp/verify`
- **Sample Request:**

```json
{
  "identifier": "+919876543210",
  "otp": "839102",
  "role": "customer"
}
```

---

### 2. Real-Time Location & Delivery Addresses (`/api/location`)

#### A. Send Live Browser Geolocation
- **Endpoint:** `POST /api/location/update-current`
- **Headers:** `Authorization: Bearer <TOKEN>`

```javascript
navigator.geolocation.getCurrentPosition(async (position) => {
  const { latitude, longitude } = position.coords;

  await fetch('http://localhost:5000/api/location/update-current', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({
      latitude,
      longitude,
      addressText: "Detected live browser location"
    })
  });
});
```

#### B. Save Delivery Address
- **Endpoint:** `POST /api/location/delivery-address`
- **Headers:** `Authorization: Bearer <TOKEN>`

```json
{
  "label": "Home",
  "addressLine": "House #42, Block B, Green Glen Layout",
  "landmark": "Near Community Food Hub",
  "city": "Noida",
  "pincode": "201309",
  "latitude": 28.5372,
  "longitude": 77.3895,
  "isDefault": true
}
```

#### C. Find Nearby Food Centers & NGOs
- **Endpoint:** `GET /api/location/nearby?lat=28.5355&lng=77.3910&radiusKm=5`

Sample response:

```json
{
  "success": true,
  "count": 2,
  "center": {
    "latitude": 28.5355,
    "longitude": 77.3910
  },
  "nearbyCommunity": [
    {
      "_id": "67233045...",
      "name": "Feeding Hope Foundation",
      "organizationName": "Feeding Hope Foundation",
      "communityType": "ngo",
      "currentLocation": {
        "coordinates": [77.3945, 28.538]
      }
    }
  ]
}
```

---

### 3. AI Search Bar (`/api/ai`)

- **Endpoint:** `POST /api/ai/search`
- **Headers:** Optional `Authorization: Bearer <TOKEN>`

#### Frontend Search Bar Integration

```javascript
const handleAiSearch = async (userPrompt) => {
  const res = await fetch('http://localhost:5000/api/ai/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: userPrompt })
  });

  const data = await res.json();
  console.log("AI Answer:", data.answer);
  // Display the answer in the frontend UI
};
```

#### Sample Request

```json
{
  "query": "Surplus 15 packets cooked rice ko 24 ghante tak safe kaise rakhein?"
}
```

---

### 4. User Activity & Search History (`/api/activity`)

- **Get My Login History:** `GET /api/activity/logins` (Authorization required)
- **Get My Search History:** `GET /api/activity/searches` (Authorization required)
- **Get Community Activity Feed:** `GET /api/activity/feed` (Community role required)

---

## 🛠️ Testing With cURL

### Health Check

```bash
curl http://localhost:5000/api/health
```

### Send OTP

```bash
curl -X POST http://localhost:5000/api/auth/otp/send \
  -H "Content-Type: application/json" \
  -d '{"identifier":"user@example.com","role":"customer"}'
```

### AI Search

```bash
curl -X POST http://localhost:5000/api/ai/search \
  -H "Content-Type: application/json" \
  -d '{"query":"surplus food recipe ideas"}'
```

---

**Note:** These examples are for local development. Keep all real credentials in environment variables and never commit `.env` files or private keys to version control.