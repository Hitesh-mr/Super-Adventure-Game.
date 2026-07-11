/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  type: 'dust' | 'sparkle' | 'smoke' | 'fire' | 'bubble' | 'shield' | 'glow' | 'weather';
  shape?: 'circle' | 'square' | 'line';
  gravity?: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private pool: Particle[] = [];
  private maxParticles: number = 400; // Cap to keep performance super high

  // Camera effects
  private shakeIntensity: number = 0;
  private shakeDecay: number = 0.9;
  private flashAlpha: number = 0;
  private flashColor: string = '#ffffff';

  constructor() {
    // Populate the pool with empty objects
    for (let i = 0; i < this.maxParticles; i++) {
      this.pool.push({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        color: '',
        size: 0,
        alpha: 0,
        life: 0,
        maxLife: 0,
        type: 'dust'
      });
    }
  }

  // Request a particle from the pool
  private getParticle(): Particle | null {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    // If pool is empty, reclaim the oldest active particle
    if (this.particles.length > 0) {
      const oldest = this.particles.shift()!;
      return oldest;
    }
    return null;
  }

  // Return a particle to the pool
  private reclaimParticle(p: Particle) {
    this.pool.push(p);
  }

  // --- EMITTERS ---

  public emitDust(x: number, y: number, vxOffset: number = 0, vyOffset: number = 0) {
    const p = this.getParticle();
    if (!p) return;

    p.x = x;
    p.y = y;
    p.vx = (Math.random() - 0.5) * 1.5 + vxOffset;
    p.vy = -Math.random() * 1.2 + vyOffset;
    p.color = Math.random() > 0.5 ? 'rgba(230, 230, 230, 0.7)' : 'rgba(180, 180, 180, 0.5)';
    p.size = Math.random() * 4 + 2;
    p.alpha = 1;
    p.life = 0;
    p.maxLife = Math.random() * 20 + 15; // in frames
    p.type = 'dust';
    p.shape = 'circle';
    p.gravity = -0.05; // float upwards slightly

    this.particles.push(p);
  }

  public emitSparkle(x: number, y: number, color: string, count: number = 5) {
    for (let i = 0; i < count; i++) {
      const p = this.getParticle();
      if (!p) continue;

      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1.5;

      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.color = color;
      p.size = Math.random() * 3 + 2;
      p.alpha = 1;
      p.life = 0;
      p.maxLife = Math.random() * 30 + 20;
      p.type = 'sparkle';
      p.shape = 'circle';
      p.gravity = 0.05;

      this.particles.push(p);
    }
  }

  public emitSmoke(x: number, y: number, count: number = 3) {
    for (let i = 0; i < count; i++) {
      const p = this.getParticle();
      if (!p) continue;

      p.x = x + (Math.random() - 0.5) * 10;
      p.y = y + (Math.random() - 0.5) * 10;
      p.vx = (Math.random() - 0.5) * 1.0;
      p.vy = -Math.random() * 1.5 - 0.5;
      p.color = `rgba(100, 100, 100, ${Math.random() * 0.4 + 0.2})`;
      p.size = Math.random() * 12 + 8;
      p.alpha = 0.8;
      p.life = 0;
      p.maxLife = Math.random() * 40 + 30;
      p.type = 'smoke';
      p.shape = 'circle';
      p.gravity = -0.02;

      this.particles.push(p);
    }
  }

  public emitFire(x: number, y: number, vx: number = 0, vy: number = 0, count: number = 3) {
    for (let i = 0; i < count; i++) {
      const p = this.getParticle();
      if (!p) continue;

      p.x = x;
      p.y = y;
      p.vx = (Math.random() - 0.5) * 1.5 + vx;
      p.vy = (Math.random() - 0.5) * 1.5 + vy - 1;
      // Red, Orange, or Yellow
      const colors = ['rgba(255, 60, 0, 0.9)', 'rgba(255, 150, 0, 0.9)', 'rgba(255, 230, 0, 0.9)'];
      p.color = colors[Math.floor(Math.random() * colors.length)];
      p.size = Math.random() * 5 + 3;
      p.alpha = 1;
      p.life = 0;
      p.maxLife = Math.random() * 25 + 15;
      p.type = 'fire';
      p.shape = 'circle';
      p.gravity = -0.1; // rise up

      this.particles.push(p);
    }
  }

  public emitBubble(x: number, y: number, count: number = 1) {
    for (let i = 0; i < count; i++) {
      const p = this.getParticle();
      if (!p) continue;

      p.x = x;
      p.y = y;
      p.vx = (Math.random() - 0.5) * 0.8;
      p.vy = -Math.random() * 1.2 - 0.5;
      p.color = 'rgba(0, 180, 255, 0.4)';
      p.size = Math.random() * 4 + 2;
      p.alpha = 0.7;
      p.life = 0;
      p.maxLife = Math.random() * 50 + 40;
      p.type = 'bubble';
      p.shape = 'circle';
      p.gravity = -0.04;

      this.particles.push(p);
    }
  }

  public emitShieldRing(x: number, y: number, radius: number) {
    // Create particles along a circle
    const angles = [0, Math.PI / 3, (2 * Math.PI) / 3, Math.PI, (4 * Math.PI) / 3, (5 * Math.PI) / 3];
    angles.forEach(angle => {
      const p = this.getParticle();
      if (!p) return;

      p.x = x + Math.cos(angle) * radius;
      p.y = y + Math.sin(angle) * radius;
      p.vx = -Math.sin(angle) * 1.5; // tangential velocity
      p.vy = Math.cos(angle) * 1.5;
      p.color = 'rgba(0, 220, 255, 0.8)';
      p.size = 3;
      p.alpha = 0.8;
      p.life = 0;
      p.maxLife = 10;
      p.type = 'shield';
      p.shape = 'circle';
      p.gravity = 0;

      this.particles.push(p);
    });
  }

  public emitWeather(width: number, height: number, type: 'clear' | 'rain' | 'snow' | 'fog' | 'ash' | 'clouds') {
    if (type === 'clear' || type === 'fog') return;
    // Generate new weather particles near the top/sides
    if (Math.random() > 0.4) return;

    const p = this.getParticle();
    if (!p) return;

    p.x = Math.random() * (width + 200) - 100;
    p.y = -10;
    p.type = 'weather';

    if (type === 'rain') {
      p.vx = -2 - Math.random() * 2;
      p.vy = 8 + Math.random() * 4;
      p.color = 'rgba(150, 200, 255, 0.5)';
      p.size = Math.random() * 2 + 1;
      p.shape = 'line';
      p.maxLife = 120;
    } else if (type === 'snow') {
      p.vx = (Math.random() - 0.5) * 1.5 - 0.5;
      p.vy = 1 + Math.random() * 1.5;
      p.color = 'rgba(255, 255, 255, 0.9)';
      p.size = Math.random() * 3 + 1;
      p.shape = 'circle';
      p.maxLife = 240;
    } else if (type === 'ash') {
      p.vx = -1 - Math.random() * 2;
      p.vy = 1 + Math.random() * 2;
      p.color = Math.random() > 0.5 ? 'rgba(230, 90, 40, 0.7)' : 'rgba(100, 100, 100, 0.8)'; // glowing ash
      p.size = Math.random() * 3 + 1;
      p.shape = 'circle';
      p.maxLife = 180;
    } else { // clouds
      p.x = -150;
      p.y = Math.random() * (height * 0.4);
      p.vx = 0.2 + Math.random() * 0.4;
      p.vy = 0;
      p.color = 'rgba(255, 255, 255, 0.12)';
      p.size = Math.random() * 60 + 40;
      p.shape = 'circle';
      p.maxLife = 2000;
    }

    p.alpha = Math.random() * 0.5 + 0.3;
    p.life = 0;
    p.gravity = 0;

    this.particles.push(p);
  }

  // --- CAMERA AND SCREEN EFFECTS ---

  public triggerScreenShake(intensity: number) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  public triggerScreenFlash(color: string = '#ffffff', durationFactor: number = 0.8) {
    this.flashColor = color;
    this.flashAlpha = durationFactor;
  }

  public getShakeOffsets(): { x: number; y: number } {
    if (this.shakeIntensity > 0.5) {
      const sx = (Math.random() - 0.5) * this.shakeIntensity;
      const sy = (Math.random() - 0.5) * this.shakeIntensity;
      return { x: sx, y: sy };
    }
    return { x: 0, y: 0 };
  }

  // --- UPDATE AND DRAW ---

  public update(quality: 'low' | 'medium' | 'high') {
    // Scale particle limits based on performance settings
    const maxActive = quality === 'low' ? 100 : quality === 'medium' ? 220 : 400;

    // Decay screenshakes and screen flash
    this.shakeIntensity *= this.shakeDecay;
    if (this.shakeIntensity < 0.1) this.shakeIntensity = 0;

    this.flashAlpha *= 0.88;
    if (this.flashAlpha < 0.01) this.flashAlpha = 0;

    // Update active particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life++;

      // Reclaim if dead or capped
      if (p.life >= p.maxLife || this.particles.length > maxActive) {
        this.particles.splice(i, 1);
        this.reclaimParticle(p);
        continue;
      }

      // Physics integration
      if (p.gravity) {
        p.vy += p.gravity;
      }
      p.x += p.vx;
      p.y += p.vy;

      // Alpha decay
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);
    }
  }

  public draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    ctx.save();

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;

      // Weather effects might be relative to the viewport or absolute.
      // Clouds, snow, rain can be viewport-based or relative to map.
      // For simplicity, everything is in map coordinates except thin clouds.
      const isRelative = p.type === 'weather' && p.shape === 'circle' && p.size > 30; // clouds
      const x = isRelative ? p.x : p.x - cameraX;
      const y = isRelative ? p.y : p.y - cameraY;

      // Skip drawing if completely off-screen to optimize rendering
      if (x + p.size < -50 || x - p.size > ctx.canvas.width + 50 ||
          y + p.size < -50 || y - p.size > ctx.canvas.height + 50) {
        continue;
      }

      ctx.beginPath();
      if (p.shape === 'line') {
        ctx.lineWidth = p.size;
        ctx.moveTo(x, y);
        ctx.lineTo(x + p.vx * 1.5, y + p.vy * 1.5);
        ctx.stroke();
      } else if (p.shape === 'square') {
        ctx.fillRect(x - p.size / 2, y - p.size / 2, p.size, p.size);
      } else {
        // Circle drawing (with simple lighting/glow when high-quality)
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();

    // Draw full-screen damage/victory flash if active
    if (this.flashAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = this.flashAlpha;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();
    }
  }

  public clearAll() {
    while (this.particles.length > 0) {
      const p = this.particles.pop()!;
      this.reclaimParticle(p);
    }
    this.shakeIntensity = 0;
    this.flashAlpha = 0;
  }
}

export const particles = new ParticleSystem();
export default particles;
