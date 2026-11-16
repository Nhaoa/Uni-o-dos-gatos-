import React, { useState } from 'react';
import { signInWithPopup, signOut, User } from 'firebase/auth';
import {
  auth,
  captureGoogleCredentialToken,
  clearDriveAccessToken,
  googleAuthProvider,
} from '../lib/firebase';
import { PlayerRole, SharedState } from '../types/game';
import { DEFAULT_ROOM_ID } from '../hooks/useGameSocket';
import {
  enterRoomStatic,
  isStaticHostingMode,
  markBackendUnavailable,
} from '../lib/staticRoomService';

interface LoginModalProps {
  open: boolean;
  hasRoomPassword: boolean;
  firebaseUser: User | null;
  idToken: string | null;
  authReady: boolean;
  linkedRole: PlayerRole | null;
  onLoginSuccess: (
    role: PlayerRole,
    nickname: string,
    hydratedState: SharedState,
    hasPassword: boolean,
    recovered: boolean
  ) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  open,
  hasRoomPassword,
  firebaseUser,
  idToken,
  authReady,
  linkedRole,
  onLoginSuccess,
}) => {
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      captureGoogleCredentialToken(result);
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setError('Login com Google cancelado.');
      } else if (code === 'auth/unauthorized-domain') {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'seu-dominio.github.io';
        setError(
          `Domínio "${host}" ainda não autorizado no Firebase Auth. Adicione-o em Firebase Console → Authentication → Settings → Authorized domains.`
        );
      } else {
        setError('Não foi possível conectar sua conta Google. Tente novamente.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleSignOut = async () => {
    setError('');
    clearDriveAccessToken();
    await signOut(auth);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!firebaseUser || !idToken) {
      setError('Conecte sua conta Google primeiro para entrar.');
      return;
    }

    const cleanNick = nickname.trim();
    if (!cleanNick) {
      setError('Digite seu último nick usado no jardim.');
      return;
    }

    if (hasRoomPassword && !password.trim()) {
      setError('Digite a senha da sala para entrar.');
      return;
    }

    setSubmitting(true);
    try {
      if (isStaticHostingMode()) {
        const res = await enterRoomStatic({
          roomId: DEFAULT_ROOM_ID,
          nickname: cleanNick,
          password: password.trim(),
          firebaseUser,
        });
        if (!res.ok) {
          setError(res.error);
          return;
        }
        onLoginSuccess(res.role, cleanNick, res.state, res.hasPassword, res.recovered);
        return;
      }

      const res = await fetch('/api/room/enter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          roomId: DEFAULT_ROOM_ID,
          nickname: cleanNick,
          password: password.trim(),
        }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.status === 404 || !contentType.includes('application/json')) {
        markBackendUnavailable();
        const fallback = await enterRoomStatic({
          roomId: DEFAULT_ROOM_ID,
          nickname: cleanNick,
          password: password.trim(),
          firebaseUser,
        });
        if (!fallback.ok) {
          setError(fallback.error);
          return;
        }
        onLoginSuccess(
          fallback.role,
          cleanNick,
          fallback.state,
          fallback.hasPassword,
          fallback.recovered
        );
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Não foi possível verificar suas credenciais.');
        return;
      }
      onLoginSuccess(
        data.role,
        cleanNick,
        data.state,
        Boolean(data.hasPassword),
        Boolean(data.recovered)
      );
    } catch {
      markBackendUnavailable();
      try {
        const fallback = await enterRoomStatic({
          roomId: DEFAULT_ROOM_ID,
          nickname: cleanNick,
          password: password.trim(),
          firebaseUser,
        });
        if (!fallback.ok) {
          setError(fallback.error);
          return;
        }
        onLoginSuccess(
          fallback.role,
          cleanNick,
          fallback.state,
          fallback.hasPassword,
          fallback.recovered
        );
      } catch {
        setError('Erro de conexão ao tentar entrar na sala.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center p-3 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-title"
    >
      <form
        onSubmit={handleSubmit}
        className="bg-[#fff8ed] max-w-md w-full p-5 sm:p-6 rounded-3xl sketch-border space-y-4 text-center border-t-8 border-t-red-700 my-auto"
      >
        <div className="space-y-1">
          <span className="text-3xl block" aria-hidden="true">☭🔐</span>
          <h2 id="login-title" className="font-display text-3xl font-bold text-red-900">
            Credencial do Comitê Central
          </h2>
          <p className="text-xs text-[#2b1111]/80">
            Conecte sua conta Google e confirme seu último nick e senha da sala.
          </p>
        </div>

        {/* Google Account Auth Bar */}
        <div className="bg-white p-3.5 rounded-2xl border-2 border-[#2b1111]/25 space-y-2 text-left">
          {!authReady ? (
            <span className="text-xs font-semibold text-[#2b1111]/70 block">Verificando sessão...</span>
          ) : firebaseUser ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-emerald-800">
                    {linkedRole
                      ? 'Conta Google vinculada ao seu perfil ✓'
                      : 'Conta Google conectada ✓'}
                  </p>
                  <p className="text-xs font-semibold text-[#2b1111] truncate">
                    {firebaseUser.email || firebaseUser.displayName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGoogleSignOut}
                  className="shrink-0 text-[11px] font-bold px-2.5 py-1.5 rounded-xl border border-[#2b1111] bg-amber-100 hover:bg-amber-200 text-red-950 cursor-pointer"
                >
                  Trocar conta
                </button>
              </div>
              {!linkedRole && (
                <p className="text-[11px] text-amber-950 bg-amber-50 border border-amber-300 rounded-xl p-2 leading-snug">
                  Primeira entrada com Google? Digite exatamente o seu último nick usado anteriormente e a senha da sala para vincular e recuperar todos os seus dados.
                </p>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="sketch-btn w-full bg-white hover:bg-amber-50 text-[#2b1111] font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.5 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.6H12z" />
              </svg>
              <span>{googleLoading ? 'Conectando...' : 'Entrar com Google'}</span>
            </button>
          )}
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-[#2b1111]/30 text-left space-y-3">
          <div>
            <label htmlFor="login-nick" className="text-xs font-bold text-[#2b1111]/85 block mb-1">
              Seu Último Nick
            </label>
            <input
              id="login-nick"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Digite exatamente o último nick da sua conta..."
              maxLength={18}
              autoComplete="username"
              className="w-full text-sm px-3 py-2 rounded-xl border border-[#2b1111] bg-[#fff8ed] focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          <div>
            <label htmlFor="login-pass" className="text-xs font-bold text-red-950 block mb-1">
              {hasRoomPassword ? 'Senha da Sala' : 'Definir Senha da Sala (mín. 4 caracteres)'}
            </label>
            <input
              id="login-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={
                hasRoomPassword
                  ? 'Digite a senha associada à sala...'
                  : 'Defina uma senha ou deixe em branco'
              }
              maxLength={32}
              autoComplete="current-password"
              className="w-full text-sm px-3 py-2 rounded-xl border border-[#2b1111] bg-[#fff8ed] font-mono-num focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>
          {error && <p className="text-xs font-bold text-red-700">{error}</p>}
        </div>

        <button
          type="submit"
          disabled={submitting || !firebaseUser || !idToken}
          data-start="true"
          className="sketch-btn w-full bg-red-700 hover:bg-red-800 text-amber-200 font-bold text-sm py-3 rounded-2xl cursor-pointer disabled:opacity-50"
        >
          {submitting ? 'Verificando Credenciais...' : 'Ingressar na União Felina ☭'}
        </button>
      </form>
    </div>
  );
};
