import type { ReactNode, Ref } from 'react';
import './PageFrame.css';

interface PageFrameProps {
  /**
   * `flow` (Kreu, Bulletini, case pages): the page grows with its content.
   * `fill` (Raporto, Harta, Raportet e mia): at least one viewport tall, flex column, so
   * the main area can take `flex: 1` and push the footer to the bottom.
   */
  layout?: 'flow' | 'fill';
  /** Page root class, e.g. "kreu". Scope all page CSS under it. */
  className?: string;
  /** Ref to the inner page element (e.g. for useReveal). */
  innerRef?: Ref<HTMLDivElement>;
  children: ReactNode;
}

/**
 * The two wrappers every static page had: .sinjal-screen (full-height paper background)
 * and .r-page (the page column). Put <SiteHeader>, the page sections and <SiteFooter>
 * inside.
 */
export function PageFrame({ layout = 'flow', className, innerRef, children }: PageFrameProps) {
  return (
    <div className={className ? `sinjal-screen page-screen ${className}` : 'sinjal-screen page-screen'}>
      <div ref={innerRef} className={`r-page page-body page-body--${layout}`}>
        {children}
      </div>
    </div>
  );
}
