import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function ScenarioPage() {
  const router = useRouter();
  const { id } = router.query;
  const [scenario, setScenario] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!id) return;
    const fetchScenario = async () => {
      const { data } = await supabase.from('scenarios').select('*').eq('id', id).single();
      setScenario(data);
    };
    const fetchProgress = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from('progress')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('scenario_id', id)
        .single();
      if (data) setProgress(data.percent);
    };
    fetchScenario();
    fetchProgress();
  }, [id]);

  const handleIncrement = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const newPercent = Math.min(progress + 10, 100);
    setProgress(newPercent);
    await supabase.from('progress').upsert({
      user_id: session.user.id,
      scenario_id: id,
      percent: newPercent,
    });
  };

  if (!scenario) return <p>Loading...</p>;

  return (
    <div className="max-w-xl mx-auto p-4">
      <Link href="/dashboard" className="text-blue-600 underline">← Back</Link>
      <h1 className="text-2xl mb-2">{scenario.title}</h1>
      <p className="mb-4">{scenario.description}</p>
      <div className="mb-4">
        <div className="h-4 w-full bg-gray-200 rounded">
          <div
            className="h-4 bg-green-500 rounded"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="text-sm mt-2">Progress: {progress}%</p>
      </div>
      <button onClick={handleIncrement} className="bg-blue-500 text-white p-2 rounded">
        Practice (+10%)
      </button>
    </div>
  );
}
