import type { db } from "./index";

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type Connection = typeof db | Transaction;
