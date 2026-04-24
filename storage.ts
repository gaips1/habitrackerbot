 import { promises as fs } from 'node:fs';
import path from 'node:path';
import { BotData, UserData } from './bot.js';

const DB_PATH = path.resolve(process.cwd(), 'habits.json');

let dataCache: BotData = {};

export async function loadData(): Promise<BotData> {
  try {
    const raw = await fs.readFile(DB_PATH, 'utf-8');
    dataCache = JSON.parse(raw) as BotData;
  } catch (err: any) {
    await saveData();
  }
  return dataCache;
}

export async function saveData(): Promise<void> {
  await fs.writeFile(DB_PATH, JSON.stringify(dataCache, null, 2), 'utf-8');
}

export function getUserData(userId: number | string): UserData {
  const id = String(userId);
  if (!dataCache[id]) {
    dataCache[id] = { habits: [] };
  }
  return dataCache[id];
}

export async function saveUserData(userId: number | string, userData: UserData): Promise<void> {
  const id = String(userId);
  dataCache[id] = userData;
  await saveData();
}