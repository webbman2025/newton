"use client";

import * as Phaser from "phaser";
import {
  formatMark6SectionRange,
  getMark6BallColor,
  MARK6_BALL_SECTIONS,
  MARK6_DRAW_SIMULATOR_MIX_MS,
  type Mark6DrawSimulatorLabels,
  type Mark6DrawSimulatorPayload,
} from "@/lib/mark6-draw-simulator";

type BallEntry = {
  number: number;
  container: Phaser.GameObjects.Container;
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
  private drumX = 0;
  private drumY = 0;
  private drumRadius = 118;
  private rackY = 0;
  private mainSlotXs: number[] = [];
  private bonusSlotX = 0;
  private drumGraphic?: Phaser.GameObjects.Graphics;
  private columnGraphic?: Phaser.GameObjects.Graphics;
  private mixEvent?: Phaser.Time.TimerEvent;
  private running = false;

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
    this.drawRack();
    this.drawColumn();

    this.events.on("start-draw", this.handleStartDraw, this);
    this.events.on("reset-draw", this.handleReset, this);
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
    const circle = this.add.circle(0, 0, 14, color).setStrokeStyle(2, 0xffffff);
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
    return { number, container, drawn: false };
  }

  private randomPointInDrum(): { x: number; y: number } {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const distance = Phaser.Math.FloatBetween(8, this.drumRadius - 22);
    return {
      x: this.drumX + Math.cos(angle) * distance,
      y: this.drumY + Math.sin(angle) * distance,
    };
  }

  private handleReset = () => {
    this.stopMixing();
    this.running = false;
    this.payload = null;
    this.balls.forEach((ball) => ball.container.destroy());
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
      this.runDrawSequence(0);
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
      this.callbacks.onStatus(this.labels.mixing.replace("{range}", rangeLabel));
      this.startMixing(MARK6_DRAW_SIMULATOR_MIX_MS, () => {
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
        delay: index * 90,
        duration: 650,
        ease: "Back.Out",
        onComplete: () => {
          completed += 1;
          if (completed === numbers.length) {
            this.time.delayedCall(350, () => onComplete());
          }
        },
      });
    });
  }

  private startMixing(durationMs: number, onComplete: () => void) {
    this.stopMixing();
    this.mixEvent = this.time.addEvent({
      delay: 220,
      loop: true,
      callback: () => {
        this.balls
          .filter((ball) => !ball.drawn)
          .forEach((ball) => {
            const target = this.randomPointInDrum();
            this.tweens.add({
              targets: ball.container,
              x: target.x,
              y: target.y,
              duration: 210,
              ease: "Sine.InOut",
            });
          });
      },
    });

    if (this.drumGraphic) {
      this.tweens.add({
        targets: this.drumGraphic,
        angle: 360,
        duration: 4200,
        repeat: Math.ceil(durationMs / 4200),
        ease: "Linear",
      });
    }

    this.time.delayedCall(durationMs, () => {
      this.stopMixing();
      onComplete();
    });
  }

  private stopMixing() {
    this.mixEvent?.remove(false);
    this.mixEvent = undefined;
    if (this.drumGraphic) {
      this.tweens.killTweensOf(this.drumGraphic);
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
