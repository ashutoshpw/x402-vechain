import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("api-keys", "routes/api-keys.tsx"),
] satisfies RouteConfig;
