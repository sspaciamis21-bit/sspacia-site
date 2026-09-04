import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SSPACIA Coworking Ahmedabad',
    short_name: 'SSPACIA',
    description: 'Top Coworking Spaces, Private Cabins & Shared Offices in Ahmedabad',
    start_url: '/',
    display: 'standalone',
    background_color: '#FBF9F8',
    theme_color: '#1ab0bc',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: '/SspaciaLogo.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
