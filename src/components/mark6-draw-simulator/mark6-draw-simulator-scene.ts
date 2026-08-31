"use client";

import * as Phaser from "phaser";
import {
  formatMark6SectionRange,
  getMark6BallColor,
  MARK6_BALL_SECTIONS,
  MARK6_DRAW_SIMULATOR_BATCH_DELAY_MS,
  MARK6_DRAW_SIMULATOR_MIX_MS,
  type Mark6DrawSimulatorLabels,
  type Mark6DrawSimulatorPayload,
} from "@/lib/mark6-draw-simulator";

const BALL_RADIUS = 14;
const GAME_HEIGHT = 520;
const DRUM_WALL_SEGMENTS = 40;

type BallEntry = {
  number: number;
  dropSprite?: Phaser.GameObjects.Container;
  circle?: Phaser.GameObjects.Arc;
  label?: Phaser.GameObjects.Text;
  drawn: boolean;
};

type SceneCallbacks = {
  onStatus: (message: string) => void;
  onComplete: (payload: Mark6DrawSimulatorPayload) => void;
};

export class Mark6DrawSimulatorScene extends Phaser.Scene {
  private callbacks: SceneCallbacks = { onStatus: () => {}, onComplete: () => {} };
  private labels: Mark6DrawSimulatorLabels = {
    sectionRolling: "",
    mixing: "",
    drawingMain: "",
    drawingBonus: "",
    complete: "",
  };
  private payload: Mark6DrawSimulatorPayload | null = null;
  private balls: BallEntry[] = [];
  private drumWalls: MatterJS.BodyType[] = [];
  private drumX = 0;
  private drumY = 0;
  private drumRadius = 118;
  private rackY = 0;
  private mainSlotXs: number[] = [];
  private bonusSlotX = 0;
  private backdrop?: Phaser.GameObjects.Graphics;
  private drumGraphic?: Phaser.GameObjects.Graphics;
  private drumBase?: Phaser.GameObjects.Graphics;
  private rackGraphic?: Phaser.GameObjects.Graphics;
  private columnGraphic?: Phaser.GameObjects.Graphics;
  private running = false;
  private mixing = false;
  private mixElapsed = 0;
  private mixDurationMs = 0;
  private mixComplete?: () => void;
  private spinPhase = 0;

  constructor() {
    super({ key: "Mark6DrawSimulatorScene" });
  }

  init(data: { callbacks?: SceneCallbacks; labels?: Mark6DrawSimulatorLabels }) {
    if (data.callbacks) {
      this.callbacks = data.callbacks;
    }
    if (data.labels) {
      this.labels = data.labels;
    }
  }

  create() {
    this.layoutStage(this.scale.width, this.scale.height);
    this.drawStage();

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.on("start-draw", this.handleStartDraw, this);
    this.events.on("reset-draw", this.handleReset, this);
  }

  update(_time: number, delta: number) {
    for (const entry of this.balls) {
      if (entry.circle && entry.label && !entry.drawn) {
        entry.label.setPosition(entry.circle.x, entry.circle.y);
        entry.label.setRotation(entry.circle.rotation);
      }
    }

    if (!this.mixing) {
      return;
    }

    this.mixElapsed += delta;
    this.spinPhase += delta * 0.005;

    const spinDirection = Math.sin(this.spinPhase * 0.65) >= 0 ? 1 : -1;
    const spinStrength = 0.014 + Math.sin(this.spinPhase) * 0.005;
    const maxDist = this.drumRadius - BALL_RADIUS - 4;

    for (const entry of this.balls) {
      const body = entry.circle ? this.getBallBody(entry.circle) : null;
      if (!body || entry.drawn) {
        continue;
      }

      const dx = body.position.x - this.drumX;
      const dy = body.position.y - this.drumY;
      const dist = Math.max(Math.hypot(dx, dy), 1);
      const nx = dx / dist;
      const ny = dy / dist;

      if (dist > maxDist) {
        MatterJS.Body.setPosition(body, {
          x: this.drumX + nx * maxDist,
          y: this.drumY + ny * maxDist,
        });
        const velocity = body.velocity;
        const dot = velocity.x * nx + velocity.y * ny;
        MatterJS.Body.setVelocity(body, {
          x: velocity.x - 1.8 * dot * nx,
          y: velocity.y - 1.8 * dot * ny,
        });
      }

      const tangentX = -ny * spinDirection;
      const tangentY = nx * spinDirection;
      MatterJS.Body.applyForce(body, body.position, {
        x: tangentX * spinStrength * body.mass,
        y: tangentY * spinStrength * body.mass,
      });
      MatterJS.Body.applyForce(body, body.position, {
        x: (Math.random() - 0.5) * 0.005 * body.mass,
        y: (Math.random() - 0.5) * 0.005 * body.mass,
      });
    }

    if (this.drumGraphic) {
      this.drumGraphic.setAngle(Math.sin(this.spinPhase * 1.5) * 7);
    }

    if (this.mixElapsed >= this.mixDurationMs) {
      this.finishMixing();
    }
  }

  shutdown() {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.off("start-draw", this.handleStartDraw, this);
    this.events.off("reset-draw", this.handleReset, this);
    this.stopMixing();
    this.clearDrumWalls();
  }

  private handleResize = (gameSize: Phaser.Structs.Size) => {
    if (this.mixing || this.running) {
      return;
    }
    this.layoutStage(gameSize.width, gameSize.height);
    this.drawStage();
  };

  private layoutStage(width: number, height: number) {
    this.drumX = width / 2;
    this.drumY = height * 0.4;
    this.rackY = height - 72;
    this.drumRadius = Math.min(118, width * 0.36, height * 0.28);

    const slotGap = Math.min(40, Math.max(26, (width - 56) / 8));
    this.mainSlotXs = Array.from(
      { length: 6 },
      (_value, index) => this.drumX + (index - 2.75) * slotGap,
    );
    this.bonusSlotX = this.drumX + 3.25 * slotGap;
  }

  private drawStage() {
    const { width, height } = this.scale;

    this.backdrop?.destroy();
    this.drumGraphic?.destroy();
    this.drumBase?.destroy();
    this.rackGraphic?.destroy();
    this.columnGraphic?.destroy();

    this.backdrop = this.add.graphics();
    this.backdrop.fillGradientStyle(0x07101f, 0x07101f, 0x0f2a4d, 0x0f2a4d, 1);
    this.backdrop.fillRect(0, 0, width, height);

    const chute = this.add.graphics();
    chute.fillStyle(0xffffff, 0.08);
    chute.fillRoundedRect(this.drumX - 34, 18, 68, 86, 10);
    chute.lineStyle(2, 0x5eb3ff, 0.35);
    chute.strokeRoundedRect(this.drumX - 34, 18, 68, 86, 10);

    this.drumGraphic = this.add.graphics();
    this.drumGraphic.lineStyle(4, 0x8fd0ff, 0.85);
    this.drumGraphic.strokeCircle(this.drumX, this.drumY, this.drumRadius);
    this.drumGraphic.lineStyle(2, 0xffffff, 0.15);
    this.drumGraphic.strokeCircle(this.drumX, this.drumY, this.drumRadius - 16);

    this.drumBase = this.add.graphics();
    this.drumBase.fillStyle(0x123d6b, 0.9);
    this.drumBase.fillEllipse(
      this.drumX,
      this.drumY + this.drumRadius + 8,
      this.drumRadius * 1.35,
      24,
    );

    this.columnGraphic = this.add.graphics();
    this.columnGraphic.fillStyle(0xffffff, 0.12);
    this.columnGraphic.fillRoundedRect(
      this.drumX - 10,
      this.drumY - this.drumRadius - 36,
      20,
      52,
      8,
    );
    this.columnGraphic.lineStyle(2, 0x90caf9, 0.8);
    this.columnGraphic.strokeRoundedRect(
      this.drumX - 10,
      this.drumY - this.drumRadius - 36,
      20,
      52,
      8,
    );

    this.rackGraphic = this.add.graphics();
    this.rackGraphic.lineStyle(2, 0xffffff, 0.2);
    this.rackGraphic.strokeRoundedRect(
      this.mainSlotXs[0] - 24,
      this.rackY - 24,
      this.bonusSlotX - this.mainSlotXs[0] + 48,
      48,
      12,
    );
    this.mainSlotXs.forEach((x) => {
      this.rackGraphic?.lineStyle(1.5, 0xffffff, 0.18);
      this.rackGraphic?.strokeCircle(x, this.rackY, 17);
    });
    this.rackGraphic.lineStyle(2, 0xffd54f, 0.55);
    this.rackGraphic.strokeCircle(this.bonusSlotX, this.rackY, 17);
  }

  private clearDrumWalls() {
    for (const wall of this.drumWalls) {
      this.matter.world.remove(wall);
    }
    this.drumWalls = [];
  }

  private createDrumWalls() {
    this.clearDrumWalls();
    const wallSize = 9;
    for (let index = 0; index < DRUM_WALL_SEGMENTS; index += 1) {
      const angle = (index / DRUM_WALL_SEGMENTS) * Math.PI * 2;
      const x = this.drumX + Math.cos(angle) * (this.drumRadius - 3);
      const y = this.drumY + Math.sin(angle) * (this.drumRadius - 3);
      const wall = MatterJS.Bodies.rectangle(x, y, wallSize, wallSize * 1.5, {
        isStatic: true,
        angle,
        friction: 0.02,
        restitution: 0.9,
        label: "drum-wall",
      });
      this.matter.world.add(wall);
      this.drumWalls.push(wall);
    }
  }

  private getBallBody(circle: Phaser.GameObjects.Arc): MatterJS.BodyType | null {
    const body = circle.body;
    if (!body) {
      return null;
    }
    return body as MatterJS.BodyType;
  }

  private createDropSprite(number: number, x: number, y: number): BallEntry {
    const color = getMark6BallColor(number);
    const circle = this.add.circle(0, 0, BALL_RADIUS, color).setStrokeStyle(2, 0xffffff);
    const text = this.add
      .text(0, 0, String(number), {
        fontFamily: "Arial, sans-serif",
        fontSize: "12px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    const dropSprite = this.add.container(x, y, [circle, text]);
    dropSprite.setDepth(10);
    return { number, dropSprite, drawn: false };
  }

  private randomPointInDrum(): { x: number; y: number } {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const distance = Phaser.Math.FloatBetween(8, this.drumRadius - BALL_RADIUS - 12);
    return {
      x: this.drumX + Math.cos(angle) * distance,
      y: this.drumY + Math.sin(angle) * distance,
    };
  }

  private convertDropSpritesToPhysics() {
    const converted: BallEntry[] = [];

    for (const entry of this.balls) {
      if (!entry.dropSprite) {
        if (entry.circle) {
          converted.push(entry);
        }
        continue;
      }

      this.tweens.killTweensOf(entry.dropSprite);
      const x = entry.dropSprite.x;
      const y = entry.dropSprite.y;
      entry.dropSprite.destroy();

      const color = getMark6BallColor(entry.number);
      const circle = this.add
        .circle(x, y, BALL_RADIUS, color)
        .setStrokeStyle(2, 0xffffff)
        .setDepth(10);

      this.matter.add.gameObject(circle, {
        shape: { type: "circle", radius: BALL_RADIUS },
        restitution: 0.9,
        friction: 0.03,
        frictionAir: 0.002,
        density: 0.005,
        label: `ball-${entry.number}`,
      });

      const label = this.add
        .text(x, y, String(entry.number), {
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
          color: "#ffffff",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(11);

      const body = this.getBallBody(circle);
      if (body) {
        MatterJS.Body.setVelocity(body, {
          x: Phaser.Math.FloatBetween(-5, 5),
          y: Phaser.Math.FloatBetween(-3, 5),
        });
        MatterJS.Body.setAngularVelocity(body, Phaser.Math.FloatBetween(-0.25, 0.25));
      }

      converted.push({
        number: entry.number,
        circle,
        label,
        drawn: entry.drawn,
      });
    }

    this.balls = converted;
  }

  private destroyBallEntry(entry: BallEntry) {
    entry.dropSprite?.destroy();
    if (entry.circle) {
      if (entry.circle.body) {
        this.matter.world.remove(entry.circle.body);
      }
      entry.circle.destroy();
    }
    entry.label?.destroy();
  }

  private handleReset = () => {
    this.stopMixing();
    this.clearDrumWalls();
    this.running = false;
    this.payload = null;
    this.balls.forEach((ball) => this.destroyBallEntry(ball));
    this.balls = [];
  };

  private handleStartDraw = (payload: Mark6DrawSimulatorPayload) => {
    if (this.running) {
      return;
    }
    this.handleReset();
    this.running = true;
    this.payload = payload;
    this.runSectionSequence(0);
  };

  private runSectionSequence(sectionIndex: number) {
    if (sectionIndex >= MARK6_BALL_SECTIONS.length) {
      this.callbacks.onStatus(this.labels.mixing);
      this.startMixing(MARK6_DRAW_SIMULATOR_MIX_MS, () => {
        this.runDrawSequence(0);
      });
      return;
    }

    const section = MARK6_BALL_SECTIONS[sectionIndex];
    const rangeLabel = formatMark6SectionRange(section.min, section.max);
    this.callbacks.onStatus(this.labels.sectionRolling.replace("{range}", rangeLabel));

    const numbers = Array.from(
      { length: section.max - section.min + 1 },
      (_value, index) => section.min + index,
    );
    this.rollInSection(numbers, () => {
      this.time.delayedCall(MARK6_DRAW_SIMULATOR_BATCH_DELAY_MS, () => {
        this.runSectionSequence(sectionIndex + 1);
      });
    });
  }

  private rollInSection(numbers: number[], onComplete: () => void) {
    let completed = 0;
    numbers.forEach((number, index) => {
      const startX = this.drumX + Phaser.Math.Between(-18, 18);
      const startY = 36;
      const ball = this.createDropSprite(number, startX, startY);
      this.balls.push(ball);
      const target = this.randomPointInDrum();
      this.tweens.add({
        targets: ball.dropSprite,
        x: target.x,
        y: target.y,
        delay: index * 45,
        duration: 420,
        ease: "Back.Out",
        onComplete: () => {
          completed += 1;
          if (completed === numbers.length) {
            onComplete();
          }
        },
      });
    });
  }

  private startMixing(durationMs: number, onComplete: () => void) {
    this.stopMixing();
    this.createDrumWalls();
    this.convertDropSpritesToPhysics();

    this.mixing = true;
    this.mixElapsed = 0;
    this.mixDurationMs = durationMs;
    this.spinPhase = 0;
    this.mixComplete = onComplete;
  }

  private finishMixing() {
    if (!this.mixing) {
      return;
    }

    this.mixing = false;

    for (const entry of this.balls) {
      const body = entry.circle ? this.getBallBody(entry.circle) : null;
      if (!body || entry.drawn) {
        continue;
      }
      MatterJS.Body.setVelocity(body, { x: 0, y: 0 });
      MatterJS.Body.setAngularVelocity(body, 0);
    }

    if (this.drumGraphic) {
      this.drumGraphic.setAngle(0);
    }

    const onComplete = this.mixComplete;
    this.mixComplete = undefined;
    onComplete?.();
  }

  private stopMixing() {
    this.mixing = false;
    this.mixComplete = undefined;
    this.mixElapsed = 0;

    for (const entry of this.balls) {
      const body = entry.circle ? this.getBallBody(entry.circle) : null;
      if (!body || entry.drawn) {
        continue;
      }
      MatterJS.Body.setVelocity(body, { x: 0, y: 0 });
      MatterJS.Body.setAngularVelocity(body, 0);
    }

    if (this.drumGraphic) {
      this.drumGraphic.setAngle(0);
    }
  }

  private runDrawSequence(index: number) {
    if (!this.payload) {
      return;
    }
    if (index >= this.payload.mainNumbers.length) {
      this.revealBonus(this.payload.bonusNumber);
      return;
    }

    const number = this.payload.mainNumbers[index];
    this.callbacks.onStatus(
      this.labels.drawingMain
        .replace("{number}", String(number))
        .replace("{index}", String(index + 1)),
    );
    this.revealNumber(number, this.mainSlotXs[index], false, () => {
      this.time.delayedCall(700, () => this.runDrawSequence(index + 1));
    });
  }

  private revealBonus(number: number) {
    this.callbacks.onStatus(this.labels.drawingBonus.replace("{number}", String(number)));
    this.revealNumber(number, this.bonusSlotX, true, () => {
      if (this.payload) {
        this.callbacks.onStatus(this.labels.complete);
        this.callbacks.onComplete(this.payload);
      }
      this.running = false;
      this.clearDrumWalls();
    });
  }

  private revealNumber(
    number: number,
    slotX: number,
    isBonus: boolean,
    onComplete: () => void,
  ) {
    const entry = this.balls.find((ball) => ball.number === number && !ball.drawn);
    if (!entry?.circle || !entry.label) {
      onComplete();
      return;
    }
    entry.drawn = true;

    if (entry.circle.body) {
      this.matter.world.remove(entry.circle.body);
    }

    if (this.columnGraphic) {
      this.tweens.add({
        targets: this.columnGraphic,
        alpha: 0.35,
        yoyo: true,
        duration: 180,
        repeat: 2,
      });
    }

    const liftY = this.drumY - this.drumRadius - 8;
    this.tweens.add({
      targets: [entry.circle, entry.label],
      x: this.drumX,
      y: liftY,
      scale: 1.25,
      angle: 0,
      duration: 700,
      ease: "Cubic.Out",
      onComplete: () => {
        this.tweens.add({
          targets: [entry.circle, entry.label],
          x: slotX,
          y: this.rackY,
          scale: isBonus ? 1.15 : 1.05,
          duration: 900,
          ease: "Quad.InOut",
          onComplete: () => {
            const glow = this.add.circle(slotX, this.rackY, 18, isBonus ? 0xffd54f : 0x42a5f5, 0.25);
            glow.setDepth(5);
            this.tweens.add({
              targets: glow,
              scale: 1.35,
              alpha: 0,
              duration: 500,
              onComplete: () => glow.destroy(),
            });
            onComplete();
          },
        });
      },
    });
  }
}

export function createMark6DrawSimulatorGame(
  parent: HTMLElement,
  callbacks: SceneCallbacks,
  labels: Mark6DrawSimulatorLabels,
) {
  const width = Math.max(parent.clientWidth, 320);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width,
    height: GAME_HEIGHT,
    backgroundColor: "#07101f",
    physics: {
      default: "matter",
      matter: {
        gravity: { x: 0, y: 0.35 },
        enableSleeping: false,
      },
    },
    scene: Mark6DrawSimulatorScene,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width,
      height: GAME_HEIGHT,
    },
    audio: {
      noAudio: true,
    },
  });

  game.scene.start("Mark6DrawSimulatorScene", { callbacks, labels });

  const resize = () => {
    const nextWidth = Math.max(parent.clientWidth, 320);
    if (nextWidth !== game.scale.width) {
      game.scale.resize(nextWidth, GAME_HEIGHT);
    }
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(parent);
  resize();

  return {
    startDraw(payload: Mark6DrawSimulatorPayload) {
      const scene = game.scene.getScene("Mark6DrawSimulatorScene");
      scene.events.emit("start-draw", payload);
    },
    reset() {
      const scene = game.scene.getScene("Mark6DrawSimulatorScene");
      scene.events.emit("reset-draw");
    },
    destroy() {
      resizeObserver.disconnect();
      game.destroy(true);
    },
  };
}
