{/* 🧠 OUTPUT AREA */}
<div className="mt-6">
  {!topic ? (
    <div className="text-zinc-500 text-sm">
      Select a subject and topic to start learning.
    </div>
  ) : loading ? (
    <div className="text-zinc-400 text-sm">
      Generating explanation...
    </div>
  ) : explanation ? (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-3">{topic}</h2>
      <p className="text-zinc-300 whitespace-pre-line">
        {explanation}
      </p>
    </div>
  ) : (
    <div className="text-zinc-500 text-sm">
      Click "Explain" to generate content.
    </div>
  )}
</div>
