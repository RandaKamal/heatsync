import { useRef, useState } from 'react'
import { Html } from '@react-three/drei'
import {
  useFrame,
  type ThreeEvent,
} from '@react-three/fiber'
import {
  DoubleSide,
  type MeshBasicMaterial,
} from 'three'
import type { ClimateDevice as ClimateDeviceData } from '../../types/campus'
import {
  MODE_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  TECHNOLOGY_ABBREVIATIONS,
} from '../../utils/status'
import { DeviceCard } from './DeviceCard'

interface ClimateDeviceProps {
  device: ClimateDeviceData
  selected: boolean
  labelsSuppressed: boolean
  onSelect: (deviceId: string) => void
  onClose: () => void
}

interface DeviceGeometryProps {
  device: ClimateDeviceData
  color: string
}

function Fan({
  x,
  color,
}: {
  x: number
  color: string
}) {
  return (
    <group position={[x, 0.12, 1.08]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.29, 0.29, 0.07, 32]} />
        <meshStandardMaterial color="#142537" metalness={0.5} />
      </mesh>

      {[0, 1, 2, 3].map((blade) => (
        <mesh
          key={blade}
          rotation={[0, 0, (Math.PI / 2) * blade]}
        >
          <boxGeometry args={[0.38, 0.055, 0.035]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}

      <mesh>
        <sphereGeometry args={[0.07, 20, 20]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  )
}

function DeviceGeometry({
  device,
  color,
}: DeviceGeometryProps) {
  if (device.technology === 'orion-mobile-rooftop') {
    const fanPositions =
      device.model === 'ORIO 047' ? [-0.35, 0.35] : [0]

    return (
      <group>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.55, 1.05, 2.15]} />
          <meshStandardMaterial
            color="#d9e3e9"
            roughness={0.48}
            metalness={0.28}
          />
        </mesh>

        <mesh position={[0, 0.16, -1.095]}>
          <boxGeometry args={[1.05, 0.42, 0.05]} />
          <meshStandardMaterial color="#1a2b3d" />
        </mesh>

        {[-0.34, -0.17, 0, 0.17, 0.34].map((y) => (
          <mesh key={y} position={[0, y + 0.16, -1.13]}>
            <boxGeometry args={[0.92, 0.04, 0.025]} />
            <meshStandardMaterial color={color} />
          </mesh>
        ))}

        {fanPositions.map((x) => (
          <Fan key={x} x={x} color={color} />
        ))}

        <mesh position={[-0.42, -0.10, 1.08]}>
          <cylinderGeometry args={[0.18, 0.18, 0.24, 24]} />
          <meshStandardMaterial color="#8da4b4" metalness={0.35} />
        </mesh>

        <mesh position={[0.42, -0.10, 1.08]}>
          <cylinderGeometry args={[0.18, 0.18, 0.24, 24]} />
          <meshStandardMaterial color="#8da4b4" metalness={0.35} />
        </mesh>

        <Html
          position={[0, 0.05, -1.16]}
          center
          distanceFactor={13}
          zIndexRange={[3, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div className="orion-badge">
            ORION
            <small>{device.model?.replace('ORIO ', '')}</small>
          </div>
        </Html>
      </group>
    )
  }

  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[0.42, 0.52, 0.16]} />
        <meshStandardMaterial
          color="#dce7ed"
          roughness={0.5}
        />
      </mesh>

      <mesh position={[0, 0.05, 0.09]}>
        <boxGeometry args={[0.27, 0.18, 0.025]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.25}
        />
      </mesh>

      <mesh position={[0, -0.16, 0.09]}>
        <circleGeometry args={[0.04, 20]} />
        <meshStandardMaterial color="#152638" />
      </mesh>
    </group>
  )
}

export function ClimateDevice({
  device,
  selected,
  labelsSuppressed,
  onSelect,
  onClose,
}: ClimateDeviceProps) {
  const [hovered, setHovered] = useState(false)
  const haloMaterial =
    useRef<MeshBasicMaterial | null>(null)

  const statusColor = STATUS_COLORS[device.status]

  useFrame(({ clock }) => {
    if (!haloMaterial.current) {
      return
    }

    const pulse =
      0.26 + Math.sin(clock.elapsedTime * 3.2) * 0.1

    haloMaterial.current.opacity = selected
      ? 0.82
      : device.status === 'fault' ||
          device.status === 'at-risk'
        ? pulse + 0.15
        : 0.24
  })

  const handleClick = (
    event: ThreeEvent<MouseEvent>,
  ) => {
    event.stopPropagation()
    onSelect(device.id)
  }

  return (
    <group
      position={device.position}
      scale={selected ? 1.08 : hovered ? 1.04 : 1}
      onClick={handleClick}
      onPointerOver={(event) => {
        event.stopPropagation()
        setHovered(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = 'default'
      }}
    >
      <DeviceGeometry device={device} color={statusColor} />

      <mesh
        position={[0, device.technology === 'orion-mobile-rooftop' ? -0.58 : -0.43, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry
          args={
            device.technology === 'orion-mobile-rooftop'
              ? [0.92, 1.08, 40]
              : [0.61, 0.77, 40]
          }
        />
        <meshBasicMaterial
          ref={haloMaterial}
          color={statusColor}
          transparent
          opacity={0.3}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {!labelsSuppressed && !selected && (
        <Html
          position={[
            0,
            device.technology === 'orion-mobile-rooftop' ? 1.0 : 0.72,
            0,
          ]}
          center
          distanceFactor={12}
          zIndexRange={[8, 5]}
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="device-tag"
            style={{ borderColor: statusColor }}
          >
            <span
              className="device-tag__type"
              style={{
                color: statusColor,
                background: `${statusColor}22`,
              }}
            >
              {TECHNOLOGY_ABBREVIATIONS[device.technology]}
            </span>
            <span>{device.id}</span>
            <span
              className="status-dot"
              style={{ background: statusColor }}
            />
            <span className="device-tag__status">
              {MODE_LABELS[device.operatingMode]} ·{' '}
              {STATUS_LABELS[device.status]}
            </span>
          </div>
        </Html>
      )}

      {selected && (
        <Html
          position={[
            0,
            device.technology === 'orion-mobile-rooftop' ? 2.0 : 1.55,
            0,
          ]}
          center
          distanceFactor={10}
          zIndexRange={[30, 20]}
          style={{ pointerEvents: 'auto' }}
        >
          <DeviceCard
            device={device}
            onClose={onClose}
          />
        </Html>
      )}
    </group>
  )
}
