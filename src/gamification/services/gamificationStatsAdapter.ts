import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/supabase.database';
import type { DbApplicationStatus, RequestStatus } from '../../types/database';
import type { GamificationStats, UserType } from '../types/gamification';

export type GamificationDb = SupabaseClient<Database>;

type ConversationRef = {
  id: string;
  client_id: string;
  helper_id: string;
};

type MessageRef = {
  id: string;
  conversation_id: string;
  sender_id: string;
  created_at: string;
};

export const EMPTY_GAMIFICATION_STATS: GamificationStats = {
  totalCompleted: 0,
  avgRating: 0,
  responseRate: 0,
  cancelCount: 0,
  complaintCount: 0,
  profilePct: 0,
  applicationsCount: 0,
  publishedOrdersCount: 0,
  hireRate: 0,
};

function sortMessages(messages: MessageRef[]): MessageRef[] {
  return [...messages].sort((a, b) => {
    const timeDiff = a.created_at.localeCompare(b.created_at);
    if (timeDiff !== 0) return timeDiff;
    return a.id.localeCompare(b.id);
  });
}

function groupMessagesByConversation(messages: MessageRef[]): Map<string, MessageRef[]> {
  const grouped = new Map<string, MessageRef[]>();
  for (const message of messages) {
    const bucket = grouped.get(message.conversation_id) ?? [];
    bucket.push(message);
    grouped.set(message.conversation_id, bucket);
  }
  return grouped;
}

/**
 * Uma conversa conta como recebida quando o parceiro enviou a primeira mensagem.
 * Conta como respondida se o usuário enviou ao menos uma mensagem depois dessa primeira.
 */
export function evaluateConversationResponse(
  conversation: ConversationRef,
  messages: MessageRef[],
  userId: string,
  userType: UserType,
): { received: boolean; responded: boolean } {
  const peerId = userType === 'helper' ? conversation.client_id : conversation.helper_id;
  const sorted = sortMessages(messages);
  const firstPeerIdx = sorted.findIndex((message) => message.sender_id === peerId);

  if (firstPeerIdx === -1) {
    return { received: false, responded: false };
  }

  const responded = sorted.slice(firstPeerIdx + 1).some((message) => message.sender_id === userId);
  return { received: true, responded };
}

/**
 * Taxa de resposta MVP: conversas respondidas / conversas recebidas × 100.
 * Sem conversas recebidas → 0 (nunca 100).
 */
export function computeResponseRate(
  conversations: ConversationRef[],
  messages: MessageRef[],
  userId: string,
  userType: UserType,
): number {
  const messagesByConversation = groupMessagesByConversation(messages);
  let receivedCount = 0;
  let respondedCount = 0;

  for (const conversation of conversations) {
    const conversationMessages = messagesByConversation.get(conversation.id) ?? [];
    const result = evaluateConversationResponse(conversation, conversationMessages, userId, userType);
    if (!result.received) continue;
    receivedCount += 1;
    if (result.responded) respondedCount += 1;
  }

  if (receivedCount === 0) return 0;
  return Math.round((respondedCount / receivedCount) * 100);
}

async function fetchUserConversations(
  db: GamificationDb,
  userId: string,
  userType: UserType,
): Promise<ConversationRef[]> {
  const column = userType === 'helper' ? 'helper_id' : 'client_id';
  const { data, error } = await db
    .from('conversations')
    .select('id, client_id, helper_id')
    .eq(column, userId);

  if (error || !data) return [];
  return data;
}

async function fetchMessagesForConversations(
  db: GamificationDb,
  conversationIds: string[],
): Promise<MessageRef[]> {
  if (conversationIds.length === 0) return [];

  const { data, error } = await db
    .from('messages')
    .select('id, conversation_id, sender_id, created_at')
    .in('conversation_id', conversationIds);

  if (error || !data) return [];
  return data;
}

export async function calculateResponseRate(
  db: GamificationDb,
  userId: string,
  userType: UserType,
): Promise<number> {
  try {
    const conversations = await fetchUserConversations(db, userId, userType);
    if (conversations.length === 0) return 0;

    const messages = await fetchMessagesForConversations(
      db,
      conversations.map((conversation) => conversation.id),
    );

    return computeResponseRate(conversations, messages, userId, userType);
  } catch {
    return 0;
  }
}

type ComplaintRef = {
  reported_user_id: string;
  status: string;
};

/**
 * Conta reclamações confirmadas contra o usuário.
 * Somente status = 'confirmed' entra na gamificação.
 */
export function computeConfirmedComplaintCount(
  complaints: ComplaintRef[],
  userId: string,
): number {
  return complaints.filter(
    (complaint) => complaint.reported_user_id === userId && complaint.status === 'confirmed',
  ).length;
}

export async function calculateComplaintCount(db: GamificationDb, userId: string): Promise<number> {
  try {
    const { count, error } = await db
      .from('user_complaints')
      .select('id', { count: 'exact', head: true })
      .eq('reported_user_id', userId)
      .eq('status', 'confirmed');

    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function countHelperApplications(
  db: GamificationDb,
  helperId: string,
  statuses?: DbApplicationStatus[],
): Promise<number> {
  let query = db.from('applications').select('id', { count: 'exact', head: true }).eq('helper_id', helperId);
  if (statuses && statuses.length > 0) {
    query = query.in('status', statuses);
  }
  const { count, error } = await query;
  if (error) return 0;
  return count ?? 0;
}

async function countClientRequests(
  db: GamificationDb,
  clientId: string,
  statuses?: RequestStatus[],
): Promise<number> {
  let query = db.from('requests').select('id', { count: 'exact', head: true }).eq('client_id', clientId);
  if (statuses && statuses.length > 0) {
    query = query.in('status', statuses);
  }
  const { count, error } = await query;
  if (error) return 0;
  return count ?? 0;
}

async function fetchProfileBasics(
  db: GamificationDb,
  userId: string,
): Promise<{ avgRating: number; profilePct: number }> {
  const { data, error } = await db
    .from('profiles')
    .select('rating, avatar_url, name, phone, city, bio')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return { avgRating: 0, profilePct: 0 };

  // Completude simples do perfil (0–100) baseada em campos preenchidos.
  // Refinar depois com computeHelperProfileCompletion (foto + skills) quando
  // a fonte de skills (helper_skills) entrar no cálculo oficial.
  const checks = [
    Boolean(data.name?.trim()),
    Boolean(data.avatar_url?.trim()),
    Boolean(data.phone?.trim()),
    Boolean(data.city?.trim()),
    Boolean(data.bio?.trim()),
  ];
  const filled = checks.filter(Boolean).length;
  const profilePct = Math.round((filled / checks.length) * 100);

  return { avgRating: data.rating ?? 0, profilePct };
}

/**
 * Monta as stats do helper a partir das tabelas reais.
 *
 * Fontes conectadas:
 * - `profiles` → avg_rating (sincronizado por trigger de reviews) e completude do perfil
 * - `applications` → candidaturas, serviços concluídos, cancelamentos e taxa de contratação
 * - `conversations` + `messages` → responseRate (taxa de resposta no chat)
 * - `user_complaints` → complaintCount (somente status `confirmed`)
 */
export async function buildHelperGamificationStats(
  db: GamificationDb,
  userId: string,
): Promise<GamificationStats> {
  try {
    const [profile, applicationsCount, totalCompleted, cancelCount, hiredCount, responseRate, complaintCount] =
      await Promise.all([
        fetchProfileBasics(db, userId),
        countHelperApplications(db, userId),
        countHelperApplications(db, userId, ['completed']),
        countHelperApplications(db, userId, ['cancelled']),
        countHelperApplications(db, userId, ['accepted', 'completed']),
        calculateResponseRate(db, userId, 'helper'),
        calculateComplaintCount(db, userId),
      ]);

    const hireRate = applicationsCount > 0 ? Math.round((hiredCount / applicationsCount) * 100) : 0;

    return {
      ...EMPTY_GAMIFICATION_STATS,
      totalCompleted,
      avgRating: profile.avgRating,
      responseRate,
      cancelCount,
      complaintCount,
      profilePct: profile.profilePct,
      applicationsCount,
      hireRate,
    };
  } catch {
    return { ...EMPTY_GAMIFICATION_STATS };
  }
}

/**
 * Monta as stats do cliente a partir das tabelas reais.
 *
 * Fontes conectadas:
 * - `profiles` → avg_rating recebida (reviews) e completude do perfil
 * - `requests` → pedidos publicados, concluídos e cancelados
 * - `conversations` + `messages` → responseRate (comunicação com helpers)
 * - `user_complaints` → complaintCount (somente status `confirmed`)
 */
export async function buildClientGamificationStats(
  db: GamificationDb,
  userId: string,
): Promise<GamificationStats> {
  try {
    const [profile, publishedOrdersCount, totalCompleted, cancelCount, responseRate, complaintCount] =
      await Promise.all([
        fetchProfileBasics(db, userId),
        countClientRequests(db, userId),
        countClientRequests(db, userId, ['completed']),
        countClientRequests(db, userId, ['cancelled']),
        calculateResponseRate(db, userId, 'client'),
        calculateComplaintCount(db, userId),
      ]);

    return {
      ...EMPTY_GAMIFICATION_STATS,
      totalCompleted,
      avgRating: profile.avgRating,
      responseRate,
      cancelCount,
      complaintCount,
      profilePct: profile.profilePct,
      publishedOrdersCount,
    };
  } catch {
    return { ...EMPTY_GAMIFICATION_STATS };
  }
}
