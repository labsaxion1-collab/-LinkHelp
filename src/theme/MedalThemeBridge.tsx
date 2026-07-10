import { useMedalTheme } from '@/theme/useMedalTheme';

/**
 * Aplica o tema da medalha globalmente a partir do papel autenticado.
 * Montar dentro de `AuthProvider` (precisa de sessão/perfil).
 */
export function MedalThemeBridge() {
  useMedalTheme();
  return null;
}
