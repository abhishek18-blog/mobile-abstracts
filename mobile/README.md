# Abstracts Mobile (React Native / Expo Android App)

This directory contains the native React Native / Expo application for **Abstracts ResearchHub**.

---

## 📱 Features

- **Discover & Live Search**: Search paper databases (OpenAlex / Semantic Scholar) with live filters, citations, and tags.
- **My Library**: Access saved research papers, custom reading progress indicators, and research projects.
- **For You Recommendations**: Personalized feed based on research interests and topics.
- **Research Communities & E2EE Chat**: Join research groups, discuss academic topics, and send messages protected by **End-to-End Encryption (AES-256-GCM)**.
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

---

## 🔒 End-to-End Encryption (E2EE) Architecture

The mobile app includes a client-side End-to-End Encryption system located in:
👉 [`src/services/encryptionService.ts`](file:///home/user/Desktop/react-native-abstracts/Appdev/mobile/src/services/encryptionService.ts)

### How It Works:
1. **AES-256-GCM Symmetric Encryption**:
   - Each community group utilizes a 256-bit symmetric Room Key derived via **HKDF (SHA-256)** with a domain-separated salt.
   - Every message is encrypted using **AES-256-GCM** with a fresh 12-byte cryptographically random Nonce/IV before leaving the phone.
   - GCM mode provides **AEAD** (Authenticated Encryption with Associated Data), ensuring any modification or tampering immediately invalidates decryption.

2. **Zero-Knowledge Cloud Storage**:
   - The Node.js server and MongoDB Atlas receive and store only ciphertext formatted as:
     `E2EE:v1:aes-gcm:<12-byte-nonce-hex>:<ciphertext-and-auth-tag-hex>`
   - Neither MongoDB Atlas, the backend API, nor network intermediaries possess the keys or ability to decrypt messages.

3. **Client-Side Decryption**:
   - When fetching or polling posts in `CommunityScreen.tsx`, the app checks for the `E2EE:v1:` prefix.
   - Encrypted posts are decrypted locally using the room key.
   - A lock icon and `E2EE (AES-256)` badge in the UI indicate verified encryption status.

4. **1-on-1 Direct Messaging (X25519 ECDH)**:
   - For direct messaging between two users, the service provides `encryptDirectMessage` and `decryptDirectMessage`.
   - Generates an **X25519 (Curve25519)** asymmetric keypair on the device.
   - Derives a pairwise AES-256 session key via Elliptic-Curve Diffie-Hellman (ECDH) without transmitting secret keys across the network.
