import * as THREE from 'three';

// Generate procedural canvas texture from primary & secondary colors
function createProceduralTexture(primaryColor, secondaryColor, patternType = 'striped') {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Fill base color
  ctx.fillStyle = primaryColor || '#4A7A58';
  ctx.fillRect(0, 0, 256, 256);

  // Draw secondary pattern
  ctx.fillStyle = secondaryColor || '#5FE6B4';

  if (patternType === 'dots' || patternType === 'spotted') {
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const r = Math.random() * 12 + 4;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (patternType === 'striped' || patternType === 'stripes') {
    ctx.lineWidth = 10;
    ctx.strokeStyle = secondaryColor || '#5FE6B4';
    for (let i = -256; i < 512; i += 30) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 120, 256);
      ctx.stroke();
    }
  } else {
    // Bioluminescent veins / organic noise
    for (let i = 0; i < 25; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      ctx.beginPath();
      ctx.arc(x, y, Math.random() * 20 + 5, 0, Math.PI * 2);
      ctx.globalAlpha = 0.5;
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export class ProceduralMeshGenerator {
  static createCreatureMesh(speciesData) {
    const group = new THREE.Group();
    const phys = speciesData.physical || {};
    const color = phys.coloration || {};
    const primary = color.primary || '#5FE6B4';
    const secondary = color.secondary || '#4C9C7C';
    const length = Math.max(0.5, Math.min(6.0, phys.size?.length || 1.2));
    const height = Math.max(0.5, Math.min(5.0, phys.size?.height || 1.0));

    const tex = createProceduralTexture(primary, secondary, color.pattern || 'striped');
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.5,
      metalness: 0.2,
      emissive: new THREE.Color(secondary),
      emissiveIntensity: 0.2
    });

    const glowMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(secondary),
      emissive: new THREE.Color(secondary),
      emissiveIntensity: 0.8,
      roughness: 0.2
    });

    const domain = speciesData.taxonomy?.metabolicDomain || 'photovore';
    const kingdom = speciesData.taxonomy?.kingdom || 'fauna';
    const name = speciesData.commonName.toLowerCase();

    // Glider / Driftmoth morphology
    if (name.includes('drift') || name.includes('moth') || name.includes('fin') || name.includes('flyer') || name.includes('flicker')) {
      // Body thorax
      const thoraxGeo = new THREE.ConeGeometry(height * 0.3, length, 8);
      thoraxGeo.rotateX(Math.PI / 2);
      const thorax = new THREE.Mesh(thoraxGeo, mat);
      group.add(thorax);

      // Bioluminescent wings
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 0);
      wingShape.quadraticCurveTo(length * 0.8, height * 1.5, length * 1.5, height * 0.8);
      wingShape.quadraticCurveTo(length * 0.8, -height * 0.5, 0, 0);

      const wingGeo = new THREE.ShapeGeometry(wingShape);
      const wingMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(secondary),
        emissive: new THREE.Color(secondary),
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide
      });

      const wingLeft = new THREE.Mesh(wingGeo, wingMat);
      wingLeft.rotation.x = Math.PI / 6;
      wingLeft.name = 'wingLeft';
      group.add(wingLeft);

      const wingRight = new THREE.Mesh(wingGeo, wingMat);
      wingRight.scale.y = -1;
      wingRight.rotation.x = -Math.PI / 6;
      wingRight.name = 'wingRight';
      group.add(wingRight);

      // Glowing antennae
      const antGeo = new THREE.CylinderGeometry(0.02, 0.04, height * 0.8);
      const antL = new THREE.Mesh(antGeo, glowMat);
      antL.position.set(0.1, height * 0.2, length * 0.4);
      antL.rotation.z = -0.4;
      group.add(antL);

      const antR = new THREE.Mesh(antGeo, glowMat);
      antR.position.set(-0.1, height * 0.2, length * 0.4);
      antR.rotation.z = 0.4;
      group.add(antR);

    } else if (name.includes('burrower') || name.includes('shell') || name.includes('scrapper') || name.includes('geode')) {
      // Dome / Armored Shell morphology
      const shellGeo = new THREE.SphereGeometry(length * 0.5, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.6);
      const shell = new THREE.Mesh(shellGeo, mat);
      shell.position.y = height * 0.4;
      group.add(shell);

      // Base body
      const baseGeo = new THREE.CylinderGeometry(length * 0.45, length * 0.4, height * 0.4, 8);
      const base = new THREE.Mesh(baseGeo, mat);
      base.position.y = height * 0.2;
      group.add(base);

      // Glowing crystal nodes on shell
      for (let i = 0; i < 4; i++) {
        const nodeGeo = new THREE.DodecahedronGeometry(length * 0.12);
        const node = new THREE.Mesh(nodeGeo, glowMat);
        const angle = (i / 4) * Math.PI * 2;
        node.position.set(Math.cos(angle) * length * 0.3, height * 0.5, Math.sin(angle) * length * 0.3);
        group.add(node);
      }

    } else if (name.includes('stalker') || name.includes('hunter') || name.includes('scout') || name.includes('runner')) {
      // Sleek Apex Predator morphology
      const bodyGeo = new THREE.BoxGeometry(length * 0.4, height * 0.4, length);
      const body = new THREE.Mesh(bodyGeo, mat);
      body.position.y = height * 0.5;
      group.add(body);

      // Predatory head
      const headGeo = new THREE.ConeGeometry(height * 0.3, length * 0.5, 6);
      headGeo.rotateX(-Math.PI / 2);
      const head = new THREE.Mesh(headGeo, mat);
      head.position.set(0, height * 0.5, length * 0.6);
      group.add(head);

      // Glowing predatory eyes
      const eyeGeo = new THREE.SphereGeometry(length * 0.06, 8, 8);
      const eyeL = new THREE.Mesh(eyeGeo, glowMat);
      eyeL.position.set(length * 0.12, height * 0.6, length * 0.7);
      const eyeR = new THREE.Mesh(eyeGeo, glowMat);
      eyeR.position.set(-length * 0.12, height * 0.6, length * 0.7);
      group.add(eyeL);
      group.add(eyeR);

      // 4 Leg joint pillars
      for (let i = 0; i < 4; i++) {
        const legGeo = new THREE.CylinderGeometry(0.04, 0.03, height * 0.8);
        const leg = new THREE.Mesh(legGeo, mat);
        const side = (i % 2 === 0) ? 1 : -1;
        const front = (i < 2) ? 1 : -1;
        leg.position.set(side * length * 0.25, height * 0.25, front * length * 0.3);
        leg.rotation.z = side * 0.2;
        group.add(leg);
      }

    } else {
      // General Grazer / Quadruped morphology
      const bodyGeo = new THREE.CapsuleGeometry(height * 0.35, length * 0.6, 8, 12);
      bodyGeo.rotateX(Math.PI / 2);
      const body = new THREE.Mesh(bodyGeo, mat);
      body.position.y = height * 0.5;
      group.add(body);

      // Head
      const headGeo = new THREE.SphereGeometry(height * 0.3, 10, 10);
      const head = new THREE.Mesh(headGeo, mat);
      head.position.set(0, height * 0.65, length * 0.45);
      group.add(head);

      // 4 Legs
      for (let i = 0; i < 4; i++) {
        const legGeo = new THREE.CylinderGeometry(0.06, 0.04, height * 0.6);
        const leg = new THREE.Mesh(legGeo, mat);
        const side = (i % 2 === 0) ? 1 : -1;
        const front = (i < 2) ? 1 : -1;
        leg.position.set(side * height * 0.3, height * 0.3, front * length * 0.3);
        group.add(leg);
      }

      // Bioluminescent spinal plates
      for (let j = 0; j < 3; j++) {
        const plateGeo = new THREE.BoxGeometry(0.05, height * 0.2, length * 0.15);
        const plate = new THREE.Mesh(plateGeo, glowMat);
        plate.position.set(0, height * 0.85, (j - 1) * length * 0.2);
        group.add(plate);
      }
    }

    group.castShadow = true;
    group.receiveShadow = true;
    return group;
  }

  static createFloraMesh(type, scale = 1.0) {
    const group = new THREE.Group();

    if (type === 'sporeStalk') {
      // Towering Kharon Spore Stalk
      const trunkGeo = new THREE.CylinderGeometry(0.4 * scale, 0.8 * scale, 12 * scale, 10);
      const trunkMat = new THREE.MeshStandardMaterial({ color: '#2a442e', roughness: 0.8 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 6 * scale;
      group.add(trunk);

      // Spore Cap
      const capGeo = new THREE.SphereGeometry(3.5 * scale, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const capMat = new THREE.MeshStandardMaterial({
        color: '#4ce0a5',
        emissive: '#33aa77',
        emissiveIntensity: 0.5,
        roughness: 0.3
      });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.y = 12 * scale;
      group.add(cap);

      // Shelf brackets along trunk
      for (let i = 0; i < 3; i++) {
        const bracketGeo = new THREE.CylinderGeometry(1.2 * scale, 0.2 * scale, 0.3 * scale, 8, 1, false, 0, Math.PI);
        const bracketMat = new THREE.MeshStandardMaterial({ color: '#88b577', roughness: 0.6 });
        const bracket = new THREE.Mesh(bracketGeo, bracketMat);
        bracket.position.y = (3 + i * 3) * scale;
        bracket.rotation.y = (i * 1.5);
        group.add(bracket);
      }

    } else if (type === 'crystalNode' || type === 'glowCrystal') {
      // Crystalline Spire (Pallid Reach / Coreth)
      const crystalGeo = new THREE.ConeGeometry(1.5 * scale, 5 * scale, 6);
      const crystalMat = new THREE.MeshStandardMaterial({
        color: '#5fe6d0',
        emissive: '#2cbda8',
        emissiveIntensity: 0.8,
        roughness: 0.1,
        metalness: 0.8,
        transparent: true,
        opacity: 0.9
      });
      const main = new THREE.Mesh(crystalGeo, crystalMat);
      main.position.y = 2.5 * scale;
      group.add(main);

      // Secondary cluster crystals
      for (let i = 0; i < 3; i++) {
        const sub = new THREE.Mesh(crystalGeo, crystalMat);
        sub.scale.set(0.5, 0.6, 0.5);
        const angle = (i / 3) * Math.PI * 2;
        sub.position.set(Math.cos(angle) * 0.8 * scale, 1.2 * scale, Math.sin(angle) * 0.8 * scale);
        sub.rotation.z = Math.cos(angle) * 0.3;
        group.add(sub);
      }

    } else if (type === 'ventBush') {
      // Lava Vent Cone (Ashfields Coreth)
      const ventGeo = new THREE.ConeGeometry(2.0 * scale, 3 * scale, 12, 1, true);
      const ventMat = new THREE.MeshStandardMaterial({ color: '#1a100c', roughness: 0.9 });
      const vent = new THREE.Mesh(ventGeo, ventMat);
      vent.position.y = 1.5 * scale;
      group.add(vent);

      // Glowing lava center
      const lavaGeo = new THREE.CylinderGeometry(0.8 * scale, 0.5 * scale, 0.2 * scale, 10);
      const lavaMat = new THREE.MeshStandardMaterial({
        color: '#ff4500',
        emissive: '#ff2a00',
        emissiveIntensity: 1.0
      });
      const lava = new THREE.Mesh(lavaGeo, lavaMat);
      lava.position.y = 2.4 * scale;
      group.add(lava);

    } else if (type === 'reefCoral') {
      // Ocean Coral Anemone (Vantauri Deep)
      const stemGeo = new THREE.CylinderGeometry(0.2 * scale, 0.4 * scale, 3 * scale, 8);
      const coralMat = new THREE.MeshStandardMaterial({ color: '#106680', emissive: '#1ca5cc', emissiveIntensity: 0.5 });
      for (let i = 0; i < 5; i++) {
        const stem = new THREE.Mesh(stemGeo, coralMat);
        const angle = (i / 5) * Math.PI * 2;
        stem.position.set(Math.cos(angle) * 0.6 * scale, 1.5 * scale, Math.sin(angle) * 0.6 * scale);
        stem.rotation.z = Math.cos(angle) * 0.4;
        group.add(stem);
      }
    } else {
      // Golden Grass / Steppe Bush
      const bushGeo = new THREE.DodecahedronGeometry(1.2 * scale);
      const bushMat = new THREE.MeshStandardMaterial({ color: '#8a9e42', roughness: 0.8 });
      const bush = new THREE.Mesh(bushGeo, bushMat);
      bush.position.y = 1.0 * scale;
      group.add(bush);
    }

    return group;
  }

  static createFirstseedMonolith(ruinType = 'Obelisk') {
    const group = new THREE.Group();

    // Ancient Obsidian Monolith Structure
    const baseGeo = new THREE.BoxGeometry(4, 1.5, 4);
    const monolithGeo = new THREE.ConeGeometry(2.5, 14, 4);
    const mat = new THREE.MeshStandardMaterial({
      color: '#0d131a',
      metalness: 0.9,
      roughness: 0.15
    });

    const base = new THREE.Mesh(baseGeo, mat);
    base.position.y = 0.75;
    group.add(base);

    const pillar = new THREE.Mesh(monolithGeo, mat);
    pillar.position.y = 8;
    pillar.rotation.y = Math.PI / 4;
    group.add(pillar);

    // Glowing Firstseed Glyph Rings
    const ringGeo = new THREE.TorusGeometry(2.0, 0.12, 16, 32);
    const ringMat = new THREE.MeshStandardMaterial({
      color: '#5fe6b4',
      emissive: '#5fe6b4',
      emissiveIntensity: 0.9
    });

    const ring1 = new THREE.Mesh(ringGeo, ringMat);
    ring1.rotation.x = Math.PI / 2;
    ring1.position.y = 4.0;
    ring1.name = 'glyphRing1';
    group.add(ring1);

    const ring2 = new THREE.Mesh(ringGeo, ringMat);
    ring2.rotation.x = Math.PI / 2;
    ring2.scale.set(0.7, 0.7, 0.7);
    ring2.position.y = 9.0;
    ring2.name = 'glyphRing2';
    group.add(ring2);

    // Interactive Terminal Core
    const coreGeo = new THREE.OctahedronGeometry(0.8);
    const coreMat = new THREE.MeshStandardMaterial({
      color: '#ffc857',
      emissive: '#ff9f1c',
      emissiveIntensity: 1.0
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 2.5;
    core.name = 'ruinCore';
    group.add(core);

    return group;
  }
}
