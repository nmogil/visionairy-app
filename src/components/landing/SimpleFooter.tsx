import { Link } from "react-router-dom";

export const SimpleFooter = () => {
  return (
    <footer className="border-t">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground md:flex-row">
        <p>© {new Date().getFullYear()} Mogil Ventures, LLC</p>
        <nav className="flex items-center gap-4">
          <a href="#" className="hover:underline">Privacy</a>
          <Link to="/terms" className="hover:underline">Terms</Link>
          <a href="#" className="hover:underline">Contact</a>
        </nav>
      </div>
    </footer>
  );
};

export default SimpleFooter;
