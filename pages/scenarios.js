import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function Scenarios() {
  const router = useRouter();
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

      console.log('Fetched scenarios data:', data);
      console.log('Fetch error:', error);

      if (error) {
        setError(error.message);
        console.error(error);
      } else {
        setScenarios(data || []);
      }
      setLoading(false);
    };
    fetchData();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl mb-4">Choose a scenario</h1>
      {scenarios.length > 0 ? (
        <ul>
          {scenarios.map((s) => (
            <li key={s.id} className="mb-2">
              
              <Link href={`/scenario/${s.numeric_id || s.id}`} className="text-blue-600 underline">
                {/*
                  We use s.title || s.scenario_name here because:
                  - The database might have either 'title' or 'scenario_name' as the scenario name field.
                  - Our debugging showed that sometimes the fetched data has 'scenario_name' instead of 'title'.
                  - This ensures the scenario name is displayed regardless of which field is present.
                */}
                {s.title || s.scenario_name}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>No scenarios found.</p>
      )}
      <button onClick={handleLogout} className="mt-4 bg-red-500 text-white p-2 rounded">
        Logout
      </button>
    </div>
  );
}
