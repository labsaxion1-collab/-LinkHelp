// Medalhas por heroKey — compartilhadas entre ProgressCard e Tutorial.

import helperNovoMedal from '@/assets/hero/medals/helper/novo helper.png';
import helperInicianteMedal from '@/assets/hero/medals/helper/iniciante.png';
import helperProfissionalMedal from '@/assets/hero/medals/helper/profissional.png';
import helperEliteMedal from '@/assets/hero/medals/helper/elite.png';
import helperTopMedal from '@/assets/hero/medals/helper/top.png';
import helperLendaMedal from '@/assets/hero/medals/helper/lenda.png';

import clientNovoMedal from '@/assets/hero/medals/client/novo cliente.png';
import clientConfiavelMedal from '@/assets/hero/medals/client/confiavel.png';
import clientOuroMedal from '@/assets/hero/medals/client/ouro.png';
import clientVipMedal from '@/assets/hero/medals/client/vip.png';
import clientEliteMedal from '@/assets/hero/medals/client/elite.png';

export const MEDAL_MAP: Record<string, string> = {
  helper_novo: helperNovoMedal,
  helper_confiavel: helperInicianteMedal,
  helper_profissional: helperProfissionalMedal,
  helper_elite: helperEliteMedal,
  helper_top_helper: helperTopMedal,
  helper_lenda: helperLendaMedal,
  client_novo: clientNovoMedal,
  client_confiavel: clientConfiavelMedal,
  client_ouro: clientOuroMedal,
  client_vip: clientVipMedal,
  client_elite: clientEliteMedal,
};
