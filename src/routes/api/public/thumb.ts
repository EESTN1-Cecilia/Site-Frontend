import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/thumb")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const id = new URL(request.url).searchParams.get("id") ?? "";
        if (!/^[\w-]{10,}$/.test(id)) {
          return new Response("Bad id", { status: 400 });
        }
        const upstream = await fetch(
          `https://drive.google.com/thumbnail?id=${id}&sz=w480`,
          { redirect: "follow" },
        );
        const type = upstream.headers.get("content-type") ?? "";
        if (!upstream.ok || !type.startsWith("image/")) {
          return new Response("Not found", { status: 404 });
        }
        return new Response(await upstream.arrayBuffer(), {
          headers: {
            "content-type": type,
            "cache-control": "public, max-age=86400",
          },
        });
      },
    },
  },
});
