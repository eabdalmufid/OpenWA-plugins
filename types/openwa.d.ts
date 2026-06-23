// Vendored OpenWA plugin contract. There is no published @openwa SDK package; keep this in sync
// with the OpenWA version you target. All imports of this module must be `import type`.
//
// v0.7 surface (added below): `ctx.net.fetch` (host-proxied, SSRF-guarded outbound HTTP — gated by the
// "net:fetch" permission + manifest `net.allow` host allowlist), and the manifest fields
// `sessionScoped` (per-session activation; ctx.config is the resolved per-session slice), `net`, and
// `configUi` (a sandboxed-iframe config editor). The richer `configSchema` field set (select/textarea/
// array/object, options/items/properties, minimum/maximum/pattern) is plain manifest JSON — the plugin
// still reads `ctx.config` as `Record<string, unknown>` and validates defensively.

export type HookEvent =
  | 'session:created' | 'session:starting' | 'session:ready' | 'session:qr'
  | 'session:disconnected' | 'session:error' | 'session:deleted'
  | 'message:received' | 'message:sending' | 'message:sent' | 'message:failed' | 'message:ack'
  | 'webhook:before' | 'webhook:queued' | 'webhook:delivered' | 'webhook:after' | 'webhook:error';

export interface HookContext<T = unknown> {
  event: HookEvent;
  data: T;
  sessionId?: string;
  timestamp: Date;
  source: string;
}

export interface HookResult<T = unknown> {
  continue: boolean;
  data?: T;
  error?: Error;
}

export type HookHandler<T = unknown> = (ctx: HookContext<T>) => Promise<HookResult<T>>;

export interface PluginLogger {
  log(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: unknown, meta?: Record<string, unknown>): void;
}

export interface PluginStorage {
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
}

export interface MessageResponseDto {
  messageId: string;
  timestamp: number;
}

export interface PluginMessagingCapability {
  sendText(sessionId: string, chatId: string, text: string): Promise<MessageResponseDto>;
  reply(sessionId: string, chatId: string, quotedMessageId: string, text: string): Promise<MessageResponseDto>;
}

export interface PluginEngineReadCapability {
  getGroupInfo(sessionId: string, groupId: string): Promise<unknown>;
  getContacts(sessionId: string): Promise<unknown>;
  getContactById(sessionId: string, contactId: string): Promise<unknown>;
  checkNumberExists(sessionId: string, phone: string): Promise<unknown>;
  getChats(sessionId: string): Promise<unknown>;
}

// ── v0.7: host-proxied, SSRF-guarded outbound HTTP ──────────────────────────────────────────────
// Gated by the "net:fetch" permission + manifest `net.allow` (host:port allowlist; deny by default).
// Use this for ALL outbound HTTP — the raw worker `fetch` is unguarded and discouraged.
export interface PluginNetRequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

export interface PluginNetResponse {
  ok: boolean;
  status: number;
  headers: Record<string, string>;
  text(): Promise<string>;
  json<T = unknown>(): Promise<T>;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface PluginNetCapability {
  fetch(url: string, init?: PluginNetRequestInit): Promise<PluginNetResponse>;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  type: string;
  main: string;
  permissions?: string[];
  sessions?: string[];
  hooks?: HookEvent[];
  /** v0.7: per-session activation (default true). The platform owns which sessions a plugin runs for. */
  sessionScoped?: boolean;
  /** v0.7: outbound HTTP host allowlist for ctx.net.fetch — "host:port" entries; deny by default. */
  net?: { allow: string[] };
  /** v0.7: a sandboxed-iframe config editor served by the host. */
  configUi?: { entry: string; height?: number };
  /** Declarative config schema (rendered by the host into an authenticated form). */
  configSchema?: unknown;
  [key: string]: unknown;
}

export interface PluginContext {
  pluginId: string;
  manifest: PluginManifest;
  /** The RESOLVED config for `sessionId` (the per-session slice merged over the "*" defaults). */
  config: Record<string, unknown>;
  hookManager: unknown;
  logger: PluginLogger;
  storage: PluginStorage;
  registerHook(event: HookEvent, handler: HookHandler, priority?: number): void;
  messages: PluginMessagingCapability;
  engine: PluginEngineReadCapability;
  /** v0.7: host-proxied, SSRF-guarded outbound HTTP (needs the "net:fetch" permission + manifest net.allow). */
  net: PluginNetCapability;
}

export interface IPlugin {
  onLoad?(context: PluginContext): Promise<void>;
  onEnable?(context: PluginContext): Promise<void>;
  onDisable?(context: PluginContext): Promise<void>;
  onUnload?(context: PluginContext): Promise<void>;
  onConfigChange?(context: PluginContext, newConfig: Record<string, unknown>): Promise<void>;
  healthCheck?(): Promise<{ healthy: boolean; message?: string }>;
}

export interface IncomingMessage {
  id: string;
  from: string;
  to: string;
  chatId: string;
  body: string;
  type: string;
  timestamp: number;
  fromMe: boolean;
  isGroup: boolean;
  author?: string;
  senderPhone?: string | null;
  mentionedIds?: string[];
  contact?: { name?: string; pushName?: string };
}
