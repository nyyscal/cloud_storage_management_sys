import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript:{
    ignoreBuildErrors:true
  },
  eslint:{
    ignoreDuringBuilds:true,
  },
  experimental:{
    serverActions:{
      bodySizeLimit: "100MB",
    },
  },
  images: {
    //domains: ['img.freepik.com'], // Add allowed domains here
    remotePatterns:[
      {
        protocol: "https",
        hostname:"img.freepik.com"
      },{
        protocol: "https",
        hostname:"cloud.appwrite.io"
      },
    ]
  },
  /* other config options here */
};

export default nextConfig;