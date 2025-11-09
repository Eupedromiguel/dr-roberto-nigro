import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-slate-900"> {/* Fundo Global */}
      {/* Navbar comum a todas as páginas */}
      <Navbar />

      {/* Conteúdo central */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {children}
      </main>

      {/* Footer comum */}
      <Footer />
    </div>
  );
}
