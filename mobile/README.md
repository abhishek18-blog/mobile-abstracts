# Abstracts Mobile (React Native / Expo Android App)

This directory contains the native React Native / Expo application for **Abstracts ResearchHub**.

---

## 📱 Features

- **Discover & Live Search**: Search paper databases (OpenAlex / Semantic Scholar) with live filters, citations, and tags.
- **My Library**: Access saved research papers, custom reading progress indicators, and research projects.
- **For You Recommendations**: Personalized feed based on research interests and topics.
- **Research Communities**: Join research groups, read discussions, and interact with peers.
- **Native Paper Viewer**: Abstract summary viewer with PDF/source launch and reading progress tracking.
- **Authentication & Guest Mode**: Full support for user login/signup with persistent storage (`AsyncStorage`) and guest access.

---

## 🚀 Getting Started

### 1. Install Mobile Dependencies
From inside the `./mobile` directory:
```bash
cd mobile
npm install
```

### 2. Run on Mobile Device or Emulator

- **Android Emulator**:
  ```bash
  npx expo start --android
  ```

- **Physical Android Device (Expo Go App)**:
  1. Install **Expo Go** from Google Play Store on your Android phone.
  2. Run:
     ```bash
     npx expo start
     ```
  3. Scan the QR code displayed in the terminal using the Expo Go app.

---

## 🌐 Connecting to Backend Server

By default, the mobile app connects to the remote production backend API (`https://abstracts-researchhub.onrender.com/api`).

If you are running the backend server locally on your machine (`localhost:5000`):
- Open **Settings** inside the mobile app.
- Update the API Endpoint to:
  - `http://10.0.2.2:5000/api` (if using Android Studio Emulator).
  - `http://<YOUR_LOCAL_IP>:5000/api` (if testing on physical Android phone connected to same Wi-Fi).

---

## 📦 Building Standalone Android APK (.apk)

To build a standalone installable Android APK file:

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```
2. Log in to Expo:
   ```bash
   eas login
   ```
3. Build Android APK:
   ```bash
   eas build --platform android --profile preview
   ```
This will produce a `.apk` file that can be downloaded and installed directly on any Android phone.
