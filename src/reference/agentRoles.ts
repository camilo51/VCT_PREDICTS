/**
 * Static Valorant game data: agent -> role. This is official game design
 * information (not a statistic), used to build role-based Key Matchups.
 */
export type AgentRole = "Duelist" | "Controller" | "Initiator" | "Sentinel";

export const AGENT_ROLE: Record<string, AgentRole> = {
  jett: "Duelist",
  raze: "Duelist",
  reyna: "Duelist",
  phoenix: "Duelist",
  yoru: "Duelist",
  neon: "Duelist",
  iso: "Duelist",
  waylay: "Duelist",

  brimstone: "Controller",
  viper: "Controller",
  omen: "Controller",
  astra: "Controller",
  harbor: "Controller",
  clove: "Controller",

  sova: "Initiator",
  breach: "Initiator",
  skye: "Initiator",
  kayo: "Initiator",
  fade: "Initiator",
  gekko: "Initiator",
  tejo: "Initiator",

  killjoy: "Sentinel",
  cypher: "Sentinel",
  sage: "Sentinel",
  chamber: "Sentinel",
  deadlock: "Sentinel",
  vyse: "Sentinel",
};

export function roleForAgent(agentName: string | undefined | null): AgentRole | null {
  if (!agentName) return null;
  return AGENT_ROLE[agentName.toLowerCase()] ?? null;
}
