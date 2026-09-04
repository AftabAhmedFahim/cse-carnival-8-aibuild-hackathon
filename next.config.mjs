/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/schedules",
        destination: "/dashboard/schedules",
        permanent: true,
      },
      {
        source: "/rooms",
        destination: "/dashboard/rooms",
        permanent: true,
      },
      {
        source: "/events",
        destination: "/dashboard/events",
        permanent: true,
      },
      {
        source: "/announcements",
        destination: "/dashboard/announcements",
        permanent: true,
      },
      {
        source: "/assignments",
        destination: "/dashboard/assignments",
        permanent: true,
      },
      {
        source: "/chat",
        destination: "/dashboard/chat",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
