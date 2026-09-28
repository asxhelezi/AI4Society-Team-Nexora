import { type CSSProperties, useState } from 'react';

interface Props {
  src: string | null | undefined;
  alt: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * A citizen or field-team photo. The photos were hosted blobs in the design
 * tool and are not part of the handoff, so a missing or unloadable image
 * renders a neutral placeholder of the same size instead of a broken image.
 */
export function Photo({ src, alt, className, style }: Props) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) return <img src={src} alt={alt} className={className} style={style} onError={() => setFailed(true)} />;
  return (
    <div role="img" aria-label={alt} className={className} style={{ ...style, background: '#EDEAE3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8A847C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    </div>
  );
}
