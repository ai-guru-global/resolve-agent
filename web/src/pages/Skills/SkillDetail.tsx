import { useParams } from 'react-router-dom';

export default function SkillDetail() {
  const { name } = useParams<{ name: string }>();

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Skill: {name}</h2>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <p className="text-gray-500 text-sm">Skill details will be displayed here.</p>
      </div>
    </div>
  );
}
