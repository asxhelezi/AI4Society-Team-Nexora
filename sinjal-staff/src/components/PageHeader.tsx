import type { ReactNode } from 'react';
import { NotificationBell } from './notifications/NotificationBell';

interface Props {
  /** Optional back link/button rendered above the title (".page-crumb"). */
  crumb?: ReactNode;
  title: ReactNode;
  /** The context line under the title: plain text or a row of chips. */
  context?: ReactNode;
  contextClassName?: string;
  /** Page-specific actions, rendered to the left of the notification bell. */
  actions?: ReactNode;
}

/**
 * The fixed 96px band every page starts with: crumb, title, context line and
 * actions. The notification bell is always the last action.
 */
export function PageHeader({ crumb, title, context, contextClassName, actions }: Props) {
  const contextClass = 'page-context' + (contextClassName ? ' ' + contextClassName : '');
  return (
    <header className="page-header">
      <div className="page-header-main">
        {crumb}
        <h1 className="page-title">{title}</h1>
        {context !== undefined && (typeof context === 'string' || typeof context === 'number' ? <p className={contextClass}>{context}</p> : <div className={contextClass}>{context}</div>)}
      </div>
      <div className="page-actions">
        {actions ? <div className="page-actions-extra">{actions}</div> : null}
        <NotificationBell />
      </div>
    </header>
  );
}
