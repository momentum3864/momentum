/*
 * MOMENTUM 애니메이션
 *
 * 흐름:
 * idle → burst → gather → done
 *
 * 작품 모양은 seed로 결정된다.
 * 같은 seed를 사용하면 같은 모양을 다시 그릴 수 있다.
 */

(function () {
  const M = (window.MOMENTUM = window.MOMENTUM || {});

  const PALETTE = [
    "#ffb3c7",
    "#ff8fab",
    "#ffd6a5",
    "#fff1c1",
    "#f3c4fb",
    "#ffffff",
    "#ffc2a8",
  ];

  const BRANCH_COLOR = "201, 162, 122";

  // 애니메이션 시간
  const BURST_MS = 2600;
  const GROW_MS = 2600;
  const GATHER_MS = 2400;
  const GATHER_STAGGER_MS = 1400;

  // 난수를 일정하게 생성하는 함수
  function mulberry32(seed) {
    let a = seed >>> 0;

    return function () {
      a = (a + 0x6d2b79f5) | 0;

      let t = Math.imul(a ^ (a >>> 15), 1 | a);

      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const clamp01 = (t) =>
    Math.max(0, Math.min(1, t));

  const easeOutCubic = (t) =>
    1 - Math.pow(1 - t, 3);

  const easeInOutCubic = (t) =>
    t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const truncate = (text, length) =>
    text.length > length
      ? text.slice(0, length) + "…"
      : text;


  // =====================================================
  // 나무 모양 생성
  // =====================================================

  // 나무 가지와 메시지 목표 위치를 생성하는 함수
  function buildTree(rand, count) {

    const segments = [];
    const tips = [];

    const MAX_DEPTH = 7;

    // 가지를 재귀적으로 생성하는 함수
    function branch(x, y, len, angle, width, depth) {

      const x2 = x + Math.cos(angle) * len;
      const y2 = y + Math.sin(angle) * len;

      segments.push({
        x1: x,
        y1: y,
        x2,
        y2,
        width,
        depth,
      });

      if (depth >= MAX_DEPTH) {
        tips.push({ x: x2, y: y2 });
        return;
      }

      const n =
        depth < 2
          ? 2
          : rand() < 0.3
            ? 3
            : 2;

      for (let i = 0; i < n; i++) {

        const spread = 0.45 + rand() * 0.35;

        const angleOffset =
          (i - (n - 1) / 2) * spread +
          (rand() - 0.5) * 0.3;

        const nextAngle = angle + angleOffset;

        branch(
          x2,
          y2,
          len * (0.7 + rand() * 0.1),
          nextAngle,
          width * 0.7,
          depth + 1
        );
      }
    }

    branch(
      0.5,
      0.97,
      0.17,
      -Math.PI / 2 + (rand() - 0.5) * 0.08,
      0.022,
      0
    );

    const spreadR =
      0.025 + Math.min(0.04, count / 4000);

    const targets = [];

    for (let i = 0; i < count; i++) {

      const tip =
        tips[Math.floor(rand() * tips.length)];

      const angle = rand() * Math.PI * 2;

      const radius =
        Math.sqrt(rand()) * spreadR;

      targets.push({
        x: tip.x + Math.cos(angle) * radius,
        y: tip.y + Math.sin(angle) * radius,
      });
    }

    return {
      segments,
      targets,
      maxDepth: MAX_DEPTH,
    };
  }


  // =====================================================
  // 꽃 모양 생성
  // =====================================================

  // 꽃잎과 줄기, 메시지 목표 위치를 생성하는 함수
  function buildFlower(rand, count) {

    const segments = [];

    const cx = 0.5;
    const cy = 0.36;

    const STEPS = 10;

    const bend = (rand() - 0.5) * 0.12;

    let px = 0.5;
    let py = 0.97;

    // 줄기 생성
    for (let i = 1; i <= STEPS; i++) {

      const t = i / STEPS;

      const x =
        0.5 + Math.sin(t * Math.PI) * bend;

      const y =
        0.97 - (0.97 - (cy + 0.04)) * t;

      segments.push({
        x1: px,
        y1: py,
        x2: x,
        y2: y,
        width: 0.014,
        depth: i - 1,
      });

      px = x;
      py = y;
    }

    // 잎 두 장 생성
    [0.35, 0.55].forEach((t, index) => {

      const sx =
        0.5 + Math.sin(t * Math.PI) * bend;

      const sy =
        0.97 - (0.97 - (cy + 0.04)) * t;

      const dir = index === 0 ? 1 : -1;

      segments.push({
        x1: sx,
        y1: sy,
        x2: sx + dir * 0.1,
        y2: sy - 0.07,
        width: 0.01,
        depth: Math.round(t * STEPS),
      });
    });

    const petals =
      5 + Math.floor(rand() * 4);

    const rot = rand() * Math.PI;

    const petalLen = 0.24;

    const targets = [];

    // 메시지를 꽃잎과 꽃 중앙에 배치
    for (let i = 0; i < count; i++) {

      if (rand() < 0.12) {

        const angle = rand() * Math.PI * 2;

        const radius =
          Math.sqrt(rand()) * 0.035;

        targets.push({
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
        });

        continue;
      }

      const petal =
        Math.floor(rand() * petals);

      const angle =
        rot + (petal / petals) * Math.PI * 2;

      const along =
        0.15 + rand() * 0.85;

      const half =
        Math.sin(along * Math.PI) *
        0.055 *
        (rand() * 2 - 1);

      const radius = along * petalLen;

      targets.push({
        x:
          cx +
          Math.cos(angle) * radius +
          Math.cos(angle + Math.PI / 2) * half,

        y:
          cy +
          Math.sin(angle) * radius +
          Math.sin(angle + Math.PI / 2) * half,
      });
    }

    return {
      segments,
      targets,
      maxDepth: STEPS,
      petals: {
        cx,
        cy,
        count: petals,
        rot,
        len: petalLen,
      },
    };
  }


  // =====================================================
  // 작품 모양 선택
  // =====================================================

  // 나무 또는 꽃 모양을 생성하는 함수
  function buildShape(shape, seed, count) {

    const rand = mulberry32(seed);

    return shape === "flower"
      ? buildFlower(rand, count)
      : buildTree(rand, count);
  }


  // =====================================================
  // Stage 클래스
  // =====================================================

  class Stage {

    constructor(canvas) {

      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");

      this.phase = "idle";

      this.idleDots = [];
      this.particles = [];

      this.shape = null;

      this.highlight = -1;

      this.onComplete = null;

      this._resize = this._resize.bind(this);
      this._frame = this._frame.bind(this);

      window.addEventListener(
        "resize",
        this._resize
      );

      this._resize();
    }

    // 애니메이션 시작
    start() {
      requestAnimationFrame(this._frame);
    }

    // 화면 크기에 맞게 캔버스를 조정하는 함수
    _resize() {

      const dpr = Math.min(
        window.devicePixelRatio || 1,
        2
      );

      this.dpr = dpr;

      this.W = window.innerWidth;
      this.H = window.innerHeight;

      this.canvas.width =
        Math.round(this.W * dpr);

      this.canvas.height =
        Math.round(this.H * dpr);

      this.ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
      );

      this.size =
        Math.min(this.W, this.H) * 0.78;

      this.ox =
        (this.W - this.size) / 2;

      this.oy =
        this.H * 0.1;

      this.k = Math.max(
        0.8,
        Math.min(2, this.size / 560)
      );

      const gradient =
        this.ctx.createRadialGradient(
          this.W / 2,
          this.H * 0.45,
          0,
          this.W / 2,
          this.H * 0.45,
          Math.max(this.W, this.H) * 0.75
        );

      gradient.addColorStop(0, "#2a1838");
      gradient.addColorStop(0.6, "#140c22");
      gradient.addColorStop(1, "#08060f");

      this.bg = gradient;
    }

    // 정규화 좌표를 실제 화면 좌표로 변환하는 함수
    _map(point) {

      return {
        x: this.ox + point.x * this.size,
        y: this.oy + point.y * this.size,
      };
    }

    // 메시지 수에 맞춰 대기 화면 빛을 생성하는 함수
    setIdleMessages(messages) {

      const targetCount =
        Math.min(messages.length, 400);

      const have = this.idleDots.length;

      for (
        let i = have;
        i < targetCount;
        i++
      ) {

        this.idleDots.push({
          x: Math.random(),
          y: Math.random(),

          r: 1.5 + Math.random() * 2.5,

          speed:
            0.00004 + Math.random() * 0.00008,

          phase: Math.random() * Math.PI * 2,

          color:
            PALETTE[i % PALETTE.length],

          born: performance.now(),
        });
      }

      this.idleDots.length = targetCount;
    }

    /*
     * 작품 재생
     *
     * artwork: {shape, seed}
     * messages: [{name, content}, ...]
     * opts: {skipBurst, onComplete}
     */
    play(artwork, messages, opts = {}) {

      if (!Array.isArray(messages) || !messages.length) {
        return;
      }

      const count = messages.length;

      this.shape = buildShape(
        artwork.shape,
        artwork.seed,
        count
      );

      this.onComplete =
        opts.onComplete || null;

      this.highlight = -1;

      const rand = mulberry32(
        artwork.seed ^ 0x9e3779b9
      );

      const cx = this.W / 2;
      const cy = this.H / 2;

      const reach = Math.max(
        this.W,
        this.H
      );

      // 메시지마다 파티클 생성
      this.particles = messages.map(
        (message, index) => {

          const angle =
            rand() * Math.PI * 2;

          const distance =
            (0.18 + rand() * 0.42) * reach;

          return {
            msg: message,

            color:
              PALETTE[
                Math.floor(rand() * PALETTE.length)
              ],

            r: 2.4 + rand() * 3,

            bx:
              cx + Math.cos(angle) * distance,

            by:
              cy + Math.sin(angle) * distance * 0.7,

            burstDelay: rand() * 500,

            gatherDelay:
              (index / count) *
              GATHER_STAGGER_MS *
              rand(),

            target: this.shape.targets[index],

            label: index < 36,
          };
        }
      );

      this.t0 =
        performance.now() -
        (opts.skipBurst ? BURST_MS : 0);

      this.phase = "play";

      this.completed = false;
    }

    // 특정 메시지의 파티클을 강조하는 함수
    setHighlight(index) {
      this.highlight = index;
    }


    // ===================================================
    // 그리기
    // ===================================================

    // 매 프레임 화면을 갱신하는 함수
    _frame(now) {

      const ctx = this.ctx;

      ctx.fillStyle = this.bg;

      ctx.fillRect(
        0,
        0,
        this.W,
        this.H
      );

      if (this.phase === "idle") {
        this._drawIdle(now);
      } else {
        this._drawPlay(now);
      }

      requestAnimationFrame(this._frame);
    }

    // 빛 입자를 그리는 함수
    _dot(x, y, radius, color, alpha, glow = 3.2) {

      const ctx = this.ctx;

      ctx.globalAlpha = alpha * 0.18;

      ctx.fillStyle = color;

      ctx.beginPath();

      ctx.arc(
        x,
        y,
        radius * glow,
        0,
        Math.PI * 2
      );

      ctx.fill();

      ctx.globalAlpha = alpha;

      ctx.beginPath();

      ctx.arc(
        x,
        y,
        radius,
        0,
        Math.PI * 2
      );

      ctx.fill();

      ctx.globalAlpha = 1;
    }

    // 대기 화면의 떠다니는 빛을 그리는 함수
    _drawIdle(now) {

      for (const dot of this.idleDots) {

        const t = now * dot.speed;

        const x =
          (
            dot.x +
            Math.sin(t + dot.phase) * 0.04 +
            t * 0.15
          ) % 1;

        const normalizedX =
          (x + 1) % 1;

        const y =
          dot.y +
          Math.cos(t * 1.3 + dot.phase) * 0.03;

        const fadeIn = clamp01(
          (now - dot.born) / 1200
        );

        const twinkle =
          0.55 +
          0.45 *
          Math.sin(now / 900 + dot.phase * 3);

        this._dot(
          normalizedX * this.W,
          y * this.H,
          dot.r,
          dot.color,
          0.7 * twinkle * fadeIn
        );
      }
    }

    // 나무 또는 꽃의 줄기를 그리는 함수
    _drawBranches(progress) {

      const ctx = this.ctx;

      const {
        segments,
        maxDepth,
      } = this.shape;

      const grown =
        progress * (maxDepth + 1);

      ctx.lineCap = "round";

      for (const segment of segments) {

        const p = clamp01(
          grown - segment.depth
        );

        if (p <= 0) {
          continue;
        }

        const start = this._map({
          x: segment.x1,
          y: segment.y1,
        });

        const end = this._map({
          x:
            segment.x1 +
            (segment.x2 - segment.x1) * p,

          y:
            segment.y1 +
            (segment.y2 - segment.y1) * p,
        });

        ctx.strokeStyle =
          `rgba(${BRANCH_COLOR}, ${
            0.55 +
            0.35 *
            (1 - segment.depth / (maxDepth + 1))
          })`;

        ctx.lineWidth = Math.max(
          1,
          segment.width * this.size
        );

        ctx.beginPath();

        ctx.moveTo(start.x, start.y);

        ctx.lineTo(end.x, end.y);

        ctx.stroke();
      }

      // 꽃 모양이면 꽃잎을 그리는 함수
      const petals = this.shape.petals;

      if (petals) {

        const bloom = clamp01(
          (progress - 0.6) / 0.4
        );

        if (bloom <= 0) {
          return;
        }

        const center = this._map({
          x: petals.cx,
          y: petals.cy,
        });

        const len =
          petals.len *
          this.size *
          easeOutCubic(bloom);

        ctx.save();

        ctx.translate(
          center.x,
          center.y
        );

        for (
          let i = 0;
          i < petals.count;
          i++
        ) {

          ctx.save();

          ctx.rotate(
            petals.rot +
            (i / petals.count) * Math.PI * 2
          );

          ctx.beginPath();

          ctx.ellipse(
            len / 2,
            0,
            len / 2,
            len * 0.24,
            0,
            0,
            Math.PI * 2
          );

          ctx.fillStyle =
            `rgba(255, 179, 199, ${0.1 * bloom})`;

          ctx.strokeStyle =
            `rgba(255, 179, 199, ${0.35 * bloom})`;

          ctx.lineWidth = 1.2;

          ctx.fill();
          ctx.stroke();

          ctx.restore();
        }

        ctx.restore();
      }
    }

    // 파티클 이동과 작품 완성을 처리하는 함수
    _drawPlay(now) {

      const ctx = this.ctx;

      const t = now - this.t0;

      const cx = this.W / 2;
      const cy = this.H / 2;

      const growT = clamp01(
        (t - BURST_MS) / GROW_MS
      );

      if (t > BURST_MS) {
        this._drawBranches(
          easeOutCubic(growT)
        );
      }

      const fontSize = Math.max(
        12,
        Math.min(18, this.W / 90)
      );

      ctx.font =
        `${fontSize}px "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;

      ctx.textAlign = "center";

      let allLanded = true;

      this.particles.forEach(
        (particle, index) => {

          let x;
          let y;
          let alpha = 1;

          const target =
            this._map(particle.target);

          if (t < BURST_MS) {

            // 1단계: 메시지가 화면 가운데에서 퍼짐
            const k = easeOutCubic(
              clamp01(
                (t - particle.burstDelay) /
                (BURST_MS - particle.burstDelay)
              )
            );

            x =
              cx +
              (particle.bx - cx) * k +
              Math.sin(now / 400 + index) * 4 * k;

            y =
              cy +
              (particle.by - cy) * k +
              Math.cos(now / 500 + index) * 4 * k;

            alpha = clamp01(
              (t - particle.burstDelay) / 200
            );

            if (particle.label && k > 0.25) {

              ctx.globalAlpha =
                Math.min(
                  alpha,
                  1 - clamp01(
                    (t - BURST_MS + 500) / 500
                  )
                ) * 0.85;

              ctx.fillStyle = "#fff6ec";

              ctx.fillText(
                truncate(
                  particle.msg.content || "",
                  16
                ),
                x,
                y - particle.r - 8
              );

              ctx.globalAlpha = 1;
            }

          } else {

            // 2단계: 파티클이 작품의 위치로 모임
            const gatherTime =
              t -
              BURST_MS -
              GROW_MS * 0.35 -
              particle.gatherDelay;

            const k = easeInOutCubic(
              clamp01(gatherTime / GATHER_MS)
            );

            if (k < 1) {
              allLanded = false;
            }

            const lift =
              Math.sin(k * Math.PI) * 40;

            x =
              particle.bx +
              (target.x - particle.bx) * k;

            y =
              particle.by +
              (target.y - particle.by) * k -
              lift;
          }

          if (this.completed) {

            // 3단계: 완성된 작품이 숨 쉬듯 움직임
            const breathe =
              1 +
              0.18 *
              Math.sin(now / 700 + index * 1.7);

            const isHighlighted =
              index === this.highlight;

            this._dot(
              x,
              y,
              particle.r *
                this.k *
                breathe *
                (isHighlighted ? 1.6 : 1),

              isHighlighted
                ? "#ffffff"
                : particle.color,

              isHighlighted ? 1 : 0.9,

              isHighlighted ? 3.6 : 3.2
            );

          } else {

            this._dot(
              x,
              y,
              particle.r * this.k,
              particle.color,
              alpha
            );
          }
        }
      );

      // 모든 파티클이 모이면 작품 완성 처리
      if (
        !this.completed &&
        t > BURST_MS &&
        growT >= 1 &&
        allLanded
      ) {

        this.completed = true;

        if (this.onComplete) {
          this.onComplete();
        }
      }
    }
  }

  // 다른 JS 파일에서 Stage를 사용할 수 있도록 공개
  M.Stage = Stage;

})();
