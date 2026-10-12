import { apiFetch } from "@/lib/api"

// Browser push for the team. Needs the project's Firebase web settings and a
// Web Push certificate key; without them the feature simply stays hidden.
const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
}
const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || ""

export function isWebPushConfigured(): boolean {
    return Boolean(config.apiKey && config.projectId && config.messagingSenderId && config.appId && vapidKey)
}

export function isWebPushSupported(): boolean {
    return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator
}

export function webPushPermission(): NotificationPermission | "unsupported" {
    return isWebPushSupported() ? Notification.permission : "unsupported"
}

async function getMessagingAndToken() {
    const [{ initializeApp, getApps }, { getMessaging, getToken }] = await Promise.all([
        import("firebase/app"),
        import("firebase/messaging"),
    ])
    const app = getApps()[0] ?? initializeApp(config)
    const query = new URLSearchParams(config).toString()
    const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${query}`)
    const messaging = getMessaging(app)
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration })
    return { messaging, token }
}

/** Asks permission, gets this browser's token and registers it with the API. */
export async function enableWebPush(): Promise<"enabled" | "denied" | "unavailable"> {
    if (!isWebPushConfigured() || !isWebPushSupported()) return "unavailable"
    const permission = await Notification.requestPermission()
    if (permission !== "granted") return "denied"
    const { token } = await getMessagingAndToken()
    if (!token) return "unavailable"
    const response = await apiFetch("/admin/notifications/register-token", { method: "POST", body: JSON.stringify({ fcmToken: token }) })
    return response.ok ? "enabled" : "unavailable"
}

/** Calls `onMessage` for pushes that arrive while the panel is open. */
export async function listenForForegroundPush(onMessage: (title: string, body: string) => void): Promise<() => void> {
    if (!isWebPushConfigured() || webPushPermission() !== "granted") return () => {}
    const { onMessage: subscribe } = await import("firebase/messaging")
    const { messaging } = await getMessagingAndToken()
    return subscribe(messaging, (payload) => onMessage(payload.notification?.title || "Notification", payload.notification?.body || ""))
}
