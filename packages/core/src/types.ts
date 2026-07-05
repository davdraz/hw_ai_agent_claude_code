export interface AgentUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface ShowPromptMessage {
  role: string;
  content: string;
}

export interface AgentResult {
  answer: string;
  sql: string[];
  usage: AgentUsage;
  logPath: string;
  messages?: ShowPromptMessage[];
}
