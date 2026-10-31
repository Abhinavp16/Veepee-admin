"use client"

import { FFmpeg } from "@ffmpeg/ffmpeg"
import { fetchFile } from "@ffmpeg/util"
import { apiFetch } from "@/lib/api"

// Banner videos are compressed here, in the browser, then sent straight to
// storage: the server (on Vercel) can't take a request this large.

export const MAX_VIDEO_BYTES = 25 * 1024 * 1024
// The file picked, before compressing.
export const MAX_SOURCE_BYTES = 300 * 1024 * 1024

// The ffmpeg engine (~30 MB) is served by this site from /ffmpeg (copied there
// from @ffmpeg/core before dev and build); the browser caches it. A fresh
// instance per video: ffmpeg.wasm can crash when reused.
async function loadFfmpeg(): Promise<FFmpeg> {
    const ffmpeg = new FFmpeg()
    const base = `${window.location.origin}/ffmpeg`
    await ffmpeg.load({
        // The library's own worker, unbundled (see copy-ffmpeg-core.mjs).
        classWorkerURL: `${base}/worker.js`,
        coreURL: `${base}/ffmpeg-core.js`,
        wasmURL: `${base}/ffmpeg-core.wasm`,
    })
    return ffmpeg
}

/** A JPEG frame from about 1 second into [video], drawn by the browser. */
async function posterFrame(video: Blob): Promise<Blob> {
    const url = URL.createObjectURL(video)
    try {
        const element = document.createElement("video")
        element.muted = true
        element.playsInline = true
        element.preload = "auto"
        element.src = url
        await new Promise<void>((resolve, reject) => {
            element.onloadedmetadata = () => resolve()
            element.onerror = () => reject(new Error("Could not read the compressed video"))
        })
        await new Promise<void>((resolve) => {
            element.onseeked = () => resolve()
            element.currentTime = Math.min(1, (element.duration || 0) / 2)
        })
        const canvas = document.createElement("canvas")
        canvas.width = element.videoWidth
        canvas.height = element.videoHeight
        canvas.getContext("2d")!.drawImage(element, 0, 0)
        return await new Promise<Blob>((resolve, reject) =>
            canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No poster frame"))), "image/jpeg", 0.85))
    } finally {
        URL.revokeObjectURL(url)
    }
}

// ffmpeg hands back bytes on a shared buffer; a Blob wants its own copy.
function toArrayBuffer(data: Uint8Array | string): ArrayBuffer {
    const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data
    return bytes.slice().buffer as ArrayBuffer
}

export type CompressStage = "loading" | "compressing" | "uploading"

/**
 * At most 1280 px wide, H.264 MP4 that plays on every phone and starts before
 * it has fully downloaded, plus a poster frame (JPEG) from 1 second in.
 */
export async function compressBannerVideo(
    file: File,
    onProgress: (stage: CompressStage, fraction: number) => void,
): Promise<{ video: Blob; poster: Blob }> {
    onProgress("loading", 0)
    const ffmpeg = await loadFfmpeg()
    const report = ({ progress }: { progress: number }) =>
        onProgress("compressing", Math.max(0, Math.min(1, progress)))
    // ffmpeg's own messages, shown in the console if something fails.
    const log: string[] = []
    const keepLog = ({ message }: { message: string }) => {
        log.push(message)
        if (log.length > 40) log.shift()
    }
    ffmpeg.on("progress", report)
    ffmpeg.on("log", keepLog)
    let video: Blob
    try {
        await ffmpeg.writeFile("input", await fetchFile(file))
        onProgress("compressing", 0)
        const code = await ffmpeg.exec([
            "-i", "input",
            "-vf", "scale='min(1280,iw)':-2",
            "-fpsmax", "30",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "28",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "96k",
            "-movflags", "+faststart",
            "out.mp4",
        ])
        if (code !== 0) throw new Error("This video could not be compressed. Try another file.")
        video = new Blob([toArrayBuffer(await ffmpeg.readFile("out.mp4"))], { type: "video/mp4" })
    } catch (error) {
        console.error("ffmpeg log:\n" + log.join("\n"))
        throw error
    } finally {
        ffmpeg.terminate()
    }
    return { video, poster: await posterFrame(video) }
}

async function messageOf(res: Response, fallback: string) {
    const data = await res.json().catch(() => null)
    return data?.message || fallback
}

/** Sends the compressed video to storage; returns its public address. */
export async function uploadBannerVideo(
    video: Blob,
    onProgress: (fraction: number) => void,
): Promise<string> {
    if (video.size > MAX_VIDEO_BYTES) {
        throw new Error(`Still ${(video.size / 1024 / 1024).toFixed(1)} MB after compressing (max 25 MB). Trim the video and try again.`)
    }
    const start = await apiFetch("/upload/video/start", {
        method: "POST",
        body: JSON.stringify({ contentType: "video/mp4", size: video.size }),
    })
    if (!start.ok) throw new Error(await messageOf(start, "Could not start the upload"))
    const { uploadUrl, path } = (await start.json()).data

    await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open("PUT", uploadUrl)
        xhr.setRequestHeader("Content-Type", "video/mp4")
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) onProgress(event.loaded / event.total)
        }
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error(`Upload failed (${xhr.status})`)))
        xhr.onerror = () => reject(new Error("Upload failed. Check the connection and try again."))
        xhr.send(video)
    })

    const finish = await apiFetch("/upload/video/finish", {
        method: "POST",
        body: JSON.stringify({ path }),
    })
    if (!finish.ok) throw new Error(await messageOf(finish, "Could not publish the video"))
    return (await finish.json()).data.url as string
}

/** The poster frame, through the normal image upload (stored as WebP). */
export async function uploadPosterImage(poster: Blob): Promise<string> {
    const form = new FormData()
    form.append("image", new File([poster], "poster.jpg", { type: "image/jpeg" }))
    const res = await apiFetch("/upload/image?folder=banners", { method: "POST", body: form })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.success) throw new Error(data?.message || "Poster upload failed")
    return data.data.url as string
}

export function extractYoutubeId(url: unknown) {
    const value = String(url || "").trim()
    const match = value.match(/(?:youtube\.com\/(?:watch\?[^#]*v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i)
    return match?.[1] || ""
}

export function youtubeThumbnailUrl(url: unknown) {
    const id = extractYoutubeId(url)
    return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : ""
}
