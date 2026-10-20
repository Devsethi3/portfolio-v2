type Ctx = CanvasRenderingContext2D;

const BIRD_X = 233.5;
const FEET_Y = 133;
const SCALE = 0.41;
let birdSprite: HTMLCanvasElement | undefined;

function shape(g: Ctx, path: string, color: string) {
  g.fillStyle = color;
  g.fill(new Path2D(path));
}

/** Flat color shapes keep the reference's rounded macaw readable at scene scale. */
function paintBird(g: Ctx) {
  // Tapered tail feathers sit behind the body and hang below the existing perch.
  shape(g, "M20 24Q26 24 27 31L30 44Q31 48 28 47Q25 45 24 40L21 30Z", "#244f65");
  shape(g, "M22 28L25 29L28.5 44Q29 46 28 45L25.5 39Z", "#258cb5");
  shape(g, "M24 29L25 30L28.5 43L27.5 41Z", "#48b5ca");
  shape(g, "M23 25Q29 28 31 33Q31.5 35 29 33L24 30Q27 34 25 34L20 28Z", "#244f65");

  // Rounded crown, natural neck, and full breast form one continuous silhouette.
  shape(g, "M3 6Q3 1 10 1Q16 0 20 4L18 4.5Q21 6 19 6.5L18 6Q19 10 21 14Q27 18 27 24Q26 29 20 29Q11 28 8 23Q6 19 7 12L4 10Z", "#244f65");
  shape(g, "M4 6Q4 2 10 2Q15 1 18.5 4L16 4Q19 5 18 5.5Q16 5 15 4.5L19 15L14 18L8 12Z", "#259bc2");
  shape(g, "M4.5 5Q5 2 10 2Q14 1.5 17 3.5Q11 2.5 7 5Z", "#66cbd1");

  // Broad golden chest, with a small warm shadow under the cheek and wing.
  shape(g, "M13 7Q17 7 18 11L16 10.5Q18 13 17 14L16 13Q20 16 23 22L24 28Q15 28 10 24Q7 20 8 12Z", "#eebd48");
  shape(g, "M10 11Q12 12 14 10L15 13Q12 17 14 24Q9 23 8.5 18L9 13Z", "#f8d961");
  shape(g, "M10 11L14 10L13 13Q11 15 9 15Z", "#dfa73d");

  // Large ivory face and hooked navy beak are the main recognition details.
  shape(g, "M7 5Q10 3 13 4Q15 5 14 9Q13 12 10 11L7 9Z", "#244f65");
  shape(g, "M7 5.5Q10 3.5 12.5 4.5Q14 5.5 13 8.5Q12 10.5 10 10L7 8.5Z", "#faf3d1");
  shape(g, "M10 10Q12 11 14 9L13 12Q11 13 9 11Z", "#f1e8b6");
  shape(g, "M3.5 6Q5 5 7 6L9 8Q5 8 3.5 7Z", "#f8d961");
  shape(g, "M3.5 7Q7 6.5 9 9Q10 12 7 12L5.5 11Q4 12 5 14Q1 12 2.5 8Z", "#183b50");
  shape(g, "M3 7.5Q5 7 6.5 8Q5 10 3.5 11.5Q2.5 10 3 7.5Z", "#28566a");
  shape(g, "M7 9Q8.5 9 8.5 11Q7.5 11.5 6 10.5Z", "#102f43");

  // Layered flight feathers: a few broad shapes instead of tiny noisy marks.
  shape(g, "M16 13Q20 11 25 17Q28 20 29 25Q29 27 27 26L28 28Q26 29 23 26Q25 30 23 29Q16 27 14 21Q12 16 16 13Z", "#244f65");
  shape(g, "M15 16Q17 17 20 23Q22 27 21 27Q16 24 15 19Z", "#237da7");
  shape(g, "M18 16Q22 18 25 24L27 27Q24 27 21 23Z", "#248eb8");
  shape(g, "M22 17Q26 20 28 25Q27 26 24 22Z", "#299bc1");
  shape(g, "M15 13Q19 11 24 16Q27 18 27.5 21Q25 22 23 19Q24 22 22 21.5Q20.5 21 19.5 18.5Q20 22 18 21Q16.5 20 16 17.5Q16 20 14.5 19Q12.5 17 15 13Z", "#38b5ce");
  shape(g, "M14.5 16Q14 13 17 12.5Q20 12.5 23 15L21 14.5Q17 12.5 15 16Z", "#8bd6d6");
}

/** Cache the artwork once; the low-resolution raster keeps it part of the scene. */
function makeSprite() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 96;
  const g = canvas.getContext("2d");
  if (!g) return;
  g.scale(2, 2);
  paintBird(g);
  return canvas;
}

/** A short perch with just two leaves at its exposed tip. */
export function drawBirdPerch(g: Ctx) {
  g.save();
  g.translate(BIRD_X, FEET_Y);
  g.fillStyle = "#765946";
  g.fillRect(-3.5, 0, 6, 1);
  g.fillRect(2, 0.5, 2.5, 1);
  g.fillRect(4, 1, 2.5, 1);
  shape(g, "M-3.5 0H-5V-0.5H-6V-2H-4.5V-1.5H-3.5Z", "#688d65");
  shape(g, "M-3.5 0.5H-5V1H-5.5V2.5H-4V2H-3.5Z", "#557c59");
  g.fillStyle = "#9fb77d";
  g.fillRect(-5.5, -1.5, 1, 0.5);
  g.fillRect(-5, 1, 0.5, 1);
  g.restore();
}

function drawFeet(g: Ctx) {
  for (const x of [16, 20]) {
    g.fillStyle = "#425553";
    g.fillRect(x, 27, 1, 2);
    g.fillRect(x - 1, 28.5, 3, 0.5);
    g.fillRect(x - 1, 29, 0.5, 1);
    g.fillStyle = "#b9b698";
    g.fillRect(x, 27, 0.5, 1.5);
  }
}

export function drawFishingBird(g: Ctx, time: number, reducedMotion: boolean, speaking: boolean, attentive: boolean, pleased: boolean) {
  birdSprite ??= makeSprite();
  if (!birdSprite) return;
  g.save();
  g.imageSmoothingEnabled = false;
  g.translate(BIRD_X - 18 * SCALE, FEET_Y - 29 * SCALE);
  g.scale(SCALE, SCALE);
  g.drawImage(birdSprite, 0, 0, 32, 48);
  const blink = !reducedMotion && (time + 1.7) % 5.6 < 0.16;
  g.fillStyle = "#183b50";
  if (blink || pleased) {
    g.fillRect(10, 6.5, 2, 0.5);
  } else {
    g.beginPath();
    g.ellipse(11, 6.25, 1, attentive ? 1.5 : 1.25, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#faf3d1";
    g.fillRect(10.5, 5.5, 0.5, 0.5);
  }
  if (speaking && !reducedMotion && Math.sin(time * 12) > 0.2) {
    g.fillStyle = "#eff0c9";
    g.fillRect(6, 10.5, 1.5, 0.5);
  }
  drawFeet(g);
  g.restore();
}
