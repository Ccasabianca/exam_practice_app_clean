// fix : année calculée, elle était en dur
export default function Footer() {
  return (
    <footer className="app-footer">
      <p>&copy; {new Date().getFullYear()} Application Mes Tâches</p>
    </footer>
  );
}
