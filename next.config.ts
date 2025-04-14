import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.pixabay.com", // Pixabay CDN
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com", // Cloudinary
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.imgix.net", // Imgix (wildcard)
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com", // Google content (wildcard)
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.githubusercontent.com", // GitHub raw content (wildcard)
        port: "",
        pathname: "/**",
      },
      // Add more patterns as needed
    ],
  },
};

export default nextConfig;
