import { PrismaClient } from "../generated/client/index.js";

let client: PrismaClient | undefined;

export function getPrismaClient(): PrismaClient {
  client ??= new PrismaClient();
  return client;
}
