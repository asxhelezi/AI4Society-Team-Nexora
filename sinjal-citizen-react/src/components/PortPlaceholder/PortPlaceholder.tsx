import { Link } from 'react-router-dom';
import { ROUTES } from '../../lib/routes';
import './PortPlaceholder.css';

/**
 * Temporary body for pages that haven't been ported yet. Delete its usage (and, once no
 * page uses it, this component) when the page is ported.
 */
export function PortPlaceholder({ title, source, dark = false }: { title: string; source: string; dark?: boolean }) {
  return (
    <main className={`r-wrap port-placeholder${dark ? ' port-placeholder--dark' : ''}`}>
      <p className="port-placeholder__eyebrow">Në migrim · {source}</p>
      <h1 className="port-placeholder__title">{title}</h1>
      <p className="port-placeholder__text">
        Kjo faqe po kalon në React. <Link to={ROUTES.kreu}>Kreu</Link>
      </p>
    </main>
  );
}
