(function () {
  'use strict';

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // p5.js is the browser version of Processing. It only loads once the Art tab opens.
  const P5_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js';
  const P5_SRI = 'sha512-d6sc8kbZEtA2LwB9m/ck0FhvyUwVfdmvTeyJRprmj7Wg9wRFtHDIpr6qk4g/y3Ix3O9I6KHIv6SGu9f7RaP1Gw==';

  /* ------------------------------------------------------------------
     Sketches. Each one is a p5 instance-mode sketch: `p` is the p5
     instance and `C` holds the canvas size and this site's theme colours.
     p.restart() redraws from scratch (new seed, resize, theme change).
     The Code button shows each function's source exactly as written here.
     ------------------------------------------------------------------ */
  const SKETCHES = [
    {
      id: 'flow-field',
      featured: true,
      title: 'Flow Field',
      kicker: 'noise() · beginShape(LINES)',
      blurb: 'Eighteen hundred particles ride an invisible wind made of Perlin noise. Each one leaves a faint trail, so the field slowly paints itself while the wind keeps shifting.',
      hint: 'Move over it to push the particles',
      learn: 'https://processing.org/reference/noise_.html',
      poster: 160,
      sketch: (p, C) => {
        // Every particle reads an angle from 3D Perlin noise (x, y, time) and steps that way
        const COUNT = 1800;
        const ZOOM = 0.0018; // smaller = broader, smoother currents
        const SPEED = 1.6;
        let groups = [];
        let inks = [];
        let t = 0;

        p.setup = () => {
          p.createCanvas(C.width, C.height);
          p.restart();
        };

        p.restart = () => {
          p.noiseSeed(p.random(1e6));
          p.background(C.bg);
          // Three colour groups, so each group can be drawn as one batch of lines
          inks = [C.a1, C.a2, C.a3].map((c) => {
            const ink = p.color(c);
            ink.setAlpha(80);
            return ink;
          });
          groups = inks.map(() => Array.from({ length: COUNT / 3 }, () => ({
            x: p.random(p.width),
            y: p.random(p.height),
          })));
        };

        p.draw = () => {
          // A see-through background fades old trails instead of wiping them
          const fade = p.color(C.bg);
          fade.setAlpha(16);
          p.background(fade);

          const over = p.mouseX > 0 && p.mouseX < p.width && p.mouseY > 0 && p.mouseY < p.height;
          p.strokeWeight(1.2);

          groups.forEach((particles, g) => {
            p.stroke(inks[g]);
            p.beginShape(p.LINES);
            for (const pt of particles) {
              const angle = p.noise(pt.x * ZOOM, pt.y * ZOOM, t) * p.TAU * 2;
              let vx = Math.cos(angle) * SPEED;
              let vy = Math.sin(angle) * SPEED;

              if (over) {
                // Push away from the mouse, harder the closer it is
                const dx = pt.x - p.mouseX;
                const dy = pt.y - p.mouseY;
                const d = Math.hypot(dx, dy);
                if (d > 0 && d < 110) {
                  const push = (1 - d / 110) * 4;
                  vx += (dx / d) * push;
                  vy += (dy / d) * push;
                }
              }

              p.vertex(pt.x, pt.y);
              pt.x += vx;
              pt.y += vy;
              p.vertex(pt.x, pt.y);

              // Respawn somewhere random after leaving the canvas (or now and then anyway)
              if (pt.x < 0 || pt.x > p.width || pt.y < 0 || pt.y > p.height || p.random() < 0.003) {
                pt.x = p.random(p.width);
                pt.y = p.random(p.height);
              }
            }
            p.endShape();
          });

          t += 0.0016;
        };
      },
    },

    {
      id: 'tree',
      title: 'Recursive Tree',
      kicker: 'recursion · push() / pop()',
      blurb: 'One function draws a branch, then calls itself twice to draw two smaller ones. Ten levels down that makes over two thousand branches, all swaying in a breeze made of noise.',
      hint: 'Move left or right to open the branches',
      learn: 'https://processing.org/examples/tree.html',
      sketch: (p, C) => {
        const DEPTH = 10;
        let seed;
        let spread = 0.45;
        let shades = [];
        let leaves = [];

        p.setup = () => {
          p.createCanvas(C.width, C.height);
          p.restart();
        };

        p.restart = () => {
          seed = p.random(1e6);
          // One shade per level, fading from bark to leaf
          shades = Array.from({ length: DEPTH + 1 }, (_, i) =>
            p.lerpColor(p.color(C.muted), p.color(C.a2), i / DEPTH));
          leaves = [C.a3, C.gold].map((c) => {
            const leaf = p.color(c);
            leaf.setAlpha(170);
            return leaf;
          });
        };

        p.draw = () => {
          p.background(C.bg);
          // Re-seeding every frame grows the same tree each time; only the wind moves it
          p.randomSeed(seed);

          const over = p.mouseX > 0 && p.mouseX < p.width && p.mouseY > 0 && p.mouseY < p.height;
          const target = over ? p.map(p.mouseX, 0, p.width, 0.12, 1.1) : 0.45;
          spread = p.lerp(spread, target, 0.08);

          p.translate(p.width / 2, p.height);
          branch(p.height * 0.2, 0);
        };

        function branch(len, depth) {
          p.stroke(shades[depth]);
          p.strokeWeight(p.map(depth, 0, DEPTH, p.width / 50, 1));
          p.line(0, 0, 0, -len);
          p.translate(0, -len);

          if (depth === DEPTH) {
            p.noStroke();
            p.fill(p.random(leaves));
            p.circle(0, 0, p.random(3, 7));
            return;
          }

          // Higher branches feel more of the wind
          const wind = (p.noise(depth * 0.5, p.frameCount * 0.012) - 0.5) * 0.5 * (depth / DEPTH);
          for (const side of [-1, 1]) {
            p.push();
            p.rotate(side * spread * p.random(0.6, 1.1) + wind);
            branch(len * p.random(0.66, 0.8), depth + 1);
            p.pop();
          }
        }
      },
    },

    {
      id: 'flocking',
      title: 'Flocking',
      kicker: 'p5.Vector · steering forces',
      blurb: "Craig Reynolds' boids. No bird knows about the flock; each one only follows three rules about its neighbours: don't crowd, match their heading, stay close.",
      hint: 'Move over it to scatter the flock',
      learn: 'https://processing.org/examples/flocking.html',
      sketch: (p, C) => {
        const COUNT = 110;
        const VIEW = 46; // how far a boid can see
        const MAX_SPEED = 2.6;
        const MAX_FORCE = 0.06;
        let boids = [];

        p.setup = () => {
          p.createCanvas(C.width, C.height);
          p.restart();
        };

        p.restart = () => {
          boids = Array.from({ length: COUNT }, () => ({
            pos: p.createVector(p.random(p.width), p.random(p.height)),
            vel: p5.Vector.random2D().mult(p.random(1, MAX_SPEED)),
            color: p.color(p.random([C.a1, C.a2, C.a3])),
          }));
        };

        p.draw = () => {
          p.background(C.bg);
          const over = p.mouseX > 0 && p.mouseX < p.width && p.mouseY > 0 && p.mouseY < p.height;
          const mouse = p.createVector(p.mouseX, p.mouseY);

          for (const b of boids) {
            const separation = p.createVector();
            const alignment = p.createVector();
            const cohesion = p.createVector();
            let neighbours = 0;

            for (const other of boids) {
              const d = b.pos.dist(other.pos);
              if (other === b || d > VIEW) continue;
              neighbours++;
              alignment.add(other.vel);
              cohesion.add(other.pos);
              // Too close: push away, much harder at short range
              if (d > 0 && d < VIEW / 2) separation.add(p5.Vector.sub(b.pos, other.pos).div(d * d));
            }

            const force = p.createVector();
            if (neighbours) {
              force.add(steer(b, alignment.div(neighbours)).mult(1));
              force.add(steer(b, cohesion.div(neighbours).sub(b.pos)).mult(0.8));
              force.add(steer(b, separation).mult(1.7));
            }
            if (over && b.pos.dist(mouse) < 90) force.add(steer(b, p5.Vector.sub(b.pos, mouse)).mult(4));

            b.vel.add(force).limit(MAX_SPEED);
            b.pos.add(b.vel);
            // Wrap around the edges
            b.pos.x = (b.pos.x + p.width) % p.width;
            b.pos.y = (b.pos.y + p.height) % p.height;
          }

          p.noStroke();
          for (const b of boids) {
            p.push();
            p.translate(b.pos.x, b.pos.y);
            p.rotate(b.vel.heading());
            p.fill(b.color);
            p.triangle(7, 0, -5, 3.5, -5, -3.5);
            p.pop();
          }

          if (over) {
            p.noFill();
            p.stroke(C.muted);
            p.circle(p.mouseX, p.mouseY, 180);
          }
        };

        // Reynolds' steering: the velocity you want minus the one you have, capped
        function steer(b, desired) {
          if (desired.magSq() === 0) return desired;
          return desired.setMag(MAX_SPEED).sub(b.vel).limit(MAX_FORCE);
        }
      },
    },

    {
      id: 'life',
      title: 'Game of Life',
      kicker: '2D arrays · cellular automata',
      blurb: "John Conway's Game of Life. Each cell counts its eight neighbours: a live cell with 2 or 3 survives, an empty cell with exactly 3 comes alive, and every other cell dies.",
      hint: 'Click and drag to draw new cells',
      learn: 'https://processing.org/examples/gameoflife.html',
      poster: 12,
      sketch: (p, C) => {
        const CELL = 9;
        let cols, rows, grid, ages, shades;

        p.setup = () => {
          p.createCanvas(C.width, C.height);
          p.frameRate(14);
          p.restart();
        };

        const make = (fn) => Array.from({ length: cols }, (_, x) =>
          Array.from({ length: rows }, (_, y) => fn(x, y)));

        p.restart = () => {
          cols = Math.floor(p.width / CELL);
          rows = Math.floor(p.height / CELL);
          grid = make(() => (p.random() < 0.24 ? 1 : 0));
          ages = make(() => 0);
          // Newborn cells start in one colour and shift as they survive longer
          shades = Array.from({ length: 10 }, (_, i) => p.lerpColor(p.color(C.a2), p.color(C.a3), i / 9));
        };

        p.draw = () => {
          // Paint live cells under the mouse while the button is held
          const over = p.mouseX > 0 && p.mouseX < p.width && p.mouseY > 0 && p.mouseY < p.height;
          if (p.mouseIsPressed && over) {
            const mx = Math.floor(p.mouseX / CELL);
            const my = Math.floor(p.mouseY / CELL);
            for (let dx = -1; dx <= 1; dx++) {
              for (let dy = -1; dy <= 1; dy++) {
                const x = mx + dx;
                const y = my + dy;
                if (x >= 0 && x < cols && y >= 0 && y < rows) grid[x][y] = 1;
              }
            }
          }

          // The rules, with edges that wrap around like a donut
          const next = make((x, y) => {
            let n = 0;
            for (let dx = -1; dx <= 1; dx++) {
              for (let dy = -1; dy <= 1; dy++) {
                if (dx || dy) n += grid[(x + dx + cols) % cols][(y + dy + rows) % rows];
              }
            }
            return n === 3 || (n === 2 && grid[x][y]) ? 1 : 0;
          });

          p.background(C.bg);
          p.noStroke();
          let alive = 0;
          for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {
              ages[x][y] = next[x][y] ? ages[x][y] + 1 : 0;
              if (!next[x][y]) continue;
              alive++;
              p.fill(shades[Math.min(ages[x][y], 9)]);
              p.rect(x * CELL + 0.5, y * CELL + 0.5, CELL - 1, CELL - 1, 2);
            }
          }
          grid = next;

          // Start over once the colony has mostly died out
          if (alive < cols * rows * 0.02) p.restart();
        };
      },
    },

    {
      id: 'ten-print',
      title: '10 PRINT',
      kicker: 'random() · a one-line program',
      blurb: 'A famous one-line Commodore 64 program: print / or \\ at random, forever. There is no maze logic at all, yet a maze appears. Here your mouse tilts the odds.',
      hint: 'Move left or right to tilt the odds',
      learn: 'https://processing.org/reference/random_.html',
      poster: 400,
      sketch: (p, C) => {
        // 10 PRINT CHR$(205.5+RND(1)); : GOTO 10
        const SIZE = 20;
        let x, y, wait;

        p.setup = () => {
          p.createCanvas(C.width, C.height);
          p.restart();
        };

        p.restart = () => {
          p.background(C.bg);
          x = 0;
          y = 0;
          wait = 0;
        };

        p.draw = () => {
          // Finished: leave it up for a few seconds, then start over
          if (y >= p.height) {
            if (++wait > 240) p.restart();
            return;
          }

          const over = p.mouseX > 0 && p.mouseX < p.width && p.mouseY > 0 && p.mouseY < p.height;
          const odds = over ? p.map(p.mouseX, 0, p.width, 0.08, 0.92) : 0.5;
          p.strokeWeight(SIZE * 0.14);
          p.strokeCap(p.ROUND);
          p.stroke(p.lerpColor(p.color(C.a1), p.color(C.a2), y / p.height));

          for (let i = 0; i < 3; i++) {
            if (p.random() < odds) p.line(x, y, x + SIZE, y + SIZE);
            else p.line(x, y + SIZE, x + SIZE, y);
            x += SIZE;
            if (x >= p.width) {
              x = 0;
              y += SIZE;
            }
          }
        };
      },
    },

    {
      id: 'harmonograph',
      title: 'Harmonograph',
      kicker: 'sin() · exponential decay',
      blurb: 'A Victorian drawing machine: pendulums swing a pen while slowly losing energy. Frequencies close to simple ratios like 2:3 make the looping, lace-like curves.',
      hint: 'Press the reseed button for a new ratio',
      learn: 'https://processing.org/reference/sin_.html',
      poster: 700,
      sketch: (p, C) => {
        // x(t) = (sin(f1·t + φ1) + sin(f2·t + φ2)) · e^(−d·t), and the same for y with f3, f4
        let f, phase, damp, t, prev, wait;

        p.setup = () => {
          p.createCanvas(C.width, C.height);
          p.restart();
        };

        p.restart = () => {
          p.background(C.bg);
          const [a, b] = p.random([[2, 3], [3, 4], [3, 2], [1, 3], [2, 1], [4, 3], [3, 5]]);
          // A tiny detune makes the figure slowly rotate as it shrinks
          f = [a, b, a, b].map((k) => k + p.random(-0.015, 0.015));
          phase = f.map(() => p.random(p.TAU));
          damp = p.random(0.002, 0.0045);
          t = 0;
          prev = null;
          wait = 0;
        };

        p.draw = () => {
          const decay = Math.exp(-damp * t);
          if (decay < 0.04) {
            if (++wait > 180) p.restart();
            return;
          }

          const R = Math.min(p.width, p.height) * 0.22;
          const ink = p.lerpColor(p.color(C.a1), p.color(C.a3), (Math.sin(t * 0.04) + 1) / 2);
          ink.setAlpha(170);
          p.stroke(ink);
          p.strokeWeight(1);
          p.translate(p.width / 2, p.height / 2);

          for (let i = 0; i < 80; i++) {
            const k = Math.exp(-damp * t);
            const x = R * k * (Math.sin(f[0] * t + phase[0]) + Math.sin(f[1] * t + phase[1]));
            const y = R * k * (Math.sin(f[2] * t + phase[2]) + Math.sin(f[3] * t + phase[3]));
            if (prev) p.line(prev.x, prev.y, x, y);
            prev = { x, y };
            t += 0.02;
          }
        };
      },
    },

    {
      id: 'circle-packing',
      title: 'Circle Packing',
      kicker: 'dist() · collision checks',
      blurb: 'Keep dropping circles wherever there is free space. Each one grows until it touches a neighbour or the edge, then freezes, until the canvas is full.',
      hint: 'Move over it to place circles there',
      learn: 'https://processing.org/reference/dist_.html',
      poster: 300,
      sketch: (p, C) => {
        let circles, misses, wait;

        p.setup = () => {
          p.createCanvas(C.width, C.height);
          p.restart();
        };

        p.restart = () => {
          circles = [];
          misses = 0;
          wait = 0;
        };

        p.draw = () => {
          const over = p.mouseX > 0 && p.mouseX < p.width && p.mouseY > 0 && p.mouseY < p.height;

          // Try a few new spots each frame (around the mouse, if it's over the canvas)
          for (let i = 0; i < 6; i++) {
            const x = over ? p.mouseX + p.random(-40, 40) : p.random(p.width);
            const y = over ? p.mouseY + p.random(-40, 40) : p.random(p.height);
            if (circles.every((c) => p.dist(x, y, c.x, c.y) > c.r + 2)) {
              const color = p.color(p.random([C.a1, C.a2, C.a3, C.gold]));
              const fill = p.color(color.toString());
              fill.setAlpha(45);
              circles.push({ x, y, r: 1, growing: true, color, fill });
              misses = 0;
            } else {
              misses++;
            }
          }

          for (const c of circles) {
            if (!c.growing) continue;
            c.r += 0.6;
            const hitsEdge = c.x - c.r < 2 || c.x + c.r > p.width - 2 || c.y - c.r < 2 || c.y + c.r > p.height - 2;
            const hitsCircle = circles.some((o) => o !== c && p.dist(c.x, c.y, o.x, o.y) < c.r + o.r + 1.5);
            if (hitsEdge || hitsCircle) c.growing = false;
          }

          p.background(C.bg);
          p.strokeWeight(1.5);
          for (const c of circles) {
            p.stroke(c.color);
            p.fill(c.fill);
            p.circle(c.x, c.y, c.r * 2);
          }

          // Full: no free spot found in a long while, so pause and start again
          if (misses > 600 && ++wait > 150) p.restart();
        };
      },
    },

    {
      id: 'ridgelines',
      title: 'Ridgelines',
      kicker: 'noise() · beginShape()',
      blurb: 'Stacked lines of Perlin noise, drawn back to front. Each line is a filled shape that hides the lines behind it, and that overlap is what makes flat lines read as mountains.',
      hint: 'Move left or right to shift the peaks',
      learn: 'https://processing.org/reference/beginShape_.html',
      sketch: (p, C) => {
        const LINES = 24;
        let t = 0;
        let offset;
        let center;

        p.setup = () => {
          p.createCanvas(C.width, C.height);
          p.restart();
        };

        p.restart = () => {
          offset = p.random(1000);
          center = p.width / 2;
        };

        p.draw = () => {
          p.background(C.bg);
          const over = p.mouseX > 0 && p.mouseX < p.width && p.mouseY > 0 && p.mouseY < p.height;
          center = p.lerp(center, over ? p.mouseX : p.width / 2, 0.06);

          const margin = p.width * 0.1;
          const gap = (p.height - margin * 2) / LINES;
          const width = p.width * 0.13;

          for (let i = 0; i < LINES; i++) {
            const base = margin + (i + 1) * gap;
            const points = [];
            for (let x = margin; x <= p.width - margin; x += 4) {
              // Peaks rise near the centre and stay flat toward the edges
              const bump = Math.exp(-((x - center) ** 2) / (2 * width * width));
              const n = p.noise(x * 0.02, i * 0.3 + offset, t);
              points.push([x, base - n * gap * (0.5 + bump * 9)]);
            }

            // Fill first, to hide the lines behind...
            p.noStroke();
            p.fill(C.bg);
            p.beginShape();
            p.vertex(margin, base);
            for (const [x, y] of points) p.vertex(x, y);
            p.vertex(p.width - margin, base);
            p.endShape(p.CLOSE);

            // ...then trace the ridge on top
            p.noFill();
            p.stroke(p.lerpColor(p.color(C.a3), p.color(C.a1), i / LINES));
            p.strokeWeight(1.4);
            p.beginShape();
            for (const [x, y] of points) p.vertex(x, y);
            p.endShape();
          }

          t += 0.006;
        };
      },
    },

    {
      id: 'phyllotaxis',
      title: 'Phyllotaxis',
      kicker: 'radians() · the golden angle',
      blurb: 'How sunflowers pack their seeds. Seed n sits at n × 137.5° (the golden angle), a distance √n from the centre. Change the angle by even one degree and the spiral breaks into spokes.',
      hint: 'Move left or right to change the angle',
      learn: 'https://processing.org/reference/radians_.html',
      poster: 90,
      sketch: (p, C) => {
        const GOLDEN = 137.508;
        const SEEDS = 900;
        let count, angle, spin, shades;

        p.setup = () => {
          p.createCanvas(C.width, C.height);
          p.textFont('JetBrains Mono, monospace');
          p.restart();
        };

        p.restart = () => {
          count = 0;
          spin = 0;
          angle = GOLDEN;
          // Colour runs through three accents from the centre out
          shades = Array.from({ length: 64 }, (_, i) => {
            const k = i / 63;
            return k < 0.5
              ? p.lerpColor(p.color(C.a2), p.color(C.a1), k * 2)
              : p.lerpColor(p.color(C.a1), p.color(C.a3), (k - 0.5) * 2);
          });
        };

        p.draw = () => {
          p.background(C.bg);
          const over = p.mouseX > 0 && p.mouseX < p.width && p.mouseY > 0 && p.mouseY < p.height;
          angle = p.lerp(angle, over ? p.map(p.mouseX, 0, p.width, GOLDEN - 2, GOLDEN + 2) : GOLDEN, 0.1);
          count = Math.min(count + 10, SEEDS);
          spin += 0.002;

          const spacing = (Math.min(p.width, p.height) * 0.45) / Math.sqrt(SEEDS);
          p.push();
          p.translate(p.width / 2, p.height / 2);
          p.rotate(spin);
          p.noStroke();
          for (let n = 0; n < count; n++) {
            const a = p.radians(n * angle);
            const r = spacing * Math.sqrt(n);
            p.fill(shades[Math.floor((n / SEEDS) * 63)]);
            p.circle(r * Math.cos(a), r * Math.sin(a), spacing * (0.6 + 0.5 * (n / SEEDS)));
          }
          p.pop();

          p.noStroke();
          p.fill(C.muted);
          p.textSize(12);
          p.text(`${angle.toFixed(2)}°`, 14, 24);
        };
      },
    },
  ];

  /* ------------------------------------------------------------------
     Runner: builds the cards, loads p5 on the first visit, and only
     animates sketches that are on screen while the Art tab is open
     ------------------------------------------------------------------ */
  const page = $('#page-art');
  let runs = [];
  let tabOpen = false;
  let built = false;

  function themeColors() {
    const css = getComputedStyle(root);
    const v = (name) => css.getPropertyValue(name).trim();
    return { bg: v('--bg-2'), ink: v('--text'), muted: v('--muted'), a1: v('--accent'), a2: v('--accent-2'), a3: v('--accent-3'), gold: v('--gold') };
  }

  function cardHtml(def) {
    return `
      <article class="card art-card${def.featured ? ' art-feature' : ''}" id="art-${def.id}">
        <div class="art-stage skeleton">
          <span class="art-hint">${def.hint}</span>
          <div class="art-code" id="art-${def.id}-code" hidden>
            <div class="art-code-bar"><span>${def.id}.js</span><button type="button" data-act="copy">Copy</button></div>
            <pre><code></code></pre>
          </div>
        </div>
        <div class="art-body">
          <p class="project-kicker">${def.kicker}</p>
          <h3>${def.title}</h3>
          <p>${def.blurb}</p>
          <div class="art-actions">
            <button class="icon-btn" type="button" data-act="pause" aria-pressed="false" aria-label="Pause" title="Pause"><svg><use href="#i-pause"/></svg></button>
            <button class="icon-btn" type="button" data-act="seed" aria-label="New seed" title="New seed"><svg><use href="#i-replay"/></svg></button>
            <button class="icon-btn" type="button" data-act="save" aria-label="Save as PNG" title="Save as PNG"><svg><use href="#i-download"/></svg></button>
            <button class="icon-btn wide" type="button" data-act="code" aria-expanded="false" aria-controls="art-${def.id}-code"><svg><use href="#i-code"/></svg>Code</button>
            <a class="art-learn" href="${def.learn}" target="_blank" rel="noopener">processing.org<svg><use href="#i-external"/></svg></a>
          </div>
        </div>
      </article>`;
  }

  function build() {
    built = true;
    $('#artFeature').innerHTML = SKETCHES.filter((d) => d.featured).map(cardHtml).join('');
    $('#artGrid').innerHTML = SKETCHES.filter((d) => !d.featured).map(cardHtml).join('');

    runs = SKETCHES.map((def) => {
      const card = $('#art-' + def.id);
      return { def, card, stage: $('.art-stage', card), inst: null, C: null, paused: reducedMotion, visible: false, codeOpen: false };
    });
    runs.forEach((run) => {
      labelPause(run);
      $$('[data-act]', run.card).forEach((btn) => btn.addEventListener('click', () => act(run, btn)));
      visibility.observe(run.stage);
      resizer.observe(run.stage);
    });

    if (!reducedMotion) {
      runs.forEach(({ card }, i) => card.animate(
        [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }],
        { duration: 500, delay: Math.min(i, 4) * 80, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }
      ));
    }

    loadP5()
      .then(() => runs.forEach(start))
      .catch(() => runs.forEach(({ stage }) => {
        stage.classList.remove('skeleton');
        stage.innerHTML = '<p class="art-error">Couldn\'t load p5.js. Check your connection and refresh.</p>';
      }));
  }

  let p5Loading = null;
  function loadP5() {
    if (window.p5) return Promise.resolve();
    p5Loading = p5Loading || new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = P5_SRC;
      script.integrity = P5_SRI;
      script.crossOrigin = 'anonymous';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return p5Loading;
  }

  // The code view covers the canvas, so the sketch rests while it's open
  const running = (run) => tabOpen && run.visible && !run.paused && !run.codeOpen;

  function start(run) {
    const { def, stage } = run;
    run.C = Object.assign(themeColors(), { width: stage.clientWidth, height: stage.clientHeight });
    run.inst = new window.p5((p) => {
      def.sketch(p, run.C);
      const setup = p.setup;
      p.setup = () => {
        p.pixelDensity(Math.min(2, window.devicePixelRatio || 1));
        setup();
        p.canvas.setAttribute('role', 'img');
        p.canvas.setAttribute('aria-label', `${def.title}: ${def.blurb}`);
        if (!running(run)) {
          p.noLoop();
          setTimeout(() => poster(run), 0);
        }
      };
    }, stage);
    stage.classList.remove('skeleton');
    stage.classList.add('ready');
  }

  // Paused or off screen: run enough frames by hand that the canvas shows a finished-looking piece
  function poster(run) {
    if (run.inst && !running(run)) run.inst.redraw(run.def.poster || 1);
  }

  function sync(run) {
    if (!run.inst) return;
    const go = running(run);
    if (go && !run.inst.isLooping()) run.inst.loop();
    if (!go && run.inst.isLooping()) run.inst.noLoop();
  }

  function refresh(run) {
    if (!run.inst) return;
    run.inst.restart();
    poster(run);
  }

  function labelPause(run) {
    const btn = $('[data-act="pause"]', run.card);
    const label = run.paused ? 'Play' : 'Pause';
    btn.setAttribute('aria-pressed', String(run.paused));
    btn.setAttribute('aria-label', label);
    btn.title = label;
    $('use', btn).setAttribute('href', run.paused ? '#i-resume' : '#i-pause');
  }

  function act(run, btn) {
    switch (btn.dataset.act) {
      case 'pause':
        run.paused = !run.paused;
        labelPause(run);
        sync(run);
        break;
      case 'seed':
        refresh(run);
        break;
      case 'save':
        if (run.inst) run.inst.saveCanvas(`billy-dang-${run.def.id}`, 'png');
        break;
      case 'code': {
        const panel = $('.art-code', run.card);
        const code = $('code', panel);
        if (!code.innerHTML) code.innerHTML = highlight(source(run.def.sketch));
        panel.hidden = !panel.hidden;
        run.codeOpen = !panel.hidden;
        btn.setAttribute('aria-expanded', String(run.codeOpen));
        sync(run);
        break;
      }
      case 'copy':
        navigator.clipboard.writeText(source(run.def.sketch)).then(() => {
          btn.textContent = 'Copied';
          setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
        }).catch(() => { btn.textContent = 'Select and copy'; });
        break;
    }
  }

  const visibility = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const run = runs.find((r) => r.stage === entry.target);
      if (!run) return;
      run.visible = entry.isIntersecting;
      sync(run);
    });
  }, { rootMargin: '80px 0px' });

  // Resize the canvas to its card and redraw (skipped while the tab is hidden and sizes are 0)
  let resizeTimer;
  const resizer = new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => runs.forEach((run) => {
      const w = run.stage.clientWidth;
      const h = run.stage.clientHeight;
      if (!run.inst || !w || !h || (w === run.C.width && h === run.C.height)) return;
      run.C.width = w;
      run.C.height = h;
      run.inst.resizeCanvas(w, h);
      refresh(run);
    }), 200);
  });

  // Repaint in the new colours when the theme flips
  new MutationObserver(() => {
    const colors = themeColors();
    runs.forEach((run) => {
      if (!run.C) return;
      Object.assign(run.C, colors);
      refresh(run);
    });
  }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  /* ------------------------------------------------------------------
     Code panels: the sketch's real source, dedented and highlighted
     ------------------------------------------------------------------ */
  function source(fn) {
    const lines = fn.toString().split('\n');
    const indent = lines[lines.length - 1].match(/^\s*/)[0].length;
    const body = lines.map((line, i) => (i ? line.slice(Math.min(indent, line.match(/^\s*/)[0].length)) : line));
    return '// p is the p5 instance; C has the canvas size and this site\'s theme colours\nconst sketch = ' + body.join('\n') + ';\n';
  }

  const escapeHtml = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const TOKENS = /(\/\/.*)|('(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`|"(?:[^"\\\n]|\\.)*")|\b(const|let|function|return|for|of|if|else|new|switch|case|break|continue|true|false|null)\b|\b(\d+(?:\.\d+)?(?:e\d+)?)\b|\bp\.(\w+)/g;

  function highlight(src) {
    let out = '';
    let last = 0;
    src.replace(TOKENS, (match, comment, str, keyword, num, fn, offset) => {
      out += escapeHtml(src.slice(last, offset));
      last = offset + match.length;
      if (fn) out += `p.<span class="tk-f">${fn}</span>`;
      else out += `<span class="tk-${comment ? 'c' : str ? 's' : keyword ? 'k' : 'n'}">${escapeHtml(match)}</span>`;
      return match;
    });
    return out + escapeHtml(src.slice(last));
  }

  /* ------------------------------------------------------------------
     Tab hooks: main.js announces every tab switch
     ------------------------------------------------------------------ */
  function onTab(name) {
    tabOpen = name === 'art';
    if (tabOpen && !built) build();
    runs.forEach(sync);
  }

  document.addEventListener('tabshow', (e) => onTab(e.detail));
  if (!page.hidden) onTab('art');
})();
