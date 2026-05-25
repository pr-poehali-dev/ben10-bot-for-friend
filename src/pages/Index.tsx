import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";

const HERO_IMG = "https://cdn.poehali.dev/projects/71af8a95-d904-440f-ba6d-66038b668379/files/83e12519-d24c-4e92-ad72-e1fffea42488.jpg";
const FOUR_ARMS_IMG = "https://cdn.poehali.dev/projects/71af8a95-d904-440f-ba6d-66038b668379/files/07607e93-d68a-4fe8-b77a-7768704f7455.jpg";
const VILLAIN_IMG = "https://cdn.poehali.dev/projects/71af8a95-d904-440f-ba6d-66038b668379/files/39bbb539-9316-4e38-bd4c-5cccf1bfe75a.jpg";

interface Attack {
  id: string;
  name: string;
  emoji: string;
  damage: number;
  cost: number;
  special?: string;
  description: string;
}

interface Alien {
  id: string;
  name: string;
  emoji: string;
  image?: string;
  color: string;
  glowColor: string;
  description: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  attacks: Attack[];
  unlockLevel: number;
}

interface Enemy {
  id: string;
  name: string;
  emoji: string;
  image: string;
  color: string;
  glowColor: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  reward: number;
  attacks: Attack[];
}

interface PlayerStats {
  level: number;
  xp: number;
  xpToNext: number;
  totalWins: number;
  bonusAttack: number;
  bonusDefense: number;
}

const ALIENS: Alien[] = [
  {
    id: "heatblast",
    name: "Хитбласт",
    emoji: "🔥",
    image: HERO_IMG,
    color: "#ff6b00",
    glowColor: "rgba(255,107,0,0.5)",
    description: "Огненный пирокинетик, повелитель пламени",
    hp: 100,
    maxHp: 100,
    attack: 28,
    defense: 15,
    speed: 20,
    unlockLevel: 1,
    attacks: [
      { id: "fireball", name: "Огненный шар", emoji: "🔥", damage: 25, cost: 2, description: "Бросает шар пламени" },
      { id: "inferno", name: "Инферно", emoji: "💥", damage: 40, cost: 4, special: "burn", description: "Поджигает врага на 2 хода" },
      { id: "lavaflow", name: "Лавовый поток", emoji: "🌋", damage: 55, cost: 6, description: "Мощная волна лавы" },
    ],
  },
  {
    id: "fourarms",
    name: "Четыре Руки",
    emoji: "💪",
    image: FOUR_ARMS_IMG,
    color: "#cc0000",
    glowColor: "rgba(204,0,0,0.5)",
    description: "Могучий тетрамандец, мастер рукопашного боя",
    hp: 150,
    maxHp: 150,
    attack: 38,
    defense: 30,
    speed: 10,
    unlockLevel: 2,
    attacks: [
      { id: "punch", name: "Мощный удар", emoji: "👊", damage: 35, cost: 2, description: "Удар всеми четырьмя кулаками" },
      { id: "shockwave", name: "Ударная волна", emoji: "🌊", damage: 50, cost: 4, special: "stun", description: "Создаёт ударную волну" },
      { id: "megaslam", name: "Мега-удар", emoji: "⚡", damage: 70, cost: 6, description: "Сокрушительный удар о землю" },
    ],
  },
  {
    id: "xlr8",
    name: "XLR8",
    emoji: "⚡",
    color: "#0088ff",
    glowColor: "rgba(0,136,255,0.5)",
    description: "Сверхскоростной кинецелеран",
    hp: 80,
    maxHp: 80,
    attack: 22,
    defense: 12,
    speed: 50,
    unlockLevel: 3,
    attacks: [
      { id: "dash", name: "Молниеносный удар", emoji: "💨", damage: 30, cost: 2, description: "Атакует со скоростью молнии" },
      { id: "tornado", name: "Вихрь", emoji: "🌪️", damage: 45, cost: 4, description: "Создаёт торнадо вокруг врага" },
      { id: "speedblitz", name: "Спид-блиц", emoji: "⚡", damage: 65, cost: 5, special: "double", description: "Атакует дважды за ход" },
    ],
  },
  {
    id: "diamondhead",
    name: "Бриллиантовая Голова",
    emoji: "💎",
    color: "#00ccff",
    glowColor: "rgba(0,204,255,0.5)",
    description: "Кристаллический петросапиен",
    hp: 120,
    maxHp: 120,
    attack: 32,
    defense: 35,
    speed: 15,
    unlockLevel: 4,
    attacks: [
      { id: "shard", name: "Кристальный осколок", emoji: "💎", damage: 30, cost: 2, description: "Метает острые кристаллы" },
      { id: "prism", name: "Призма", emoji: "✨", damage: 50, cost: 4, special: "reflect", description: "Отражает часть урона" },
      { id: "crystal_storm", name: "Кристальный шторм", emoji: "❄️", damage: 65, cost: 6, description: "Буря из кристаллических осколков" },
    ],
  },
];

const ENEMIES: Enemy[] = [
  {
    id: "vilgax_drone",
    name: "Дрон Вилгакса",
    emoji: "🤖",
    image: VILLAIN_IMG,
    color: "#666",
    glowColor: "rgba(100,100,100,0.5)",
    hp: 80,
    maxHp: 80,
    attack: 18,
    defense: 10,
    reward: 30,
    attacks: [
      { id: "laser", name: "Лазерный луч", emoji: "🔴", damage: 15, cost: 0, description: "Лазерная атака" },
      { id: "missile", name: "Ракета", emoji: "🚀", damage: 25, cost: 0, description: "Ракетный удар" },
    ],
  },
  {
    id: "sublimino",
    name: "Субли-Майно",
    emoji: "👁️",
    image: VILLAIN_IMG,
    color: "#9900cc",
    glowColor: "rgba(153,0,204,0.5)",
    hp: 120,
    maxHp: 120,
    attack: 25,
    defense: 18,
    reward: 60,
    attacks: [
      { id: "hypno", name: "Гипноз", emoji: "👁️", damage: 20, cost: 0, description: "Гипнотическая атака" },
      { id: "mind_crush", name: "Ментальный удар", emoji: "🧠", damage: 35, cost: 0, description: "Ментальная атака" },
    ],
  },
  {
    id: "forever_knight",
    name: "Вечный Рыцарь",
    emoji: "⚔️",
    image: VILLAIN_IMG,
    color: "#885500",
    glowColor: "rgba(136,85,0,0.5)",
    hp: 160,
    maxHp: 160,
    attack: 32,
    defense: 28,
    reward: 100,
    attacks: [
      { id: "sword", name: "Удар мечом", emoji: "⚔️", damage: 28, cost: 0, description: "Мощный удар клинком" },
      { id: "shield_bash", name: "Удар щитом", emoji: "🛡️", damage: 20, cost: 0, special: "stun", description: "Оглушает врага" },
      { id: "lance", name: "Копьё", emoji: "🗡️", damage: 45, cost: 0, description: "Пронзающий удар" },
    ],
  },
  {
    id: "vilgax",
    name: "ВИЛГАКС",
    emoji: "👾",
    image: VILLAIN_IMG,
    color: "#cc0000",
    glowColor: "rgba(204,0,0,0.7)",
    hp: 250,
    maxHp: 250,
    attack: 45,
    defense: 40,
    reward: 200,
    attacks: [
      { id: "tentacle", name: "Щупальца", emoji: "🦑", damage: 40, cost: 0, description: "Атака щупальцами" },
      { id: "beam", name: "Энергетический луч", emoji: "☄️", damage: 60, cost: 0, description: "Мощный луч энергии" },
      { id: "crush", name: "Сокрушение", emoji: "💀", damage: 80, cost: 0, description: "Смертоносная атака" },
    ],
  },
];

type GameScreen = "menu" | "select_alien" | "battle" | "victory" | "defeat" | "levelup";

function HealthBar({ current, max, color }: { current: number; max: number; color: string }) {
  const pct = Math.max(0, (current / max) * 100);
  const barColor = pct > 50 ? color : pct > 25 ? "#ffaa00" : "#ff2200";
  return (
    <div className="w-full h-3 bg-gray-900 rounded-full overflow-hidden border border-gray-700">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: barColor, boxShadow: `0 0 8px ${barColor}` }}
      />
    </div>
  );
}

function XPBar({ current, max }: { current: number; max: number }) {
  const pct = (current / max) * 100;
  return (
    <div className="w-full h-2 bg-gray-900 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: "linear-gradient(90deg, #00ff41, #00cc33)", boxShadow: "0 0 6px #00ff41" }}
      />
    </div>
  );
}

function EnergyDots({ current, max }: { current: number; max: number }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className="w-4 h-4 rounded-full border transition-all duration-300"
          style={{
            backgroundColor: i < current ? "#00ff41" : "transparent",
            borderColor: i < current ? "#00ff41" : "#333",
            boxShadow: i < current ? "0 0 6px #00ff41" : "none",
          }}
        />
      ))}
    </div>
  );
}

function AttackButton({ attack, onClick, disabled }: { attack: Attack; onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full p-3 rounded-lg text-left transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: "linear-gradient(135deg, rgba(0,30,10,0.9), rgba(0,50,20,0.9))",
        border: "1px solid rgba(0,255,65,0.3)",
        boxShadow: disabled ? "none" : "0 0 8px rgba(0,255,65,0.1)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{attack.emoji}</span>
          <div>
            <div className="font-rajdhani font-bold text-white text-sm">{attack.name}</div>
            <div className="text-xs text-gray-400">{attack.description}</div>
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-2">
          <div className="font-orbitron text-red-400 font-bold text-sm">-{attack.damage}</div>
          <div className="text-xs text-gray-400">⚡{attack.cost}</div>
        </div>
      </div>
    </button>
  );
}

export default function Index() {
  const [screen, setScreen] = useState<GameScreen>("menu");
  const [selectedAlien, setSelectedAlien] = useState<Alien | null>(null);
  const [enemyIndex, setEnemyIndex] = useState(0);
  const [playerHp, setPlayerHp] = useState(100);
  const [enemyHp, setEnemyHp] = useState(0);
  const [energy, setEnergy] = useState(6);
  const maxEnergy = 6;
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shakeEnemy, setShakeEnemy] = useState(false);
  const [shakePlayer, setShakePlayer] = useState(false);
  const [flashEffect, setFlashEffect] = useState<"none" | "green" | "red">("none");
  const [transforming, setTransforming] = useState(false);
  const [stats, setStats] = useState<PlayerStats>({
    level: 1, xp: 0, xpToNext: 100, totalWins: 0, bonusAttack: 0, bonusDefense: 0,
  });
  const [unlockedAliens, setUnlockedAliens] = useState<string[]>(["heatblast"]);
  const [pendingXP, setPendingXP] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);

  const currentEnemy = ENEMIES[enemyIndex];

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [battleLog]);

  const addLog = (msg: string) => setBattleLog(prev => [...prev.slice(-20), msg]);

  const startBattle = (alien: Alien) => {
    const enemy = ENEMIES[enemyIndex];
    setSelectedAlien({ ...alien, hp: alien.maxHp });
    setPlayerHp(alien.maxHp + stats.bonusDefense * 5);
    setEnemyHp(enemy.maxHp);
    setEnergy(maxEnergy);
    setBattleLog([
      "⚡ БОЙ НАЧАЛСЯ!",
      `Бен трансформируется в ${alien.name} ${alien.emoji}`,
      `Противник: ${enemy.name} ${enemy.emoji}`,
    ]);
    setIsPlayerTurn(true);
    setIsAnimating(false);
    setScreen("battle");
    setTransforming(true);
    setTimeout(() => setTransforming(false), 800);
  };

  const enemyTurn = (currentEnemyHp: number, currentPlayerHp: number, alien: Alien) => {
    const enemy = ENEMIES[enemyIndex];
    const ea = enemy.attacks[Math.floor(Math.random() * enemy.attacks.length)];
    const base = Math.max(1, ea.damage - alien.defense - stats.bonusDefense * 2);
    const crit = Math.random() < 0.1;
    const dmg = crit ? Math.floor(base * 1.5) : base;

    setShakePlayer(true);
    setFlashEffect("green");
    setTimeout(() => { setShakePlayer(false); setFlashEffect("none"); }, 400);
    addLog(`${enemy.emoji} ${ea.name}${crit ? " 💥 КРИТ!" : ""} → ${dmg} урона тебе`);

    const newHp = Math.max(0, currentPlayerHp - dmg);
    setPlayerHp(newHp);
    setEnergy(e => Math.min(maxEnergy, e + 2));

    if (newHp <= 0) {
      setTimeout(() => { addLog("💀 Ты проиграл..."); setScreen("defeat"); }, 500);
    } else {
      setIsPlayerTurn(true);
    }
    setIsAnimating(false);
  };

  const playerAttack = (attack: Attack) => {
    if (!isPlayerTurn || isAnimating || !selectedAlien) return;
    if (energy < attack.cost) { addLog("⚠️ Недостаточно энергии!"); return; }

    setIsAnimating(true);
    setEnergy(e => e - attack.cost);

    const base = Math.max(1, attack.damage + stats.bonusAttack * 3 - currentEnemy.defense);
    const crit = Math.random() < 0.15;
    const dmg = crit ? Math.floor(base * 1.5) : base;

    setShakeEnemy(true);
    setFlashEffect("red");
    setTimeout(() => { setShakeEnemy(false); setFlashEffect("none"); }, 400);
    addLog(`${selectedAlien.emoji} ${attack.name}${crit ? " 💥 КРИТ!" : ""} → ${dmg} урона`);
    if (attack.special === "burn") addLog("🔥 Враг горит!");
    if (attack.special === "stun") addLog("⚡ Враг оглушён!");

    const newEnemyHp = Math.max(0, enemyHp - dmg);
    setEnemyHp(newEnemyHp);

    if (newEnemyHp <= 0) {
      setTimeout(() => {
        addLog(`🏆 ${currentEnemy.name} повержен!`);
        const xpGain = currentEnemy.reward;
        setPendingXP(xpGain);
        const newXP = stats.xp + xpGain;
        if (newXP >= stats.xpToNext) {
          const newLevel = stats.level + 1;
          const newAliens = ALIENS.filter(a => a.unlockLevel === newLevel).map(a => a.id);
          setUnlockedAliens(prev => [...prev, ...newAliens]);
          setStats(s => ({
            ...s,
            level: newLevel,
            xp: newXP - s.xpToNext,
            xpToNext: Math.floor(s.xpToNext * 1.5),
            totalWins: s.totalWins + 1,
            bonusAttack: s.bonusAttack + 2,
            bonusDefense: s.bonusDefense + 1,
          }));
          setTimeout(() => setScreen("levelup"), 800);
        } else {
          setStats(s => ({ ...s, xp: newXP, totalWins: s.totalWins + 1 }));
          setTimeout(() => setScreen("victory"), 800);
        }
        setIsAnimating(false);
      }, 600);
      return;
    }

    const alien = selectedAlien;
    const curPHp = playerHp;
    setTimeout(() => enemyTurn(newEnemyHp, curPHp, alien), 800);
  };

  const nextBattle = () => {
    setEnemyIndex(i => Math.min(i + 1, ENEMIES.length - 1));
    setScreen("select_alien");
  };

  const restart = () => {
    setEnemyIndex(0);
    setStats({ level: 1, xp: 0, xpToNext: 100, totalWins: 0, bonusAttack: 0, bonusDefense: 0 });
    setUnlockedAliens(["heatblast"]);
    setScreen("menu");
  };

  // ── MENU ──────────────────────────────────────────────
  if (screen === "menu") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
        style={{ background: "radial-gradient(ellipse at center, #001a08 0%, #000d04 50%, #000000 100%)" }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: Math.random() * 3 + 1 + "px",
                height: Math.random() * 3 + 1 + "px",
                background: "#00ff41",
                left: Math.random() * 100 + "%",
                top: Math.random() * 100 + "%",
                opacity: 0.2,
                boxShadow: "0 0 6px #00ff41",
                animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
                animationDelay: Math.random() * 4 + "s",
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex flex-col items-center gap-8 px-4 animate-slide-up">
          <div className="relative">
            <div
              className="w-40 h-40 rounded-full overflow-hidden border-4 animate-float"
              style={{ borderColor: "#00ff41", boxShadow: "0 0 40px rgba(0,255,65,0.6), 0 0 80px rgba(0,255,65,0.2)" }}
            >
              <img src={HERO_IMG} alt="Ben 10" className="w-full h-full object-cover" />
            </div>
            <div
              className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full bg-black border-2 flex items-center justify-center text-2xl animate-omnitrix-pulse"
              style={{ borderColor: "#00ff41" }}
            >⌚</div>
          </div>

          <div className="text-center">
            <div
              className="font-orbitron text-4xl font-black tracking-widest mb-1"
              style={{ color: "#00ff41", textShadow: "0 0 20px #00ff41, 0 0 40px rgba(0,255,65,0.5)" }}
            >BEN 10</div>
            <div className="font-orbitron text-lg font-bold tracking-[0.3em] text-gray-400">OMNITRIX WARS</div>
          </div>

          <p className="font-rajdhani text-gray-400 text-sm text-center max-w-xs leading-relaxed">
            Используй силу Омнитрикса! Трансформируйся в инопланетян, сражайся с врагами и стань героем вселенной
          </p>

          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={() => setScreen("select_alien")}
              className="w-full py-4 font-orbitron font-bold text-lg tracking-widest uppercase rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #003311, #00661a)",
                border: "2px solid #00ff41",
                color: "#00ff41",
                boxShadow: "0 0 20px rgba(0,255,65,0.4), 0 0 40px rgba(0,255,65,0.1)",
              }}
            >⌚ НАЧАТЬ ИГРУ</button>
            <div className="text-center font-rajdhani text-gray-600 text-xs">
              УРОВЕНЬ {stats.level} · {stats.totalWins} ПОБЕД
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── SELECT ALIEN ──────────────────────────────────────
  if (screen === "select_alien") {
    return (
      <div
        className="min-h-screen p-4 relative overflow-hidden"
        style={{ background: "radial-gradient(ellipse at top, #001a08 0%, #000d04 50%, #000000 100%)" }}
      >
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-6 animate-fade-in">
            <div className="font-orbitron text-xl font-bold mb-1" style={{ color: "#00ff41" }}>ВЫБОР ТРАНСФОРМАЦИИ</div>
            <div className="font-rajdhani text-gray-400 mb-2">Противник: {currentEnemy.name} {currentEnemy.emoji}</div>
            <div className="flex items-center justify-center gap-3">
              <span className="font-rajdhani text-xs text-gray-500">УР.{stats.level}</span>
              <div className="flex-1 max-w-32"><XPBar current={stats.xp} max={stats.xpToNext} /></div>
              <span className="font-rajdhani text-xs text-gray-500">{stats.xp}/{stats.xpToNext}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {ALIENS.map((alien) => {
              const unlocked = unlockedAliens.includes(alien.id);
              return (
                <div
                  key={alien.id}
                  onClick={() => unlocked && startBattle(alien)}
                  className="relative rounded-xl overflow-hidden transition-all duration-300"
                  style={{
                    border: unlocked ? `1px solid ${alien.color}44` : "1px solid #333",
                    background: unlocked
                      ? `linear-gradient(135deg, rgba(0,10,0,0.95), ${alien.color}11)`
                      : "rgba(0,0,0,0.5)",
                    boxShadow: unlocked ? `0 0 15px ${alien.glowColor}` : "none",
                    opacity: unlocked ? 1 : 0.5,
                    cursor: unlocked ? "pointer" : "default",
                  }}
                >
                  <div className="flex items-center gap-4 p-4">
                    <div
                      className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0"
                      style={{ border: `2px solid ${alien.color}`, boxShadow: unlocked ? `0 0 10px ${alien.glowColor}` : "none" }}
                    >
                      {alien.image ? (
                        <img src={alien.image} alt={alien.name} className="w-full h-full object-cover" />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center text-4xl"
                          style={{ background: `linear-gradient(135deg, ${alien.color}22, ${alien.color}44)` }}
                        >{alien.emoji}</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-orbitron font-bold text-white text-sm">{alien.name}</span>
                        {!unlocked && (
                          <span className="font-rajdhani text-xs px-2 py-0.5 rounded" style={{ background: "#333", color: "#666" }}>
                            УР.{alien.unlockLevel}
                          </span>
                        )}
                      </div>
                      <div className="font-rajdhani text-gray-400 text-xs mb-2">{alien.description}</div>
                      <div className="flex gap-3 text-xs font-rajdhani">
                        <span className="text-red-400">⚔️ {alien.attack + stats.bonusAttack * 3}</span>
                        <span className="text-blue-400">🛡️ {alien.defense + stats.bonusDefense * 2}</span>
                        <span className="text-yellow-400">❤️ {alien.maxHp}</span>
                      </div>
                    </div>
                    {unlocked
                      ? <Icon name="ChevronRight" size={20} className="text-gray-600 flex-shrink-0" />
                      : <Icon name="Lock" size={20} className="flex-shrink-0" style={{ color: "#555" }} />}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setScreen("menu")}
            className="mt-4 w-full py-2 font-rajdhani text-gray-500 text-sm hover:text-gray-300 transition-colors"
          >← НАЗАД</button>
        </div>
      </div>
    );
  }

  // ── BATTLE ────────────────────────────────────────────
  if (screen === "battle" && selectedAlien) {
    const maxPlayerHp = selectedAlien.maxHp + stats.bonusDefense * 5;
    return (
      <div
        className="min-h-screen flex flex-col relative overflow-hidden"
        style={{ background: "radial-gradient(ellipse at center, #000d04 0%, #000000 100%)" }}
      >
        {flashEffect === "red" && (
          <div
            className="absolute inset-0 pointer-events-none z-50"
            style={{ background: "radial-gradient(ellipse at 70% 30%, rgba(255,0,0,0.2) 0%, transparent 60%)" }}
          />
        )}
        {flashEffect === "green" && (
          <div
            className="absolute inset-0 pointer-events-none z-50"
            style={{ background: "radial-gradient(ellipse at 30% 30%, rgba(0,255,65,0.15) 0%, transparent 60%)" }}
          />
        )}

        <div className="flex-1 flex flex-col p-4 max-w-lg mx-auto w-full">
          <div className="flex items-center justify-between mb-4 font-rajdhani text-xs text-gray-500">
            <span>УР.{stats.level}</span>
            <span style={{ color: "#00ff41" }}>⌚ OMNITRIX WARS</span>
            <span>{stats.totalWins} побед</span>
          </div>

          <div className="flex items-center justify-between gap-4 mb-4">
            {/* Player alien */}
            <div
              className="flex flex-col items-center gap-2 flex-1"
              style={{ animation: shakePlayer ? "shake 0.3s ease-in-out" : "none" }}
            >
              <div className="font-orbitron text-xs font-bold" style={{ color: selectedAlien.color }}>
                {selectedAlien.name}
              </div>
              <div
                className="relative w-28 h-28 rounded-xl overflow-hidden"
                style={{
                  border: `2px solid ${selectedAlien.color}`,
                  boxShadow: `0 0 20px ${selectedAlien.glowColor}`,
                  animation: transforming ? "transform-flash 0.6s ease-out" : "float 3s ease-in-out infinite",
                }}
              >
                {selectedAlien.image ? (
                  <img src={selectedAlien.image} alt={selectedAlien.name} className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-5xl"
                    style={{ background: `linear-gradient(135deg, ${selectedAlien.color}22, ${selectedAlien.color}44)` }}
                  >{selectedAlien.emoji}</div>
                )}
              </div>
              <div className="w-full space-y-1">
                <div className="flex justify-between font-rajdhani text-xs">
                  <span className="text-gray-400">HP</span>
                  <span style={{ color: selectedAlien.color }}>{playerHp}/{maxPlayerHp}</span>
                </div>
                <HealthBar current={playerHp} max={maxPlayerHp} color={selectedAlien.color} />
              </div>
            </div>

            <div className="font-orbitron text-gray-600 text-xs">VS</div>

            {/* Enemy */}
            <div
              className="flex flex-col items-center gap-2 flex-1"
              style={{ animation: shakeEnemy ? "shake 0.3s ease-in-out" : "none" }}
            >
              <div className="font-orbitron text-xs font-bold text-red-400">{currentEnemy.name}</div>
              <div
                className="relative w-28 h-28 rounded-xl overflow-hidden"
                style={{ border: `2px solid ${currentEnemy.color}`, boxShadow: `0 0 20px ${currentEnemy.glowColor}` }}
              >
                <img
                  src={currentEnemy.image}
                  alt={currentEnemy.name}
                  className="w-full h-full object-cover"
                  style={{ filter: "hue-rotate(200deg) saturate(0.7)" }}
                />
              </div>
              <div className="w-full space-y-1">
                <div className="flex justify-between font-rajdhani text-xs">
                  <span className="text-gray-400">HP</span>
                  <span className="text-red-400">{enemyHp}/{currentEnemy.maxHp}</span>
                </div>
                <HealthBar current={enemyHp} max={currentEnemy.maxHp} color="#cc0000" />
              </div>
            </div>
          </div>

          <div className="mb-3 flex items-center gap-3">
            <span className="font-rajdhani text-xs text-gray-500">ЭНЕРГИЯ</span>
            <EnergyDots current={energy} max={maxEnergy} />
          </div>

          <div
            ref={logRef}
            className="mb-3 h-20 overflow-y-auto rounded-lg p-2 font-rajdhani text-xs space-y-0.5"
            style={{ background: "rgba(0,0,0,0.6)", border: "1px solid #111" }}
          >
            {battleLog.map((log, i) => (
              <div key={i} className="text-gray-400 leading-tight">{log}</div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="font-orbitron text-xs text-gray-600 mb-1">
              {isPlayerTurn ? "✅ ТВОЙ ХОД" : "⏳ ХОД ВРАГА..."}
            </div>
            {selectedAlien.attacks.map(attack => (
              <AttackButton
                key={attack.id}
                attack={attack}
                onClick={() => playerAttack(attack)}
                disabled={!isPlayerTurn || isAnimating || energy < attack.cost}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── VICTORY / LEVELUP ─────────────────────────────────
  if (screen === "victory" || screen === "levelup") {
    const isLevelUp = screen === "levelup";
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden"
        style={{ background: "radial-gradient(ellipse at center, #001a08 0%, #000000 100%)" }}
      >
        <div className="animate-glow-burst space-y-6 max-w-sm w-full">
          <div className="text-7xl">{isLevelUp ? "🆙" : "🏆"}</div>
          <div>
            <div
              className="font-orbitron text-3xl font-black"
              style={{ color: "#00ff41", textShadow: "0 0 20px #00ff41" }}
            >{isLevelUp ? "НОВЫЙ УРОВЕНЬ!" : "ПОБЕДА!"}</div>
            <div className="font-rajdhani text-gray-400 mt-2">
              {isLevelUp
                ? `Уровень ${stats.level}! +2 атака, +1 защита`
                : `+${pendingXP} XP · ${currentEnemy.name} повержен`}
            </div>
          </div>

          {isLevelUp && (
            <div
              className="rounded-xl p-4 space-y-2"
              style={{ border: "1px solid #00ff4144", background: "rgba(0,255,65,0.05)" }}
            >
              <div className="font-orbitron text-sm text-white">ПРИРОСТ ХАРАКТЕРИСТИК</div>
              <div className="flex justify-around font-rajdhani text-sm">
                <div><div className="text-red-400">⚔️ +{stats.bonusAttack * 3}</div><div className="text-gray-600">Атака</div></div>
                <div><div className="text-blue-400">🛡️ +{stats.bonusDefense * 2}</div><div className="text-gray-600">Защита</div></div>
              </div>
              {ALIENS.filter(a => a.unlockLevel === stats.level).map(a => (
                <div key={a.id} className="font-rajdhani text-sm" style={{ color: "#00ff41" }}>
                  🔓 Разблокирован: {a.name} {a.emoji}
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-3">
            {enemyIndex < ENEMIES.length - 1 ? (
              <button
                onClick={nextBattle}
                className="w-full py-3 font-orbitron font-bold tracking-widest uppercase rounded-lg transition-all hover:scale-105"
                style={{
                  background: "linear-gradient(135deg, #003311, #00661a)",
                  border: "2px solid #00ff41",
                  color: "#00ff41",
                  boxShadow: "0 0 20px rgba(0,255,65,0.3)",
                }}
              >СЛЕДУЮЩИЙ БОЙ →</button>
            ) : (
              <div className="font-rajdhani text-gray-400">🎉 Ты победил всех врагов!</div>
            )}
            <button
              onClick={() => setScreen("select_alien")}
              className="w-full py-2 font-rajdhani text-gray-500 hover:text-white transition-colors"
            >Выбрать другого инопланетянина</button>
            <button
              onClick={restart}
              className="w-full py-2 font-rajdhani text-gray-600 hover:text-gray-400 transition-colors text-sm"
            >Начать заново</button>
          </div>
        </div>
      </div>
    );
  }

  // ── DEFEAT ────────────────────────────────────────────
  if (screen === "defeat") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden"
        style={{ background: "radial-gradient(ellipse at center, #1a0000 0%, #000000 100%)" }}
      >
        <div className="animate-fade-in space-y-6 max-w-sm w-full">
          <div className="text-7xl">💀</div>
          <div>
            <div
              className="font-orbitron text-3xl font-black text-red-500"
              style={{ textShadow: "0 0 20px #ff0000" }}
            >ПОРАЖЕНИЕ</div>
            <div className="font-rajdhani text-gray-400 mt-2">
              {currentEnemy.name} оказался сильнее...
            </div>
          </div>
          <div
            className="rounded-xl p-4"
            style={{ border: "1px solid #ff000033", background: "rgba(255,0,0,0.05)" }}
          >
            <div className="font-rajdhani text-sm text-gray-400">
              Победы: {stats.totalWins} · Уровень: {stats.level}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setScreen("select_alien")}
              className="w-full py-3 font-orbitron font-bold tracking-widest uppercase rounded-lg transition-all hover:scale-105"
              style={{
                background: "linear-gradient(135deg, #330000, #660011)",
                border: "2px solid #ff2200",
                color: "#ff4400",
                boxShadow: "0 0 20px rgba(255,34,0,0.3)",
              }}
            >ПОПРОБОВАТЬ СНОВА</button>
            <button
              onClick={restart}
              className="w-full py-2 font-rajdhani text-gray-600 hover:text-gray-400 transition-colors text-sm"
            >Начать заново</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
