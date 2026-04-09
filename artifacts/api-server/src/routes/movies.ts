import { Readable } from "stream";
import { Router, type Request, type Response } from "express";

const router = Router();

const GZ_BASE = "https://gzmovieboxapi.septorch.tech";
const MOVIEBOX_BASE = "https://moviebox.davidcyril.name.ng";
const GZ_APIKEY = "Godszeal";

async function proxyJson(url: string, res: Response) {
  const upstream = await fetch(url, { headers: { "User-Agent": "CINEVERSE-App/1.0" } });
  const data = await upstream.json();
  res.json(data);
}

router.get("/movies/homepage", async (_req: Request, res: Response) => {
  await proxyJson(`${MOVIEBOX_BASE}/api/homepage`, res);
});

router.get("/movies/trending", async (_req: Request, res: Response) => {
  await proxyJson(`${MOVIEBOX_BASE}/api/trending`, res);
});

router.get("/movies/search", async (req: Request, res: Response) => {
  const query = String(req.query.query ?? "");
  const page = String(req.query.page ?? "1");
  const url = `${GZ_BASE}/api/search?apikey=${GZ_APIKEY}&query=${encodeURIComponent(query)}&subjectType=ALL&page=${page}&perPage=24`;
  await proxyJson(url, res);
});

router.get("/movies/details", async (req: Request, res: Response) => {
  const id = String(req.query.id ?? "");
  const url = `${GZ_BASE}/api/item-details?subjectId=${encodeURIComponent(id)}&apikey=${GZ_APIKEY}`;
  await proxyJson(url, res);
});

router.get("/movies/stream", async (req: Request, res: Response) => {
  const id = String(req.query.id ?? "");
  const detailPath = req.query.detailPath ? String(req.query.detailPath) : undefined;
  const season = req.query.season ? parseInt(String(req.query.season)) : 0;
  const episode = req.query.episode ? parseInt(String(req.query.episode)) : 0;

  const body: Record<string, unknown> = {
    subjectId: id,
    apikey: GZ_APIKEY,
    season,
    episode,
  };
  if (detailPath) body.detailPath = detailPath;

  const upstream = await fetch(`${GZ_BASE}/api/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "CINEVERSE-App/1.0" },
    body: JSON.stringify(body),
  });
  const data = await upstream.json();
  res.json(data);
});

router.get("/movies/qualities", async (req: Request, res: Response) => {
  const id = String(req.query.id ?? "");
  const detailPath = req.query.detailPath ? String(req.query.detailPath) : undefined;
  const season = req.query.season ? parseInt(String(req.query.season)) : 0;
  const episode = req.query.episode ? parseInt(String(req.query.episode)) : 0;

  const body: Record<string, unknown> = {
    subjectId: id,
    apikey: GZ_APIKEY,
    season,
    episode,
  };
  if (detailPath) body.detailPath = detailPath;

  const upstream = await fetch(`${GZ_BASE}/api/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "CINEVERSE-App/1.0" },
    body: JSON.stringify(body),
  });
  const data = await upstream.json();
  res.json(data);
});

router.get("/movies/media", async (req: Request, res: Response) => {
  const id = String(req.query.id ?? "");
  const detailPath = req.query.detailPath ? String(req.query.detailPath) : undefined;
  const season = req.query.season ? parseInt(String(req.query.season)) : 0;
  const episode = req.query.episode ? parseInt(String(req.query.episode)) : 0;

  const params = new URLSearchParams({
    apikey: GZ_APIKEY,
    subjectId: id,
    season: String(season),
    episode: String(episode),
  });
  if (detailPath) params.set("detailPath", detailPath);

  await proxyJson(`${GZ_BASE}/api/media?${params.toString()}`, res);
});

const fileSizeCache = new Map<string, number>();
const INITIAL_CHUNK = 524288;

async function getFileSize(targetUrl: string): Promise<number> {
  const cached = fileSizeCache.get(targetUrl);
  if (cached && cached > 0) return cached;
  const headRes = await fetch(targetUrl, {
    method: "HEAD",
    headers: { "User-Agent": "CINEVERSE-Relay/1.0" },
  });
  const size = parseInt(headRes.headers.get("content-length") ?? "0", 10);
  if (size > 0) fileSizeCache.set(targetUrl, size);
  return size;
}

router.head("/movies/relay", async (req: Request, res: Response) => {
  const targetUrl = String(req.query.url ?? "");
  if (!targetUrl) { res.status(400).end(); return; }
  try {
    const totalBytes = await getFileSize(targetUrl);
    res.writeHead(200, {
      "Content-Type": "video/mp4",
      "Accept-Ranges": "bytes",
      "Content-Length": String(totalBytes),
      "Access-Control-Allow-Origin": "*",
    });
    res.end();
  } catch {
    res.status(502).end();
  }
});

router.get("/movies/relay", async (req: Request, res: Response) => {
  const targetUrl = String(req.query.url ?? "");
  if (!targetUrl) { res.status(400).json({ error: "url required" }); return; }

  try {
    const totalBytes = await getFileSize(targetUrl);
    if (totalBytes === 0) { res.status(502).json({ error: "could not determine file size" }); return; }

    const rangeHeader = String(req.headers["range"] ?? "");
    let start = 0;
    let end = Math.min(INITIAL_CHUNK - 1, totalBytes - 1);

    if (rangeHeader) {
      const m = rangeHeader.match(/^bytes=(\d+)?-(\d+)?$/);
      if (m) {
        if (m[1] !== undefined && m[1] !== "") {
          start = parseInt(m[1], 10);
          end = m[2] !== undefined && m[2] !== "" ? parseInt(m[2], 10) : totalBytes - 1;
        } else if (m[2] !== undefined && m[2] !== "") {
          const suffixLen = parseInt(m[2], 10);
          start = Math.max(0, totalBytes - suffixLen);
          end = totalBytes - 1;
        }
      }
    }

    start = Math.max(0, Math.min(start, totalBytes - 1));
    end = Math.max(start, Math.min(end, totalBytes - 1));
    const chunkSize = end - start + 1;

    const upstream = await fetch(targetUrl, {
      headers: {
        "User-Agent": "CINEVERSE-Relay/1.0",
        "Range": `bytes=${start}-${end}`,
      },
    });

    if (!upstream.body) { res.status(502).end(); return; }

    res.writeHead(206, {
      "Content-Type": "video/mp4",
      "Accept-Ranges": "bytes",
      "Content-Range": `bytes ${start}-${end}/${totalBytes}`,
      "Content-Length": String(chunkSize),
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
    });

    const nodeStream = Readable.fromWeb(
      upstream.body as Parameters<typeof Readable.fromWeb>[0]
    );
    nodeStream.pipe(res);
    req.on("close", () => { try { nodeStream.destroy(); } catch {} });

  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: String(err) });
  }
});

export default router;
