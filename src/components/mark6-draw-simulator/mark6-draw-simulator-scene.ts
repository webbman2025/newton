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
const DRUM_WALL_SEGMENTS = 40;

type BallEntry = {
  number: number;
  container: Phaser.GameObjects.Container;
  drawn: boolean;
  physicsEnabled: boolean;
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
  private drumX = 0;
  private drumY = 0;
  private drumRadius = 118;
  private rackY = 0;
  private mainSlotXs: number[] = [];
  private bonusSlotX = 0;
  private drumGraphic?: Phaser.GameObjects.Graphics;
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
    const { width, height } = this.scale;
    this.drumX = width / 2;
    this.drumY = height * 0.4;
    this.rackY = height - 72;
    const slotGap = Math.min(42, (width - 80) / 7);
    const rackStartX = this.drumX - slotGap * 2.75;
    this.mainSlotXs = Array.from({ length: 6 }, (_value, index) => rackStartX + index * slotGap);
    this.bonusSlotX = rackStartX + 6 * slotGap + slotGap * 0.55;

    this.drawBackdrop(width, height);
    this.drawDrum();
    this.createDrumBoundary();
    this.drawRack();
    this.drawColumn();

    this.events.on("start-draw", this.handleStartDraw, this);
    this.events.on("reset-draw", this.handleReset, this);
  }

  update(_time: number, delta: number) {
    if (!this.mixing) {
      return;
    }

    this.mixElapsed += delta;
    this.spinPhase += delta * 0.005;

    const spinStrength = 0.00075 + Math.sin(this.spinPhase) * 0.0002;
    const spinDirection = Math.sin(this.spinPhase * 0.7) >= 0 ? 1 : -1;

    for (const entry of this.balls) {
      if (entry.drawn || !entry.physicsEnabled) {
        continue;
      }

      const body = entry.container.body as MatterJS.BodyType | null;
      if (!body) {
        continue;
      }

      const dx = body.position.x - this.drumX;
      const dy = body.position.y - this.drumY;
      const dist = Math.max(Math.hypot(dx, dy), 1);
      const nx = dx / dist;
      const ny = dy / dist;

      if (dist > this.drumRadius - BALL_RADIUS - 4) {
        MatterJS.Body.setPosition(body, {
          x: this.drumX + nx * (this.drumRadius - BALL_RADIUS - 4),
          y: this.drumY + ny * (this.drumRadius - BALL_RADIUS - 4),
        });
        MatterJS.Body.setVelocity(body, {
          x: body.velocity.x * 0.65,
          y: body.velocity.y * 0.65,
        });
      }

      const tangentX = -ny * spinDirection;
      const tangentY = nx * spinDirection;
      MatterJS.Body.applyForce(body, body.position, {
        x: (tangentX * spinStrength + (Math.random() - 0.5) * 0.0004) * body.mass,
        y: (tangentY * spinStrength + (Math.random() - 0.5) * 0.0004) * body.mass,
      });

      if (dy > 0) {
        MatterJS.Body.applyForce(body, body.position, {
          x: Math.sin(this.spinPhase * 2 + entry.number) * 0.00015 * body.mass,
          y: 0.0003 * body.mass,
        });
      }
    }

    if (this.drumGraphic) {
      this.drumGraphic.setAngle(Math.sin(this.spinPhase * 1.4) * 4);
    }

    if (this.mixElapsed >= this.mixDurationMs) {
      this.finishMixing();
    }
  }

  shutdown() {
    this.events.off("start-draw", this.handleStartDraw, this);
    this.events.off("reset-draw", this.handleReset, this);
    this.stopMixing();
  }

  private drawBackdrop(width: number, height: number) {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x07101f, 0x07101f, 0x0f2a4d, 0x0f2a4d, 1);
    bg.fillRect(0, 0, width, height);

    const chute = this.add.graphics();
    chute.fillStyle(0xffffff, 0.08);
    chute.fillRoundedRect(width / 2 - 34, 18, 68, 86, 10);
    chute.lineStyle(2, 0x5eb3ff, 0.35);
    chute.strokeRoundedRect(width / 2 - 34, 18, 68, 86, 10);
  }

  private drawDrum() {
    this.drumGraphic = this.add.graphics();
    this.drumGraphic.lineStyle(4, 0x8fd0ff, 0.85);
    this.drumGraphic.strokeCircle(this.drumX, this.drumY, this.drumRadius);
    this.drumGraphic.lineStyle(2, 0xffffff, 0.15);
    this.drumGraphic.strokeCircle(this.drumX, this.drumY, this.drumRadius - 16);

    const base = this.add.graphics();
    base.fillStyle(0x123d6b, 0.9);
    base.fillEllipse(this.drumX, this.drumY + this.drumRadius + 8, this.drumRadius * 1.35, 24);
  }

  private createDrumBoundary() {
    const wallSize = 11;
    for (let index = 0; index < DRUM_WALL_SEGMENTS; index += 1) {
      const angle = (index / DRUM_WALL_SEGMENTS) * Math.PI * 2;
      const x = this.drumX + Math.cos(angle) * (this.drumRadius - 2);
      const y = this.drumY + Math.sin(angle) * (this.drumRadius - 2);
      this.matter.add.rectangle(x, y, wallSize, wallSize * 1.5, {
        isStatic: true,
        angle,
        friction: 0.15,
        restitution: 0.82,
        label: "drum-wall",
      });
    }

    this.matter.add.circle(this.drumX, this.drumY + this.drumRadius - 28, this.drumRadius * 0.55, {
      isStatic: true,
      friction: 0.25,
      restitution: 0.65,
      label: "drum-base",
    });
  }

  private drawColumn() {
    this.columnGraphic = this.add.graphics();
    this.columnGraphic.fillStyle(0xffffff, 0.12);
    this.columnGraphic.fillRoundedRect(this.drumX - 10, this.drumY - this.drumRadius - 36, 20, 52, 8);
    this.columnGraphic.lineStyle(2, 0x90caf9, 0.8);
    this.columnGraphic.strokeRoundedRect(this.drumX - 10, this.drumY - this.drumRadius - 36, 20, 52, 8);
  }

  private drawRack() {
    const rack = this.add.graphics();
    rack.lineStyle(2, 0xffffff, 0.2);
    rack.strokeRoundedRect(this.mainSlotXs[0] - 24, this.rackY - 24, this.bonusSlotX - this.mainSlotXs[0] + 48, 48, 12);

    this.mainSlotXs.forEach((x) => {
      rack.lineStyle(1.5, 0xffffff, 0.18);
      rack.strokeCircle(x, this.rackY, 17);
    });
    rack.lineStyle(2, 0xffd54f, 0.55);
    rack.strokeCircle(this.bonusSlotX, this.rackY, 17);
  }

  private createBall(number: number, x: number, y: number): BallEntry {
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
    const container = this.add.container(x, y, [circle, text]);
    container.setDepth(10);
    return { number, container, drawn: false, physicsEnabled: false };
  }

  private randomPointInDrum(): { x: number; y: number } {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const distance = Phaser.Math.FloatBetween(8, this.drumRadius - BALL_RADIUS - 10);
    return {
      x: this.drumX + Math.cos(angle) * distance,
      y: this.drumY + Math.sin(angle) * distance,
    };
  }

  private enableBallPhysics(entry: BallEntry) {
    if (entry.physicsEnabled) {
      return;
    }

    this.matter.add.gameObject(entry.container, {
      shape: { type: "circle", radius: BALL_RADIUS },
      restitution: 0.9,
      friction: 0.06,
      frictionAir: 0.012,
      density: 0.0025,
      label: `ball-${entry.number}`,
    });
    entry.physicsEnabled = true;
  }

  private detachBallPhysics(entry: BallEntry) {
    if (!entry.physicsEnabled) {
      return;
    }

    const gameObject = entry.container as Phaser.GameObjects.GameObject & {
      body: MatterJS.BodyType | null;
    };
    if (gameObject.body) {
      this.matter.world.remove(gameObject.body);
      gameObject.body = null;
    }
    entry.physicsEnabled = false;
  }

  private handleReset = () => {
    this.stopMixing();
    this.running = false;
    this.payload = null;
    this.balls.forEach((ball) => {
      this.detachBallPhysics(ball);
      ball.container.destroy();
    });
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
      const ball = this.createBall(number, startX, startY);
      this.balls.push(ball);
      const target = this.randomPointInDrum();
      this.tweens.add({
        targets: ball.container,
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

    this.balls.forEach((entry) => {
      this.enableBallPhysics(entry);
      const body = entry.container.body as MatterJS.BodyType | null;
      if (!body) {
        return;
      }
      MatterJS.Body.setVelocity(body, {
        x: Phaser.Math.FloatBetween(-3.5, 3.5),
        y: Phaser.Math.FloatBetween(-2.5, 3.5),
      });
      MatterJS.Body.setAngularVelocity(body, Phaser.Math.FloatBetween(-0.15, 0.15));
    });

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
      if (entry.drawn || !entry.physicsEnabled) {
        continue;
      }
      const body = entry.container.body as MatterJS.BodyType | null;
      if (!body) {
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
      if (!entry.physicsEnabled || entry.drawn) {
        continue;
      }
      const body = entry.container.body as MatterJS.BodyType | null;
      if (body) {
        MatterJS.Body.setVelocity(body, { x: 0, y: 0 });
        MatterJS.Body.setAngularVelocity(body, 0);
      }
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
    });
  }

  private revealNumber(
    number: number,
    slotX: number,
    isBonus: boolean,
    onComplete: () => void,
  ) {
    const entry = this.balls.find((ball) => ball.number === number && !ball.drawn);
    if (!entry) {
      onComplete();
      return;
    }
    entry.drawn = true;
    this.detachBallPhysics(entry);

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
      targets: entry.container,
      x: this.drumX,
      y: liftY,
      scale: 1.25,
      duration: 700,
      ease: "Cubic.Out",
      onComplete: () => {
        this.tweens.add({
          targets: entry.container,
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
  const height = 520;

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width,
    height,
    backgroundColor: "#07101f",
    physics: {
      default: "matter",
      matter: {
        gravity: { x: 0, y: 0.45 },
        enableSleeping: false,
      },
    },
    scene: Mark6DrawSimulatorScene,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width,
      height,
    },
    audio: {
      noAudio: true,
    },
  });

  game.scene.start("Mark6DrawSimulatorScene", { callbacks, labels });

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
      game.destroy(true);
    },
  };
}
