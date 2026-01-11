import type { Route } from "./+types/home";
import { client } from "~/lib/api";

export async function loader({ request }: Route.LoaderArgs) {
  // 1. Fetch from Hono (Type-safe!)
  const res = await client.index.$get();

  if (!res.ok) {
    throw new Response("Failed to fetch", { status: 500 });
  }

  const data = await res.json();
  return { message: data.message };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Data from Hono: {loaderData.message}</p>
    </div>
  );
}