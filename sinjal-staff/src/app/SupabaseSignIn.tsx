import { useState, type FormEvent } from 'react';
import { login } from '../api/staff';

const FIELD = {
  display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '6px', padding: '10px 12px',
  border: '1px solid #E4DFD6', borderRadius: '8px', background: '#FBFAF8',
  fontFamily: "'Barlow',sans-serif", fontSize: '15px', color: '#1B1917',
} as const;
const LABEL = { display: 'block', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600, color: '#1B1917' } as const;

/** Staff sign-in with Supabase Auth, shown when the app reads its tables from Supabase. */
export function SupabaseSignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email.trim(), password);
      onSignedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hyrja nuk u krye. Ju lutemi provoni përsëri.');
      setPassword('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#F5F2ED', padding: '16px' }}>
      <form onSubmit={submit} style={{ width: '100%', maxWidth: '360px', background: '#FBFAF8', border: '1px solid #E4DFD6', borderRadius: '12px', padding: '28px' }}>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: '32px', textTransform: 'uppercase', color: '#1B1917' }}>Sinjal</div>
        <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: '#6B665F', marginBottom: '24px' }}>Paneli i Nëpunësit</div>
        <label style={LABEL}>
          Email
          <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} style={FIELD} />
        </label>
        <label style={{ ...LABEL, marginTop: '16px' }}>
          Fjalëkalimi
          <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} style={FIELD} />
        </label>
        {error ? <div role="alert" style={{ marginTop: '14px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: '#C23B31' }}>{error}</div> : null}
        <button type="submit" disabled={busy} className="tap" style={{
          marginTop: '22px', width: '100%', padding: '11px', border: 0, borderRadius: '8px', background: '#1B1917', color: '#F5F2ED',
          fontFamily: "'Barlow',sans-serif", fontSize: '15px', fontWeight: 600, cursor: busy ? 'wait' : 'pointer',
        }}>
          {busy ? 'Po verifikohet' : 'Hyr'}
        </button>
      </form>
    </main>
  );
}
