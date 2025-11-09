export default function Button({ children, className = "", ...props }) {
  return (
    <button
      className={
        "w-full rounded-full bg-slate-700 bg-slate-700 text-white text-sm font-medium py-3 hover:bg-yellow-400 " +
        "disabled:opacity-50 " + className
      }
      {...props}
    >
      {children}
    </button>
  );
}
