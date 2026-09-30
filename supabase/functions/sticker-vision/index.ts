const INDEX_URL =
  "https://cdn.jsdelivr.net/gh/aubreywu0-source/claude-stickers@main/stickers.json";
const ORIGINAL_BASE =
  "https://cdn.jsdelivr.net/gh/aubreywu0-source/claude-stickers@main/stickers/";
const THUMB_BASE =
  "https://cdn.jsdelivr.net/gh/aubreywu0-source/claude-stickers@main/thumbs/";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, mcp-protocol-version, mcp-session-id",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Expose-Headers": "Mcp-Session-Id",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

type Sticker = {
  id: number;
  file: string;
  meaning: string;
  tone?: string[];
};

let cachedStickers: Sticker[] | null = null;
let cachedAt = 0;

async function getStickers(): Promise<Sticker[]> {
  if (cachedStickers && Date.now() - cachedAt < 5 * 60 * 1000) {
    return cachedStickers;
  }

  const response = await fetch(INDEX_URL, {
    headers: { "User-Agent": "aubrey-sticker-vision/1.0" },
  });
  if (!response.ok) {
    throw new Error(`无法读取表情索引：HTTP ${response.status}`);
  }

  const data = await response.json();
  cachedStickers = Array.isArray(data) ? data : data.stickers;
  if (!Array.isArray(cachedStickers)) {
    throw new Error("表情索引格式无效");
  }
  cachedAt = Date.now();
  return cachedStickers;
}

function normalize(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function searchStickers(stickers: Sticker[], query: string, limit: number) {
  const terms = normalize(query).split(/\s+/).filter(Boolean);

  return stickers
    .map((sticker) => {
      const meaning = normalize(sticker.meaning);
      const tone = normalize((sticker.tone ?? []).join(" "));
      const file = normalize(sticker.file);
      let score = 0;

      for (const term of terms) {
        if (meaning.includes(term)) score += 5;
        if (tone.includes(term)) score += 3;
        if (file.includes(term)) score += 1;
      }

      return { sticker, score };
    })
    .filter((item) => terms.length === 0 || item.score > 0)
    .sort((a, b) => b.score - a.score || a.sticker.id - b.sticker.id)
    .slice(0, limit)
    .map(({ sticker }) => ({
      id: sticker.id,
      meaning: sticker.meaning,
      tone: sticker.tone ?? [],
    }));
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function fetchStickerImage(file: string) {
  let response = await fetch(THUMB_BASE + encodeURIComponent(file));
  if (!response.ok) {
    response = await fetch(ORIGINAL_BASE + encodeURIComponent(file));
  }
  if (!response.ok) {
    throw new Error(`无法读取图片：HTTP ${response.status}`);
  }

  const mimeType = response.headers.get("content-type")?.split(";")[0] ||
    "image/jpeg";
  const data = arrayBufferToBase64(await response.arrayBuffer());
  return { data, mimeType };
}

function rpcResult(id: unknown, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

function rpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

const tools = [
  {
    name: "search_stickers",
    description:
      "低消耗地搜索私人表情包。只返回最多3个简短候选，不返回图片。需要发图时先调用本工具，再只对最终候选调用 see_sticker。",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "想表达的情绪或场景，例如：想念、道歉、亲亲、委屈",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 3,
          default: 3,
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "see_sticker",
    description:
      "读取并亲自查看一张真实表情图片。只在已经通过 search_stickers 选定候选后调用，一次只看一张，以节省图像 token。结果包含实际图像和用于发送高清图的地址。",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "integer",
          minimum: 1,
          maximum: 37,
          description: "search_stickers 返回的表情编号",
        },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
];

async function handleRpc(message: Record<string, unknown>) {
  const id = message.id ?? null;
  const method = message.method;

  if (method === "initialize") {
    const params = (message.params ?? {}) as Record<string, unknown>;
    return rpcResult(id, {
      protocolVersion: params.protocolVersion ?? "2025-06-18",
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "aubrey-sticker-vision", version: "1.0.0" },
      instructions:
        "先搜索少量候选，只查看最终选中的一张真实图片。不要连续读取多张，除非第一张明显不合适。",
    });
  }

  if (method === "ping") {
    return rpcResult(id, {});
  }

  if (method === "tools/list") {
    return rpcResult(id, { tools });
  }

  if (method === "tools/call") {
    const params = (message.params ?? {}) as Record<string, unknown>;
    const name = params.name;
    const args = (params.arguments ?? {}) as Record<string, unknown>;

    try {
      const stickers = await getStickers();

      if (name === "search_stickers") {
        const query = String(args.query ?? "");
        const limit = Math.max(1, Math.min(3, Number(args.limit ?? 3)));
        const matches = searchStickers(stickers, query, limit);
        return rpcResult(id, {
          content: [
            {
              type: "text",
              text: JSON.stringify({ query, matches }, null, 2),
            },
          ],
          isError: false,
        });
      }

      if (name === "see_sticker") {
        const stickerId = Number(args.id);
        const sticker = stickers.find((item) => item.id === stickerId);
        if (!sticker) {
          return rpcResult(id, {
            content: [{ type: "text", text: `不存在编号 ${stickerId}` }],
            isError: true,
          });
        }

        const image = await fetchStickerImage(sticker.file);
        const displayUrl = ORIGINAL_BASE + encodeURIComponent(sticker.file);
        return rpcResult(id, {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                id: sticker.id,
                meaning: sticker.meaning,
                tone: sticker.tone ?? [],
                displayUrl,
                instruction:
                  "你现在已经实际看到了这张图。确认适合语境后，把 displayUrl 作为图片发给用户。",
              }),
            },
            { type: "image", data: image.data, mimeType: image.mimeType },
          ],
          isError: false,
        });
      }

      return rpcResult(id, {
        content: [{ type: "text", text: `未知工具：${String(name)}` }],
        isError: true,
      });
    } catch (error) {
      return rpcResult(id, {
        content: [
          {
            type: "text",
            text: error instanceof Error ? error.message : String(error),
          },
        ],
        isError: true,
      });
    }
  }

  if (typeof method === "string" && method.startsWith("notifications/")) {
    return null;
  }

  return rpcError(id, -32601, `不支持的方法：${String(method)}`);
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method === "GET") {
    return new Response(
      JSON.stringify({
        ok: true,
        name: "aubrey-sticker-vision",
        stickerCount: 37,
        transport: "MCP Streamable HTTP",
      }),
      { status: 200, headers: jsonHeaders },
    );
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const payload = await request.json();
    if (Array.isArray(payload)) {
      const results = (await Promise.all(payload.map(handleRpc))).filter(Boolean);
      if (results.length === 0) {
        return new Response(null, { status: 202, headers: corsHeaders });
      }
      return new Response(JSON.stringify(results), {
        status: 200,
        headers: jsonHeaders,
      });
    }

    const result = await handleRpc(payload);
    if (result === null) {
      return new Response(null, { status: 202, headers: corsHeaders });
    }
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error) {
    return new Response(
      JSON.stringify(
        rpcError(
          null,
          -32700,
          error instanceof Error ? error.message : "Invalid JSON",
        ),
      ),
      { status: 400, headers: jsonHeaders },
    );
  }
});
