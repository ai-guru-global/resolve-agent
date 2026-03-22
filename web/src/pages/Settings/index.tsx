export default function Settings() {
  return (
    <div className="space-y-6 max-w-3xl">
      <h2 className="text-xl font-semibold">Settings</h2>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h3 className="font-medium">Platform Configuration</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Server Address</label>
            <input
              type="text"
              defaultValue="localhost:8080"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Agent Runtime</label>
            <input
              type="text"
              defaultValue="localhost:9091"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
              readOnly
            />
          </div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h3 className="font-medium">Model Providers</h3>
        <p className="text-gray-500 text-sm">Configure LLM providers (Qwen, Wenxin, Zhipu).</p>
      </div>
    </div>
  );
}
