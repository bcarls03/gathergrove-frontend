// src/lib/notifications.ts
import { Capacitor } from "@capacitor/core";
import {
  PushNotifications,
  type Token,
  type PushNotificationSchema,
  type ActionPerformed,
} from "@capacitor/push-notifications";
import { CURRENT_UID } from "./api";

let hasInitialized = false;

/**
 * Call this once (e.g., in App.tsx) after the user is onboarded/logged in.
 * - Web: no-op
 * - iOS/Android: requests permission, registers, and sends token to backend (if VITE_API_BASE_URL is set)
 */
export async function initPushNotifications() {
  if (hasInitialized) return;
  hasInitialized = true;

  // Only run on native (iOS/Android)
  const platform = Capacitor.getPlatform();
  if (platform === "web") {
    console.log("[push] Skipping init on web");
    return;
  }

  try {
    console.log("[push] Checking permissions…");
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === "prompt") {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== "granted") {
      console.warn("[push] Permission not granted:", permStatus.receive);
      return;
    }

    console.log("[push] Permissions granted, registering with APNS/FCM…");
    await PushNotifications.register();

    // Registration success -> token
    PushNotifications.addListener("registration", async (token: Token) => {
      console.log("[push] Registration success, token:", token.value);

      // IMPORTANT: do NOT call /users here.
      // We'll only send to a dedicated push endpoint if it exists.
      try {
        await sendPushTokenToBackend(token.value);
      } catch (err) {
        console.error("[push] Failed to send token to backend:", err);
      }
    });

    PushNotifications.addListener("registrationError", (error: any) => {
      console.error("[push] Registration error:", error);
    });

    PushNotifications.addListener(
      "pushNotificationReceived",
      (notification: PushNotificationSchema) => {
        console.log("[push] Notification received in foreground:", notification);
      }
    );

    PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (notification: ActionPerformed) => {
        console.log(
          "[push] Notification action performed:",
          JSON.stringify(notification, null, 2)
        );
      }
    );
  } catch (err) {
    console.error("[push] Unexpected error during init:", err);
  }
}

/**
 * Sends the device token to backend (optional).
 * If you don't have the endpoint yet, it safely no-ops.
 *
 * Backend endpoint:
 *   POST {VITE_API_BASE_URL}/push/register
 * body: { uid, token, platform }
 */
async function sendPushTokenToBackend(token: string): Promise<void> {
  if (!CURRENT_UID) {
    console.warn("[push] No CURRENT_UID — skipping token registration");
    return;
  }

  // Align with src/lib/api.ts (VITE_API_BASE_URL)
  // Set in .env when ready, e.g. VITE_API_BASE_URL=http://127.0.0.1:8000
  const base =
    (import.meta as any)?.env?.VITE_API_BASE_URL?.toString()?.trim() || "";

  if (!base) {
    console.log(
      "[push] No VITE_API_BASE_URL set — skipping backend token registration"
    );
    return;
  }

  const url = `${base.replace(/\/$/, "")}/push/register`;

  const payload = {
    uid: CURRENT_UID,
    token,
    platform: Capacitor.getPlatform(),
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to register push token (${res.status}): ${text || "no body"}`
    );
  }

  console.log("[push] Token registered with backend");
}
