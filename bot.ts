import { Bot } from "grammy";

const bot = new Bot(process.env.TOKEN!);

export interface Habit {
  id: number;
  name: string;
  createdAt: string;
  history: string[];
}

export interface UserData {
  habits: Habit[];
}

export interface BotData {
  [userId: string]: UserData;
}

bot.command('start', async (ctx) => {
  const user = ctx.from;
  if (!user) return;

  await ctx.reply(
    `👋 Привет, <b>${user.first_name}</b>!\n\n` +
    `Я — <b>HabitTracker Bot</b>\n` +
    `Помогаю тебе формировать полезные привычки и следить за прогрессом.\n\n` +
    `Что я уже умею:\n` +
    `• /start — это приветствие\n` +
    `• /help — список всех команд\n\n`,
    { parse_mode: 'HTML' }
  );
});

bot.command('help', async (ctx) => {
  await ctx.reply(
    `<b>📋 Доступные команды HabitTracker</b>\n\n` +
    `/start — приветствие и информация о боте\n` +
    `/help — показать это сообщение\n\n`,
    { parse_mode: 'HTML' }
  );
});

bot.start();