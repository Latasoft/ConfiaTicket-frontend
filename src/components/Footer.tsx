export default function Footer() {
  return (
    <footer className="border-t mt-10">
      <div className="max-w-6xl mx-auto px-4 py-6 text-sm text-gray-500">
        © {new Date().getFullYear()} Portal de Entradas
      </div>
    </footer>
  );
}
