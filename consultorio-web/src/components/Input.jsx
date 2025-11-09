export default function Input({ label, ...props }) {
  return (
    <label className="block mb-3">
      {label && <span className="block mb-1 text-sm text-slate-700">{label}</span>}
      <input
        className="w-full rounded-lg border border-gray-400 bg-white px-3 py-2 text-sm outline-none
                   focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
        {...props}
      />
    </label>
  );
}
