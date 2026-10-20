/// <reference lib="webworker" />

type Point = { x: number; y: number; z: number }

type TransferBuffers = {
  indices?: ArrayBuffer
  normals?: ArrayBuffer
  positions?: ArrayBuffer
}

type Grab = Point & {
  active: boolean
  offsets: Float32Array | null
  radius: number
  weights: Float32Array | null
}

let columns = 0
let rows = 0
let particleCount = 0
let positions: Float32Array
let previous: Float32Array
let pinned: Uint8Array

// Structural and shear links are stored separately so a broken link stays
// broken forever. That is the difference between a cloth that stretches and a
// paper surface that actually tears.
let horizontal: Uint8Array
let vertical: Uint8Array
let diagonal: Uint8Array
let horizontalRest: Float32Array
let verticalRest: Float32Array
let diagonalRest: Float32Array

const grabs: Grab[] = Array.from({ length: 8 }, () => ({
  active: false,
  offsets: null,
  radius: 0,
  weights: null,
  x: 0,
  y: 0,
  z: 0,
}))

let hasInteracted = false
let worldWidth = 0
let worldHeight = 0
let tearRatio = 5.2
let grabStrength = 0.6

// These deliberately mirror the shape of the reference runtime values: low
// gravity, a light constraint solve, and a broad soft grab. The values are
// adapted to this component's world-space mesh rather than copied from it.
const GRAVITY_Y = -0.0003
const DAMPING = 0.97
const RELAXATION_PASSES = 2
const FLOOR_Y = -4

const pointIndex = (row: number, column: number) => row * columns + column
const horizontalIndex = (row: number, column: number) =>
  row * (columns - 1) + column
const verticalIndex = (row: number, column: number) => row * columns + column
const diagonalIndex = (row: number, column: number) =>
  row * (columns - 1) + column

function distance(a: number, b: number) {
  const aOffset = a * 3
  const bOffset = b * 3
  return (
    Math.hypot(
      positions[aOffset] - positions[bOffset],
      positions[aOffset + 1] - positions[bOffset + 1],
      positions[aOffset + 2] - positions[bOffset + 2]
    ) || 0.00001
  )
}

function initialise(message: {
  columns: number
  height: number
  rows: number
  width: number
}) {
  columns = message.columns
  rows = message.rows
  worldWidth = message.width
  worldHeight = message.height
  particleCount = columns * rows

  positions = new Float32Array(particleCount * 3)
  previous = new Float32Array(particleCount * 3)
  pinned = new Uint8Array(particleCount)

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const point = pointIndex(row, column)
      const offset = point * 3
      const x = (column / (columns - 1) - 0.5) * worldWidth
      const y = (0.5 - row / (rows - 1)) * worldHeight
      positions[offset] = previous[offset] = x
      positions[offset + 1] = previous[offset + 1] = y
      positions[offset + 2] = previous[offset + 2] = 0
    }
  }

  // A poster is held on three sides. Tear through the free material and a
  // chunk drops; the top and both side borders remain fixed to the frame.
  for (let column = 0; column < columns; column++)
    pinned[pointIndex(0, column)] = 1
  for (let row = 1; row < rows; row++) {
    pinned[pointIndex(row, 0)] = 1
    pinned[pointIndex(row, columns - 1)] = 1
  }

  horizontal = new Uint8Array(rows * (columns - 1)).fill(1)
  vertical = new Uint8Array((rows - 1) * columns).fill(1)
  diagonal = new Uint8Array((rows - 1) * (columns - 1)).fill(1)
  horizontalRest = new Float32Array(horizontal.length)
  verticalRest = new Float32Array(vertical.length)
  diagonalRest = new Float32Array(diagonal.length)

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns - 1; column++) {
      horizontalRest[horizontalIndex(row, column)] = distance(
        pointIndex(row, column),
        pointIndex(row, column + 1)
      )
    }
  }
  for (let row = 0; row < rows - 1; row++) {
    for (let column = 0; column < columns; column++) {
      verticalRest[verticalIndex(row, column)] = distance(
        pointIndex(row, column),
        pointIndex(row + 1, column)
      )
    }
  }
  for (let row = 0; row < rows - 1; row++) {
    for (let column = 0; column < columns - 1; column++) {
      diagonalRest[diagonalIndex(row, column)] = distance(
        pointIndex(row, column),
        pointIndex(row + 1, column + 1)
      )
    }
  }

  const cellWidth = worldWidth / (columns - 1)
  const cellHeight = worldHeight / (rows - 1)
  // A soft patch spanning several cells prevents square, grid-sized chunks.
  const cell = Math.max(cellWidth, cellHeight)
  const defaultGrabRadius = Math.min(
    Math.min(worldWidth, worldHeight) * 0.22,
    cell * 15
  )
  for (const grab of grabs) {
    grab.active = false
    grab.offsets = new Float32Array(particleCount * 3)
    grab.radius = defaultGrabRadius
    grab.weights = new Float32Array(particleCount)
  }
  hasInteracted = false
}

function integrate() {
  if (!hasInteracted) return
  for (let point = 0; point < particleCount; point++) {
    if (pinned[point]) continue
    const offset = point * 3
    const x = positions[offset]
    const y = positions[offset + 1]
    const z = positions[offset + 2]
    const vx = (x - previous[offset]) * DAMPING
    const vy = (y - previous[offset + 1]) * DAMPING
    const vz = (z - previous[offset + 2]) * DAMPING
    previous[offset] = x
    previous[offset + 1] = y
    previous[offset + 2] = z
    positions[offset] = x + vx
    positions[offset + 1] = y + vy + GRAVITY_Y
    positions[offset + 2] = z + vz
  }
}

function applyGrabs() {
  for (const grab of grabs) {
    if (!grab.active || !grab.offsets || !grab.weights) continue
    for (let point = 0; point < particleCount; point++) {
      if (pinned[point]) continue
      const weight = grab.weights[point]
      if (weight === 0) continue
      const offset = point * 3
      // Preserve each particle's offset from the point at which it was
      // grabbed. Pulling every particle to the same cursor coordinate folds
      // the mesh into a dark, singular point; moving their local patch keeps
      // the paper flat until the surrounding links genuinely tear.
      const targetX = grab.x + grab.offsets[offset]
      const targetY = grab.y + grab.offsets[offset + 1]
      const targetZ = grab.z + grab.offsets[offset + 2]
      const strength = grabStrength * weight
      positions[offset] += (targetX - positions[offset]) * strength
      positions[offset + 1] += (targetY - positions[offset + 1]) * strength
      positions[offset + 2] += (targetZ - positions[offset + 2]) * strength
    }
  }
}

function resolveLink(
  active: Uint8Array,
  rest: Float32Array,
  link: number,
  a: number,
  b: number
) {
  if (!active[link]) return
  const aOffset = a * 3
  const bOffset = b * 3
  let dx = positions[bOffset] - positions[aOffset]
  let dy = positions[bOffset + 1] - positions[aOffset + 1]
  let dz = positions[bOffset + 2] - positions[aOffset + 2]
  const current = Math.hypot(dx, dy, dz) || 0.00001

  if (current > rest[link] * tearRatio) {
    active[link] = 0
    return
  }

  const aPinned = pinned[a] === 1
  const bPinned = pinned[b] === 1
  if (aPinned && bPinned) return

  const correction = ((current - rest[link]) / current) * 0.25
  dx *= correction
  dy *= correction
  dz *= correction

  if (aPinned) {
    positions[bOffset] -= dx * 2
    positions[bOffset + 1] -= dy * 2
    positions[bOffset + 2] -= dz * 2
  } else if (bPinned) {
    positions[aOffset] += dx * 2
    positions[aOffset + 1] += dy * 2
    positions[aOffset + 2] += dz * 2
  } else {
    positions[aOffset] += dx
    positions[aOffset + 1] += dy
    positions[aOffset + 2] += dz
    positions[bOffset] -= dx
    positions[bOffset + 1] -= dy
    positions[bOffset + 2] -= dz
  }
}

function relax() {
  for (let pass = 0; pass < RELAXATION_PASSES; pass++) {
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns - 1; column++) {
        resolveLink(
          horizontal,
          horizontalRest,
          horizontalIndex(row, column),
          pointIndex(row, column),
          pointIndex(row, column + 1)
        )
      }
    }
    for (let row = 0; row < rows - 1; row++) {
      for (let column = 0; column < columns; column++) {
        resolveLink(
          vertical,
          verticalRest,
          verticalIndex(row, column),
          pointIndex(row, column),
          pointIndex(row + 1, column)
        )
      }
    }
    for (let row = 0; row < rows - 1; row++) {
      for (let column = 0; column < columns - 1; column++) {
        resolveLink(
          diagonal,
          diagonalRest,
          diagonalIndex(row, column),
          pointIndex(row, column),
          pointIndex(row + 1, column + 1)
        )
      }
    }
  }
}

function buildFrame(buffers: TransferBuffers) {
  const positionBuffer =
    buffers.positions?.byteLength === positions.byteLength
      ? buffers.positions
      : new ArrayBuffer(positions.byteLength)
  new Float32Array(positionBuffer).set(positions)

  const normalBuffer =
    buffers.normals?.byteLength === positions.byteLength
      ? buffers.normals
      : new ArrayBuffer(positions.byteLength)
  const normals = new Float32Array(normalBuffer)
  normals.fill(0)

  const indexByteLength =
    (rows - 1) * (columns - 1) * 6 * Uint32Array.BYTES_PER_ELEMENT
  const indexBuffer =
    buffers.indices?.byteLength === indexByteLength
      ? buffers.indices
      : new ArrayBuffer(indexByteLength)
  const indices = new Uint32Array(indexBuffer)
  let drawCount = 0

  const addTriangle = (a: number, b: number, c: number) => {
    indices[drawCount++] = a
    indices[drawCount++] = b
    indices[drawCount++] = c

    const aOffset = a * 3
    const bOffset = b * 3
    const cOffset = c * 3
    const abx = positions[bOffset] - positions[aOffset]
    const aby = positions[bOffset + 1] - positions[aOffset + 1]
    const abz = positions[bOffset + 2] - positions[aOffset + 2]
    const acx = positions[cOffset] - positions[aOffset]
    const acy = positions[cOffset + 1] - positions[aOffset + 1]
    const acz = positions[cOffset + 2] - positions[aOffset + 2]
    const nx = aby * acz - abz * acy
    const ny = abz * acx - abx * acz
    const nz = abx * acy - aby * acx
    for (const point of [a, b, c]) {
      const offset = point * 3
      normals[offset] += nx
      normals[offset + 1] += ny
      normals[offset + 2] += nz
    }
  }

  for (let row = 0; row < rows - 1; row++) {
    for (let column = 0; column < columns - 1; column++) {
      const topLeft = pointIndex(row, column)
      const topRight = pointIndex(row, column + 1)
      const bottomLeft = pointIndex(row + 1, column)
      const bottomRight = pointIndex(row + 1, column + 1)
      const hTop = horizontal[horizontalIndex(row, column)]
      const hBottom = horizontal[horizontalIndex(row + 1, column)]
      const vLeft = vertical[verticalIndex(row, column)]
      const vRight = vertical[verticalIndex(row, column + 1)]
      const d = diagonal[diagonalIndex(row, column)]

      if (vLeft && hBottom && d) addTriangle(topLeft, bottomLeft, bottomRight)
      if (hTop && vRight && d) addTriangle(topLeft, bottomRight, topRight)
    }
  }

  for (let point = 0; point < particleCount; point++) {
    const offset = point * 3
    const length = Math.hypot(
      normals[offset],
      normals[offset + 1],
      normals[offset + 2]
    )
    if (length > 0.00001) {
      normals[offset] /= length
      normals[offset + 1] /= length
      normals[offset + 2] /= length
    } else {
      normals[offset + 2] = 1
    }
  }

  return { drawCount, indexBuffer, normalBuffer, positionBuffer }
}

function isActive() {
  if (grabs.some((grab) => grab.active)) return true
  if (!hasInteracted) return false
  for (let point = 0; point < particleCount; point++) {
    if (pinned[point] || positions[point * 3 + 1] < FLOOR_Y) continue
    const offset = point * 3
    const vx = positions[offset] - previous[offset]
    const vy = positions[offset + 1] - previous[offset + 1]
    const vz = positions[offset + 2] - previous[offset + 2]
    if (vx * vx + vy * vy + vz * vz > 0.00000002) return true
  }
  return false
}

self.onmessage = (event: MessageEvent) => {
  const message = event.data
  switch (message.type) {
    case "init":
      tearRatio = message.tearRatio ?? 5.2
      grabStrength = message.grabStrength ?? 0.6
      initialise(message)
      break
    case "grab": {
      const grab = grabs[message.slot ?? 0]
      if (!grab || !grab.offsets || !grab.weights) break
      hasInteracted = true
      grab.active = true
      grab.x = message.point.x
      grab.y = message.point.y
      grab.z = message.point.z
      grab.weights.fill(0)
      const radiusSquared = grab.radius * grab.radius
      for (let point = 0; point < particleCount; point++) {
        if (pinned[point]) continue
        const offset = point * 3
        const dx = positions[offset] - grab.x
        const dy = positions[offset + 1] - grab.y
        const dz = positions[offset + 2] - grab.z
        const distanceSquared = dx * dx + dy * dy + dz * dz
        if (distanceSquared >= radiusSquared) continue
        const falloff = 1 - Math.sqrt(distanceSquared) / grab.radius
        grab.weights[point] = falloff * falloff
        grab.offsets[offset] = dx
        grab.offsets[offset + 1] = dy
        grab.offsets[offset + 2] = dz
      }
      break
    }
    case "moveGrab": {
      const grab = grabs[message.slot ?? 0]
      if (!grab) break
      grab.x = message.point.x
      grab.y = message.point.y
      grab.z = message.point.z
      break
    }
    case "releaseGrab": {
      const grab = grabs[message.slot ?? 0]
      if (grab) grab.active = false
      break
    }
    case "step": {
      integrate()
      applyGrabs()
      relax()
      const frame = buildFrame(message.buffers ?? {})
      ;(self as unknown as Worker).postMessage(
        {
          active: isActive(),
          drawCount: frame.drawCount,
          id: message.id,
          indices: frame.indexBuffer,
          normals: frame.normalBuffer,
          positions: frame.positionBuffer,
          type: "result",
        },
        [frame.positionBuffer, frame.normalBuffer, frame.indexBuffer]
      )
      break
    }
    case "dispose":
      self.close()
      break
  }
}
