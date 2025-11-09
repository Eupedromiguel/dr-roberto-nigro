export default function AuthCard({ title, children, footer }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white/90 backdrop-blur border border-slate-200 shadow-lg rounded-2xl p-6">
          <h1 className="text-xl font-semibold mb-4">{title}</h1>
          {children}
        </div>
        {footer && <div className="text-center text-sm text-slate-600 mt-3">{footer}</div>}
      </div>
    </div>
  );
}
