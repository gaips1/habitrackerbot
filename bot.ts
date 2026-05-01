import { Bot, InlineKeyboard } from "grammy";
import { loadData, getUserData, saveUserData, getToday, hasCompletedToday } from "./storage.js";

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

const bot = new Bot(process.env.TOKEN!);

function getStreak(history: string[]): number {
  let streak = 0;
  const d = new Date();
  const today = d.toISOString().split('T')[0];
  d.setDate(d.getDate() - 1);
  const yesterday = d.toISOString().split('T')[0];

  let currentDate = new Date();
  if (history.includes(today)) {
    streak = 1;
    currentDate.setDate(currentDate.getDate() - 1);
  } else if (history.includes(yesterday)) {
    streak = 1;
    currentDate.setDate(currentDate.getDate() - 2);
  } else {
    return 0;
  }

  while (true) {
    const dateStr = currentDate.toISOString().split('T')[0];
    if (history.includes(dateStr)) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function getRate(history: string[], days: number): number {
  let count = 0;
  const d = new Date();
  for (let i = 0; i < days; i++) {
    if (history.includes(d.toISOString().split('T')[0])) {
      count++;
    }
    d.setDate(d.getDate() - 1);
  }
  return Math.round((count / days) * 100);
}

bot.command('start', async (ctx) => {
  const user = ctx.from;
  if (!user) return;

  await ctx.reply(
    `👋 Привет, <b>${user.first_name}</b>!\n\n` +
    `Я — <b>HabitTracker Bot</b>\n` +
    `Помогаю тебе формировать полезные привычки и следить за прогрессом.\n\n` +
    `Что я умею:\n` +
    `/start — приветствие\n` +
    `/help — список всех команд\n` +
    `/add — добавить новую привычку\n` +
    `/list — показать все привычки\n` +
    `/check — отметить привычку как выполненную\n` +
    `/stats — статистика прогресса\n` +
    `/delete — удалить привычку\n`,
    { parse_mode: 'HTML' }
  );
});

bot.command('help', async (ctx) => {
  await ctx.reply(
    `<b>📋 Доступные команды HabitTracker</b>\n\n` +
    `/start — информация о боте\n` +
    `/help — показать это сообщение\n` +
    `/add &lt;название&gt; — добавить привычку\n` +
    `/list — список твоих привычек\n` +
    `/check — отметить выполнение\n` +
    `/stats — твоя статистика\n` +
    `/delete — удалить привычку\n`,
    { parse_mode: 'HTML' }
  );
});

bot.command('add', async (ctx) => {
  const name = ctx.match;
  if (!name) {
    return ctx.reply('Укажи название привычки. Пример: /add Читать 20 минут');
  }
  const userId = ctx.from?.id;
  if (!userId) return;

  const userData = getUserData(userId);
  userData.habits.push({
    id: Date.now(),
    name,
    createdAt: getToday(),
    history:[]
  });
  
  await saveUserData(userId, userData);
  await ctx.reply(`✅ Привычка <b>${name}</b> добавлена!`, { parse_mode: 'HTML' });
});

bot.command('list', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const userData = getUserData(userId);
  if (userData.habits.length === 0) {
    return ctx.reply('У тебя пока нет привычек. Добавь их с помощью /add');
  }

  let msg = '<b>Твои привычки сегодня:</b>\n\n';
  userData.habits.forEach((h, i) => {
    const done = hasCompletedToday(h) ? '✅' : '❌';
    msg += `${i + 1}. ${h.name} — ${done}\n`;
  });
  await ctx.reply(msg, { parse_mode: 'HTML' });
});

bot.command('check', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const userData = getUserData(userId);
  if (userData.habits.length === 0) {
    return ctx.reply('У тебя нет привычек для отметки.');
  }

  const kb = new InlineKeyboard();
  userData.habits.forEach(h => {
    const done = hasCompletedToday(h) ? '✅' : '❌';
    kb.text(`${done} ${h.name}`, `check_${h.id}`).row();
  });

  await ctx.reply('Выбери привычку, чтобы отметить её:', { reply_markup: kb });
});

bot.callbackQuery(/^check_(.+)$/, async (ctx) => {
  const habitId = Number(ctx.match[1]);
  const userId = ctx.from.id;
  const userData = getUserData(userId);

  const habit = userData.habits.find(h => h.id === habitId);
  if (!habit) {
    return ctx.answerCallbackQuery('Привычка не найдена.');
  }

  const today = getToday();
  if (habit.history.includes(today)) {
    await ctx.answerCallbackQuery('Уже отмечено сегодня!');
    return;
  }

  habit.history.push(today);
  await saveUserData(userId, userData);
  await ctx.answerCallbackQuery('Отмечено!');

  const kb = new InlineKeyboard();
  userData.habits.forEach(h => {
    const done = hasCompletedToday(h) ? '✅' : '❌';
    kb.text(`${done} ${h.name}`, `check_${h.id}`).row();
  });

  await ctx.editMessageReplyMarkup({ reply_markup: kb });
});

bot.command('delete', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const userData = getUserData(userId);
  if (userData.habits.length === 0) {
    return ctx.reply('У тебя пока нет привычек.');
  }

  const kb = new InlineKeyboard();
  userData.habits.forEach(h => {
    kb.text(`🗑 ${h.name}`, `del_${h.id}`).row();
  });

  await ctx.reply('Выбери привычку для удаления:', { reply_markup: kb });
});

bot.callbackQuery(/^del_(.+)$/, async (ctx) => {
  const habitId = Number(ctx.match[1]);
  const userId = ctx.from.id;
  const userData = getUserData(userId);

  const initLen = userData.habits.length;
  userData.habits = userData.habits.filter(h => h.id !== habitId);

  if (userData.habits.length === initLen) {
    return ctx.answerCallbackQuery('Привычка не найдена.');
  }

  await saveUserData(userId, userData);
  await ctx.answerCallbackQuery('Удалено!');

  if (userData.habits.length === 0) {
    await ctx.editMessageText('Все привычки удалены.');
    return;
  }

  const kb = new InlineKeyboard();
  userData.habits.forEach(h => {
    kb.text(`🗑 ${h.name}`, `del_${h.id}`).row();
  });

  await ctx.editMessageReplyMarkup({ reply_markup: kb });
});

bot.command('stats', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const userData = getUserData(userId);
  if (userData.habits.length === 0) {
    return ctx.reply('У тебя пока нет привычек.');
  }

  let msg = '<b>📊 Твоя статистика:</b>\n\n';
  userData.habits.forEach(h => {
    const streak = getStreak(h.history);
    const week = getRate(h.history, 7);
    const month = getRate(h.history, 30);
    msg += `<b>${h.name}</b>\n`;
    msg += `🔥 Стрик: ${streak} дн.\n`;
    msg += `📅 Неделя: ${week}%\n`;
    msg += `🗓 Месяц: ${month}%\n\n`;
  });

  await ctx.reply(msg, { parse_mode: 'HTML' });
});

loadData().then(() => {
  bot.start();
});