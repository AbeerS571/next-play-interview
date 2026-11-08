import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import BoardPage from './pages/BoardPage.jsx';

// Shared so StrictMode's double-run effect doesn't create two guest users
let guestSignIn = null;

async function ensureSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;

  if (!guestSignIn) {
    guestSignIn = supabase.auth.signInAnonymously().then(({ data, error }) => {
      if (error) {
        guestSignIn = null;
        throw error;
      }
      return data.session;
    });
  }
  return guestSignIn;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    ensureSession()
      .then((s) => !cancelled && setSession(s))
      .catch((e) => !cancelled && setError(e.message));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (newSession) setSession(newSession);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [attempt]);

  if (error) {
    return (
      <div className="auth-page">
        <div className="auth-box">
          <h1>Couldn't start</h1>
          <p className="auth-message">{error}</p>
          {/anonymous/i.test(error) && (
            <p className="splash-hint">
              Turn on anonymous sign-ins in Supabase: Authentication → Sign In / Providers.
            </p>
          )}
          <button className="btn-primary" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!session) return <p className="status">Setting up your board…</p>;

  return <BoardPage key={session.user.id} user={session.user} />;
}
