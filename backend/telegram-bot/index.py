"""
Telegram бот Ben 10: Omnitrix Wars
Команды, бои, ИИ-диалоги, топ лидеров, групповые чаты
"""
import json
import os
import random
import urllib.request
import urllib.parse
import psycopg2
from datetime import datetime, timezone

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p7329685_ben10_bot_for_friend")

ALIENS = {
    "heatblast":    {"name": "🔥 Хитбласт",         "hp": 100, "atk": 28, "def": 15, "unlock": 1},
    "fourarms":     {"name": "💪 Четыре Руки",        "hp": 150, "atk": 38, "def": 30, "unlock": 2},
    "xlr8":         {"name": "⚡ XLR8",               "hp": 80,  "atk": 22, "def": 12, "unlock": 3},
    "diamondhead":  {"name": "💎 Бриллиантовая Голова","hp": 120, "atk": 32, "def": 35, "unlock": 4},
    "ghostfreak":   {"name": "👻 Призрак",            "hp": 90,  "atk": 25, "def": 20, "unlock": 5},
    "upgrade":      {"name": "🔧 Апгрейд",            "hp": 110, "atk": 30, "def": 25, "unlock": 6},
    "wildmutt":     {"name": "🐺 Дикий Зверь",        "hp": 130, "atk": 35, "def": 18, "unlock": 7},
    "greymatter":   {"name": "🧠 Серое Вещество",     "hp": 70,  "atk": 20, "def": 10, "unlock": 8},
    "stinkfly":     {"name": "🪲 Вонючка",            "hp": 95,  "atk": 27, "def": 16, "unlock": 9},
    "ripjaws":      {"name": "🦈 Клыкастый",          "hp": 115, "atk": 33, "def": 22, "unlock": 10},
}

ENEMIES = [
    {"name": "Дрон Вилгакса 🤖",     "hp": 80,  "atk": 18, "def": 10, "reward": 30,  "xp": 20},
    {"name": "Субли-Майно 👁️",       "hp": 120, "atk": 25, "def": 18, "reward": 60,  "xp": 40},
    {"name": "Вечный Рыцарь ⚔️",     "hp": 160, "atk": 32, "def": 28, "reward": 100, "xp": 70},
    {"name": "Доктор Анимо 🐸",       "hp": 130, "atk": 28, "def": 20, "reward": 80,  "xp": 55},
    {"name": "Кевин 11 ⚫",           "hp": 200, "atk": 40, "def": 35, "reward": 150, "xp": 100},
    {"name": "ВИЛГАКС 👾",            "hp": 250, "atk": 45, "def": 40, "reward": 200, "xp": 150},
]

XP_PER_LEVEL = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000]

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
API_BASE = f"https://api.telegram.org/bot{BOT_TOKEN}"


# ── DB helpers ────────────────────────────────────────────────────────────────

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def get_or_create_user(conn, telegram_id, username=None, first_name=None, last_name=None):
    cur = conn.cursor()
    cur.execute(
        f"SELECT telegram_id, coins, wins, losses, level, xp, current_alien, streak FROM {SCHEMA}.bot_users WHERE telegram_id = %s",
        (telegram_id,)
    )
    row = cur.fetchone()
    if not row:
        cur.execute(
            f"""INSERT INTO {SCHEMA}.bot_users (telegram_id, username, first_name, last_name)
                VALUES (%s, %s, %s, %s) RETURNING telegram_id, coins, wins, losses, level, xp, current_alien, streak""",
            (telegram_id, username, first_name, last_name)
        )
        row = cur.fetchone()
        conn.commit()
    cur.execute(
        f"UPDATE {SCHEMA}.bot_users SET last_active = NOW(), username=%s, first_name=%s WHERE telegram_id=%s",
        (username, first_name, telegram_id)
    )
    conn.commit()
    return {"telegram_id": row[0], "coins": row[1], "wins": row[2], "losses": row[3],
            "level": row[4], "xp": row[5], "current_alien": row[6], "streak": row[7]}


def save_battle(conn, user_id, alien, enemy_name, result, coins, xp):
    cur = conn.cursor()
    cur.execute(
        f"INSERT INTO {SCHEMA}.battles (user_id, alien_used, enemy_name, result, coins_earned, xp_earned) VALUES (%s,%s,%s,%s,%s,%s)",
        (user_id, alien, enemy_name, result, coins, xp)
    )
    conn.commit()


def update_user_stats(conn, telegram_id, coins_delta, wins_delta, losses_delta, xp_delta):
    cur = conn.cursor()
    cur.execute(
        f"""UPDATE {SCHEMA}.bot_users
            SET coins = coins + %s,
                wins = wins + %s,
                losses = losses + %s,
                xp = xp + %s,
                streak = CASE WHEN %s > 0 THEN streak + 1 ELSE 0 END,
                level = (
                    SELECT COALESCE(MAX(lv), 1) FROM (VALUES
                        (1,0),(2,100),(3,250),(4,450),(5,700),
                        (6,1000),(7,1400),(8,1900),(9,2500),(10,3200)
                    ) AS t(lv, req)
                    WHERE req <= xp + %s
                )
            WHERE telegram_id = %s""",
        (coins_delta, wins_delta, losses_delta, xp_delta, wins_delta, xp_delta, telegram_id)
    )
    conn.commit()


def get_ai_history(conn, telegram_id, limit=10):
    cur = conn.cursor()
    cur.execute(
        f"SELECT role, content FROM {SCHEMA}.ai_conversations WHERE telegram_id=%s ORDER BY created_at DESC LIMIT %s",
        (telegram_id, limit)
    )
    rows = cur.fetchall()
    return [{"role": r[0], "content": r[1]} for r in reversed(rows)]


def save_ai_message(conn, telegram_id, role, content):
    cur = conn.cursor()
    cur.execute(
        f"INSERT INTO {SCHEMA}.ai_conversations (telegram_id, role, content) VALUES (%s,%s,%s)",
        (telegram_id, role, content)
    )
    conn.commit()


def ensure_group(conn, chat_id, title):
    cur = conn.cursor()
    cur.execute(
        f"INSERT INTO {SCHEMA}.group_chats (chat_id, title) VALUES (%s,%s) ON CONFLICT (chat_id) DO UPDATE SET title=%s",
        (chat_id, title, title)
    )
    conn.commit()


# ── Telegram API ──────────────────────────────────────────────────────────────

def tg_post(method, payload):
    url = f"{API_BASE}/{method}"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        urllib.request.urlopen(req, timeout=10)
    except Exception:
        pass


def send_message(chat_id, text, reply_markup=None, parse_mode="HTML"):
    payload = {"chat_id": chat_id, "text": text, "parse_mode": parse_mode}
    if reply_markup:
        payload["reply_markup"] = reply_markup
    tg_post("sendMessage", payload)


def send_photo(chat_id, photo_url, caption, reply_markup=None):
    payload = {"chat_id": chat_id, "photo": photo_url, "caption": caption, "parse_mode": "HTML"}
    if reply_markup:
        payload["reply_markup"] = reply_markup
    tg_post("sendPhoto", payload)


# ── AI (бесплатный — pollinations) ───────────────────────────────────────────

def ask_ai(messages):
    """Использует бесплатный Pollinations AI (без ключа)"""
    system = {
        "role": "system",
        "content": (
            "Ты — Омнитрикс, умный помощник из вселенной Бен 10. "
            "Ты знаешь всё о Бен 10, его инопланетянах, злодеях и приключениях. "
            "Отвечай по-русски, дружелюбно и с юмором. "
            "Иногда используй эмодзи инопланетян ⌚🔥💪⚡💎. "
            "Если спрашивают не про Бен 10 — всё равно отвечай полезно, но от лица Омнитрикса."
        )
    }
    all_messages = [system] + messages[-10:]
    payload = json.dumps({
        "messages": all_messages,
        "model": "openai",
        "seed": random.randint(1, 9999)
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://text.pollinations.ai/openai",
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            return result["choices"][0]["message"]["content"]
    except Exception as e:
        return f"⌚ Омнитрикс временно недоступен... ({e})"


# ── Game logic ────────────────────────────────────────────────────────────────

def do_battle(user):
    alien_id = user["current_alien"]
    alien = ALIENS.get(alien_id, ALIENS["heatblast"])
    enemy = random.choice(ENEMIES)

    player_hp = alien["hp"] + user["level"] * 5
    enemy_hp = enemy["hp"]
    log = []
    rounds = 0

    while player_hp > 0 and enemy_hp > 0 and rounds < 20:
        rounds += 1
        # Атака игрока
        atk = alien["atk"] + user["level"] * 2
        dmg = max(1, atk - enemy["def"] + random.randint(-5, 10))
        crit = random.random() < 0.15
        if crit:
            dmg = int(dmg * 1.5)
        enemy_hp -= dmg
        log.append(f"{'💥 КРИТ! ' if crit else ''}{alien['name']} → <b>{dmg}</b> урона")

        if enemy_hp <= 0:
            break

        # Атака врага
        edmg = max(1, enemy["atk"] - alien["def"] + random.randint(-3, 8))
        player_hp -= edmg
        log.append(f"{enemy['name']} → <b>{edmg}</b> урона тебе")

    win = enemy_hp <= 0
    coins = enemy["reward"] if win else enemy["reward"] // 5
    xp = enemy["xp"] if win else enemy["xp"] // 4

    return {
        "win": win,
        "enemy": enemy,
        "alien": alien,
        "log": log[-6:],
        "coins": coins,
        "xp": xp,
        "rounds": rounds,
    }


def get_level_label(level):
    labels = {
        1: "🟢 Новичок", 2: "🔵 Ученик", 3: "🟡 Боец",
        4: "🟠 Воин", 5: "🔴 Ветеран", 6: "⚡ Эксперт",
        7: "💎 Мастер", 8: "👑 Легенда", 9: "🌟 Чемпион", 10: "🏆 Омнитрикс",
    }
    return labels.get(level, f"УР.{level}")


def get_unlocked_aliens(level):
    return [aid for aid, a in ALIENS.items() if a["unlock"] <= level]


# ── Keyboards ─────────────────────────────────────────────────────────────────

def main_keyboard():
    return {
        "keyboard": [
            [{"text": "⚔️ Сражаться"}, {"text": "👤 Профиль"}],
            [{"text": "🔄 Сменить инопланетянина"}, {"text": "🏆 Топ игроков"}],
            [{"text": "📊 Статистика"}, {"text": "🎁 Ежедневный бонус"}],
            [{"text": "ℹ️ Инопланетяне"}, {"text": "❓ Помощь"}],
        ],
        "resize_keyboard": True,
        "input_field_placeholder": "Выбери действие или напиши вопрос Омнитриксу...",
    }


def aliens_keyboard(level):
    unlocked = get_unlocked_aliens(level)
    buttons = []
    row = []
    for aid in ALIENS:
        a = ALIENS[aid]
        if aid in unlocked:
            row.append({"text": f"{a['name']}", "callback_data": f"setalien_{aid}"})
        else:
            row.append({"text": f"🔒 УР.{a['unlock']}", "callback_data": f"locked_{a['unlock']}"})
        if len(row) == 2:
            buttons.append(row)
            row = []
    if row:
        buttons.append(row)
    return {"inline_keyboard": buttons}


def battle_keyboard():
    return {
        "inline_keyboard": [
            [{"text": "⚔️ Ещё бой!", "callback_data": "battle_again"},
             {"text": "👤 Профиль", "callback_data": "show_profile"}],
        ]
    }


# ── Command handlers ──────────────────────────────────────────────────────────

def handle_start(chat_id, user_data, conn):
    name = user_data.get("first_name", "Герой")
    user = get_or_create_user(conn, chat_id,
                              user_data.get("username"),
                              user_data.get("first_name"),
                              user_data.get("last_name"))
    text = (
        f"⌚ <b>Добро пожаловать, {name}!</b>\n\n"
        f"Я — Омнитрикс, твой верный помощник в мире Бен 10!\n\n"
        f"🔥 Трансформируйся в инопланетян\n"
        f"⚔️ Сражайся с врагами и получай монеты\n"
        f"🏆 Поднимайся в топ лидеров\n"
        f"🧠 Задавай мне любые вопросы\n\n"
        f"Твой первый инопланетянин — <b>Хитбласт 🔥</b>\n"
        f"Нажми <b>⚔️ Сражаться</b>, чтобы начать!"
    )
    send_message(chat_id, text, main_keyboard())


def handle_profile(chat_id, user):
    alien = ALIENS.get(user["current_alien"], ALIENS["heatblast"])
    unlocked_count = len(get_unlocked_aliens(user["level"]))
    text = (
        f"👤 <b>Твой профиль</b>\n\n"
        f"🎖 Статус: {get_level_label(user['level'])}\n"
        f"⭐ Уровень: <b>{user['level']}</b>\n"
        f"✨ Опыт: <b>{user['xp']}</b>\n"
        f"💰 Монеты: <b>{user['coins']}</b>\n"
        f"⚔️ Победы: <b>{user['wins']}</b>\n"
        f"💀 Поражения: <b>{user['losses']}</b>\n"
        f"🔥 Серия побед: <b>{user['streak']}</b>\n\n"
        f"🛸 Текущий: <b>{alien['name']}</b>\n"
        f"🔓 Открыто инопланетян: <b>{unlocked_count}/{len(ALIENS)}</b>"
    )
    send_message(chat_id, text, main_keyboard())


def handle_battle(chat_id, user, conn):
    result = do_battle(user)
    update_user_stats(conn, chat_id,
                      result["coins"],
                      1 if result["win"] else 0,
                      0 if result["win"] else 1,
                      result["xp"])
    save_battle(conn, chat_id, user["current_alien"],
                result["enemy"]["name"],
                "win" if result["win"] else "loss",
                result["coins"], result["xp"])

    log_text = "\n".join(result["log"])
    if result["win"]:
        text = (
            f"⚔️ <b>БОЙ ЗАВЕРШЁН — ПОБЕДА!</b> 🏆\n\n"
            f"🛸 Ты: {result['alien']['name']}\n"
            f"👾 Враг: {result['enemy']['name']}\n"
            f"📜 Раунды: {result['rounds']}\n\n"
            f"{log_text}\n\n"
            f"💰 +<b>{result['coins']}</b> монет\n"
            f"✨ +<b>{result['xp']}</b> опыта"
        )
    else:
        text = (
            f"⚔️ <b>БОЙ ЗАВЕРШЁН — ПОРАЖЕНИЕ</b> 💀\n\n"
            f"🛸 Ты: {result['alien']['name']}\n"
            f"👾 Враг: {result['enemy']['name']}\n"
            f"📜 Раунды: {result['rounds']}\n\n"
            f"{log_text}\n\n"
            f"💰 +<b>{result['coins']}</b> монет (утешение)\n"
            f"✨ +<b>{result['xp']}</b> опыта\n\n"
            f"Не сдавайся, тренируйся и возвращайся! 💪"
        )
    send_message(chat_id, text, battle_keyboard())


def handle_change_alien(chat_id, user):
    text = (
        f"🔄 <b>Выбери трансформацию</b>\n\n"
        f"Твой уровень: <b>{user['level']}</b>\n"
        f"Новые инопланетяне открываются с повышением уровня!\n\n"
        f"🔒 — заблокировано\n✅ — доступно"
    )
    send_message(chat_id, text, aliens_keyboard(user["level"]))


def handle_top(chat_id, conn):
    cur = conn.cursor()
    cur.execute(
        f"""SELECT first_name, username, coins, wins, level
            FROM {SCHEMA}.bot_users
            ORDER BY coins DESC LIMIT 10"""
    )
    rows = cur.fetchall()
    medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"]
    lines = ["🏆 <b>ТОП ИГРОКОВ ПО МОНЕТАМ</b>\n"]
    for i, row in enumerate(rows):
        name = row[0] or (f"@{row[1]}" if row[1] else "Игрок")
        lines.append(f"{medals[i]} {name} — 💰{row[2]} монет | {get_level_label(row[4])}")
    if not rows:
        lines.append("Пока никого нет. Стань первым! ⚔️")
    send_message(chat_id, "\n".join(lines), main_keyboard())


def handle_stats(chat_id, user, conn):
    cur = conn.cursor()
    cur.execute(
        f"SELECT alien_used, COUNT(*) as cnt FROM {SCHEMA}.battles WHERE user_id=%s AND result='win' GROUP BY alien_used ORDER BY cnt DESC LIMIT 1",
        (chat_id,)
    )
    row = cur.fetchone()
    best_alien = ALIENS.get(row[0], {}).get("name", "—") if row else "—"
    cur.execute(
        f"SELECT COUNT(*) FROM {SCHEMA}.battles WHERE user_id=%s",
        (chat_id,)
    )
    total = cur.fetchone()[0]
    winrate = round(user["wins"] / total * 100) if total > 0 else 0
    text = (
        f"📊 <b>Подробная статистика</b>\n\n"
        f"⚔️ Всего боёв: <b>{total}</b>\n"
        f"✅ Побед: <b>{user['wins']}</b>\n"
        f"❌ Поражений: <b>{user['losses']}</b>\n"
        f"📈 Винрейт: <b>{winrate}%</b>\n"
        f"🔥 Лучшая серия: <b>{user['streak']}</b>\n\n"
        f"🌟 Лучший инопланетянин: <b>{best_alien}</b>\n"
        f"💰 Всего монет: <b>{user['coins']}</b>\n"
        f"⭐ Уровень: <b>{user['level']}</b> ({get_level_label(user['level'])})"
    )
    send_message(chat_id, text, main_keyboard())


def handle_daily_bonus(chat_id, user, conn):
    cur = conn.cursor()
    cur.execute(
        f"SELECT last_active FROM {SCHEMA}.bot_users WHERE telegram_id=%s",
        (chat_id,)
    )
    row = cur.fetchone()
    now = datetime.now(timezone.utc)
    last = row[0].replace(tzinfo=timezone.utc) if row and row[0] else None
    if last and (now - last).total_seconds() < 86400:
        hours_left = int(24 - (now - last).total_seconds() / 3600)
        send_message(chat_id, f"⏰ Бонус уже получен! Следующий через <b>{hours_left}ч</b>", main_keyboard())
        return
    bonus = random.randint(50, 200) + user["level"] * 10
    streak_bonus = user["streak"] * 5
    total = bonus + streak_bonus
    cur.execute(
        f"UPDATE {SCHEMA}.bot_users SET coins = coins + %s, last_active = NOW() WHERE telegram_id = %s",
        (total, chat_id)
    )
    conn.commit()
    text = (
        f"🎁 <b>Ежедневный бонус!</b>\n\n"
        f"💰 +<b>{bonus}</b> монет\n"
        f"🔥 Серия бонус: +<b>{streak_bonus}</b> монет\n"
        f"✅ Итого: +<b>{total}</b> монет!\n\n"
        f"Возвращайся завтра за новым бонусом!"
    )
    send_message(chat_id, text, main_keyboard())


def handle_aliens_info(chat_id):
    lines = ["ℹ️ <b>Все инопланетяне Омнитрикса</b>\n"]
    for aid, a in ALIENS.items():
        lines.append(
            f"{a['name']} (УР.{a['unlock']})\n"
            f"  ❤️{a['hp']} ⚔️{a['atk']} 🛡️{a['def']}"
        )
    send_message(chat_id, "\n".join(lines), main_keyboard())


def handle_help(chat_id):
    text = (
        "❓ <b>Помощь</b>\n\n"
        "⚔️ <b>Сражаться</b> — бой со случайным врагом\n"
        "👤 <b>Профиль</b> — твои характеристики\n"
        "🔄 <b>Сменить инопланетянина</b> — выбор трансформации\n"
        "🏆 <b>Топ игроков</b> — рейтинг по монетам\n"
        "📊 <b>Статистика</b> — подробная аналитика\n"
        "🎁 <b>Ежедневный бонус</b> — монеты раз в сутки\n"
        "ℹ️ <b>Инопланетяне</b> — все характеристики\n\n"
        "💬 <b>Просто напиши что-нибудь</b> — поговори с Омнитриксом!\n\n"
        "<b>В группах:</b>\n"
        "Напиши <code>Бен 10 [вопрос]</code> — ИИ ответит на вопрос\n"
        "/top — топ игроков\n"
        "/battle — быстрый бой"
    )
    send_message(chat_id, text, main_keyboard())


def handle_ai_message(chat_id, user_text, telegram_id, conn):
    history = get_ai_history(conn, telegram_id)
    history.append({"role": "user", "content": user_text})
    save_ai_message(conn, telegram_id, "user", user_text)
    response = ask_ai(history)
    save_ai_message(conn, telegram_id, "assistant", response)
    send_message(chat_id, f"⌚ {response}", main_keyboard())


def handle_set_alien(chat_id, alien_id, user, conn):
    if alien_id not in ALIENS:
        return
    a = ALIENS[alien_id]
    if a["unlock"] > user["level"]:
        tg_post("answerCallbackQuery", {"callback_query_id": "", "text": f"🔒 Нужен уровень {a['unlock']}!"})
        return
    cur = conn.cursor()
    cur.execute(
        f"UPDATE {SCHEMA}.bot_users SET current_alien=%s WHERE telegram_id=%s",
        (alien_id, chat_id)
    )
    conn.commit()
    send_message(chat_id, f"✅ Выбран <b>{a['name']}</b>!\n❤️{a['hp']} ⚔️{a['atk']} 🛡️{a['def']}", main_keyboard())


# ── Group handler ─────────────────────────────────────────────────────────────

def handle_group_message(chat_id, text, user_data, conn):
    ensure_group(conn, chat_id, "group")
    tl = text.strip().lower()

    if tl.startswith("бен 10 ") or tl.startswith("ben 10 "):
        question = text[7:].strip()
        if not question:
            return
        response = ask_ai([{"role": "user", "content": question}])
        send_message(chat_id, f"⌚ <b>Омнитрикс отвечает:</b>\n\n{response}")
        return

    if tl == "/top" or tl.startswith("/top@"):
        handle_top(chat_id, conn)
        return

    if tl == "/battle" or tl.startswith("/battle@"):
        uid = user_data.get("id")
        if uid:
            user = get_or_create_user(conn, uid,
                                      user_data.get("username"),
                                      user_data.get("first_name"))
            result = do_battle(user)
            update_user_stats(conn, uid, result["coins"],
                              1 if result["win"] else 0,
                              0 if result["win"] else 1,
                              result["xp"])
            name = user_data.get("first_name", "Игрок")
            emoji = "🏆" if result["win"] else "💀"
            send_message(chat_id,
                         f"{emoji} <b>{name}</b> {'победил' if result['win'] else 'проиграл'} "
                         f"{result['enemy']['name']}! +{result['coins']}💰")
        return

    if tl == "/aliens" or tl.startswith("/aliens@"):
        handle_aliens_info(chat_id)
        return


# ── Main handler ──────────────────────────────────────────────────────────────

def handler(event: dict, context) -> dict:
    """Обработчик Telegram Webhook — Ben 10 бот"""
    cors = {"Access-Control-Allow-Origin": "*"}

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors, "body": ""}

    # Проверяем webhook secret (если задан)
    webhook_secret = os.environ.get("TELEGRAM_WEBHOOK_SECRET", "")
    if webhook_secret:
        headers = event.get("headers", {})
        # заголовок может прийти в разном регистре
        incoming = (
            headers.get("X-Telegram-Bot-Api-Secret-Token")
            or headers.get("x-telegram-bot-api-secret-token")
            or ""
        )
        if incoming != webhook_secret:
            return {"statusCode": 200, "headers": cors, "body": "ok"}

    body = json.loads(event.get("body", "{}"))

    # Callback query (нажатие inline-кнопок)
    if "callback_query" in body:
        cq = body["callback_query"]
        cq_id = cq.get("id", "")
        chat_id = cq["message"]["chat"]["id"]
        user_data = cq.get("from", {})
        data = cq.get("data", "")

        conn = get_conn()
        user = get_or_create_user(conn, user_data.get("id", chat_id),
                                  user_data.get("username"),
                                  user_data.get("first_name"))

        if data.startswith("setalien_"):
            alien_id = data.replace("setalien_", "")
            handle_set_alien(chat_id, alien_id, user, conn)
        elif data == "battle_again":
            handle_battle(chat_id, user, conn)
        elif data == "show_profile":
            handle_profile(chat_id, user)
        elif data.startswith("locked_"):
            lvl = data.replace("locked_", "")
            send_message(chat_id, f"🔒 Этот инопланетянин откроется на уровне <b>{lvl}</b>!\nПродолжай сражаться!")

        tg_post("answerCallbackQuery", {"callback_query_id": cq_id})
        conn.close()
        return {"statusCode": 200, "headers": cors, "body": "ok"}

    # Обычное сообщение
    message = body.get("message")
    if not message:
        return {"statusCode": 200, "headers": cors, "body": "ok"}

    chat = message.get("chat", {})
    chat_id = chat.get("id")
    chat_type = chat.get("type", "private")
    user_data = message.get("from", {})
    text = message.get("text", "").strip()

    if not text or not chat_id:
        return {"statusCode": 200, "headers": cors, "body": "ok"}

    conn = get_conn()

    # Группы и супергруппы
    if chat_type in ("group", "supergroup"):
        handle_group_message(chat_id, text, user_data, conn)
        conn.close()
        return {"statusCode": 200, "headers": cors, "body": "ok"}

    # Личные сообщения
    telegram_id = user_data.get("id", chat_id)
    user = get_or_create_user(conn, telegram_id,
                              user_data.get("username"),
                              user_data.get("first_name"),
                              user_data.get("last_name"))

    tl = text.lower()

    if tl in ("/start", "start"):
        handle_start(chat_id, user_data, conn)
    elif tl in ("⚔️ сражаться", "/battle"):
        handle_battle(chat_id, user, conn)
    elif tl in ("👤 профиль", "/profile"):
        handle_profile(chat_id, user)
    elif tl in ("🔄 сменить инопланетянина", "/aliens"):
        handle_change_alien(chat_id, user)
    elif tl in ("🏆 топ игроков", "/top"):
        handle_top(chat_id, conn)
    elif tl in ("📊 статистика", "/stats"):
        handle_stats(chat_id, user, conn)
    elif tl in ("🎁 ежедневный бонус", "/bonus"):
        handle_daily_bonus(chat_id, user, conn)
    elif tl in ("ℹ️ инопланетяне", "/info"):
        handle_aliens_info(chat_id)
    elif tl in ("❓ помощь", "/help"):
        handle_help(chat_id)
    else:
        # Всё остальное — ИИ диалог
        handle_ai_message(chat_id, text, telegram_id, conn)

    conn.close()
    return {"statusCode": 200, "headers": cors, "body": "ok"}