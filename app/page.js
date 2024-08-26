'use client';
import Spline from '@splinetool/react-spline/next';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  const handleClick = () => {
    // Redirect to the Home page
    router.push('/home');
  };

  return (
    <main
      onClick={handleClick}
      style={{
        backgroundImage: "url('/space_background_2.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        height: '100vh',
      }}
    >
      <Spline
        scene="https://prod.spline.design/JnBaj2Ifl50jESLg/scene.splinecode" 
      />
    </main>
  );
}

