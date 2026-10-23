import { Firestore } from '@google-cloud/firestore';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Google Cloud Firestore Persistence Layer for Sami Full-Stack Application
 * Targeting project: majestic-interface-ksmzh
 * Database ID: ai-studio-c1d1b606-9578-42a6-b7b2-17faaec47f72
 */

export const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID || 'majestic-interface-ksmzh';
export const databaseId = process.env.FIRESTORE_DATABASE_ID || 'ai-studio-c1d1b606-9578-42a6-b7b2-17faaec47f72';

// 1. Initialize Google Cloud Firestore Server Client
let firestoreClient: Firestore | null = null;
let firestoreInitError: string | null = null;

try {
  const options: Record<string, unknown> = {
    projectId,
    databaseId: databaseId === '(default)' ? undefined : databaseId,
  };

  // Support for Service Account Key passed via environment variable (JSON or base64 JSON)
  if (process.env.GCP_SERVICE_ACCOUNT_KEY) {
    try {
      const raw = process.env.GCP_SERVICE_ACCOUNT_KEY.trim();
      const jsonStr = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
      const credentials = JSON.parse(jsonStr);
      options.credentials = credentials;
      console.log('[Sami DB] Using Service Account credentials from GCP_SERVICE_ACCOUNT_KEY');
    } catch (e: any) {
      console.warn('[Sami DB] Failed to parse GCP_SERVICE_ACCOUNT_KEY:', e.message);
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    console.log('[Sami DB] Using credentials from GOOGLE_APPLICATION_CREDENTIALS file');
  }

  firestoreClient = new Firestore(options as any);
  console.log(`[Sami DB] Google Cloud Firestore client initialized for project: ${projectId}, database: ${databaseId}`);
} catch (err: any) {
  firestoreInitError = err?.message || String(err);
  console.error('[Sami DB] Error initializing Firestore client:', firestoreInitError);
}

export { firestoreClient };

// Persistent local disk store file for data survival across container restarts if cloud ADC is pending
const DATA_DIR = path.resolve('data');
const LOCAL_STORE_FILE = path.join(DATA_DIR, 'persistent_store.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface LocalDiskStore {
  users: Record<string, any>;
  channels: Record<string, any>;
  channelMessages: Record<string, any[]>;
  privateMessages: Record<string, any[]>;
  challenges: Record<string, any>;
  trades: Record<string, any[]>;
  appUpdates?: Record<string, any>;
  fcmTokens?: Record<string, any>;
  fcmOutbox?: any[];
}

function loadLocalDiskStore(): LocalDiskStore {
  try {
    if (fs.existsSync(LOCAL_STORE_FILE)) {
      const content = fs.readFileSync(LOCAL_STORE_FILE, 'utf8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.warn('[Sami DB] Notice reading persistent store file, initializing clean store');
  }
  return {
    users: {},
    channels: {},
    channelMessages: {},
    privateMessages: {},
    challenges: {},
    trades: {},
  };
}

function saveLocalDiskStore(store: LocalDiskStore): void {
  try {
    fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch (e) {
    console.error('[Sami DB] Error persisting store to disk:', e);
  }
}

const diskStore = loadLocalDiskStore();

// Dynamic secure PBKDF2 Password Hashing with per-user salt
export function hashPasswordWithSalt(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha512').toString('hex');
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function verifyUserPassword(password: string, hash: string, salt: string): boolean {
  try {
    const calculated = hashPasswordWithSalt(password, salt);
    return crypto.timingSafeEqual(Buffer.from(calculated, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}

// ============================================================================
// FIRESTORE TEST & VERIFICATION
// ============================================================================

export async function testFirestoreConnection(): Promise<{
  connected: boolean;
  projectId: string;
  databaseId: string;
  error?: string;
  errorType?: 'PERMISSION_DENIED' | 'NOT_FOUND' | 'UNAVAILABLE' | 'QUOTA_EXCEEDED' | 'OTHER';
}> {
  if (!firestoreClient) {
    return {
      connected: false,
      projectId,
      databaseId,
      error: firestoreInitError || 'Firestore client was not initialized',
      errorType: 'UNAVAILABLE',
    };
  }

  try {
    // Attempt a live read from health ping collection
    const pingRef = firestoreClient.collection('_system_health').doc('ping');
    await pingRef.get();
    return {
      connected: true,
      projectId,
      databaseId,
    };
  } catch (err: any) {
    const msg = err?.message || String(err);
    let errorType: 'PERMISSION_DENIED' | 'NOT_FOUND' | 'UNAVAILABLE' | 'QUOTA_EXCEEDED' | 'OTHER' = 'OTHER';

    if (msg.includes('PERMISSION_DENIED') || msg.includes('7 PERMISSION_DENIED')) {
      errorType = 'PERMISSION_DENIED';
    } else if (msg.includes('NOT_FOUND') || msg.includes('5 NOT_FOUND')) {
      errorType = 'NOT_FOUND';
    } else if (msg.includes('Quota') || msg.includes('8 RESOURCE_EXHAUSTED')) {
      errorType = 'QUOTA_EXCEEDED';
    } else if (msg.includes('UNAVAILABLE') || msg.includes('14 UNAVAILABLE')) {
      errorType = 'UNAVAILABLE';
    }

    return {
      connected: false,
      projectId,
      databaseId,
      error: msg,
      errorType,
    };
  }
}

// ============================================================================
// USER PERSISTENCE (FIRESTORE PRIMARY WITH LOCAL DISK SURVIVAL)
// ============================================================================

export interface UserRecord {
  id: number;
  username: string;
  displayName: string;
  passwordHash: string;
  salt: string;
  role: 'owner' | 'moderator' | 'user' | 'guest';
  avatarUrl?: string | null;
  warningsCount?: number;
  createdAt: number;
  updatedAt: number;
}

export async function getUserById(userId: number): Promise<UserRecord | null> {
  // 1. Try Google Cloud Firestore
  if (firestoreClient) {
    try {
      const snap = await firestoreClient.collection('users').doc(String(userId)).get();
      if (snap.exists) {
        return snap.data() as UserRecord;
      }
    } catch (err: any) {
      console.warn(`[Sami DB] Firestore read notice for user ${userId}:`, err.message);
    }
  }

  // 2. Persistent disk fallback
  return diskStore.users[String(userId)] || null;
}

export async function getUserByUsername(username: string): Promise<UserRecord | null> {
  const clean = username.trim().toLowerCase();

  // 1. Try Google Cloud Firestore
  if (firestoreClient) {
    try {
      const snap = await firestoreClient
        .collection('users')
        .where('usernameLower', '==', clean)
        .limit(1)
        .get();

      if (!snap.empty) {
        return snap.docs[0].data() as UserRecord;
      }
    } catch (err: any) {
      console.warn(`[Sami DB] Firestore read notice for username ${username}:`, err.message);
    }
  }

  // 2. Persistent disk fallback
  for (const u of Object.values(diskStore.users)) {
    if (u.username && u.username.toLowerCase() === clean) {
      return u as UserRecord;
    }
  }

  return null;
}

export async function getUsersCount(): Promise<number> {
  if (firestoreClient) {
    try {
      const snap = await firestoreClient.collection('users').count().get();
      return snap.data().count;
    } catch {
      // Ignore and fallback
    }
  }
  return Object.keys(diskStore.users).length;
}

export async function createUserRecord(user: {
  username: string;
  displayName: string;
  password: string;
  role?: 'owner' | 'moderator' | 'user' | 'guest';
  avatarUrl?: string | null;
}): Promise<UserRecord> {
  const cleanUser = user.username.trim();
  const isSami = cleanUser.toLowerCase() === 'sami';
  const role: 'owner' | 'moderator' | 'user' | 'guest' = user.role || (isSami ? 'owner' : 'user');
  const existingIds = Object.keys(diskStore.users).map(Number).filter((n) => !isNaN(n));
  const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 1;
  const nextId = isSami ? 1 : Math.max(2, maxId + 1);
  const salt = generateSalt();
  const passwordHash = hashPasswordWithSalt(user.password, salt);
  const now = Date.now();

  const record: UserRecord = {
    id: nextId,
    username: cleanUser,
    displayName: user.displayName.trim() || cleanUser,
    passwordHash,
    salt,
    role,
    avatarUrl: user.avatarUrl || null,
    warningsCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  // 1. Try Google Cloud Firestore
  if (firestoreClient) {
    try {
      await firestoreClient.collection('users').doc(String(record.id)).set({
        ...record,
        usernameLower: record.username.toLowerCase(),
      });
      console.log(`[Sami DB] User ${record.username} (ID: ${record.id}) saved to Firestore.`);
    } catch (err: any) {
      console.warn(`[Sami DB] Firestore write notice for user ${record.id}:`, err.message);
    }
  }

  // 2. Save to persistent disk store
  diskStore.users[String(record.id)] = record;
  saveLocalDiskStore(diskStore);

  return record;
}

export async function getAllUsersList(): Promise<Omit<UserRecord, 'passwordHash' | 'salt'>[]> {
  const results: Record<string, Omit<UserRecord, 'passwordHash' | 'salt'>> = {};

  if (firestoreClient) {
    try {
      const snap = await firestoreClient.collection('users').get();
      snap.forEach((doc) => {
        const d = doc.data();
        results[doc.id] = {
          id: d.id,
          username: d.username,
          displayName: d.displayName,
          role: d.role,
          avatarUrl: d.avatarUrl,
          warningsCount: d.warningsCount,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        };
      });
    } catch (err: any) {
      console.warn('[Sami DB] Firestore getUsers notice:', err.message);
    }
  }

  for (const [id, d] of Object.entries(diskStore.users)) {
    if (!results[id]) {
      results[id] = {
        id: d.id,
        username: d.username,
        displayName: d.displayName,
        role: d.role,
        avatarUrl: d.avatarUrl,
        warningsCount: d.warningsCount,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      };
    }
  }

  return Object.values(results);
}

// ============================================================================
// CHANNELS PERSISTENCE
// ============================================================================

export interface ChannelRecord {
  id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  visibility: 'public' | 'hidden';
  allowedMemberIds: number[];
  memberIds: number[];
  createdAt: number;
}

export const INITIAL_CHANNELS_CONFIG: ChannelRecord[] = [
  {
    id: 'general_trading',
    name: '💬 دردشة عامة - دفعة 3000$',
    description: 'القناة العامة لتبادل الأفكار والنقاشات بين جميع المشتركين.',
    isPrivate: false,
    visibility: 'public',
    allowedMemberIds: [],
    memberIds: [1],
    createdAt: 1735689600000,
  },
  {
    id: 'signals_vip',
    name: '👑 قناة Sami VIP الخاصة',
    description: 'قناة التوصيات والصفقات المتقدمة الخاصة بالأعضاء المصرح لهم فقط.',
    isPrivate: true,
    visibility: 'hidden',
    allowedMemberIds: [1],
    memberIds: [1],
    createdAt: 1735689600000,
  },
];

// Seed initial channels to persistent disk if missing
for (const c of INITIAL_CHANNELS_CONFIG) {
  if (!diskStore.channels[c.id]) {
    diskStore.channels[c.id] = c;
  }
}
saveLocalDiskStore(diskStore);

export async function getChannelsForUser(userId: number, role: string): Promise<ChannelRecord[]> {
  const channelMap: Record<string, ChannelRecord> = {};

  if (firestoreClient) {
    try {
      const snap = await firestoreClient.collection('channels').get();
      snap.forEach((doc) => {
        channelMap[doc.id] = doc.data() as ChannelRecord;
      });
    } catch (err: any) {
      console.warn('[Sami DB] Firestore channels read notice:', err.message);
    }
  }

  // Merge with disk store
  for (const [id, c] of Object.entries(diskStore.channels)) {
    if (!channelMap[id]) {
      channelMap[id] = c;
    }
  }

  // Filter based on Zero-Trust RBAC permissions
  return Object.values(channelMap).filter((channel) => {
    // Owner sees all channels
    if (role === 'owner') return true;

    // Hidden channels are strictly invisible to unauthorized users
    if (channel.visibility === 'hidden') {
      return channel.allowedMemberIds?.includes(userId) || channel.memberIds?.includes(userId);
    }

    // Private channels require explicit membership
    if (channel.isPrivate) {
      return channel.allowedMemberIds?.includes(userId) || channel.memberIds?.includes(userId);
    }

    // Public channels visible to all
    return true;
  });
}

export async function getChannelById(channelId: string): Promise<ChannelRecord | null> {
  if (firestoreClient) {
    try {
      const doc = await firestoreClient.collection('channels').doc(channelId).get();
      if (doc.exists) {
        return doc.data() as ChannelRecord;
      }
    } catch {}
  }
  return diskStore.channels[channelId] || null;
}

// ============================================================================
// MESSAGES PERSISTENCE
// ============================================================================

export interface ChannelMessage {
  id: string;
  channelId: string;
  senderId: number;
  senderName: string;
  senderRole: string;
  senderAvatarUrl?: string | null;
  text?: string;
  imageUrl?: string;
  storagePath?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  fileUrl?: string;
  audioUrl?: string;
  audioDuration?: number;
  replyToId?: string | null;
  replyToText?: string | null;
  replyToSenderName?: string | null;
  isDeleted?: boolean;
  timestamp: number;
}

export async function getChannelMessages(channelId: string, limitCount = 80): Promise<ChannelMessage[]> {
  if (firestoreClient) {
    try {
      const snap = await firestoreClient
        .collection('channels')
        .doc(channelId)
        .collection('messages')
        .orderBy('timestamp', 'asc')
        .limitToLast(limitCount)
        .get();

      if (!snap.empty) {
        return snap.docs.map((d) => d.data() as ChannelMessage);
      }
    } catch (err: any) {
      console.warn(`[Sami DB] Firestore messages read notice for ${channelId}:`, err.message);
    }
  }

  // Fallback to persistent disk store
  const list = diskStore.channelMessages[channelId] || [];
  return list.slice(-limitCount);
}

export async function saveChannelMessage(message: ChannelMessage): Promise<void> {
  if (firestoreClient) {
    try {
      await firestoreClient
        .collection('channels')
        .doc(message.channelId)
        .collection('messages')
        .doc(message.id)
        .set(message);
    } catch (err: any) {
      console.warn('[Sami DB] Firestore message write notice:', err.message);
    }
  }

  if (!diskStore.channelMessages[message.channelId]) {
    diskStore.channelMessages[message.channelId] = [];
  }
  diskStore.channelMessages[message.channelId].push(message);
  saveLocalDiskStore(diskStore);
}

// ============================================================================
// CHALLENGE & TRADES PERSISTENCE (150 MILESTONES)
// ============================================================================

export interface ChallengeRecord {
  id: string;
  userId: number;
  userName: string;
  initialCapitalCents: number;
  currentBalanceCents: number;
  targetBalanceCents: number;
  tradeCount: number;
  challengeStarted: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface TradeRecord {
  id: string;
  challengeId: string;
  userId: number;
  tradeNumber: number;
  resultCents: number;
  oldBalanceCents: number;
  newBalanceCents: number;
  type: 'WIN' | 'LOSS';
  attachmentPath?: string | null;
  timestamp: number;
}

export async function getUserChallenge(userId: number, userName = ''): Promise<ChallengeRecord> {
  const challengeId = `challenge_${userId}`;

  if (firestoreClient) {
    try {
      const doc = await firestoreClient.collection('challenges').doc(challengeId).get();
      if (doc.exists) {
        return doc.data() as ChallengeRecord;
      }
    } catch {}
  }

  if (diskStore.challenges[String(userId)]) {
    return diskStore.challenges[String(userId)];
  }

  const defaultChallenge: ChallengeRecord = {
    id: challengeId,
    userId,
    userName: userName || `متداول #${userId}`,
    initialCapitalCents: 10000, // $100.00
    currentBalanceCents: 10000,
    targetBalanceCents: 300000, // $3,000.00
    tradeCount: 0,
    challengeStarted: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await saveUserChallenge(defaultChallenge);
  return defaultChallenge;
}

export async function saveUserChallenge(challenge: ChallengeRecord): Promise<void> {
  challenge.updatedAt = Date.now();

  if (firestoreClient) {
    try {
      await firestoreClient.collection('challenges').doc(challenge.id).set(challenge);
    } catch (err: any) {
      console.warn('[Sami DB] Firestore challenge save notice:', err.message);
    }
  }

  diskStore.challenges[String(challenge.userId)] = challenge;
  saveLocalDiskStore(diskStore);
}

export async function getUserTrades(userId: number): Promise<TradeRecord[]> {
  if (firestoreClient) {
    try {
      const snap = await firestoreClient
        .collection('challenges')
        .doc(`challenge_${userId}`)
        .collection('trades')
        .orderBy('tradeNumber', 'asc')
        .get();

      if (!snap.empty) {
        return snap.docs.map((d) => d.data() as TradeRecord);
      }
    } catch {}
  }

  return diskStore.trades[String(userId)] || [];
}

export async function addTradeRecord(userId: number, trade: TradeRecord, updatedChallenge: ChallengeRecord): Promise<void> {
  if (firestoreClient) {
    try {
      const batch = firestoreClient.batch();
      const chalRef = firestoreClient.collection('challenges').doc(updatedChallenge.id);
      const tradeRef = chalRef.collection('trades').doc(trade.id);

      batch.set(chalRef, updatedChallenge);
      batch.set(tradeRef, trade);
      await batch.commit();
    } catch (err: any) {
      console.warn('[Sami DB] Firestore addTrade notice:', err.message);
    }
  }

  if (!diskStore.trades[String(userId)]) {
    diskStore.trades[String(userId)] = [];
  }
  diskStore.trades[String(userId)].push(trade);
  diskStore.challenges[String(userId)] = updatedChallenge;
  saveLocalDiskStore(diskStore);
}

// ============================================================================
// PRIVATE MESSAGES PERSISTENCE
// ============================================================================

export interface PrivateMessageRecord {
  id: string;
  senderId: number;
  receiverId: number;
  senderName: string;
  senderRole: string;
  text?: string;
  imageUrl?: string;
  storagePath?: string;
  audioUrl?: string;
  fileUrl?: string;
  fileName?: string;
  timestamp: number;
}

export async function getPrivateMessagesList(userId1: number, userId2: number, limitCount = 80): Promise<PrivateMessageRecord[]> {
  const pairKey = [userId1, userId2].sort((a, b) => a - b).join('_');

  if (firestoreClient) {
    try {
      const snap = await firestoreClient
        .collection('private_conversations')
        .doc(pairKey)
        .collection('messages')
        .orderBy('timestamp', 'asc')
        .limitToLast(limitCount)
        .get();

      if (!snap.empty) {
        return snap.docs.map((d) => d.data() as PrivateMessageRecord);
      }
    } catch (err: any) {
      console.warn('[Sami DB] Firestore private messages notice:', err.message);
    }
  }

  const list = diskStore.privateMessages[pairKey] || [];
  return list.slice(-limitCount);
}

export async function savePrivateMessageRecord(msg: PrivateMessageRecord): Promise<void> {
  const pairKey = [msg.senderId, msg.receiverId].sort((a, b) => a - b).join('_');

  if (firestoreClient) {
    try {
      await firestoreClient
        .collection('private_conversations')
        .doc(pairKey)
        .collection('messages')
        .doc(msg.id)
        .set(msg);
    } catch (err: any) {
      console.warn('[Sami DB] Firestore savePrivateMessage notice:', err.message);
    }
  }

  if (!diskStore.privateMessages[pairKey]) {
    diskStore.privateMessages[pairKey] = [];
  }
  diskStore.privateMessages[pairKey].push(msg);
  saveLocalDiskStore(diskStore);
}

export async function saveFullChallengeAndTrades(userId: number, challenge: ChallengeRecord, trades: TradeRecord[]): Promise<void> {
  if (firestoreClient) {
    try {
      const batch = firestoreClient.batch();
      const chalRef = firestoreClient.collection('challenges').doc(`challenge_${userId}`);
      batch.set(chalRef, challenge);

      for (const t of trades) {
        const tradeRef = chalRef.collection('trades').doc(t.id);
        batch.set(tradeRef, t);
      }
      await batch.commit();
    } catch (err: any) {
      console.warn('[Sami DB] Firestore saveFullChallengeAndTrades notice:', err.message);
    }
  }

  diskStore.challenges[String(userId)] = challenge;
  diskStore.trades[String(userId)] = trades;
  saveLocalDiskStore(diskStore);
}

// ============================================================================
// APP UPDATES PERSISTENCE (FIRESTORE PRIMARY WITH LOCAL DISK SURVIVAL)
// ============================================================================

export interface AppUpdateRecord {
  id: string;
  versionName: string;
  versionCode: number;
  downloadUrl: string;
  description: string;
  isMandatory: boolean;
  minSupportedVersionCode?: number;
  publishedBy?: number;
  publishedByName?: string;
  updatedAt: number;
}

export const DEFAULT_APP_UPDATE_RECORD: AppUpdateRecord = {
  id: 'latest',
  versionName: '1.3.0',
  versionCode: 11,
  downloadUrl: 'https://github.com/alqadasif2-cloud/SSAMIII77777/actions',
  description: 'الإصدار 1.3.0 متوفر الآن مع تحسينات في حماية الضيوف وسرعة الباقات وإدارة المشرفين وتسجيل الصوت والإشعارات.',
  isMandatory: false,
  minSupportedVersionCode: 11,
  publishedBy: 1,
  publishedByName: 'Sami',
  updatedAt: 1735689600000,
};

export async function getLatestAppUpdate(): Promise<AppUpdateRecord> {
  if (firestoreClient) {
    try {
      const doc = await firestoreClient.collection('app_updates').doc('latest').get();
      if (doc.exists) {
        return doc.data() as AppUpdateRecord;
      }
    } catch (err: any) {
      console.warn('[Sami DB] Firestore read app_updates notice:', err.message);
    }
  }

  if (diskStore.appUpdates && diskStore.appUpdates['latest']) {
    return diskStore.appUpdates['latest'];
  }

  return DEFAULT_APP_UPDATE_RECORD;
}

export async function saveAppUpdateRecord(update: AppUpdateRecord): Promise<void> {
  update.updatedAt = Date.now();

  if (firestoreClient) {
    try {
      await firestoreClient.collection('app_updates').doc('latest').set(update);
    } catch (err: any) {
      console.warn('[Sami DB] Firestore write app_updates notice:', err.message);
    }
  }

  if (!diskStore.appUpdates) {
    diskStore.appUpdates = {};
  }
  diskStore.appUpdates['latest'] = update;
  saveLocalDiskStore(diskStore);
}

// ============================================================================
// FCM DEVICE TOKENS & PUSH NOTIFICATIONS
// ============================================================================

export interface FcmTokenRecord {
  id: string;
  token: string;
  userId: number;
  username: string;
  deviceId: string;
  platform: string;
  deviceModel?: string;
  updatedAt: number;
  createdAt: number;
}

export async function saveFcmToken(record: FcmTokenRecord): Promise<void> {
  if (firestoreClient) {
    try {
      await firestoreClient.collection('user_fcm_tokens').doc(record.id).set(record);
    } catch (err: any) {
      console.warn('[Sami DB] Firestore write fcm_tokens notice:', err.message);
    }
  }

  if (!diskStore.fcmTokens) {
    diskStore.fcmTokens = {};
  }
  diskStore.fcmTokens[record.id] = record;
  saveLocalDiskStore(diskStore);
}

export async function getTokensForUser(userId: number): Promise<string[]> {
  const tokens = new Set<string>();

  if (firestoreClient) {
    try {
      const snap = await firestoreClient
        .collection('user_fcm_tokens')
        .where('userId', '==', userId)
        .get();
      snap.forEach((doc) => {
        const d = doc.data();
        if (d.token) tokens.add(d.token);
      });
    } catch {}
  }

  if (diskStore.fcmTokens) {
    for (const r of Object.values(diskStore.fcmTokens)) {
      if (r.userId === userId && r.token) {
        tokens.add(r.token);
      }
    }
  }

  return Array.from(tokens);
}

export async function getTokensForChannel(channelId: string, senderId: number): Promise<string[]> {
  const channel = await getChannelById(channelId);
  const targetUserIds = new Set<number>();

  if (channel) {
    if (channel.visibility === 'hidden' || channel.isPrivate) {
      // Only allowed members
      const allowed = [...(channel.allowedMemberIds || []), ...(channel.memberIds || []), 1];
      allowed.forEach((id) => {
        if (id !== senderId) targetUserIds.add(id);
      });
    } else {
      // All community users
      const allUsers = await getAllUsersList();
      allUsers.forEach((u) => {
        if (u.id !== senderId) targetUserIds.add(u.id);
      });
    }
  }

  const allTokens = new Set<string>();
  for (const uid of targetUserIds) {
    const userTokens = await getTokensForUser(uid);
    userTokens.forEach((t) => allTokens.add(t));
  }

  return Array.from(allTokens);
}

export async function recordNotificationJob(job: {
  id: string;
  targetUserIds: number[];
  title: string;
  body: string;
  data: Record<string, string>;
  createdAt: number;
}): Promise<void> {
  if (firestoreClient) {
    try {
      await firestoreClient.collection('fcm_outbox').doc(job.id).set(job);
    } catch {}
  }

  if (!diskStore.fcmOutbox) {
    diskStore.fcmOutbox = [];
  }
  diskStore.fcmOutbox.push(job);
  // Keep last 100 jobs
  if (diskStore.fcmOutbox.length > 100) {
    diskStore.fcmOutbox = diskStore.fcmOutbox.slice(-100);
  }
  saveLocalDiskStore(diskStore);
}


