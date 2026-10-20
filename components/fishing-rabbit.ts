type Ctx = CanvasRenderingContext2D;

// A small matte palette echoes the warm outlines and sage shadows of the trees.
const OUTLINE = "#60534e";
const FUR = "#eee9d8";
const FUR_SHADE = "#cdd4c5";
const EAR = "#cfb0a5";
const SWEATER = "#c8726c";
const SWEATER_SHADE = "#ad605e";
const SWEATER_LIGHT = "#d17c73";
const EYE = "#50443f";
const PALETTE = [OUTLINE, FUR, FUR_SHADE, EAR, SWEATER, SWEATER_SHADE, SWEATER_LIGHT];
const RGB_PALETTE = PALETTE.map((hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
]);

// Half-scene-pixel steps match the detail level of the reference tree sprites.
// Cache the two layers once; no image processing runs in the animation loop.
const PIXEL_SCALE = 2;
const SPRITE_PAD = 4;
let bodySprite: HTMLCanvasElement | undefined;
let pawSprite: HTMLCanvasElement | undefined;

function makePixelSprite(paint: (g: Ctx, x: number, y: number) => void) {
  const sprite = document.createElement("canvas");
  sprite.width = 24 * PIXEL_SCALE;
  sprite.height = 31 * PIXEL_SCALE;
  const g = sprite.getContext("2d");
  if (!g) return;
  g.scale(PIXEL_SCALE, PIXEL_SCALE);
  paint(g, SPRITE_PAD, SPRITE_PAD);

  // Remove antialiased fringes and intermediate glossy-looking tones, retaining
  // the designed contours as crisp steps and the shading as flat color clusters.
  const pixels = g.getImageData(0, 0, sprite.width, sprite.height);
  const data = pixels.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) {
      data[i + 3] = 0;
      continue;
    }
    let nearest = RGB_PALETTE[0];
    let distance = Infinity;
    for (const color of RGB_PALETTE) {
      const d = (data[i] - color[0]) ** 2 + (data[i + 1] - color[1]) ** 2 + (data[i + 2] - color[2]) ** 2;
      if (d < distance) {
        distance = d;
        nearest = color;
      }
    }
    data[i] = nearest[0];
    data[i + 1] = nearest[1];
    data[i + 2] = nearest[2];
    data[i + 3] = 255;
  }
  g.putImageData(pixels, 0, 0);
  return sprite;
}

function stamp(g: Ctx, sprite: HTMLCanvasElement | undefined, x: number, y: number) {
  if (!sprite) return;
  g.save();
  g.imageSmoothingEnabled = false;
  g.drawImage(sprite, x - SPRITE_PAD, y - SPRITE_PAD, sprite.width / PIXEL_SCALE, sprite.height / PIXEL_SCALE);
  g.restore();
}

export function drawFishingRabbit(g: Ctx, x: number, y: number) {
  bodySprite ??= makePixelSprite(paintRabbitBody);
  stamp(g, bodySprite, x, y);
}

export function drawFishingRabbitPaw(g: Ctx, x: number, y: number) {
  pawSprite ??= makePixelSprite(paintRabbitPaw);
  stamp(g, pawSprite, x, y);
}

/** Keep the rounded pose as the source for the fine pixel silhouette. */
function paintRabbitBody(g: Ctx, x: number, y: number) {
  g.save();
  g.translate(x, y);
  g.lineWidth = 0.65;
  g.lineJoin = "round";
  g.lineCap = "round";

  const shape = (path: string, fill: string, outline = true) => {
    const p = new Path2D(path);
    g.fillStyle = fill;
    g.fill(p);
    if (outline) {
      g.strokeStyle = OUTLINE;
      g.stroke(p);
    }
  };

  // Far ear, rounded tail, and feet sit behind the head and sweater.
  shape("M6.7 7.5 L6.1 2 Q5.8 .2 7.1 .2 Q8.5 .1 8.9 1.9 L10 7.8 Z", FUR_SHADE);
  shape("M7.2 6.4 L6.7 2 Q6.6 1.1 7.2 1.2 L8.3 6.7 Z", EAR, false);
  shape("M1.7 16.3 C-2.7 14.5 -3.1 19.8 .2 20.5 Q2.7 20.5 3 18.5 Z", FUR);
  shape("M-.9 18.8 Q.1 20 1.7 19.4 L1.5 20 Q-.3 20.4 -.9 18.8", FUR_SHADE, false);
  shape("M3.2 20.4 Q5 19.8 6.8 20.6 Q10.8 20.1 12.5 21.3 Q13.6 22.5 11.5 22.5 L3.2 22.5 Q1.5 22 3.2 20.4 Z", FUR);
  shape("M3 21.8 Q7.8 22.1 12.2 21.8 L11.6 22.3 L3.3 22.3 Z", FUR_SHADE, false);

  // A gently rounded red sweater, with a single coherent light source.
  shape("M4.1 12.3 Q7.4 11.8 10.3 13 Q12.6 15.7 12.8 19.3 Q12.8 21.1 10.5 21.3 L3.1 21.3 Q.2 21 .8 18.3 Q1.5 14.4 4.1 12.3 Z", SWEATER);
  shape("M9.7 13.6 Q12 16.5 12.2 19.3 Q12 20.7 10.3 20.7 L3.2 20.7 Q1.5 20.6 1.4 19.6 Q5.8 20.4 9.9 19.7 Q11.2 18.5 9.7 13.6 Z", SWEATER_SHADE, false);
  shape("M3.5 13.8 Q5.4 13 7.6 13.6 L6.5 16.7 L3.1 18.1 L1.7 18.5 Q2 15.6 3.5 13.8 Z", SWEATER_LIGHT, false);

  // One continuous head/near-ear silhouette avoids seams and square cheeks.
  shape("M2.6 6.8 Q1.5 3.8 1.5 1.6 Q1.4 .1 2.8 .1 Q4 .1 4.4 1.8 L5.7 6.4 Q9.3 6 10.8 8 Q11.6 8.9 11.7 10 L12.5 10.7 Q13.1 11.6 11.8 12.3 Q10.5 13.7 6.1 13.5 Q2.1 13.5 1.2 11.7 Q.3 9.2 2.6 6.8 Z", FUR);
  shape("M3.1 6.5 Q2.4 3.6 2.3 1.8 Q2.3 1 2.9 1.2 Q3.3 1.5 3.5 2.5 L4.5 6.4 Z", EAR, false);
  shape("M1.4 10.7 Q2.5 12.6 6.3 12.7 Q9.6 13 11.7 11.9 Q10.5 13.2 6.1 13.1 Q2.4 13.1 1.4 11.6 Z", FUR_SHADE, false);
  shape("M7.7 11 Q8.7 10.4 9.5 11 Q9.8 11.7 8.8 11.8 Q7.8 11.8 7.7 11 Z", EAR, false);
  shape("M11.9 10.5 Q12.6 10.5 12.5 11.1 L12 11.2 Z", EAR, false);

  // Rounded sleeve still reaches the existing rod and paw position.
  shape("M9 15 Q10.2 14.4 11.2 15.6 L13.9 18 Q14.3 19.1 13.1 19.5 Q11.1 18.6 9.3 17.1", SWEATER);
  g.restore();
}

function paintRabbitPaw(g: Ctx, x: number, y: number) {
  g.save();
  g.translate(x, y);
  const paw = new Path2D("M13.3 17.7 Q15.6 16.9 16 18.2 Q16.7 19.4 14.8 19.8 Q12.4 20.2 12.8 18.8 Z");
  g.fillStyle = FUR;
  g.fill(paw);
  g.strokeStyle = OUTLINE;
  g.lineWidth = 0.6;
  g.stroke(paw);
  g.restore();
}

export type RabbitExpression = "idle" | "alert" | "effort" | "happy";

/** Tiny half-pixel facial changes keep the existing matte face and idle blink. */
export function drawFishingRabbitEye(g: Ctx, x: number, y: number, closed: boolean, expression: RabbitExpression = "idle") {
  g.save();
  g.fillStyle = EYE;
  if (closed) {
    g.fillRect(x + 9.5, y + 10, 1.5, 0.5);
  } else if (expression === "alert") {
    g.fillRect(x + 9.5, y + 8.5, 1.5, 2);
    g.fillStyle = FUR;
    g.fillRect(x + 9.5, y + 8.5, 0.5, 0.5);
    g.fillStyle = EYE;
    g.fillRect(x + 9, y + 7.5, 1.5, 0.5);
  } else if (expression === "effort") {
    g.fillRect(x + 9.5, y + 9, 1, 0.5);
    g.fillRect(x + 10.5, y + 9.5, 0.5, 0.5);
    g.fillRect(x + 9.5, y + 10, 1, 0.5);
  } else if (expression === "happy") {
    g.fillRect(x + 9.5, y + 9.5, 0.5, 0.5);
    g.fillRect(x + 10, y + 9, 1, 0.5);
    g.fillRect(x + 11, y + 9.5, 0.5, 0.5);
  } else {
    g.fillRect(x + 10, y + 9, 1, 1.5);
  }
  if (expression === "happy") {
    g.fillRect(x + 9.5, y + 11.5, 0.5, 0.5);
    g.fillRect(x + 10, y + 12, 1, 0.5);
    g.fillRect(x + 11, y + 11.5, 0.5, 0.5);
  } else if (expression === "alert") {
    g.fillRect(x + 10.5, y + 11.5, 0.5, 1);
  } else if (expression === "effort") {
    g.fillRect(x + 10, y + 12, 1, 0.5);
  }
  g.restore();
}
