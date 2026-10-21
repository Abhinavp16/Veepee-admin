/** A plain grey box with a label, drawn locally (no outside image service). */
export function placeholderImage(label: string, width = 400, height = 220) {
    const text = label.replace(/[<>&"]/g, "")
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#16181d"/><text x="50%" y="50%" fill="#9ca3af" font-family="system-ui, sans-serif" font-size="${Math.max(12, Math.round(Math.min(width, height) / 9))}" text-anchor="middle" dominant-baseline="middle">${text}</text></svg>`
    return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
