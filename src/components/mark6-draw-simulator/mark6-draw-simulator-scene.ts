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
const BALL_DIAMETER = BALL_RADIUS * 2;
const MIX_GRAVITY = 0.42;
const MIX_DRAG = 0.988;
const MIX_SETTLE_DRAG = 0.955;
const WALL_BOUNCE = 0.78;
const WALL_BOUNCE_SETTLE = 0.32;
const BALL_BOUNCE = 0.92;
const MAX_BALL_SPEED = 9.5;
const MIX_SPIN = 0.085;
const MIX_SETTLE_MS = 1_800;
const REVEAL_SCALE = 1.5;
const REVEAL_BONUS_SCALE = 1.65;
const RACK_SLOT_RADIUS = 20;

type BallEntry = {
  number: number;
  dropSprite?: Phaser.GameObjects.Container;
  circle?: Phaser.GameObjects.Arc;
  label?: Phaser.GameObjects.Text;
  drawn: boolean;
  vx: number;
  vy: number;
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
  private slotGap = 34;
  private slotInset = 22;
  private backdrop?: Phaser.GameObjects.Graphics;
  private drumGraphic?: Phaser.GameObjects.Graphics;
  private drumRimGraphic?: Phaser.GameObjects.Graphics;
  private paddleGraphic?: Phaser.GameObjects.Graphics;
  private drumBase?: Phaser.GameObjects.Graphics;
  private rackGraphic?: Phaser.GameObjects.Graphics;
  private rackPlusLabel?: Phaser.GameObjects.Text;
  private columnGraphic?: Phaser.GameObjects.Graphics;
  private running = false;
  private mixing = false;
  private mixTimer?: Phaser.Time.TimerEvent;
  private spinPhase = 0;
  private mixElapsedMs = 0;
  private mixDurationMs = MARK6_DRAW_SIMULATOR_MIX_MS;

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
    if (!this.mixing) {
      return;
    }

    const step = Math.min(delta, 34);
    this.mixElapsedMs += step;
    const energy = this.getMixEnergy();
    this.spinPhase += step * MIX_SPIN * (0.22 + energy * 0.78);
    const rock = Math.sin(this.spinPhase * 0.35) * 11 * energy;
    if (this.drumGraphic) {
      this.drumGraphic.setAngle(rock);
    }
    if (this.drumRimGraphic) {
      this.drumRimGraphic.setAngle(rock);
    }
    if (this.paddleGraphic) {
      this.paddleGraphic.setAngle(this.spinPhase * 18);
    }

    const substeps = 2;
    const dt = step / (16.67 * substeps);
    for (let i = 0; i < substeps; i += 1) {
      this.integrateMixPhysics(dt);
    }
  }

  shutdown() {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.off("start-draw", this.handleStartDraw, this);
    this.events.off("reset-draw", this.handleReset, this);
    this.stopMixing();
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

    const rackPadding = 20;
    const minSlotGap = RACK_SLOT_RADIUS * 2 + 4;
    const maxSlotGap = 48;
    const bonusSeparator = 22;
    const availableWidth = width - rackPadding * 2;
    const slotGap = Math.min(
      maxSlotGap,
      Math.max(minSlotGap, (availableWidth - bonusSeparator) / 6),
    );
    const bonusGap = slotGap + bonusSeparator;
    const rackStartX = this.drumX - (5 * slotGap + bonusGap) / 2;
    this.slotGap = slotGap;
    this.mainSlotXs = Array.from(
      { length: 6 },
      (_value, index) => rackStartX + index * slotGap,
    );
    this.bonusSlotX = rackStartX + 5 * slotGap + bonusGap;
    this.slotInset = Math.max(
      12,
      Math.min(22, this.mainSlotXs[0] - 8, width - this.bonusSlotX - 8),
    );
  }

  private drawStage() {
    const { width, height } = this.scale;

    this.backdrop?.destroy();
    this.drumGraphic?.destroy();
    this.drumRimGraphic?.destroy();
    this.paddleGraphic?.destroy();
    this.drumBase?.destroy();
    this.rackGraphic?.destroy();
    this.rackPlusLabel?.destroy();
    this.columnGraphic?.destroy();

    this.backdrop = this.add.graphics();
    this.backdrop.fillGradientStyle(0x07101f, 0x07101f, 0x0f2a4d, 0x0f2a4d, 1);
    this.backdrop.fillRect(0, 0, width, height);

    const chute = this.add.graphics();
    chute.fillStyle(0xffffff, 0.1);
    chute.fillRoundedRect(this.drumX - 22, 10, 44, this.drumY - this.drumRadius - 8, 8);
    chute.lineStyle(2, 0x5eb3ff, 0.4);
    chute.strokeRoundedRect(this.drumX - 22, 10, 44, this.drumY - this.drumRadius - 8, 8);
    chute.fillStyle(0x07101f, 0.55);
    chute.fillTriangle(
      this.drumX - 18,
      this.drumY - this.drumRadius - 10,
      this.drumX + 18,
      this.drumY - this.drumRadius - 10,
      this.drumX,
      this.drumY - this.drumRadius + 6,
    );

    this.drumGraphic = this.add.graphics();
    this.drumGraphic.setPosition(this.drumX, this.drumY);
    this.drumGraphic.setDepth(1);
    this.drumGraphic.fillStyle(0x0b2748, 0.42);
    this.drumGraphic.fillCircle(0, 0, this.drumRadius);
    this.drumGraphic.fillStyle(0xffffff, 0.07);
    this.drumGraphic.fillEllipse(-this.drumRadius * 0.22, -this.drumRadius * 0.28, this.drumRadius * 0.7, this.drumRadius * 0.38);

    this.paddleGraphic = this.add.graphics();
    this.paddleGraphic.setPosition(this.drumX, this.drumY);
    this.paddleGraphic.setDepth(2);
    this.paddleGraphic.lineStyle(4, 0xb3e5fc, 0.55);
    for (let paddle = 0; paddle < 4; paddle += 1) {
      const angle = (Math.PI / 2) * paddle;
      this.paddleGraphic.lineBetween(
        Math.cos(angle) * 18,
        Math.sin(angle) * 18,
        Math.cos(angle) * (this.drumRadius - 22),
        Math.sin(angle) * (this.drumRadius - 22),
      );
    }
    this.paddleGraphic.fillStyle(0x90caf9, 0.35);
    this.paddleGraphic.fillCircle(0, 0, 10);

    this.drumRimGraphic = this.add.graphics();
    this.drumRimGraphic.setPosition(this.drumX, this.drumY);
    this.drumRimGraphic.setDepth(16);
    this.drumRimGraphic.lineStyle(8, 0x7ec8ff, 0.95);
    this.drumRimGraphic.strokeCircle(0, 0, this.drumRadius);
    this.drumRimGraphic.lineStyle(3, 0xffffff, 0.22);
    this.drumRimGraphic.strokeCircle(0, 0, this.drumRadius - 14);

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

    const mainRackWidth = this.mainSlotXs[5] - this.mainSlotXs[0] + this.slotInset * 2;

    this.rackGraphic = this.add.graphics();
    this.rackGraphic.lineStyle(2, 0xffffff, 0.2);
    this.rackGraphic.strokeRoundedRect(
      this.mainSlotXs[0] - this.slotInset,
      this.rackY - 28,
      mainRackWidth,
      56,
      14,
    );
    this.mainSlotXs.forEach((x) => {
      this.rackGraphic?.lineStyle(1.5, 0xffffff, 0.18);
      this.rackGraphic?.strokeCircle(x, this.rackY, RACK_SLOT_RADIUS);
    });

    const dividerX = (this.mainSlotXs[5] + this.bonusSlotX) / 2;
    this.rackGraphic.lineStyle(2, 0xffd54f, 0.45);
    this.rackGraphic.lineBetween(dividerX, this.rackY - 12, dividerX, this.rackY + 12);
    this.rackPlusLabel = this.add
      .text(dividerX, this.rackY, "+", {
        fontFamily: "Arial, sans-serif",
        fontSize: "18px",
        color: "#ffd54f",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setAlpha(0.85);

    this.rackGraphic.lineStyle(2, 0xffd54f, 0.55);
    this.rackGraphic.strokeRoundedRect(this.bonusSlotX - this.slotInset, this.rackY - 28, this.slotInset * 2, 56, 14);
    this.rackGraphic.strokeCircle(this.bonusSlotX, this.rackY, RACK_SLOT_RADIUS);
  }

  private getBallPosition(entry: BallEntry): { x: number; y: number } | null {
    if (entry.circle) {
      return { x: entry.circle.x, y: entry.circle.y };
    }
    if (entry.dropSprite) {
      return { x: entry.dropSprite.x, y: entry.dropSprite.y };
    }
    return null;
  }

  private syncLabel(entry: BallEntry) {
    if (!entry.circle) {
      return;
    }
    if (entry.label) {
      entry.label.setPosition(entry.circle.x, entry.circle.y);
      entry.label.setRotation(entry.circle.rotation);
    }
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
    return { number, dropSprite, drawn: false, vx: 0, vy: 0 };
  }

  private createCircleBall(number: number, x: number, y: number): BallEntry {
    const color = getMark6BallColor(number);
    const circle = this.add
      .circle(x, y, BALL_RADIUS, color)
      .setStrokeStyle(2, 0xffffff)
      .setDepth(10);
    const label = this.add
      .text(x, y, String(number), {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(11);
    return {
      number,
      circle,
      label,
      drawn: false,
      vx: Phaser.Math.FloatBetween(-3.2, 3.2),
      vy: Phaser.Math.FloatBetween(-1.2, 2.4),
    };
  }

  private clampToDrum(x: number, y: number): { x: number; y: number } {
    const dx = x - this.drumX;
    const dy = y - this.drumY;
    const dist = Math.hypot(dx, dy);
    const maxDist = this.drumRadius - BALL_RADIUS - 4;
    if (dist <= maxDist || dist === 0) {
      return { x, y };
    }
    const scale = maxDist / dist;
    return {
      x: this.drumX + dx * scale,
      y: this.drumY + dy * scale,
    };
  }

  private getMixEnergy() {
    const remaining = this.mixDurationMs - this.mixElapsedMs;
    if (remaining >= MIX_SETTLE_MS) {
      return 1;
    }
    const t = Math.max(0, remaining / MIX_SETTLE_MS);
    return 0.08 + t * t * 0.92;
  }

  private clampSpeed(entry: BallEntry) {
    const maxSpeed = 1.4 + MAX_BALL_SPEED * this.getMixEnergy();
    const speed = Math.hypot(entry.vx, entry.vy);
    if (speed <= maxSpeed) {
      return;
    }
    const scale = maxSpeed / speed;
    entry.vx *= scale;
    entry.vy *= scale;
  }

  private bounceOffDrum(entry: BallEntry) {
    if (!entry.circle) {
      return;
    }
    const dx = entry.circle.x - this.drumX;
    const dy = entry.circle.y - this.drumY;
    const dist = Math.max(Math.hypot(dx, dy), 0.001);
    const maxDist = this.drumRadius - BALL_RADIUS - 3;
    if (dist <= maxDist) {
      return;
    }

    const nx = dx / dist;
    const ny = dy / dist;
    entry.circle.x = this.drumX + nx * maxDist;
    entry.circle.y = this.drumY + ny * maxDist;

    const energy = this.getMixEnergy();
    const restitution = WALL_BOUNCE_SETTLE + (WALL_BOUNCE - WALL_BOUNCE_SETTLE) * energy;
    const outgoing = entry.vx * nx + entry.vy * ny;
    if (outgoing > 0) {
      entry.vx -= (1 + restitution) * outgoing * nx;
      entry.vy -= (1 + restitution) * outgoing * ny;
    }

    const tangentX = -ny;
    const tangentY = nx;
    const scoop = (2.6 + Math.abs(Math.sin(this.spinPhase)) * 1.8) * energy;
    entry.vx += tangentX * scoop;
    entry.vy += tangentY * scoop;
    this.clampSpeed(entry);
  }

  private resolveBallCollisions() {
    for (let i = 0; i < this.balls.length; i += 1) {
      const a = this.balls[i];
      if (!a?.circle || a.drawn) {
        continue;
      }
      for (let j = i + 1; j < this.balls.length; j += 1) {
        const b = this.balls[j];
        if (!b?.circle || b.drawn) {
          continue;
        }
        const dx = b.circle.x - a.circle.x;
        const dy = b.circle.y - a.circle.y;
        const dist = Math.hypot(dx, dy);
        const minDist = BALL_DIAMETER + 1;
        if (dist >= minDist || dist === 0) {
          continue;
        }

        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = minDist - dist;
        a.circle.x -= nx * overlap * 0.5;
        a.circle.y -= ny * overlap * 0.5;
        b.circle.x += nx * overlap * 0.5;
        b.circle.y += ny * overlap * 0.5;

        const relVx = b.vx - a.vx;
        const relVy = b.vy - a.vy;
        const closing = relVx * nx + relVy * ny;
        if (closing >= 0) {
          continue;
        }
        const impulse = (-(1 + BALL_BOUNCE * (0.35 + this.getMixEnergy() * 0.65)) * closing) / 2;
        a.vx -= impulse * nx;
        a.vy -= impulse * ny;
        b.vx += impulse * nx;
        b.vy += impulse * ny;
        this.clampSpeed(a);
        this.clampSpeed(b);
      }
    }
  }

  private integrateMixPhysics(dt: number) {
    for (const entry of this.balls) {
      if (!entry.circle || entry.drawn) {
        continue;
      }
      const energy = this.getMixEnergy();
      const drag = MIX_SETTLE_DRAG + (MIX_DRAG - MIX_SETTLE_DRAG) * energy;
      entry.vy += MIX_GRAVITY * dt;
      entry.vx *= drag;
      entry.vy *= drag;
      entry.circle.x += entry.vx * dt * 16.67;
      entry.circle.y += entry.vy * dt * 16.67;
      entry.circle.angle += entry.vx * 2.4 * dt;
      this.bounceOffDrum(entry);
    }
    this.resolveBallCollisions();
    for (const entry of this.balls) {
      if (!entry.circle || entry.drawn) {
        continue;
      }
      const clamped = this.clampToDrum(entry.circle.x, entry.circle.y);
      entry.circle.x = clamped.x;
      entry.circle.y = clamped.y;
      this.syncLabel(entry);
    }
  }

  private randomPointInDrum(): { x: number; y: number } {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const distance = Phaser.Math.FloatBetween(10, this.drumRadius - BALL_RADIUS - 10);
    return this.clampToDrum(
      this.drumX + Math.cos(angle) * distance,
      this.drumY + Math.sin(angle) * distance,
    );
  }

  private prepareBallsForMixing() {
    const converted: BallEntry[] = [];

    for (const entry of this.balls) {
      if (entry.circle && entry.label) {
        converted.push(entry);
        continue;
      }

      if (!entry.dropSprite) {
        continue;
      }

      this.tweens.killTweensOf(entry.dropSprite);
      const x = entry.dropSprite.x;
      const y = entry.dropSprite.y;
      entry.dropSprite.destroy();

      const circleBall = this.createCircleBall(entry.number, x, y);
      circleBall.drawn = entry.drawn;
      converted.push(circleBall);
    }

    this.balls = converted;
  }

  private destroyBallEntry(entry: BallEntry) {
    entry.dropSprite?.destroy();
    entry.circle?.destroy();
    entry.label?.destroy();
  }

  private handleReset = () => {
    this.stopMixing();
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
        delay: index * 38,
        duration: 620,
        ease: "Bounce.Out",
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
    this.prepareBallsForMixing();

    this.mixing = true;
    this.spinPhase = 0;
    this.mixElapsedMs = 0;
    this.mixDurationMs = durationMs;

    for (const entry of this.balls) {
      if (entry.drawn || !entry.circle) {
        continue;
      }
      this.tweens.killTweensOf(entry.circle);
      entry.vx = Phaser.Math.FloatBetween(-5.5, 5.5);
      entry.vy = Phaser.Math.FloatBetween(-4.2, 3.8);
      this.syncLabel(entry);
    }

    this.mixTimer = this.time.delayedCall(durationMs, () => {
      this.finishMixing(onComplete);
    });
  }

  private finishMixing(onComplete: () => void) {
    if (!this.mixing) {
      return;
    }

    this.mixing = false;

    if (this.mixTimer) {
      this.mixTimer.remove(false);
      this.mixTimer = undefined;
    }

    for (const entry of this.balls) {
      if (entry.circle) {
        this.tweens.killTweensOf(entry.circle);
      }
      entry.vx = 0;
      entry.vy = 0;
      this.syncLabel(entry);
    }

    if (this.drumGraphic) {
      this.tweens.killTweensOf(this.drumGraphic);
      this.drumGraphic.setAngle(0);
    }
    if (this.drumRimGraphic) {
      this.drumRimGraphic.setAngle(0);
    }
    if (this.paddleGraphic) {
      this.paddleGraphic.setAngle(0);
    }

    onComplete();
  }

  private stopMixing() {
    this.mixing = false;

    if (this.mixTimer) {
      this.mixTimer.remove(false);
      this.mixTimer = undefined;
    }

    for (const entry of this.balls) {
      if (entry.circle) {
        this.tweens.killTweensOf(entry.circle);
      }
      entry.vx = 0;
      entry.vy = 0;
    }

    if (this.drumGraphic) {
      this.tweens.killTweensOf(this.drumGraphic);
      this.drumGraphic.setAngle(0);
    }
    if (this.drumRimGraphic) {
      this.drumRimGraphic.setAngle(0);
    }
    if (this.paddleGraphic) {
      this.paddleGraphic.setAngle(0);
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
    if (!entry?.circle || !entry.label) {
      onComplete();
      return;
    }
    entry.drawn = true;
    this.tweens.killTweensOf(entry.circle);
    entry.vx = 0;
    entry.vy = 0;
    entry.circle.setDepth(20);
    entry.label.setDepth(21);
    entry.label.setFontSize(18);
    entry.label.setRotation(0);

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
      scale: 1.7,
      angle: 0,
      duration: 700,
      ease: "Cubic.Out",
      onUpdate: () => this.syncLabel(entry),
      onComplete: () => {
        this.tweens.add({
          targets: [entry.circle, entry.label],
          x: slotX,
          y: this.rackY,
          scale: isBonus ? REVEAL_BONUS_SCALE : REVEAL_SCALE,
          duration: 900,
          ease: "Quad.InOut",
          onUpdate: () => this.syncLabel(entry),
          onComplete: () => {
            this.syncLabel(entry);
            const glow = this.add.circle(slotX, this.rackY, 24, isBonus ? 0xffd54f : 0x42a5f5, 0.25);
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
    input: {
      touch: {
        capture: false,
      },
    },
  });

  game.input.enabled = false;

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
