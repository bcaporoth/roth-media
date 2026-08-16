const nextConfig = {
  async redirects() {
    return [
      {
        source: "/video",
        destination: "/",
        permanent: true,
      },
      {
        source: "/photo",
        destination: "/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
