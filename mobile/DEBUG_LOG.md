# Debugging & Troubleshooting Log

This file documents all debugging details, root causes, exact file lines, code explanations, and resolutions for issues encountered across the project. It serves as a persistent record to diagnose regressions and understand fixes.

---

## Table of Contents
- [Issue #001: TurboModuleRegistry Invariant Violation (`RNGoogleSignin`)](#issue-001-turbomoduleregistry-invariant-violation-rngooglesignin)

---

## Issue #001: TurboModuleRegistry Invariant Violation (`RNGoogleSignin`)

### 📅 Date
2026-08-24

### 📱 Environment / Platform
- **Environment**: Mobile App (React Native / Expo SDK 54 / Android)
- **Runtime**: Expo Go client

---

### 🔴 Symptom & Error Message
When launching the mobile application on a physical Android device using Expo Go, the app immediately crashed on startup displaying a red error screen (LogBox Invariant Violation):

```text
Invariant Violation: TurboModuleRegistry.getEnforcing(...): 'RNGoogleSignin' could not be found. 
Verify that a module by this name is registered in the native binary.

stack:
  invariant@10389:25
  getEnforcing@10352:26
  anonymous@282224:66
  loadModuleImplementation@252:40
  guardedLoadModule@165:37
  metroRequire@78:91
  ...
  global@284795:3
```

---

### 🔍 Root Cause
1. **Expo Go Limitations**: The pre-built Expo Go app binary only contains standard Expo native modules. It does not include third-party custom native Android/iOS code such as `@react-native-google-signin/google-signin`.
2. **Eager Evaluation in ES6 Modules**: In [AuthScreen.tsx](file:///home/user/Desktop/react-native-abstracts/Appdev/mobile/src/screens/AuthScreen.tsx), `@react-native-google-signin/google-signin` was imported statically at the top of the file.
3. **TurboModule Enforcement**: When Metro loads the JavaScript bundle, the package's internal spec (`NativeGoogleSignin.js`) calls `TurboModuleRegistry.getEnforcing('RNGoogleSignin')`. Because `RNGoogleSignin` is absent in Expo Go's compiled binary, `getEnforcing` threw a fatal runtime exception.

---

### 📍 Exact Lines Involved

1. **Project Source Code**:
   - File: [mobile/src/screens/AuthScreen.tsx](file:///home/user/Desktop/react-native-abstracts/Appdev/mobile/src/screens/AuthScreen.tsx#L19)
   - Line:
     ```typescript
     import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
     ```

2. **Package Internal Binary Specification**:
   - File: `node_modules/@react-native-google-signin/google-signin/lib/module/spec/NativeGoogleSignin.js`
   - Line 4:
     ```javascript
     export const NativeModule = TurboModuleRegistry.getEnforcing('RNGoogleSignin');
     ```

---

### 💡 What That Line Means
- **`TurboModuleRegistry.getEnforcing('RNGoogleSignin')`**:
  - `TurboModuleRegistry` is React Native's registry for native TurboModules.
  - `getEnforcing(moduleName)` instructs the JS engine to search the native C++/Java binary for a module registered under that name.
  - The term **`getEnforcing`** means "enforce that this module exists or immediately throw a fatal invariant error if missing".
  - In Expo Go, since `RNGoogleSignin` is not compiled into the Expo Go container APK, the check fails and throws the fatal Invariant Violation error.

---

### 🛠️ Solution Applied

In [mobile/src/screens/AuthScreen.tsx](file:///home/user/Desktop/react-native-abstracts/Appdev/mobile/src/screens/AuthScreen.tsx#L19-L30):

1. **Replaced Static ES6 Import with Safe Dynamic Require in `try...catch`**:
   ```typescript
   // Safely load native Google Sign-In if available in native binary (e.g. custom dev build),
   // while gracefully falling back in Expo Go where native binary does not register RNGoogleSignin.
   let GoogleSignin: any = null;
   let statusCodes: any = {};
   try {
     const googleAuthModule = require('@react-native-google-signin/google-signin');
     GoogleSignin = googleAuthModule?.GoogleSignin || null;
     statusCodes = googleAuthModule?.statusCodes || {};
   } catch (err) {
     console.log('[AuthScreen] Native GoogleSignin module unavailable in this environment');
   }
   ```

2. **Added Null-Checks & Graceful Fallback**:
   - In `useEffect`: `if (GoogleSignin?.configure) { GoogleSignin.configure(...); }`
   - In `handleNativeGoogleSignIn`:
     ```typescript
     if (!GoogleSignin?.signIn) {
       // In Expo Go or when native module is absent, open the fallback Google login modal directly
       setShowGoogleModal(true);
       return;
     }
     ```

---

### ✅ Outcome & Verification
- The app bundle loads smoothly in **Expo Go** without crashing.
- Google Authentication continues to work seamlessly through the in-app Google login modal fallback in Expo Go.
- If built as a standalone binary or custom development build (`npx expo run:android`), it will automatically detect and use the native Google Play Services sign-in dialog.
- Verified TypeScript integrity with `npx tsc --noEmit` (0 errors).

---
