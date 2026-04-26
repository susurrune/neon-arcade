// ============ 音效系统 — Web Audio API 合成复古音效 ============

class SoundManager {
  private ctx: AudioContext | null = null
  private enabled = true
  private volume = 0.3

  // 音效缓存（预生成的AudioBuffer）
  private sounds: Map<string, AudioBuffer> = new Map()

  constructor() {
    this.enabled = localStorage.getItem('neon_arcade_sound_on') !== '0'
  }

  // 初始化音频上下文
  init() {
    if (this.ctx) return
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      this.generateSounds()
    } catch (e) {
      console.warn('AudioContext not available')
    }
  }

  // 生成所有预定义音效
  private generateSounds() {
    if (!this.ctx) return

    // 得分音效 - 上升音调
    this.sounds.set('score', this.createTone(400, 0.08, 'square', [400, 500, 600]))

    // 连击音效 - 根据层级不同
    this.sounds.set('combo1', this.createTone(500, 0.1, 'square', [500, 600]))
    this.sounds.set('combo2', this.createTone(600, 0.1, 'square', [600, 800]))
    this.sounds.set('combo3', this.createTone(800, 0.12, 'square', [800, 1000, 1200]))
    this.sounds.set('combo_high', this.createTone(1000, 0.15, 'square', [1000, 1200, 1400, 1600]))

    // 消除音效（俄罗斯方块）
    this.sounds.set('clear1', this.createTone(300, 0.1, 'square', [300, 400]))
    this.sounds.set('clear2', this.createTone(350, 0.12, 'square', [350, 450, 550]))
    this.sounds.set('clear3', this.createTone(400, 0.15, 'square', [400, 500, 600, 700]))
    this.sounds.set('clear4', this.createTone(500, 0.2, 'square', [500, 700, 900, 1100]))
    this.sounds.set('perfect', this.createTone(600, 0.25, 'square', [600, 800, 1000, 1200, 1400]))

    // 移动/旋转音效
    this.sounds.set('move', this.createTone(200, 0.03, 'square', [200]))
    this.sounds.set('rotate', this.createTone(250, 0.04, 'square', [250, 300]))
    this.sounds.set('drop', this.createTone(150, 0.05, 'square', [150, 100]))

    // 道具音效
    this.sounds.set('powerup', this.createTone(300, 0.15, 'sine', [300, 400, 500, 600]))
    this.sounds.set('shield', this.createTone(400, 0.2, 'sine', [400, 500, 600]))
    this.sounds.set('skill', this.createTone(600, 0.15, 'sawtooth', [600, 800, 1000]))

    // 射击音效
    this.sounds.set('shoot', this.createTone(800, 0.02, 'square', [800, 600]))
    this.sounds.set('hit', this.createTone(200, 0.05, 'square', [200, 150]))
    this.sounds.set('explosion', this.createNoise(0.15))

    // 受伤音效
    this.sounds.set('hurt', this.createTone(200, 0.15, 'square', [200, 150, 100]))
    this.sounds.set('death', this.createTone(300, 0.3, 'square', [300, 200, 150, 100, 50]))

    // 跳跃音效
    this.sounds.set('jump', this.createTone(300, 0.08, 'square', [300, 400, 500]))
    this.sounds.set('double_jump', this.createTone(400, 0.1, 'square', [400, 550, 700]))

    // 收集音效
    this.sounds.set('coin', this.createTone(800, 0.05, 'sine', [800, 1000]))
    this.sounds.set('gem', this.createTone(1000, 0.08, 'sine', [1000, 1200, 1400]))

    // Boss音效
    this.sounds.set('boss_warning', this.createTone(400, 0.3, 'sawtooth', [400, 300, 400, 300]))
    this.sounds.set('boss_hit', this.createTone(200, 0.1, 'square', [200, 150, 200]))
    this.sounds.set('boss_death', this.createTone(500, 0.4, 'square', [500, 400, 300, 200, 100, 50]))

    // 游戏结束
    this.sounds.set('gameover', this.createTone(400, 0.5, 'square', [400, 300, 200, 150, 100]))

    // 成就音效
    this.sounds.set('achievement', this.createTone(500, 0.2, 'sine', [500, 700, 900, 1100]))

    // 按钮点击
    this.sounds.set('click', this.createTone(600, 0.02, 'square', [600, 700]))

    // 警告音效
    this.sounds.set('warning', this.createTone(500, 0.15, 'square', [500, 400, 500, 400]))

    // 瞬移音效
    this.sounds.set('teleport', this.createTone(1000, 0.15, 'sine', [1000, 500, 200]))

    // 冲刺音效
    this.sounds.set('dash', this.createTone(400, 0.1, 'sawtooth', [400, 600, 800]))
  }

  // 创建音调音效
  private createTone(baseFreq: number, duration: number, type: OscillatorType, freqs: number[]): AudioBuffer {
    if (!this.ctx) return new AudioBuffer({ length: 1, numberOfChannels: 1, sampleRate: 44100 })

    const sampleRate = this.ctx.sampleRate
    const totalSamples = Math.floor(sampleRate * duration)
    const buffer = this.ctx.createBuffer(1, totalSamples, sampleRate)
    const data = buffer.getChannelData(0)

    const segmentSamples = totalSamples / freqs.length

    for (let i = 0; i < freqs.length; i++) {
      const freq = freqs[i]
      const start = Math.floor(i * segmentSamples)
      const end = Math.floor((i + 1) * segmentSamples)

      for (let j = start; j < end; j++) {
        const t = j / sampleRate
        const phase = t * freq * 2 * Math.PI
        // 添加衰减
        const decay = 1 - (j - start) / segmentSamples
        let value = 0

        switch (type) {
          case 'square':
            value = Math.sin(phase) > 0 ? 0.5 : -0.5
            break
          case 'sine':
            value = Math.sin(phase) * 0.5
            break
          case 'sawtooth':
            value = (phase % (2 * Math.PI)) / Math.PI - 1
            break
          case 'triangle':
            value = Math.abs((phase % (2 * Math.PI)) / Math.PI - 1) * 2 - 1
            break
        }

        data[j] = value * decay * 0.5
      }
    }

    return buffer
  }

  // 创建噪声音效（爆炸）
  private createNoise(duration: number): AudioBuffer {
    if (!this.ctx) return new AudioBuffer({ length: 1, numberOfChannels: 1, sampleRate: 44100 })

    const sampleRate = this.ctx.sampleRate
    const totalSamples = Math.floor(sampleRate * duration)
    const buffer = this.ctx.createBuffer(1, totalSamples, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < totalSamples; i++) {
      const decay = 1 - i / totalSamples
      data[i] = (Math.random() * 2 - 1) * decay * 0.3
    }

    return buffer
  }

  // 播放音效
  play(name: string) {
    if (!this.enabled || !this.ctx) return

    // 如果上下文被暂停，尝试恢复
    if (this.ctx.state === 'suspended') {
      this.ctx.resume()
    }

    const buffer = this.sounds.get(name)
    if (!buffer) return

    const source = this.ctx.createBufferSource()
    source.buffer = buffer

    const gain = this.ctx.createGain()
    gain.gain.value = this.volume

    source.connect(gain)
    gain.connect(this.ctx.destination)
    source.start()
  }

  // 播放连击音效（根据层级）
  playCombo(level: number) {
    if (level >= 10) this.play('combo_high')
    else if (level >= 5) this.play('combo3')
    else if (level >= 3) this.play('combo2')
    else if (level >= 2) this.play('combo1')
  }

  // 播放消除音效（根据行数）
  playClear(lines: number) {
    if (lines >= 4) this.play('clear4')
    else if (lines === 3) this.play('clear3')
    else if (lines === 2) this.play('clear2')
    else this.play('clear1')
  }

  // 设置启用状态
  setEnabled(enabled: boolean) {
    this.enabled = enabled
    localStorage.setItem('neon_arcade_sound_on', enabled ? '1' : '0')
  }

  // 获取启用状态
  isEnabled() {
    return this.enabled
  }

  // 设置音量
  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol))
  }

  // 获取音量
  getVolume() {
    return this.volume
  }
}

// 全局单例
export const soundManager = new SoundManager()

// 便捷导出
export const playSound = (name: string) => soundManager.play(name)
export const playCombo = (level: number) => soundManager.playCombo(level)
export const playClear = (lines: number) => soundManager.playClear(lines)
export const initSound = () => soundManager.init()
export const setSoundEnabled = (enabled: boolean) => soundManager.setEnabled(enabled)
export const isSoundEnabled = () => soundManager.isEnabled()