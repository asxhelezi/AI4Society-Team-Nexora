import type { AnchorHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import { toPath } from '../lib/routes';

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { href?: string | null };

/**
 * An in-app link that accepts the design's page names ("Raporti.dc.html")
 * or app paths. The onClick runs before navigation, which is how screens
 * hand state to the next page (see lib/storage.ts).
 */
export function DcLink({ href, children, ...rest }: Props) {
  const to = toPath(href);
  if (!to) return <a {...rest}>{children}</a>;
  return (
    <Link to={to} {...rest}>
      {children}
    </Link>
  );
}
