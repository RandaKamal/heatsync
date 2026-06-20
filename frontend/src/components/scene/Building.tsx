import { Line } from '@react-three/drei'
import type {
  ClimateDevice,
  FloorFilter,
  Room,
} from '../../types/campus'
import { STATUS_COLORS } from '../../utils/status'
import { ClimateDevice as ClimateDeviceMesh } from './ClimateDevice'
import { RoomMesh } from './RoomMesh'

interface BuildingProps {
  rooms: Room[]
  devices: ClimateDevice[]
  activeFloor: FloorFilter
  selectedDeviceId: string | null
  onSelectDevice: (deviceId: string) => void
  onCloseDevice: () => void
}

interface FloorSlabProps {
  y: number
  highlighted: boolean
}

function FloorSlab({
  y,
  highlighted,
}: FloorSlabProps) {
  return (
    <mesh
      position={[0, y, -0.1]}
      receiveShadow
      castShadow
    >
      <boxGeometry args={[12.2, 0.12, 7.4]} />
      <meshStandardMaterial
        color={highlighted ? '#22354a' : '#172536'}
        roughness={0.78}
        metalness={0.08}
        transparent
        opacity={highlighted ? 0.95 : 0.7}
      />
    </mesh>
  )
}

export function Building({
  rooms,
  devices,
  activeFloor,
  selectedDeviceId,
  onSelectDevice,
  onCloseDevice,
}: BuildingProps) {
  const visibleRooms = rooms.filter(
    (room) =>
      activeFloor === 'all' ||
      room.floor === activeFloor,
  )

  const visibleDevices = devices.filter((device) => {
    if (device.floor === 'external') {
      return true
    }

    return (
      activeFloor === 'all' ||
      device.floor === activeFloor
    )
  })

  const selectedDevice = devices.find(
    (device) => device.id === selectedDeviceId,
  )

  const ductLinks = visibleDevices
    .filter(
      (device) =>
        device.technology === 'orion-mobile-rooftop',
    )
    .flatMap((device) =>
      device.servedRoomIds
        .map((roomId) => {
          const room = rooms.find(
            (candidate) => candidate.id === roomId,
          )

          if (!room) {
            return null
          }

          if (
            activeFloor !== 'all' &&
            room.floor !== activeFloor
          ) {
            return null
          }

          return {
            key: `${device.id}-${room.id}`,
            selected: device.id === selectedDeviceId,
            color: STATUS_COLORS[device.status],
            points: [
              [
                device.position[0],
                device.position[1] + 0.2,
                device.position[2],
              ],
              [
                room.position[0],
                room.position[1] + 0.2,
                room.position[2] + room.size[2] / 2,
              ],
            ] as [[number, number, number], [number, number, number]],
          }
        })
        .filter((link): link is NonNullable<typeof link> => link !== null),
    )

  return (
    <group>
      <FloorSlab y={0.08} highlighted />

      <mesh position={[0, 0.76, 2.32]} receiveShadow>
        <boxGeometry args={[11.8, 1.28, 1]} />
        <meshStandardMaterial
          color="#18283a"
          transparent
          opacity={0.32}
          roughness={0.75}
          depthWrite={false}
        />
      </mesh>

      {ductLinks.map((link) => (
        <Line
          key={link.key}
          points={link.points}
          color={link.color}
          lineWidth={link.selected ? 3 : 1}
          transparent
          opacity={selectedDevice ? (link.selected ? 0.9 : 0.08) : 0.22}
          dashed={!link.selected}
          dashSize={0.35}
          gapSize={0.22}
        />
      ))}

      {visibleRooms.map((room) => (
        <RoomMesh
          key={room.id}
          room={room}
          showLabel={selectedDeviceId === null}
        />
      ))}

      {visibleDevices.map((device) => (
        <ClimateDeviceMesh
          key={device.id}
          device={device}
          selected={selectedDeviceId === device.id}
          labelsSuppressed={selectedDeviceId !== null}
          onSelect={onSelectDevice}
          onClose={onCloseDevice}
        />
      ))}
    </group>
  )
}
