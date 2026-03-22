import { useParams } from 'react-router-dom';

export default function WorkflowExecution() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Workflow Execution: {id}</h2>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <p className="text-gray-500 text-sm">
          Live execution monitoring with tree node highlighting.
        </p>
      </div>
    </div>
  );
}
