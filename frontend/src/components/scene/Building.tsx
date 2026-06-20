import { Line } from '@react-three/drei'
import type { ClimateDevice, FloorFilter, Room } from '../../types/campus'
import { STATUS_COLORS } from '../../utils/status'
import { ClimateDevice as ClimateDeviceMesh } from './ClimateDevice'
import { RoomMesh } from './RoomMesh'

const W = 24
const D = 16
const H = 3.5
const T = 0.18

interface BuildingProps {
  rooms: Room[]
  devices: ClimateDevice[]
  activeFloor: FloorFilter
  onSelectDevice: (id: string) => void
  onSelectRoom: (id: string) => void
}

function FloorSlab() {
  return (
    <mesh position={[0, 0, 0]} receiveShadow castShadow>
      <boxGeometry args={[W + T, T, D + T]} />
      <meshStandardMaterial color="#172536" roughness={0.82} metalness={0.06} />
    </mesh>
  )
}

function Roof() {
  return (
    <mesh position={[0, H + T / 2, 0]} receiveShadow>
      <boxGeometry args={[W + T, T, D + T]} />
      <meshStandardMaterial color="#1a2d40" roughness={0.78} metalness={0.1} />
    </mesh>
  )
}

function Walls() {
  const mat = (
    <meshStandardMaterial
      color="#1e3a52"
      transparent
      opacity={0.22}
      roughness={0.15}
      metalness={0.4}
      depthWrite={false}
    />
  )
  const yMid = H / 2
  return (
    <group>
      <mesh position={[0, yMid, -D / 2]}><boxGeometry args={[W, H, T]} />{mat}</mesh>
      <mesh position={[-W / 2, yMid, 0]}><boxGeometry args={[T, H, D]} />{mat}</mesh>
      <mesh position={[W / 2, yMid, 0]}><boxGeometry args={[T, H, D]} />{mat}</mesh>
      <mesh position={[0, yMid, D / 2]}>
        <boxGeometry args={[W, H, T]} />
        <meshStandardMaterial color="#1e3a52" transparent opacity={0.10} roughness={0.15} metalness={0.4} depthWrite={false} />
      </mesh>
    </group>
  )
}

export function Building({ rooms, devices, activeFloor, onSelectDevice, onSelectRoom }: BuildingProps) {
  const visibleRooms = rooms.filter(
    (r) => activeFloor === 'all' || r.floor === activeFloor,
  )

  const ceilingCentre: [number, number, number] = [0, H, 0]

  const ductLines = devices.map((device) => ({
    key: device.id,
    color: STATUS_COLORS[device.status],
    points: [
      [device.position[0], device.position[1] - 0.53, device.position[2]] as [number, number, number],
      [device.position[0], H + T, device.position[2]] as [number, number, number],
      ceilingCentre,
    ] as [[number, number, number], [number, number, number], [number, number, number]],
  }))

  return (
    <group>
      <FloorSlab />
      <Walls />
      <Roof />

      {ductLines.map((duct) => (
        <Line
          key={duct.key}
          points={duct.points}
          color={duct.color}
          lineWidth={1.5}
          transparent
          opacity={0.35}
          dashed
          dashSize={0.5}
          gapSize={0.3}
        />
      ))}

      {visibleRooms.map((room) => (
        <RoomMesh key={room.id} room={room} onSelect={onSelectRoom} />
      ))}

      {devices.map((device) => (
        <ClimateDeviceMesh key={device.id} device={device} onSelect={onSelectDevice} />
      ))}
    </group>
  )
}
