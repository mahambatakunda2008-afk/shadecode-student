import withPWA from "@ducanh2912/next-pwa";

const nextConfig = withPWA({
  dest: "public",
  register: true,
  disable: process.env.NODE_ENV === "development",
})({
  turbopack: {
    root: process.cwd(),
  },
});

export default nextConfig;
