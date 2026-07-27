const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME;
const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || process.env.VITE_CLOUDINARY_UPLOAD_PRESET;

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 8 * 1024 * 1024) {
        reject(new Error("Image upload is too large. Please use a smaller photo."));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid image data.");
  return {
    mime: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  if (!cloudName || !uploadPreset) {
    res.status(500).json({ error: "Cloudinary is not configured in Vercel." });
    return;
  }

  try {
    const body = await readBody(req);
    const payload = JSON.parse(body || "{}");
    const { mime, buffer } = parseDataUrl(payload.image);
    const folder = String(payload.folder || "tgs-enterprises").replace(/[^a-z0-9/_-]/gi, "-").toLowerCase();

    const formData = new FormData();
    formData.append("file", new Blob([buffer], { type: mime }), "upload.jpg");
    formData.append("upload_preset", uploadPreset);
    formData.append("folder", folder);

    const response = await fetch("https://api.cloudinary.com/v1_1/" + cloudName + "/image/upload", {
      method: "POST",
      body: formData,
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      res.status(response.status).json({ error: result.error?.message || result.message || "Cloudinary upload failed." });
      return;
    }

    res.status(200).json({ url: result.secure_url });
  } catch (error) {
    res.status(500).json({ error: error.message || "Image upload failed." });
  }
}
