import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <div className="state state-empty">
      <p className="state-title">Page introuvable</p>
      <Link to="/" className="btn btn-secondary">
        Retour au tableau de bord
      </Link>
    </div>
  );
}
