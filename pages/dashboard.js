import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function Dashboard() {
  const router = useRouter();
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }
      const { data, error } = await supabase.from('scenarios').select('*');
      if (error) console.error(error);
      else setScenarios(data || []);
      setLoading(false);
    };
    fetchData();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl mb-4">Choose a scenario</h1>
      <ul>
        {scenarios.map((s) => (
          <li key={s.id} className="mb-2">
            <Link href={`/scenario/${s.id}`} className="text-blue-600 underline">
              {s.title}
            </Link>
          </li>
        ))}
      </ul>
      <button onClick={handleLogout} className="mt-4 bg-red-500 text-white p-2 rounded">
        Logout
      </button>
    </div>
  );
}
