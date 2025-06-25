import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("canvas/:id", "routes/canvas._id.tsx"),
] satisfies RouteConfig;
