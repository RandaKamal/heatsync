import * as THREE from 'three'

// Temperature → floor color (cool to warm gradient)
function tempColor(temp) {
  if (temp <= 16) return '#1155cc'
  if (temp <= 18) return '#1a88dd'
  if (temp <= 20) return '#00aabb'
  if (temp <= 22) return '#00bb77'
  if (temp <= 24) return '#88cc00'
  if (temp <= 26) return '#ffaa00'
  return '#ee3300'
}

function statusWallTint(status) {
  if (status === 'error')   return '#1e0808'
  if (status === 'warning') return '#1a1408'
  return '#0d1e2e'
}

// Ceiling-mounted air supply diffuser grille (visible from inside)
function Diffuser({ x, z }) {
  return (
    <group position={[x, -0.01, z]}>
      {/* Frame */}
      <mesh>
        <boxGeometry args={[0.7, 0.04, 0.7]} />
        <meshStandardMaterial color="#c8d4dc" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Slats x-direction */}
      {[-0.22, -0.08, 0.08, 0.22].map((oy, i) => (
        <mesh key={`sx-${i}`} position={[oy, 0, 0]}>
          <boxGeometry args={[0.05, 0.06, 0.62]} />
          <meshStandardMaterial color="#8aa0b0" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      {/* Slats z-direction */}
      {[-0.22, -0.08, 0.08, 0.22].map((oz, i) => (
        <mesh key={`sz-${i}`} position={[0, 0, oz]}>
          <boxGeometry args={[0.62, 0.05, 0.05]} />
          <meshStandardMaterial color="#8aa0b0" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
    </group>
  )
}

// Window panel for hall facades
function WindowBand({ wallWidth, wallHeight, side, glowing }) {
  const count = Math.max(2, Math.round(wallWidth / 3.2))
  const winW  = (wallWidth - 0.8) / count - 0.3
  const winH  = wallHeight * 0.38
  const winY  = -wallHeight * 0.05

  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const x = -wallWidth / 2 + 0.5 + (i + 0.5) * ((wallWidth - 0.8) / count) + i * 0.0
        return (
          <group key={i}>
            {/* Glass pane */}
            <mesh position={[x, winY, side * 0.018]}>
              <boxGeometry args={[winW, winH, 0.04]} />
              <meshStandardMaterial
                color={glowing ? '#ffe8b8' : '#7ab8d8'}
                emissive={glowing ? '#ff9933' : '#000000'}
                emissiveIntensity={glowing ? 0.55 : 0}
                transparent
                opacity={glowing ? 0.55 : 0.35}
                metalness={0.05}
                roughness={0.0}
                side={THREE.DoubleSide}
              />
            </mesh>
            {/* Frame */}
            <mesh position={[x, winY, side * 0.012]}>
              <boxGeometry args={[winW + 0.08, winH + 0.08, 0.025]} />
              <meshStandardMaterial color="#c8d4dc" metalness={0.75} roughness={0.25} />
            </mesh>
          </group>
        )
      })}
    </>
  )
}

export default function FloorLayer({ room, period = 'midday' }) {
  const [cx, , cz] = room.position
  const [w, h, d]  = room.size
  const fc      = new THREE.Color(tempColor(room.temperature.current))
  const wall    = statusWallTint(room.status)
  const halfH   = h / 2
  const glowing = period === 'night' || period === 'evening'

  // Diffuser grid inside ceiling: one per ~16 m² of floor
  const diffusers = []
  const cols = Math.max(1, Math.round(w / 5))
  const rows = Math.max(1, Math.round(d / 5))
  for (let ci = 0; ci < cols; ci++) {
    for (let ri = 0; ri < rows; ri++) {
      const dx = -w / 2 + (ci + 0.5) * (w / cols)
      const dz = -d / 2 + (ri + 0.5) * (d / rows)
      diffusers.push({ dx, dz })
    }
  }

  return (
    <group position={[cx, 0, cz]}>

      {/* ── Floor slab ── */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[w, 0.1, d]} />
        <meshStandardMaterial
          color={fc}
          emissive={fc}
          emissiveIntensity={0.12}
          metalness={0.1}
          roughness={0.75}
        />
      </mesh>

      {/* ── Exterior wall panels (white-gray cladding like TUM campus) ── */}
      {[
        // front (−z) and back (+z) — long walls, have windows
        { pos: [0, halfH, -d / 2], size: [w, h, 0.12], hasWin: true, winSide: -1, winW: w, winH: h, g: glowing },
        { pos: [0, halfH,  d / 2], size: [w, h, 0.12], hasWin: true, winSide:  1, winW: w, winH: h, g: glowing },
        // left (−x) and right (+x) — short walls, no windows
        { pos: [-w / 2, halfH, 0], size: [0.12, h, d], hasWin: false },
        { pos: [ w / 2, halfH, 0], size: [0.12, h, d], hasWin: false },
      ].map(({ pos, size, hasWin, winSide, winW, winH, g }, i) => (
        <group key={`wall-${i}`} position={pos}>
          <mesh castShadow>
            <boxGeometry args={size} />
            <meshStandardMaterial
              color="#dce8f0"
              metalness={0.2}
              roughness={0.65}
              side={THREE.DoubleSide}
            />
          </mesh>
          {hasWin && (
            <WindowBand wallWidth={winW} wallHeight={winH} side={winSide} glowing={g} />
          )}
        </group>
      ))}

      {/* ── Corner columns (exposed structural steel) ── */}
      {[[-w/2, -d/2], [w/2, -d/2], [-w/2, d/2], [w/2, d/2]].map(([px, pz], i) => (
        <mesh key={`col-${i}`} position={[px, halfH, pz]} castShadow>
          <boxGeometry args={[0.18, h + 0.04, 0.18]} />
          <meshStandardMaterial color="#1a2838" metalness={0.92} roughness={0.12} />
        </mesh>
      ))}

      {/* ── Roof slab (exterior top — light gray standing-seam metal) ── */}
      <mesh position={[0, h + 0.06, 0]} castShadow>
        <boxGeometry args={[w + 0.14, 0.12, d + 0.14]} />
        <meshStandardMaterial color="#9ab0bc" metalness={0.65} roughness={0.45} />
      </mesh>
      {/* Roof seam strips */}
      {Array.from({ length: Math.floor(d / 1.5) }, (_, i) => (
        <mesh
          key={`seam-${i}`}
          position={[0, h + 0.13, -d / 2 + 0.75 + i * 1.5]}
        >
          <boxGeometry args={[w + 0.14, 0.04, 0.06]} />
          <meshStandardMaterial color="#7a9aaa" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}

      {/* ── Ceiling interior (seen from inside when zoomed in) ── */}
      <mesh position={[0, h - 0.01, 0]}>
        <boxGeometry args={[w - 0.14, 0.06, d - 0.14]} />
        <meshStandardMaterial
          color={wall}
          side={THREE.BackSide}
          metalness={0.2}
          roughness={0.8}
        />
      </mesh>

      {/* ── Interior point light (night / dusk only) ── */}
      {glowing && (
        <pointLight
          position={[0, h * 0.75, 0]}
          color="#ffeecc"
          intensity={0.8}
          distance={h * 2.5}
          decay={2}
        />
      )}

      {/* ── LED strip along ceiling perimeter (interior glow) ── */}
      {[
        [0,      h - 0.04, -d / 2 + 0.2, w - 0.4, 0.04, 0.04],
        [0,      h - 0.04,  d / 2 - 0.2, w - 0.4, 0.04, 0.04],
        [-w / 2 + 0.2, h - 0.04, 0, 0.04, 0.04, d - 0.4],
        [ w / 2 - 0.2, h - 0.04, 0, 0.04, 0.04, d - 0.4],
      ].map(([px, py, pz, sw, sh, sd], i) => (
        <mesh key={`led-${i}`} position={[px, py, pz]}>
          <boxGeometry args={[sw, sh, sd]} />
          <meshStandardMaterial
            color="#e8f4ff"
            emissive="#e8f4ff"
            emissiveIntensity={
              room.status === 'error' ? 0.05 :
              glowing ? 0.9 : 0.4
            }
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* ── Air supply diffusers on ceiling (visible from inside) ── */}
      <group position={[0, h - 0.03, 0]}>
        {diffusers.map(({ dx, dz }, i) => (
          <Diffuser key={i} x={dx} z={dz} />
        ))}
      </group>

      {/* ── Temperature floor glow overlay ── */}
      <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w - 0.4, d - 0.4]} />
        <meshBasicMaterial color={fc} transparent opacity={0.07} depthWrite={false} />
      </mesh>

    </group>
  )
}
