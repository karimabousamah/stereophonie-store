"use client";

import {
  Gamepad2,
  Pause,
  Play,
  RotateCcw,
  Trophy,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Direction = "up" | "down" | "left" | "right";

type GameId =
  | "snake"
  | "dodge"
  | "targets"
  | "reaction"
  | "breakout"
  | "space-defender"
  | "memory"
  | "turbo-racer";

type GameDefinition = {
  id: GameId;
  code: string;
  title: string;
  subtitle: string;
  controls: string;
};

const games: GameDefinition[] = [
  {
    id: "snake",
    code: "01",
    title: "PIXEL SNAKE",
    subtitle: "Classic grid survival.",
    controls: "D-PAD / ARROWS / WASD",
  },
  {
    id: "dodge",
    code: "02",
    title: "NEON DODGE",
    subtitle: "Avoid incoming signals.",
    controls: "LEFT / RIGHT",
  },
  {
    id: "targets",
    code: "03",
    title: "TARGET RUSH",
    subtitle: "Acquire targets before timeout.",
    controls: "D-PAD + A",
  },
  {
    id: "reaction",
    code: "04",
    title: "REACTION TEST",
    subtitle: "Press A when the signal turns green.",
    controls: "A / SPACE",
  },
  {
    id: "breakout",
    code: "05",
    title: "BREAKOUT",
    subtitle: "Break the signal wall.",
    controls: "LEFT / RIGHT",
  },
  {
    id: "space-defender",
    code: "06",
    title: "SPACE DEFENDER",
    subtitle: "Defend the terminal.",
    controls: "LEFT / RIGHT + A",
  },
  {
    id: "memory",
    code: "07",
    title: "MEMORY MATRIX",
    subtitle: "Repeat the system sequence.",
    controls: "D-PAD + A",
  },
  {
    id: "turbo-racer",
    code: "08",
    title: "TURBO RACER",
    subtitle: "Survive the data highway.",
    controls: "LEFT / RIGHT",
  },
];

const GRID = 14;
const TICK_MS = 145;

type Point = {
  x: number;
  y: number;
};

function pointKey(point: Point) {
  return `${point.x}-${point.y}`;
}

function randomPoint(excluded: Point[] = []): Point {
  const excludedKeys = new Set(excluded.map(pointKey));

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const point = {
      x: Math.floor(Math.random() * GRID),
      y: Math.floor(Math.random() * GRID),
    };

    if (!excludedKeys.has(pointKey(point))) {
      return point;
    }
  }

  return { x: 1, y: 1 };
}

function highScoreKey(game: GameId) {
  return `stereophonie-arcade-high-score-${game}`;
}

export default function StereophonieMiniGame() {
  const [poweredOn, setPoweredOn] = useState(true);
  const [powerBooting, setPowerBooting] = useState(false);
  const [poweringOff, setPoweringOff] = useState(false);

  const [selectedGame, setSelectedGame] = useState<GameId | null>(null);
  const [menuIndex, setMenuIndex] = useState(0);

  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const [score, setScore] = useState(0);
  const [highScores, setHighScores] = useState<Record<GameId, number>>({
    snake: 0,
    dodge: 0,
    targets: 0,
    reaction: 0,
    breakout: 0,
    "space-defender": 0,
    memory: 0,
    "turbo-racer": 0,
  });

  const [snake, setSnake] = useState<Point[]>([
    { x: 6, y: 7 },
    { x: 5, y: 7 },
    { x: 4, y: 7 },
  ]);

  const [direction, setDirection] = useState<Direction>("right");
  const directionRef = useRef<Direction>("right");
  const [food, setFood] = useState<Point>({ x: 10, y: 7 });

  const [dodgePlayerX, setDodgePlayerX] = useState(6);
  const [obstacles, setObstacles] = useState<Point[]>([]);

  const [targetCursor, setTargetCursor] = useState<Point>({ x: 6, y: 7 });
  const [target, setTarget] = useState<Point>({ x: 9, y: 4 });
  const [targetTimer, setTargetTimer] = useState(100);

  const [reactionState, setReactionState] = useState<
    "waiting" | "armed" | "go" | "result"
  >("waiting");

  const [reactionMessage, setReactionMessage] = useState("PRESS START");
  const reactionStartRef = useRef(0);
  const reactionTimerRef = useRef<number | null>(null);

  // BREAKOUT
  const [breakoutPaddleX, setBreakoutPaddleX] = useState(5);
  const [breakoutBall, setBreakoutBall] = useState<Point>({ x: 7, y: 10 });
  const breakoutVelocityRef = useRef<Point>({ x: 1, y: -1 });
  const [breakoutBricks, setBreakoutBricks] = useState<Set<string>>(
    () =>
      new Set(
        Array.from({ length: 42 }, (_, index) => {
          const x = index % GRID;
          const y = Math.floor(index / GRID);
          return `${x}-${y}`;
        }),
      ),
  );

  // SPACE DEFENDER
  const [spacePlayerX, setSpacePlayerX] = useState(6);
  const [spaceBullets, setSpaceBullets] = useState<Point[]>([]);
  const [spaceEnemies, setSpaceEnemies] = useState<Point[]>([
    { x: 2, y: 1 },
    { x: 5, y: 1 },
    { x: 8, y: 1 },
    { x: 11, y: 1 },
    { x: 3, y: 3 },
    { x: 7, y: 3 },
    { x: 10, y: 3 },
  ]);

  // MEMORY MATRIX
  const [memorySequence, setMemorySequence] = useState<Direction[]>([]);
  const [memoryInputIndex, setMemoryInputIndex] = useState(0);
  const [memoryFlash, setMemoryFlash] = useState<Direction | null>(null);
  const [memoryAcceptingInput, setMemoryAcceptingInput] = useState(false);
  const memoryPlaybackTimersRef = useRef<number[]>([]);

  // TURBO RACER
  const [racerLane, setRacerLane] = useState(1);
  const [racerTraffic, setRacerTraffic] = useState<Point[]>([]);
  const racerTickRef = useRef(0);

  const activeDefinition =
    games.find((game) => game.id === selectedGame) ?? null;

  const engineGame = selectedGame;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const nextScores: Record<GameId, number> = {
      snake: Number(localStorage.getItem(highScoreKey("snake"))) || 0,
      dodge: Number(localStorage.getItem(highScoreKey("dodge"))) || 0,
      targets: Number(localStorage.getItem(highScoreKey("targets"))) || 0,
      reaction: Number(localStorage.getItem(highScoreKey("reaction"))) || 0,
      breakout: Number(localStorage.getItem(highScoreKey("breakout"))) || 0,
      "space-defender":
        Number(localStorage.getItem(highScoreKey("space-defender"))) || 0,
      memory: Number(localStorage.getItem(highScoreKey("memory"))) || 0,
      "turbo-racer":
        Number(localStorage.getItem(highScoreKey("turbo-racer"))) || 0,
    };

    setHighScores(nextScores);
  }, []);

  const commitScore = useCallback((game: GameId, nextScore: number) => {
    setHighScores((current) => {
      if (nextScore <= current[game]) {
        return current;
      }

      if (typeof window !== "undefined") {
        localStorage.setItem(highScoreKey(game), String(nextScore));
      }

      return {
        ...current,
        [game]: nextScore,
      };
    });
  }, []);

  const resetGame = useCallback(
    (game: GameId | null = selectedGame) => {
      setScore(0);
      setPaused(false);

      setSnake([
        { x: 6, y: 7 },
        { x: 5, y: 7 },
        { x: 4, y: 7 },
      ]);

      directionRef.current = "right";
      setDirection("right");
      setFood({ x: 10, y: 7 });

      setDodgePlayerX(6);
      setObstacles([]);

      setTargetCursor({ x: 6, y: 7 });
      setTarget({ x: 9, y: 4 });
      setTargetTimer(100);

      setReactionState("waiting");
      setReactionMessage("PRESS START");

      if (reactionTimerRef.current !== null) {
        window.clearTimeout(reactionTimerRef.current);
        reactionTimerRef.current = null;
      }

      if (game) {
        setRunning(true);
      }
    },
    [selectedGame],
  );

  function returnToLibrary() {
    if (!poweredOn || powerBooting) {
      return;
    }

    if (selectedGame) {
      commitScore(selectedGame, score);
    }

    setRunning(false);
    setPaused(false);
    setSelectedGame(null);
    setScore(0);
  }

  function chooseGame(index = menuIndex) {
    const game = games[index];

    setSelectedGame(game.id);
    setRunning(true);

    window.setTimeout(() => {
      resetGame(game.id);
    }, 0);
  }

  function playMemorySequence(sequence: Direction[]) {
    memoryPlaybackTimersRef.current.forEach((timer) => {
      window.clearTimeout(timer);
    });

    memoryPlaybackTimersRef.current = [];

    setMemoryAcceptingInput(false);
    setMemoryInputIndex(0);

    sequence.forEach((direction, index) => {
      const flashOn = window.setTimeout(
        () => {
          setMemoryFlash(direction);
        },
        350 + index * 600,
      );

      const flashOff = window.setTimeout(
        () => {
          setMemoryFlash(null);

          if (index === sequence.length - 1) {
            setMemoryAcceptingInput(true);
          }
        },
        690 + index * 600,
      );

      memoryPlaybackTimersRef.current.push(flashOn, flashOff);
    });
  }

  function startMemoryRound(existingSequence: Direction[] = []) {
    const directions: Direction[] = ["up", "right", "down", "left"];

    const nextDirection =
      directions[Math.floor(Math.random() * directions.length)];

    const nextSequence = [...existingSequence, nextDirection];

    setMemorySequence(nextSequence);
    playMemorySequence(nextSequence);
  }

  function move(directionToUse: Direction) {
    if (!poweredOn || powerBooting) {
      return;
    }

    if (!selectedGame) {
      if (directionToUse === "up" || directionToUse === "left") {
        setMenuIndex((current) =>
          current <= 0 ? games.length - 1 : current - 1,
        );
      } else {
        setMenuIndex((current) =>
          current >= games.length - 1 ? 0 : current + 1,
        );
      }

      return;
    }

    if (paused || !running) {
      return;
    }

    if (engineGame === "snake") {
      const opposites: Record<Direction, Direction> = {
        up: "down",
        down: "up",
        left: "right",
        right: "left",
      };

      if (opposites[directionRef.current] !== directionToUse) {
        directionRef.current = directionToUse;
        setDirection(directionToUse);
      }

      return;
    }

    if (engineGame === "dodge") {
      if (directionToUse === "left") {
        setDodgePlayerX((current) => Math.max(0, current - 1));
      }

      if (directionToUse === "right") {
        setDodgePlayerX((current) => Math.min(GRID - 1, current + 1));
      }

      return;
    }

    if (engineGame === "targets") {
      setTargetCursor((current) => ({
        x:
          directionToUse === "left"
            ? Math.max(0, current.x - 1)
            : directionToUse === "right"
              ? Math.min(GRID - 1, current.x + 1)
              : current.x,
        y:
          directionToUse === "up"
            ? Math.max(0, current.y - 1)
            : directionToUse === "down"
              ? Math.min(GRID - 1, current.y + 1)
              : current.y,
      }));
    }

    if (engineGame === "breakout") {
      if (directionToUse === "left") {
        setBreakoutPaddleX((current) => Math.max(0, current - 1));
      }

      if (directionToUse === "right") {
        setBreakoutPaddleX((current) => Math.min(GRID - 3, current + 1));
      }

      return;
    }

    if (engineGame === "space-defender") {
      if (directionToUse === "left") {
        setSpacePlayerX((current) => Math.max(0, current - 1));
      }

      if (directionToUse === "right") {
        setSpacePlayerX((current) => Math.min(GRID - 1, current + 1));
      }

      return;
    }

    if (engineGame === "memory") {
      if (!memoryAcceptingInput) {
        return;
      }

      const expected = memorySequence[memoryInputIndex];

      setMemoryFlash(directionToUse);

      window.setTimeout(() => {
        setMemoryFlash(null);
      }, 150);

      if (directionToUse !== expected) {
        commitScore("memory", score);
        setRunning(false);
        setMemoryAcceptingInput(false);
        return;
      }

      if (memoryInputIndex >= memorySequence.length - 1) {
        const nextScore = score + 100;

        setScore(nextScore);
        commitScore("memory", nextScore);
        setMemoryAcceptingInput(false);

        window.setTimeout(() => {
          startMemoryRound(memorySequence);
        }, 600);

        return;
      }

      setMemoryInputIndex((current) => current + 1);
      return;
    }

    if (engineGame === "turbo-racer") {
      if (directionToUse === "left") {
        setRacerLane((current) => Math.max(0, current - 1));
      }

      if (directionToUse === "right") {
        setRacerLane((current) => Math.min(2, current + 1));
      }

      return;
    }
  }

  function pressA() {
    if (!poweredOn || powerBooting) {
      return;
    }

    if (!selectedGame) {
      chooseGame();
      return;
    }

    if (engineGame === "targets" && running && !paused) {
      if (targetCursor.x === target.x && targetCursor.y === target.y) {
        const nextScore = score + 100;

        setScore(nextScore);
        commitScore("targets", nextScore);

        setTarget((currentTarget) =>
          randomPoint([currentTarget, targetCursor]),
        );

        setTargetTimer(100);
      }

      return;
    }

    if (engineGame === "space-defender" && running && !paused) {
      setSpaceBullets((current) => [
        ...current,
        {
          x: spacePlayerX,
          y: GRID - 3,
        },
      ]);

      return;
    }

    if (
      engineGame === "memory" &&
      running &&
      !paused &&
      memorySequence.length === 0
    ) {
      startMemoryRound();
      return;
    }

    if (engineGame === "reaction") {
      if (reactionState === "waiting" || reactionState === "result") {
        setReactionState("armed");
        setReactionMessage("WAIT...");

        const delay = 900 + Math.random() * 2600;

        reactionTimerRef.current = window.setTimeout(() => {
          reactionStartRef.current = performance.now();
          setReactionState("go");
          setReactionMessage("PRESS A!");
        }, delay);

        return;
      }

      if (reactionState === "armed") {
        if (reactionTimerRef.current !== null) {
          window.clearTimeout(reactionTimerRef.current);
          reactionTimerRef.current = null;
        }

        setReactionState("result");
        setReactionMessage("TOO EARLY");
        setScore(0);
        return;
      }

      if (reactionState === "go") {
        const milliseconds = Math.round(
          performance.now() - reactionStartRef.current,
        );

        const reactionScore = Math.max(0, 1000 - milliseconds);

        setScore(reactionScore);
        commitScore("reaction", reactionScore);
        setReactionState("result");
        setReactionMessage(`${milliseconds} MS`);
      }
    }
  }

  function pressB() {
    if (!selectedGame) {
      setMenuIndex(0);
      return;
    }

    resetGame(selectedGame);
  }

  function pressStart() {
    if (!poweredOn || powerBooting) {
      return;
    }

    if (!selectedGame) {
      chooseGame();
      return;
    }

    if (engineGame === "reaction" && reactionState === "waiting") {
      pressA();
      return;
    }

    if (engineGame === "memory" && memorySequence.length === 0 && running) {
      startMemoryRound();
      return;
    }

    setPaused((current) => !current);
  }

  useEffect(() => {
    if (engineGame !== "snake" || !running || paused) {
      return;
    }

    const timer = window.setInterval(() => {
      setSnake((currentSnake) => {
        const head = currentSnake[0];

        const nextHead = {
          x:
            directionRef.current === "left"
              ? head.x - 1
              : directionRef.current === "right"
                ? head.x + 1
                : head.x,
          y:
            directionRef.current === "up"
              ? head.y - 1
              : directionRef.current === "down"
                ? head.y + 1
                : head.y,
        };

        const hitWall =
          nextHead.x < 0 ||
          nextHead.x >= GRID ||
          nextHead.y < 0 ||
          nextHead.y >= GRID;

        const hitSelf = currentSnake.some(
          (part) => part.x === nextHead.x && part.y === nextHead.y,
        );

        if (hitWall || hitSelf) {
          commitScore("snake", score);
          setRunning(false);
          return currentSnake;
        }

        const ateFood = nextHead.x === food.x && nextHead.y === food.y;

        const nextSnake = [nextHead, ...currentSnake];

        if (ateFood) {
          const nextScore = score + 50;

          setScore(nextScore);
          commitScore("snake", nextScore);
          setFood(randomPoint(nextSnake));
        } else {
          nextSnake.pop();
        }

        return nextSnake;
      });
    }, TICK_MS);

    return () => window.clearInterval(timer);

    setBreakoutPaddleX(5);
    setBreakoutBall({ x: 7, y: 10 });
    breakoutVelocityRef.current = { x: 1, y: -1 };

    setBreakoutBricks(
      new Set(
        Array.from({ length: 42 }, (_, index) => {
          const x = index % GRID;
          const y = Math.floor(index / GRID);
          return `${x}-${y}`;
        }),
      ),
    );

    setSpacePlayerX(6);
    setSpaceBullets([]);
    setSpaceEnemies([
      { x: 2, y: 1 },
      { x: 5, y: 1 },
      { x: 8, y: 1 },
      { x: 11, y: 1 },
      { x: 3, y: 3 },
      { x: 7, y: 3 },
      { x: 10, y: 3 },
    ]);

    memoryPlaybackTimersRef.current.forEach((timer) => {
      window.clearTimeout(timer);
    });

    memoryPlaybackTimersRef.current = [];

    setMemorySequence([]);
    setMemoryInputIndex(0);
    setMemoryFlash(null);
    setMemoryAcceptingInput(false);

    setRacerLane(1);
    setRacerTraffic([]);
    racerTickRef.current = 0;
  }, [selectedGame, running, paused, food, score, commitScore]);

  useEffect(() => {
    if (engineGame !== "dodge" || !running || paused) {
      return;
    }

    const timer = window.setInterval(() => {
      setObstacles((current) => {
        const moved = current
          .map((obstacle) => ({
            ...obstacle,
            y: obstacle.y + 1,
          }))
          .filter((obstacle) => obstacle.y < GRID);

        if (Math.random() > 0.46) {
          moved.push({
            x: Math.floor(Math.random() * GRID),
            y: 0,
          });
        }

        const collision = moved.some(
          (obstacle) => obstacle.x === dodgePlayerX && obstacle.y >= GRID - 2,
        );

        if (collision) {
          commitScore("dodge", score);
          setRunning(false);
        } else {
          const nextScore = score + 1;

          setScore(nextScore);

          if (nextScore % 25 === 0) {
            commitScore("dodge", nextScore);
          }
        }

        return moved;
      });
    }, 150);

    return () => window.clearInterval(timer);
  }, [selectedGame, running, paused, dodgePlayerX, score, commitScore]);

  useEffect(() => {
    if (selectedGame !== "breakout" || !running || paused) {
      return;
    }

    const timer = window.setInterval(() => {
      setBreakoutBall((currentBall) => {
        let vx = breakoutVelocityRef.current.x;
        let vy = breakoutVelocityRef.current.y;

        let nextX = currentBall.x + vx;
        let nextY = currentBall.y + vy;

        if (nextX < 0 || nextX >= GRID) {
          vx *= -1;
          nextX = currentBall.x + vx;
        }

        if (nextY < 0) {
          vy = 1;
          nextY = currentBall.y + vy;
        }

        const brickKey = `${nextX}-${nextY}`;

        if (breakoutBricks.has(brickKey)) {
          const nextBricks = new Set(breakoutBricks);

          nextBricks.delete(brickKey);
          setBreakoutBricks(nextBricks);

          vy *= -1;

          const nextScore = score + 25;

          setScore(nextScore);
          commitScore("breakout", nextScore);

          if (nextBricks.size === 0) {
            setRunning(false);
          }

          nextY = currentBall.y + vy;
        }

        const paddleY = GRID - 2;

        if (
          nextY === paddleY &&
          nextX >= breakoutPaddleX &&
          nextX <= breakoutPaddleX + 2
        ) {
          vy = -1;

          if (nextX === breakoutPaddleX) {
            vx = -1;
          }

          if (nextX === breakoutPaddleX + 2) {
            vx = 1;
          }

          nextY = currentBall.y + vy;
        }

        if (nextY >= GRID) {
          commitScore("breakout", score);
          setRunning(false);
          return currentBall;
        }

        breakoutVelocityRef.current = {
          x: vx,
          y: vy,
        };

        return {
          x: nextX,
          y: nextY,
        };
      });
    }, 110);

    return () => window.clearInterval(timer);
  }, [
    selectedGame,
    running,
    paused,
    breakoutBricks,
    breakoutPaddleX,
    score,
    commitScore,
  ]);

  useEffect(() => {
    if (selectedGame !== "space-defender" || !running || paused) {
      return;
    }

    const timer = window.setInterval(() => {
      setSpaceBullets((currentBullets) => {
        const movedBullets = currentBullets
          .map((bullet) => ({
            ...bullet,
            y: bullet.y - 1,
          }))
          .filter((bullet) => bullet.y >= 0);

        setSpaceEnemies((currentEnemies) => {
          const nextEnemies = [...currentEnemies];
          const survivingBullets: Point[] = [];

          for (const bullet of movedBullets) {
            const hitIndex = nextEnemies.findIndex(
              (enemy) => enemy.x === bullet.x && enemy.y === bullet.y,
            );

            if (hitIndex >= 0) {
              nextEnemies.splice(hitIndex, 1);

              setScore((currentScore) => {
                const nextScore = currentScore + 50;

                commitScore("space-defender", nextScore);

                return nextScore;
              });
            } else {
              survivingBullets.push(bullet);
            }
          }

          let advancedEnemies = nextEnemies;

          if (Math.random() > 0.62) {
            advancedEnemies = nextEnemies.map((enemy) => ({
              ...enemy,
              y: enemy.y + 1,
            }));
          }

          if (
            advancedEnemies.some(
              (enemy) => enemy.y >= GRID - 2 && enemy.x === spacePlayerX,
            ) ||
            advancedEnemies.some((enemy) => enemy.y >= GRID - 1)
          ) {
            commitScore("space-defender", score);
            setRunning(false);
          }

          if (advancedEnemies.length === 0) {
            advancedEnemies = [
              { x: 2, y: 1 },
              { x: 5, y: 1 },
              { x: 8, y: 1 },
              { x: 11, y: 1 },
              { x: 3, y: 3 },
              { x: 7, y: 3 },
              { x: 10, y: 3 },
            ];
          }

          setSpaceBullets(survivingBullets);

          return advancedEnemies;
        });

        return movedBullets;
      });
    }, 130);

    return () => window.clearInterval(timer);
  }, [selectedGame, running, paused, spacePlayerX, score, commitScore]);

  useEffect(() => {
    if (selectedGame !== "turbo-racer" || !running || paused) {
      return;
    }

    const speed = Math.max(75, 180 - Math.floor(score / 40));

    const timer = window.setInterval(() => {
      racerTickRef.current += 1;

      setRacerTraffic((currentTraffic) => {
        const moved = currentTraffic
          .map((car) => ({
            ...car,
            y: car.y + 1,
          }))
          .filter((car) => car.y < GRID);

        if (racerTickRef.current % 4 === 0) {
          const lane = Math.floor(Math.random() * 3);

          moved.push({
            x: 3 + lane * 4,
            y: 0,
          });
        }

        const playerX = 3 + racerLane * 4;

        if (moved.some((car) => car.x === playerX && car.y >= GRID - 3)) {
          commitScore("turbo-racer", score);
          setRunning(false);

          return moved;
        }

        setScore((currentScore) => {
          const nextScore = currentScore + 1;

          if (nextScore % 25 === 0) {
            commitScore("turbo-racer", nextScore);
          }

          return nextScore;
        });

        return moved;
      });
    }, speed);

    return () => window.clearInterval(timer);
  }, [selectedGame, running, paused, racerLane, score, commitScore]);

  useEffect(() => {
    if (engineGame !== "targets" || !running || paused) {
      return;
    }

    const timer = window.setInterval(() => {
      setTargetTimer((current) => {
        if (current <= 1) {
          commitScore("targets", score);
          setRunning(false);
          return 0;
        }

        return current - 1;
      });
    }, 90);

    return () => window.clearInterval(timer);
  }, [selectedGame, running, paused, score, commitScore]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();

      const mapping: Partial<Record<string, Direction>> = {
        arrowup: "up",
        w: "up",
        arrowdown: "down",
        s: "down",
        arrowleft: "left",
        a: "left",
        arrowright: "right",
        d: "right",
      };

      const directionToUse = mapping[key];

      if (directionToUse) {
        event.preventDefault();
        move(directionToUse);
        return;
      }

      if (key === " " || key === "z") {
        event.preventDefault();
        pressA();
        return;
      }

      if (key === "x" || key === "escape") {
        event.preventDefault();

        if (key === "escape" && selectedGame) {
          returnToLibrary();
        } else {
          pressB();
        }

        return;
      }

      if (key === "enter") {
        event.preventDefault();
        pressStart();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const snakeKeys = useMemo(() => new Set(snake.map(pointKey)), [snake]);

  function renderGrid() {
    return Array.from({ length: GRID * GRID }, (_, index) => {
      const x = index % GRID;
      const y = Math.floor(index / GRID);

      let className = "st-arcade-cell";

      if (engineGame === "snake") {
        if (snakeKeys.has(`${x}-${y}`)) {
          className += " is-player";
        }

        if (food.x === x && food.y === y) {
          className += " is-target";
        }
      }

      if (engineGame === "dodge") {
        if (dodgePlayerX === x && y === GRID - 2) {
          className += " is-player";
        }

        if (
          obstacles.some((obstacle) => obstacle.x === x && obstacle.y === y)
        ) {
          className += " is-danger";
        }
      }

      if (engineGame === "targets") {
        if (targetCursor.x === x && targetCursor.y === y) {
          className += " is-cursor";
        }

        if (target.x === x && target.y === y) {
          className += " is-target";
        }
      }

      if (engineGame === "breakout") {
        if (breakoutBricks.has(`${x}-${y}`)) {
          className += " is-brick";
        }

        if (breakoutBall.x === x && breakoutBall.y === y) {
          className += " is-ball";
        }

        if (
          y === GRID - 2 &&
          x >= breakoutPaddleX &&
          x <= breakoutPaddleX + 2
        ) {
          className += " is-paddle";
        }
      }

      if (engineGame === "space-defender") {
        if (spacePlayerX === x && y === GRID - 2) {
          className += " is-space-player";
        }

        if (spaceBullets.some((bullet) => bullet.x === x && bullet.y === y)) {
          className += " is-projectile";
        }

        if (spaceEnemies.some((enemy) => enemy.x === x && enemy.y === y)) {
          className += " is-space-enemy";
        }
      }

      if (engineGame === "memory") {
        const centerX = Math.floor(GRID / 2);
        const centerY = Math.floor(GRID / 2);

        const memoryCells: Record<Direction, Point> = {
          up: {
            x: centerX,
            y: centerY - 3,
          },
          right: {
            x: centerX + 3,
            y: centerY,
          },
          down: {
            x: centerX,
            y: centerY + 3,
          },
          left: {
            x: centerX - 3,
            y: centerY,
          },
        };

        for (const [direction, point] of Object.entries(memoryCells)) {
          if (point.x === x && point.y === y) {
            className += " is-memory-node";

            if (memoryFlash === direction) {
              className += " is-memory-active";
            }
          }
        }
      }

      if (engineGame === "turbo-racer") {
        const roadColumns = [3, 7, 11];

        if (roadColumns.includes(x)) {
          className += " is-road";
        }

        if (x === 3 + racerLane * 4 && y === GRID - 3) {
          className += " is-racer";
        }

        if (racerTraffic.some((car) => car.x === x && car.y === y)) {
          className += " is-traffic";
        }
      }

      return <span key={index} className={className} />;
    });
  }

  function togglePower() {
    if (powerBooting || poweringOff) {
      return;
    }

    if (poweredOn) {
      setPoweringOff(true);

      window.setTimeout(() => {
        setPoweredOn(false);
        setPoweringOff(false);
      }, 520);

      return;
    }

    setPowerBooting(true);

    window.setTimeout(() => {
      setPoweredOn(true);
    }, 420);

    window.setTimeout(() => {
      setPowerBooting(false);
    }, 1080);
  }

  function activateSideControl() {
    if (!poweredOn || powerBooting || poweringOff) {
      return;
    }

    setSoundEnabled((current) => !current);
  }

  return (
    <div className="st-arcade-console">
      <div
        className={`st-arcade-console__bezel ${
          poweredOn ? "is-console-on" : "is-console-off"
        } ${powerBooting ? "is-console-booting" : ""} ${
          poweringOff ? "is-console-powering-off" : ""
        }`}
      >
        <div className="st-arcade-console__topline">
          <span>
            <i />
            STEREOPHONIE ARCADE
          </span>

          <span>PLAYER 01</span>
        </div>

        <div className="st-arcade-screen">
          <div className="st-arcade-screen__scanlines" />

          {poweringOff ? (
            <div
              className="st-arcade-screen-power st-arcade-screen-power--off"
              aria-live="polite"
            >
              <span className="st-arcade-screen-power__beam" />
            </div>
          ) : null}

          {!poweredOn && !powerBooting ? (
            <div
              className="st-arcade-screen-power st-arcade-screen-power--dead"
              aria-live="polite"
            >
              <span className="st-arcade-screen-power__dead-pixel" />
            </div>
          ) : null}

          {powerBooting ? (
            <div
              className="st-arcade-screen-power st-arcade-screen-power--boot"
              aria-live="polite"
            >
              <div className="st-arcade-screen-power__boot-logo">
                <span>ST</span>
                <strong>STEREOPHONIE ARCADE</strong>
                <small>VIDEO SYSTEM INITIALIZING</small>
              </div>

              <div className="st-arcade-screen-power__boot-track">
                <span />
              </div>
            </div>
          ) : null}

          {!selectedGame ? (
            <div className="st-arcade-library">
              <header>
                <span>GAME LIBRARY</span>
                <strong>SELECT PROGRAM</strong>
              </header>

              <div className="st-arcade-library__games">
                {games.map((game, index) => (
                  <button
                    key={game.id}
                    type="button"
                    className={index === menuIndex ? "is-selected" : undefined}
                    onClick={() => {
                      setMenuIndex(index);
                      chooseGame(index);
                    }}
                  >
                    <span>{game.code}</span>

                    <div>
                      <strong>{game.title}</strong>
                      <small>{game.subtitle}</small>
                    </div>

                    <b>{index === menuIndex ? "▶" : ""}</b>
                  </button>
                ))}
              </div>

              <footer>
                D-PAD SELECT
                <span>A / START LAUNCH</span>
              </footer>
            </div>
          ) : (
            <div
              className={`st-arcade-game ${poweredOn ? "is-powered-on" : "is-powered-off"} ${powerBooting ? "is-power-booting" : ""}`}
            >
              <div className="st-arcade-game__hud">
                <div>
                  <small>PROGRAM</small>
                  <strong>{activeDefinition?.title}</strong>
                </div>

                <div>
                  <small>SCORE</small>
                  <strong>{String(score).padStart(5, "0")}</strong>
                </div>

                <div>
                  <small>HI</small>
                  <strong>
                    {String(highScores[selectedGame]).padStart(5, "0")}
                  </strong>
                </div>
              </div>

              <div className="st-arcade-game__playfield">
                {engineGame === "reaction" ? (
                  <button
                    type="button"
                    className={`st-reaction-game st-reaction-game--${reactionState}`}
                    onClick={pressA}
                  >
                    <span>
                      {reactionState === "go"
                        ? "SIGNAL READY"
                        : "REACTION CORE"}
                    </span>

                    <strong>{reactionMessage}</strong>

                    <small>
                      {reactionState === "waiting"
                        ? "START OR A TO BEGIN"
                        : reactionState === "armed"
                          ? "DO NOT PRESS"
                          : reactionState === "go"
                            ? "PRESS NOW"
                            : "A TO RETRY"}
                    </small>
                  </button>
                ) : (
                  <div
                    className="st-pixel-grid"
                    style={{
                      gridTemplateColumns: `repeat(${GRID}, 1fr)`,
                      gridTemplateRows: `repeat(${GRID}, 1fr)`,
                    }}
                  >
                    {renderGrid()}
                  </div>
                )}

                {!running && selectedGame !== "reaction" ? (
                  <div className="st-arcade-game__overlay">
                    <strong>GAME OVER</strong>
                    <span>A / B TO RESTART</span>
                  </div>
                ) : null}

                {paused ? (
                  <div className="st-arcade-game__overlay">
                    <Pause />
                    <strong>PAUSED</strong>
                    <span>START TO RESUME</span>
                  </div>
                ) : null}
              </div>

              <div className="st-arcade-game__status">
                <span>{activeDefinition?.controls}</span>

                {engineGame === "targets" ? (
                  <span>TIME {String(targetTimer).padStart(3, "0")}</span>
                ) : engineGame === "memory" ? (
                  <span>
                    SEQUENCE {String(memorySequence.length).padStart(2, "0")}
                  </span>
                ) : engineGame === "breakout" ? (
                  <span>
                    BRICKS {String(breakoutBricks.size).padStart(2, "0")}
                  </span>
                ) : engineGame === "space-defender" ? (
                  <span>
                    ENEMIES {String(spaceEnemies.length).padStart(2, "0")}
                  </span>
                ) : engineGame === "turbo-racer" ? (
                  <span>LANE {racerLane + 1} / 3</span>
                ) : (
                  <span>{running ? "RUNNING" : "STOPPED"}</span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="st-arcade-console__deck">
          <div className="st-arcade-dpad" aria-label="Directional pad">
            <button
              type="button"
              className="up"
              onClick={() => move("up")}
              aria-label="Up"
            >
              ▲
            </button>

            <button
              type="button"
              className="left"
              onClick={() => move("left")}
              aria-label="Left"
            >
              ◀
            </button>

            <span />

            <button
              type="button"
              className="right"
              onClick={() => move("right")}
              aria-label="Right"
            >
              ▶
            </button>

            <button
              type="button"
              className="down"
              onClick={() => move("down")}
              aria-label="Down"
            >
              ▼
            </button>
          </div>

          <div className="st-arcade-system-buttons">
            <button
              type="button"
              className={`st-arcade-power-button st-arcade-power-button--deck ${
                poweredOn ? "is-on" : "is-off"
              } ${powerBooting ? "is-booting" : ""}`}
              onClick={togglePower}
              disabled={powerBooting}
              aria-pressed={poweredOn}
              aria-label={
                poweredOn ? "Turn arcade system off" : "Turn arcade system on"
              }
              title={poweredOn ? "POWER OFF" : "POWER ON"}
            >
              <span className="st-arcade-power-button__led" />
              <span className="st-arcade-power-button__icon">⏻</span>
              <small>POWER</small>
            </button>
            <button
              type="button"
              onClick={() => setSoundEnabled((current) => !current)}
              aria-label="Toggle arcade sound"
            >
              {soundEnabled ? <Volume2 /> : <VolumeX />}
              SOUND
            </button>

            {selectedGame ? (
              <button type="button" onClick={returnToLibrary}>
                <Gamepad2 />
                LIBRARY
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setMenuIndex((current) =>
                    current >= games.length - 1 ? 0 : current + 1,
                  )
                }
              >
                <Gamepad2 />
                SELECT
              </button>
            )}

            <button type="button" onClick={pressStart}>
              {paused ? <Play /> : <Pause />}
              START
            </button>
          </div>

          <div className="st-arcade-action-cluster">
            <button
              type="button"
              className="st-arcade-action st-arcade-action--b"
              onClick={pressB}
            >
              B
            </button>

            <button
              type="button"
              className="st-arcade-action st-arcade-action--a"
              onClick={pressA}
            >
              A
            </button>
          </div>
        </div>

        <div className="st-arcade-console__footer">
          <span>
            <Trophy />
            HIGH SCORES SAVED LOCALLY
          </span>

          <span>KEYBOARD / ARROWS / WASD / SPACE / ENTER</span>

          <button type="button" onClick={() => resetGame()}>
            <RotateCcw />
            RESET
          </button>
        </div>
      </div>
    </div>
  );
}
