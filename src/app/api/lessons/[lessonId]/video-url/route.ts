import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { API_URL, TOKEN_COOKIE } from "@/lib/api-config";

type RouteContext = {
  params: Promise<{ lessonId: string }>;
};

/**
 * Thin BFF proxy: verifies the session cookie exists, then forwards to the
 * Express backend which performs enrollment checks, Cloudinary signing,
 * watermarking, and access logging. Secrets never leave the backend.
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const { lessonId } = await context.params;
  const jar = await cookies();
  const token = jar.get(TOKEN_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const blockId = req.nextUrl.searchParams.get("blockId");
  const qs = blockId ? `?blockId=${encodeURIComponent(blockId)}` : "";

  // Forward client IP / UA for accurate access logging on the backend
  const forwardedFor =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const userAgent = req.headers.get("user-agent") || "";

  try {
    const upstream = await fetch(
      `${API_URL}/api/lessons/${encodeURIComponent(lessonId)}/video-url${qs}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Forwarded-For": forwardedFor,
          "User-Agent": userAgent,
        },
        cache: "no-store",
      }
    );

    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch (error) {
    console.error("video-url proxy error:", error);
    return NextResponse.json(
      { error: "Failed to issue video URL" },
      { status: 502 }
    );
  }
}
