import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/home');
      } else {
        router.replace('/login');
      }
    });
  }, [router]);

  return null;
}
