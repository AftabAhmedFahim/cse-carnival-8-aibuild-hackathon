/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/schedules",
        destination: "/dashboard/schedules",
      },
      {
        source: "/rooms",
        destination: "/dashboard/rooms",
      },
      {
        source: "/events",
        destination: "/dashboard/events",
      },
      {
        source: "/announcements",
        destination: "/dashboard/announcements",
      },
      {
        source: "/assignments",
        destination: "/dashboard/assignments",
      },
      {
        source: "/chat",
        destination: "/dashboard/chat",
      },
    ];
  },
};

export default nextConfig;
