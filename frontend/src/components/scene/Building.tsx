import { Line } from '@react-three/drei'
import type { ClimateDevice, FloorFilter, Room } from '../../types/campus'
import { STATUS_COLORS } from '../../utils/status'
import { ClimateDevice as ClimateDeviceMesh } from './ClimateDevice'
import { RoomMesh } from './RoomMesh'

// Building constants
const W  = 24     // total width  (m)
const D  = 16     // total depth  (m)
const H  = 3.5    // floor height (m)
const TH = H * 2  // total height (m) = 7.0
const T  = 0.18   // slab thickness

interface BuildingProps {
  rooms: Room[]
  devices: ClimateDevice[]
  activeFloor: FloorFilter
  onSelectDevice: (id: string) => void
  onSelectRoom: (id: string) => void
}

// ── Structural elements ───────────────────────────────────────────────────────

function Slab({ y, color = '#172536' }: { y: number; color?: string }) {
  return (
    <mesh position={[0, y, 0]} receiveShadow castShadow>
      <boxGeometry args={[W + T, T, D + T]} />
      <meshStandardMaterial color={color} roughness={0.82} metalness={0.06} />
    </mesh>
  )
}

function Roof() {
  return (
    <mesh position={[0, TH + T / 2, 0]} receiveShadow>
      <boxGeometry args={[W + T, T, D + T]} />
      <meshStandardMaterial color="#1a2d40" roughness={0.78} metalness={0.1} />
    </mesh>
  )
}

// Transparent outer glass walls + opaque center divider
function Walls() {
  const yMid = TH / 2
  const glassMat = (
    <meshStandardMaterial
      color="#1e3a52"
      transparent
      opacity={0.20}
      roughness={0.12}
      metalness={0.45}
      depthWrite={false}
    />
  )
  const backMat = (
    <meshStandardMaterial
      color="#1e3a52"
      transparent
      opacity={0.09}
      roughness={0.12}
      metalness={0.45}
      depthWrite={false}
    />
  )
  const dividerMat = (
    <meshStandardMaterial
      color="#223a50"
      transparent
      opacity={0.30}
      roughness={0.30}
      metalness={0.25}
      depthWrite={false}
    />
  )

  return (
    <group>
      {/* Outer front */}
      <mesh position={[0, yMid, -D / 2]}><boxGeometry args={[W, TH, T]} />{glassMat}</mesh>
      {/* Outer back (more transparent so view isn't blocked) */}
      <mesh position={[0, yMid,  D / 2]}><boxGeometry args={[W, TH, T]} />{backMat}</mesh>
      {/* Outer left */}
      <mesh position={[-W / 2, yMid, 0]}><boxGeometry args={[T, TH, D]} />{glassMat}</mesh>
      {/* Outer right */}
      <mesh position={[ W / 2, yMid, 0]}><boxGeometry args={[T, TH, D]} />{glassMat}</mesh>
      {/* Center vertical divider (separates left/right rooms, full height) */}
      <mesh position={[0, yMid, 0]}><boxGeometry args={[T * 2, TH, D]} />{dividerMat}</mesh>
    </group>
  )
}

// Structural columns at the 4 building corners + 2 centre front/back
function Columns() {
  const positions: [number, number, number][] = [
    [-W / 2 + 0.1,  TH / 2, -D / 2 + 0.1],
    [ W / 2 - 0.1,  TH / 2, -D / 2 + 0.1],
    [-W / 2 + 0.1,  TH / 2,  D / 2 - 0.1],
    [ W / 2 - 0.1,  TH / 2,  D / 2 - 0.1],
    [0,             TH / 2, -D / 2 + 0.1],  // centre front
    [0,             TH / 2,  D / 2 - 0.1],  // centre back
  ]
  return (
    <group>
      {positions.map(([x, y, z]) => (
        <mesh key={`col-${x}-${z}`} position={[x, y, z]} castShadow>
          <boxGeometry args={[0.22, TH, 0.22]} />
          <meshStandardMaterial color="#2e4a62" metalness={0.42} roughness={0.50} />
        </mesh>
      ))}
    </group>
  )
}

// Floor badge (HTML label on the front face of each floor)
// (Rendered via RoomMesh labels — no extra badge needed here)

// ── Duct lines ────────────────────────────────────────────────────────────────
//
//  Each heat pump duct runs:
//    1. From the HP bottom down to roof level
//    2. Diagonally to its room's ceiling centre
//
//  Room ceiling centres:
//    Floor 0 (G01/G02): y = H = 3.5
//    Floor 1 (F01/F02): y = TH = 7.0
//    Left rooms  (G01/F01): x = -6
//    Right rooms (G02/F02): x = +6

function roomCeilingCentre(room: Room): [number, number, number] {
  const cx = room.position[0]
  const cy = room.floor === 0 ? H : TH
  return [cx, cy, 0]
}

// ── Building component ────────────────────────────────────────────────────────

export function Building({ rooms, devices, activeFloor, onSelectDevice, onSelectRoom }: BuildingProps) {
  const visibleRooms = rooms.filter(
    (r) => activeFloor === 'all' || r.floor === activeFloor,
  )

  // Build duct lines: HP → roof level → room ceiling centre
  const ductLines = devices.flatMap((device) => {
    const servedRoom = rooms.find((r) => device.servedRoomIds.includes(r.id))
    if (!servedRoom) return []

    const [hx, hy, hz] = device.position
    const [cx, cy, cz] = roomCeilingCentre(servedRoom)
    const roofY = TH + T

    return [{
      key: device.id,
      color: STATUS_COLORS[device.status],
      points: [
        [hx, hy - 0.53, hz] as [number, number, number],  // HP bottom
        [hx, roofY,     hz] as [number, number, number],  // roof surface
        [cx, cy + 0.05, cz] as [number, number, number],  // room ceiling
      ] as [[number,number,number],[number,number,number],[number,number,number]],
    }]
  })

  return (
    <group>
      {/* Structural shell */}
      <Slab y={0} />                          {/* ground floor */}
      <Slab y={H} color="#1c2f42" />          {/* inter-floor slab */}
      <Roof />
      <Walls />
      <Columns />

      {/* Duct lines */}
      {ductLines.map((duct) => (
        <Line
          key={duct.key}
          points={duct.points}
          color={duct.color}
          lineWidth={1.5}
          transparent
          opacity={0.38}
          dashed
          dashSize={0.45}
          gapSize={0.28}
        />
      ))}

      {/* Rooms (filtered by floor) */}
      {visibleRooms.map((room) => (
        <RoomMesh key={room.id} room={room} onSelect={onSelectRoom} />
      ))}

      {/* Heat pumps (always shown — they're on the roof above the building) */}
      {devices.map((device) => (
        <ClimateDeviceMesh key={device.id} device={device} onSelect={onSelectDevice} />
      ))}
    </group>
  )
}
