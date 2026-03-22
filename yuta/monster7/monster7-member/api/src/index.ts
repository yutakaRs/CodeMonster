export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({
        status: "ok",
        timestamp: new Date().toISOString(),
      });
    }

    return Response.json(
      { error: { code: "NOT_FOUND", message: "Not found" } },
      { status: 404 }
    );
  },
} satisfies ExportedHandler<Env>;
