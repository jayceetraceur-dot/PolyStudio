import * as THREE from 'three';
import { Tribesperson, Animal, MapData } from '../types';

// Helper for standard low-poly colors
export const ROLE_COLORS: Record<string, string> = {
  Gatherer: '#e29578',  // Peach/Orange
  Hunter: '#e63946',    // Bold Red
  Farmer: '#4ecdc4',    // Teal
  Builder: '#ffb703',   // Bright Golden Yellow
  Scout: '#a8dadc',     // Sky Cyan
  Healer: '#ff006e',    // Vibrant Magenta
  Artisan: '#ff70a6',   // Vivid Pink
  Oracle: '#9d4edd',    // Cosmic Violet
  Herder: '#a7c957',    // Sage Green
  Cook: '#f28482',      // Coral Rose
  Guard: '#457b9d',     // Steel Blue
};

// --- SYSTEM 1: CHARACTER APPEARANCE GENERATOR ---
export function createVillagerMesh(
  person: Tribesperson, 
  activeColor: string, 
  materialCache: any
): THREE.Group {
  const group = new THREE.Group();
  group.name = `villager_${person.id}`;

  // Materials
  const skinColors = [0xffdbac, 0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524];
  const hCode = person.name.charCodeAt(0) + (person.name.charCodeAt(person.name.length - 1) || 0);
  const skinChoice = skinColors[hCode % skinColors.length];
  
  const skinMat = new THREE.MeshStandardMaterial({ color: skinChoice, roughness: 0.8, flatShading: true });
  const activeColorObj = new THREE.Color(activeColor);
  
  const clothesMat = new THREE.MeshStandardMaterial({ color: activeColorObj, roughness: 0.75, flatShading: true });
  const clothesAccentMat = new THREE.MeshStandardMaterial({ color: activeColorObj.clone().multiplyScalar(0.65), roughness: 0.8, flatShading: true });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
  const boneMat = new THREE.MeshStandardMaterial({ color: 0xeee6d8, roughness: 0.8, flatShading: true });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x474f54, roughness: 0.4, metalness: 0.8, flatShading: true });

  // Life Stage Scaling & Metrics
  let baseScale = 1.0;
  let isInfant = person.ageYears < 2;
  let isChild = person.agePhase === 'Child' || (person.ageYears >= 2 && person.ageYears < 12);
  let isTeenager = person.agePhase === 'Teenager' || (person.ageYears >= 12 && person.ageYears < 18);
  let isElder = person.ageYears >= 60;
  let isFemale = person.gender === 'Female';

  if (isInfant) {
    baseScale = 0.35;
  } else if (isChild) {
    baseScale = 0.65;
  } else if (isTeenager) {
    baseScale = 0.82;
  } else if (isElder) {
    baseScale = 0.95;
  }

  // Root Pivot offset
  const pivot = new THREE.Group();
  pivot.name = 'pivot';
  pivot.scale.set(baseScale, baseScale, baseScale);
  group.add(pivot);

  if (isInfant) {
    // --- INFANT MODEL: Cozy cradled baby or bundle ---
    const cradleGeom = new THREE.BoxGeometry(0.25, 0.15, 0.45);
    const cradleMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.95, flatShading: true });
    const cradle = new THREE.Mesh(cradleGeom, cradleMat);
    cradle.position.y = 0.08;
    cradle.castShadow = true;
    pivot.add(cradle);

    // Blanket bundle
    const blanketGeom = new THREE.CylinderGeometry(0.09, 0.09, 0.38, 5);
    blanketGeom.rotateX(Math.PI / 2);
    const blanketMat = new THREE.MeshStandardMaterial({ color: 0xa8dadc, roughness: 0.8, flatShading: true });
    const bundle = new THREE.Mesh(blanketGeom, blanketMat);
    bundle.position.set(0, 0.12, 0);
    bundle.castShadow = true;
    pivot.add(bundle);

    // Tiny head popping out
    const babyHead = new THREE.Mesh(new THREE.SphereGeometry(0.08, 4, 3), skinMat);
    babyHead.position.set(0, 0.15, 0.12);
    pivot.add(babyHead);
    return group;
  }

  // --- GENERAL BODY STRUCTURE (Child, Teenager, Adult, Elder) ---
  const bodyGroup = new THREE.Group();
  bodyGroup.name = 'skeletal_body';
  pivot.add(bodyGroup);

  let torso: THREE.Mesh;
  const torsoY = isFemale ? 0.26 : 0.29;

  if (isFemale) {
    // Low-poly dress
    const bodyGeom = new THREE.CylinderGeometry(0.08, 0.22, 0.44, 5);
    torso = new THREE.Mesh(bodyGeom, clothesMat);
    torso.name = 'clothes_torso';
    torso.position.y = torsoY;
    torso.castShadow = true;
    torso.receiveShadow = true;
    bodyGroup.add(torso);

    // Dress hemline accent
    const hemGeom = new THREE.CylinderGeometry(0.22, 0.24, 0.08, 5);
    const hemMesh = new THREE.Mesh(hemGeom, clothesAccentMat);
    hemMesh.name = 'clothes_accent';
    hemMesh.position.y = -0.18;
    torso.add(hemMesh);
  } else {
    // Male: Tunic shirt
    const bodyGeom = new THREE.CylinderGeometry(0.12, 0.16, 0.38, 4);
    torso = new THREE.Mesh(bodyGeom, clothesMat);
    torso.name = 'clothes_torso';
    torso.position.y = torsoY;
    torso.castShadow = true;
    torso.receiveShadow = true;
    bodyGroup.add(torso);

    // Pants/legs
    const legMat = new THREE.MeshStandardMaterial({ color: 0x474f54, roughness: 0.85, flatShading: true });
    const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.18, 4), legMat);
    leftLeg.name = 'leg_L';
    leftLeg.position.set(-0.06, -0.19, 0);
    leftLeg.castShadow = true;
    torso.add(leftLeg);

    const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.18, 4), legMat);
    rightLeg.name = 'leg_R';
    rightLeg.position.set(0.06, -0.19, 0);
    rightLeg.castShadow = true;
    torso.add(rightLeg);

    // Shoes
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x221c1a, roughness: 0.9, flatShading: true });
    const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.045, 0.1), shoeMat);
    leftShoe.position.set(0, -0.09, 0.02);
    leftLeg.add(leftShoe);

    const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.045, 0.1), shoeMat);
    rightShoe.position.set(0, -0.09, 0.02);
    rightLeg.add(rightShoe);
  }

  // Slouched Elder Posture
  if (isElder) {
    bodyGroup.position.z = -0.04;
    bodyGroup.rotation.x = 0.15; // slouched posture!
  }

  // --- ARMS & HANDS ---
  // Left arm pivot at shoulder
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.03, 0.25, 4), clothesMat);
  armL.name = 'arm_L';
  armL.position.set(isFemale ? -0.12 : -0.15, 0.12, 0);
  armL.rotation.z = Math.PI / 10;
  armL.castShadow = true;
  torso.add(armL);

  const handL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 3), skinMat);
  handL.name = 'hand_L';
  handL.position.y = -0.14;
  armL.add(handL);

  // Right arm pivot
  const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.03, 0.25, 4), clothesMat);
  armR.name = 'arm_R';
  armR.position.set(isFemale ? 0.12 : 0.15, 0.12, 0);
  armR.rotation.z = -Math.PI / 10;
  armR.castShadow = true;
  torso.add(armR);

  const handR = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 3), skinMat);
  handR.name = 'hand_R';
  handR.position.y = -0.14;
  armR.add(handR);

  // --- HEAD ---
  const headGeom = new THREE.SphereGeometry(0.125, 5, 4);
  const headMesh = new THREE.Mesh(headGeom, skinMat);
  headMesh.name = 'head';
  headMesh.position.y = isFemale ? 0.28 : 0.26;
  headMesh.castShadow = true;
  torso.add(headMesh);

  // Beady eyes
  const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.022, 0.022), eyeMat);
  leftEye.position.set(-0.04, 0.015, 0.095);
  headMesh.add(leftEye);

  const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.022, 0.022), eyeMat);
  rightEye.position.set(0.04, 0.015, 0.095);
  headMesh.add(rightEye);

  // --- HAIR / BEARDS ---
  const hairColors = ['#1d1616', '#2a1a14', '#553c2d', '#725139', '#8a7051', '#e2e2e0']; // Gray/white for elders!
  const hairChoice = isElder ? '#e2e2e0' : hairColors[hCode % (hairColors.length - 1)];
  const hairMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(hairChoice), roughness: 0.9, flatShading: true });

  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.13, 5, 3), hairMat);
  hairCap.name = 'hair_cap';
  hairCap.position.set(0, 0.02, -0.01);
  hairCap.scale.set(1.02, 1.0, 1.05);
  hairCap.castShadow = true;
  headMesh.add(hairCap);

  // Hairstyles by gender & index
  const styleIdx = hCode % 4;
  if (isFemale) {
    if (styleIdx === 0) {
      // Braided side buns
      const bunL = new THREE.Mesh(new THREE.DodecahedronGeometry(0.045, 0), hairMat);
      bunL.position.set(-0.13, -0.01, -0.03);
      headMesh.add(bunL);

      const bunR = new THREE.Mesh(new THREE.DodecahedronGeometry(0.045, 0), hairMat);
      bunR.position.set(0.13, -0.01, -0.03);
      headMesh.add(bunR);
    } else if (styleIdx === 1) {
      // Long braided tail down back
      const braid = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.015, 0.18, 4), hairMat);
      braid.position.set(0, -0.1, -0.11);
      braid.rotation.x = 0.25;
      headMesh.add(braid);
    } else if (styleIdx === 2) {
      // Top knot
      const knot = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.09, 4), hairMat);
      knot.position.set(0, 0.14, -0.02);
      headMesh.add(knot);
    }
  } else {
    // Male
    if (styleIdx === 0) {
      // Spiky front tuft
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.1, 4), hairMat);
      spike.position.set(0, 0.12, 0.04);
      spike.rotation.x = Math.PI / 4;
      headMesh.add(spike);
    } else if (styleIdx === 1) {
      // Shaggy crop
      const crop = new THREE.Mesh(new THREE.SphereGeometry(0.11, 4, 3), hairMat);
      crop.position.set(0, 0.06, 0.06);
      crop.scale.set(1.05, 0.5, 0.9);
      headMesh.add(crop);
    }

    // Beards for older males
    if (!isChild && (isElder || hCode % 3 !== 0)) {
      const beardMat = isElder ? new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.9, flatShading: true }) : hairMat;
      const beardType = hCode % 3;
      if (beardType === 0) {
        // Bushy chin beard
        const beard = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.06), beardMat);
        beard.position.set(0, -0.08, 0.06);
        headMesh.add(beard);
      } else if (beardType === 1) {
        // Goatee / mustache combo
        const mustache = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.025, 0.02), beardMat);
        mustache.position.set(0, -0.04, 0.09);
        const goatee = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 4), beardMat);
        goatee.position.set(0, -0.09, 0.075);
        goatee.rotation.x = -0.3;
        headMesh.add(mustache, goatee);
      }
    }
  }

  // --- FLOATING ROLE INDICATOR ---
  const capGeom = new THREE.OctahedronGeometry(0.05, 0);
  const capMat = new THREE.MeshStandardMaterial({
    color: activeColorObj.clone().multiplyScalar(1.25),
    roughness: 0.1,
    metalness: 0.9,
    flatShading: true,
  });
  const capMesh = new THREE.Mesh(capGeom, capMat);
  capMesh.name = 'indicator_jewel';
  capMesh.position.set(0, 0.3, 0); // Floats above hair crown
  headMesh.add(capMesh);

  // --- EXTRA MULTI-LAYER ACCESSORIES (Woven beads, bone, capes) ---
  const accessoryGroup = new THREE.Group();
  accessoryGroup.name = 'accessories';
  torso.add(accessoryGroup);

  // 1. Cloak/Cape for Scouts & Oracles
  if (person.role === 'Scout' || person.role === 'Oracle') {
    const cloakGeom = new THREE.CylinderGeometry(0.12, 0.28, 0.4, 4, 1, true);
    cloakGeom.rotateY(Math.PI / 4);
    const cloakMat = new THREE.MeshStandardMaterial({ color: person.role === 'Oracle' ? 0x4a0e4e : 0x1d3557, roughness: 0.85, flatShading: true });
    const cloak = new THREE.Mesh(cloakGeom, cloakMat);
    cloak.name = 'cloak';
    cloak.position.set(0, -0.03, -0.02);
    cloak.scale.set(1.15, 1.0, 0.85); // flatten back-to-front
    accessoryGroup.add(cloak);
  }

  // 2. Bone Charm Necklace for Hunter & Healer
  if (person.role === 'Hunter' || person.role === 'Healer') {
    const ringGeom = new THREE.TorusGeometry(0.1, 0.015, 4, 8);
    ringGeom.rotateX(Math.PI / 2);
    const ring = new THREE.Mesh(ringGeom, boneMat);
    ring.position.set(0, 0.15, 0.02);
    ring.rotation.x = 0.25;
    accessoryGroup.add(ring);

    // Bone pendant dangling in front
    const pendant = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.05, 3), boneMat);
    pendant.position.set(0, 0.1, 0.11);
    pendant.rotation.z = Math.PI;
    accessoryGroup.add(pendant);
  }

  // 3. Straw Hat for Farmers
  if (person.role === 'Farmer') {
    const hatGeom = new THREE.ConeGeometry(0.24, 0.075, 5);
    const hatMat = new THREE.MeshStandardMaterial({ color: 0xd8b48f, roughness: 0.95, flatShading: true });
    const hat = new THREE.Mesh(hatGeom, hatMat);
    hat.position.set(0, 0.12, 0);
    hat.castShadow = true;
    headMesh.add(hat);
  }

  // 4. Heavy Shoulder Armor Plates for Guards
  if ((person.role as string) === 'Guard') {
    const plateL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.04, 0.1), boneMat);
    plateL.position.set(-0.16, 0.14, 0);
    plateL.rotation.z = 0.35;
    const plateR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.04, 0.1), boneMat);
    plateR.position.set(0.16, 0.14, 0);
    plateR.rotation.z = -0.35;
    accessoryGroup.add(plateL, plateR);
  }

  // 5. Backpack for Hauler/Gatherer or physical migration on-foot
  if ((person.role as string) === 'Hauler' || person.role === 'Gatherer' || person.hasBackpack === true) {
    const packWidth = ((person.role as string) === 'Hauler' || person.hasBackpack) ? 0.18 : 0.12;
    const packHeight = ((person.role as string) === 'Hauler' || person.hasBackpack) ? 0.30 : 0.20;
    const packDepth = ((person.role as string) === 'Hauler' || person.hasBackpack) ? 0.13 : 0.08;
    const packMat = new THREE.MeshStandardMaterial({ color: 0x4e3629, roughness: 0.95, flatShading: true });
    const backpack = new THREE.Mesh(new THREE.BoxGeometry(packWidth, packHeight, packDepth), packMat);
    backpack.position.set(0, -0.02, -0.15);
    backpack.castShadow = true;
    accessoryGroup.add(backpack);

    // Leather straps
    const strapL = new THREE.Mesh(new THREE.BoxGeometry(0.02, packHeight + 0.08, packDepth + 0.02), packMat);
    strapL.position.set(-packWidth / 2, 0, 0.04);
    strapL.rotation.x = -0.1;
    const strapR = new THREE.Mesh(new THREE.BoxGeometry(0.02, packHeight + 0.08, packDepth + 0.02), packMat);
    strapR.position.set(packWidth / 2, 0, 0.04);
    strapR.rotation.x = -0.1;
    backpack.add(strapL, strapR);
  }

  // Raycasting tags
  torso.userData = { person };
  headMesh.userData = { person };

  return group;
}

// --- SYSTEM 2: VILLAGER EQUIPMENT VISUAL MANAGER & ATTACHMENT SYSTEM ---
export function updateVillagerEquipment(
  mesh: THREE.Group, 
  person: Tribesperson,
  isWorking: boolean
) {
  // Clear any existing tool/cargo mesh attached to arms or back
  const handL = mesh.getObjectByName('hand_L');
  const handR = mesh.getObjectByName('hand_R');
  const torso = mesh.getObjectByName('clothes_torso');

  if (!handL || !handR || !torso) return;

  // Clear children from hands
  while (handL.children.length > 0) handL.remove(handL.children[0]);
  while (handR.children.length > 0) handR.remove(handR.children[0]);
  
  // Clear any sheathed/stowed tool from torso back
  const oldStowed = torso.getObjectByName('stowed_tool');
  if (oldStowed) torso.remove(oldStowed);

  // Materials
  const handleMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.95 }); // Wood shaft
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x708090, roughness: 0.4, metalness: 0.8 }); // Slate metal
  const boneMat = new THREE.MeshStandardMaterial({ color: 0xeee6d8, roughness: 0.8, flatShading: true });

  // --- CARRIAGE RENDER (Lifting Crate/Food) ---
  if (person.carriage) {
    const cType = person.carriage.type;
    // Animate hands holding cargo in front of torso
    const armL = mesh.getObjectByName('arm_L');
    const armR = mesh.getObjectByName('arm_R');
    if (armL && armR) {
      armL.rotation.set(-Math.PI / 4, 0, Math.PI / 6);
      armR.rotation.set(-Math.PI / 4, 0, -Math.PI / 6);
    }

    let cargoMesh: THREE.Mesh;
    if (cType === 'wood') {
      cargoMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.28, 4), handleMat);
      cargoMesh.rotation.z = Math.PI / 2;
    } else if (cType === 'stone') {
      cargoMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.07, 0), metalMat);
    } else if (cType === 'captive_animal') {
      cargoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.13), new THREE.MeshStandardMaterial({ color: 0xc2a688, roughness: 0.9 }));
      const ears = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.07, 0.02), new THREE.MeshStandardMaterial({ color: 0xeeeeee }));
      ears.position.set(0, 0.07, 0.04);
      cargoMesh.add(ears);
    } else if (cType === 'harvested_beast') {
      cargoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.14), new THREE.MeshStandardMaterial({ color: 0x9e2a2b, roughness: 0.85 }));
    } else {
      // Food / Berries Basket
      cargoMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.12, 5), new THREE.MeshStandardMaterial({ color: 0xbda26b, roughness: 0.95 }));
      const foodFilling = new THREE.Mesh(new THREE.SphereGeometry(0.065, 4, 3), new THREE.MeshStandardMaterial({ color: 0xcc2222 }));
      foodFilling.position.y = 0.06;
      cargoMesh.add(foodFilling);
    }

    cargoMesh.name = 'carried_cargo';
    cargoMesh.position.set(0, -0.15, 0.14); // Positioned between hands
    handR.add(cargoMesh);
    return;
  }

  // --- JOBS & TOOLS ATTACHMENT SYSTEM ---
  let toolMesh: THREE.Group | null = null;
  let useLeftHand = false;

  // Determine tool to construct
  let activeToolType = 'none';
  const job = person.activeJobType;
  const status = (person.statusText || '').toLowerCase();

  if (job === 'Hunt') {
    const isRanged = status.includes('bow') || status.includes('aiming');
    activeToolType = isRanged ? 'bow' : 'spear';
  } else if (job === 'Build' || job === 'Repair') {
    activeToolType = 'hammer';
  } else if (job === 'Farm') {
    activeToolType = 'hoe';
  } else if (job === 'Gather' || status.includes('chop') || status.includes('gather') || status.includes('fell')) {
    if (status.includes('tree') || status.includes('wood') || status.includes('chop') || status.includes('fell')) {
      activeToolType = 'axe';
    } else if (status.includes('stone') || status.includes('rock') || status.includes('ore') || status.includes('mine') || status.includes('quarry')) {
      activeToolType = 'pickaxe';
    } else {
      activeToolType = 'knife'; // Small gathering knife
    }
  } else if (person.role === 'Healer' && isWorking) {
    activeToolType = 'potion';
  } else if (person.role === 'Oracle') {
    activeToolType = 'oracle_staff';
  } else if ((person.role as string) === 'Guard') {
    activeToolType = 'spear';
  }

  if (activeToolType !== 'none') {
    toolMesh = new THREE.Group();
    toolMesh.name = 'physical_tool';

    if (activeToolType === 'spear') {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.48, 4), handleMat);
      shaft.position.y = 0.08;
      const point = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.08, 4), metalMat);
      point.position.y = 0.28;
      shaft.add(point);
      toolMesh.add(shaft);
    } else if (activeToolType === 'bow') {
      const bowArc = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.007, 4, 8, Math.PI), handleMat);
      bowArc.rotation.z = Math.PI / 2;
      const string = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.24, 3), new THREE.MeshBasicMaterial({ color: 0xdddddd }));
      string.position.set(-0.06, 0, 0);
      bowArc.add(string);
      toolMesh.add(bowArc);
    } else if (activeToolType === 'hammer') {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.18, 4), handleMat);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.038, 0.038), metalMat);
      head.position.y = 0.08;
      handle.add(head);
      toolMesh.add(handle);
    } else if (activeToolType === 'pickaxe') {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.22, 4), handleMat);
      const arcGeom = new THREE.TorusGeometry(0.07, 0.012, 4, 8, Math.PI);
      const arc = new THREE.Mesh(arcGeom, metalMat);
      arc.position.y = 0.10;
      arc.rotation.z = -Math.PI / 2;
      handle.add(arc);
      toolMesh.add(handle);
    } else if (activeToolType === 'axe') {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.22, 4), handleMat);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.07, 0.012), metalMat);
      blade.position.set(0.025, 0.08, 0);
      handle.add(blade);
      toolMesh.add(handle);
    } else if (activeToolType === 'hoe') {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.24, 4), handleMat);
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.01, 0.032), metalMat);
      plate.position.set(0, 0.10, 0.025);
      handle.add(plate);
      toolMesh.add(handle);
    } else if (activeToolType === 'knife') {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 4), handleMat);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.07, 0.004), metalMat);
      blade.position.y = 0.06;
      handle.add(blade);
      toolMesh.add(handle);
    } else if (activeToolType === 'potion') {
      const flask = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.07, 5), new THREE.MeshStandardMaterial({ color: 0xff006e, roughness: 0.1, transparent: true, opacity: 0.8 }));
      const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.02, 4), handleMat);
      cork.position.y = 0.045;
      flask.add(cork);
      toolMesh.add(flask);
    } else if (activeToolType === 'oracle_staff') {
      const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.44, 4), handleMat);
      staff.position.y = 0.08;
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.03, 0), new THREE.MeshStandardMaterial({ color: 0x01ffe4, roughness: 0.1, metalness: 0.9 }));
      crystal.position.y = 0.24;
      staff.add(crystal);
      toolMesh.add(staff);
    }

    // Attach to socket
    if (isWorking || person.role === 'Oracle' || (person.role as string) === 'Guard') {
      // In hand bone socket
      toolMesh.position.set(0, -0.06, 0.04);
      toolMesh.rotation.set(-Math.PI / 3, 0, 0);
      if (useLeftHand) {
        handL.add(toolMesh);
      } else {
        handR.add(toolMesh);
      }

      // Add Shield for Guard
      if ((person.role as string) === 'Guard') {
        const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.018, 5), boneMat);
        shield.name = 'guard_shield';
        shield.rotation.x = Math.PI / 2;
        shield.position.set(-0.06, -0.04, 0.04);
        handL.add(shield);
      }
    } else {
      // Stow / Sheathe on back or belt when not working
      toolMesh.name = 'stowed_tool';
      toolMesh.position.set(0.08, 0, -0.15); // sheathed on back
      toolMesh.rotation.set(0, 0, Math.PI / 4 + 0.2);
      torso.add(toolMesh);
    }
  }
}

// --- SYSTEM 3: VILLAGER ANIMATION CONTROLLER (STATE MACHINE) ---
export function updateVillagerAnimation(
  mesh: THREE.Group,
  person: Tribesperson,
  elapsed: number,
  timeSpeed: string,
  isMoving: boolean,
  terrainY: number
) {
  const pivot = mesh.getObjectByName('pivot');
  if (!pivot) return;

  const bodyGroup = pivot.getObjectByName('skeletal_body');
  const torso = pivot.getObjectByName('clothes_torso');
  const head = pivot.getObjectByName('head');
  const armL = pivot.getObjectByName('arm_L');
  const armR = pivot.getObjectByName('arm_R');
  const legL = pivot.getObjectByName('leg_L');
  const legR = pivot.getObjectByName('leg_R');

  if (!torso || !head || !armL || !armR) return;

  // Set visual scale dynamically to safeguard correct growth transitions
  let isInfant = person.ageYears < 2;
  let isChild = person.agePhase === 'Child' || (person.ageYears >= 2 && person.ageYears < 12);
  let isTeenager = person.agePhase === 'Teenager' || (person.ageYears >= 12 && person.ageYears < 18);
  let isElder = person.ageYears >= 60;
  let isFemale = person.gender === 'Female';
  
  let baseScale = 1.0;
  if (isInfant) baseScale = 0.35;
  else if (isChild) baseScale = 0.65;
  else if (isTeenager) baseScale = 0.82;
  else if (isElder) baseScale = 0.95;
  
  if (latestSelectedPersonId === person.id) {
    pivot.scale.set(baseScale * 1.25, baseScale * 1.25, baseScale * 1.25);
  } else {
    pivot.scale.set(baseScale, baseScale, baseScale);
  }

  // Animation constants based on clock speed
  let animSpeed = 11.0;
  if (timeSpeed === 'fast') animSpeed = 22.0;
  if (timeSpeed === 'super') animSpeed = 38.0;

  // Reset base positions and rotations
  armL.rotation.set(0, 0, Math.PI / 10);
  armR.rotation.set(0, 0, -Math.PI / 10);
  if (legL) legL.rotation.set(0, 0, 0);
  if (legR) legR.rotation.set(0, 0, 0);
  head.rotation.set(0, 0, 0);
  torso.rotation.set(0, 0, 0);

  // Status checks
  const status = (person.statusText || '').toLowerCase();
  const isSleeping = person.stats.fatigue < 10 || status.includes('resting') || status.includes('💤') || status.includes('sleep');
  const isDrinking = status.includes('drinking') || status.includes('scoop');
  const isEating = status.includes('savoring') || status.includes('eating');
  const isWorking = !!person.activeJobType && !person.carriage;
  const isFleeing = status.includes('scream') || status.includes('fleeing') || status.includes('evacuating');
  const isInjured = person.stats.health < 40;

  // --- STATE-MACHINE RENDERING ---
  if (isSleeping) {
    // LAY DOWN: Sleeping state
    pivot.rotation.set(-Math.PI / 2.3, 0, 0); // lay flat
    pivot.position.set(0, -0.30, 0); // local offset, not terrainY!
    head.rotation.x = -0.15;
    
    // Slow breathing cycle
    const breathe = Math.sin(elapsed * 1.5) * 0.015;
    pivot.scale.y = baseScale * (1 + breathe);
    return;
  }

  // General vertical baseline and reset pivot transformations
  pivot.position.set(0, 0, 0);
  pivot.rotation.set(0, 0, 0);
  mesh.rotation.x = 0;
  mesh.rotation.z = 0;

  if (isMoving) {
    // --- 1. MOVEMENT STATES (WALK, RUN, INJURED WALK) ---
    let walkMultiplier = isFleeing ? 1.8 : (isInjured ? 0.5 : 1.0);
    const wave = Math.sin(elapsed * animSpeed * walkMultiplier);

    // Leg swinging
    if (legL && legR) {
      legL.rotation.x = wave * 0.55;
      legR.rotation.x = -wave * 0.55;
    }

    // Arm swinging
    armL.rotation.x = -wave * 0.45;
    armR.rotation.x = wave * 0.45;

    // Running lean / Fleeing bob
    if (isFleeing) {
      mesh.rotation.x = 0.16; // heavy forward lean
      head.rotation.x = 0.08;
      // High-frequency fear hands
      armL.rotation.z = Math.PI / 4 + Math.sin(elapsed * 45) * 0.1;
      armR.rotation.z = -Math.PI / 4 - Math.sin(elapsed * 45) * 0.1;
    } else if (isInjured) {
      mesh.rotation.z = 0.08 * Math.sin(elapsed * animSpeed * 0.5); // Limp swaying
      armL.rotation.x = 0.1;
      armR.rotation.y = 0.15;
    } else {
      mesh.rotation.x = 0.06; // slight forward lean
    }

    // Walking bob height: apply bob as a relative pivot position offset
    const bob = Math.abs(Math.sin(elapsed * animSpeed * walkMultiplier)) * 0.065;
    pivot.position.y = bob;

  } else {
    // --- 2. IDLE & STATIONARY UTILITY ANIMATIONS ---
    pivot.position.set(0, 0, 0);

    // Social Fireplace or Sitting behaviors (active at night, or contains fireplace)
    const isSocializing = status.includes('fireplace') || status.includes('social') || status.includes('listen') || (person.carriage === null && person.activeJobType === null && (elapsed % 10.0 > 7.0));
    
    if (isSocializing) {
      // SIT ON GROUND Around campfire
      pivot.position.set(0, -0.35, 0); // local sitting offset
      torso.position.y = (isFemale ? 0.26 : 0.29) - 0.08;
      if (legL && legR) {
        legL.rotation.set(-Math.PI / 4, 0.2, 0);
        legR.rotation.set(-Math.PI / 4, -0.2, 0);
      }
      armL.rotation.set(-0.2, 0, Math.PI / 6);
      armR.rotation.set(-0.2, 0, -Math.PI / 6);

      // Conversational head nods & turns
      head.rotation.y = Math.sin(elapsed * 1.5) * 0.18;
      head.rotation.x = 0.05 + Math.sin(elapsed * 3) * 0.03;
      return;
    }

    // Reset sitting torso offset
    torso.position.y = isFemale ? 0.26 : 0.29;

    // Idle breathing sway: apply as a relative pivot position offset
    const breathing = Math.sin(elapsed * 2.2) * 0.012;
    pivot.position.y = breathing;
    torso.rotation.z = Math.sin(elapsed * 1.2) * 0.015;

    if (isWorking) {
      // --- 3. STATIONARY WORK LOOP ANIMATIONS ---
      const swingSpeed = animSpeed * 1.1;
      const swing = Math.sin(elapsed * swingSpeed);

      if (status.includes('hammer') || status.includes('build') || status.includes('repair')) {
        // Build: Hammering arm strike
        armR.rotation.set(-Math.PI / 3 + swing * 0.5, 0, -Math.PI / 8);
        armL.rotation.set(-Math.PI / 6, 0, Math.PI / 8);
      } else if (status.includes('chop') || status.includes('fell') || status.includes('split') || status.includes('quarry')) {
        // Chop/Mine: Two handed striking swing
        armR.rotation.set(-Math.PI / 2.5 + swing * 0.65, 0, -Math.PI / 12);
        armL.rotation.set(-Math.PI / 2.5 + swing * 0.65, 0, Math.PI / 12);
        mesh.rotation.x = 0.12 + swing * 0.06;
      } else if (status.includes('sow') || status.includes('water') || status.includes('harvest')) {
        // Farming: Rhythmic tilling bending
        mesh.rotation.x = 0.22 + Math.sin(elapsed * 4.5) * 0.08;
        armR.rotation.set(-Math.PI / 4, 0, -Math.PI / 12);
        armL.rotation.set(-Math.PI / 4, 0, Math.PI / 12);
      } else if (status.includes('meditation') || status.includes('harmony')) {
        // Oracle meditating: Float magically on point
        pivot.position.y = 0.25 + Math.sin(elapsed * 1.5) * 0.05; // local float offset
        armL.rotation.set(0.1, 0, Math.PI / 4);
        armR.rotation.set(0.1, 0, -Math.PI / 4);
        head.rotation.x = -0.05;
      } else if (status.includes('aiming') || status.includes('thrusting')) {
        // Combat/Hunt: Weapon aiming stance
        armR.rotation.set(-Math.PI / 2, -Math.PI / 8, 0);
        armL.rotation.set(-Math.PI / 2.4, Math.PI / 6, 0);
        pivot.rotation.y = Math.sin(elapsed * 5.0) * 0.02; // aiming tremors on local pivot
      }
    } else if (isDrinking || isEating) {
      // Drink/Eat: hand to mouth movement
      const handToMouth = -Math.PI / 2.3 + Math.sin(elapsed * 8.0) * 0.15;
      armR.rotation.set(handToMouth, 0, -Math.PI / 8);
      head.rotation.x = 0.08 + Math.sin(elapsed * 4.0) * 0.04;
    }
  }
}

// Visual track tracker
let latestSelectedPersonId: string | null = null;
export function setLatestSelectedPerson(id: string | null) {
  latestSelectedPersonId = id;
}


// --- SYSTEM 4: ANIMAL APPEARANCE GENERATOR ---
export function createAnimalMesh(animal: Animal, THREE: any): THREE.Group {
  const group = new THREE.Group();
  group.name = `animal_${animal.id}`;

  // Materials & Colors matching requirements
  let bodyColor = 0x8b5a2b; // Warm brown base
  if (['Rabbit', 'JackLeaper', 'GlowGrub', 'CinderCentipede', 'PricklyBeetle'].includes(animal.type)) {
    bodyColor = 0xcd9a62; // Sand golden-brown
  } else if (['Deer', 'Elk', 'Antelope', 'PrismHornAntelope'].includes(animal.type)) {
    bodyColor = 0xbda26b; // Duneskimmer golden-tan
  } else if (['Sheep', 'TuskedShagBeast', 'WildGoat'].includes(animal.type)) {
    bodyColor = 0xe5d09e; // Sandy-wool sheep hybrid
  } else if (['PackBird', 'Cattle', 'SiltCamel'].includes(animal.type)) {
    bodyColor = 0xbc7c43; // Camel warm ocher
  } else if (['AncientDomeBack', 'FrilledShieldHorn', 'Boar'].includes(animal.type)) {
    bodyColor = 0x8b857c; // Fossil grey-slate
  } else if (['Fox', 'ProwlerJackal'].includes(animal.type)) {
    bodyColor = 0xae4e2c; // Terracotta jackal orange
  } else if (['Wolf', 'DireWolf', 'LargeCat', 'SpinedSaberWolf', 'ChitinSlasher'].includes(animal.type)) {
    bodyColor = 0x3b4252; // Windrak charcoal dark
  } else if (['VelociSkitterer', 'ScytheBeakStrider'].includes(animal.type)) {
    bodyColor = 0x708090; // Steel blue-slate
  } else if (['Bear'].includes(animal.type)) {
    bodyColor = 0x7a5030; // Warm bear deep ocher
  } else if (['Vulture', 'StormVulture', 'GaleWingFlier', 'Crow'].includes(animal.type)) {
    bodyColor = 0x2b2b2b; // Dark raven charcoal
  } else if (['PlateBackShellgrazer', 'SiltBadger', 'CarapaceScarab'].includes(animal.type)) {
    bodyColor = 0x8b5a2b; // Deep earth-brown
  }

  const animalMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.85, flatShading: true });
  const cyanGlowMat = new THREE.MeshBasicMaterial({ color: 0x01ffe4 });
  const redGlowMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });
  const plateMat = new THREE.MeshStandardMaterial({ color: 0xae4e2c, roughness: 0.8, flatShading: true }); // Terracotta orange plates
  const darkPlateMat = new THREE.MeshStandardMaterial({ color: 0x4c566a, roughness: 0.9, flatShading: true }); // Dark slate/iron plates

  let torso: THREE.Mesh;
  let head: THREE.Mesh;

  // Render based on Animal Category
  if ((animal.category as string) === 'SmallPrey') {
    // --- SANDSNOUT & DUST HOPPERS ---
    const w = 0.08, h = 0.06, l = 0.15;
    torso = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), animalMat);
    torso.position.y = h / 2 + 0.03;
    torso.castShadow = true;
    group.add(torso);

    // Shell plate
    const shell = new THREE.Mesh(new THREE.BoxGeometry(w * 1.1, h * 0.4, l * 0.7), darkPlateMat);
    shell.position.set(0, h * 0.4, -l * 0.1);
    torso.add(shell);

    // Head
    head = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, h * 0.85, l * 0.45), animalMat);
    head.name = 'head';
    head.position.set(0, h * 0.2, l * 0.45);
    torso.add(head);

    // Long ears/fins for Dust Hoppers
    if (animal.type === 'JackLeaper' || animal.type === 'Rabbit') {
      const earL = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.012, 0.09), plateMat);
      earL.position.set(-w * 0.35, h * 0.4, -0.02);
      earL.rotation.set(-0.3, 0.1, -0.1);
      const earR = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.012, 0.09), plateMat);
      earR.position.set(w * 0.35, h * 0.4, -0.02);
      earR.rotation.set(-0.3, -0.1, 0.1);
      head.add(earL, earR);
    }

    // Tiny glowing eyes
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.007, 3, 3), cyanGlowMat);
    eyeL.position.set(-w * 0.38, 0.01, l * 0.12);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.007, 3, 3), cyanGlowMat);
    eyeR.position.set(w * 0.38, 0.01, l * 0.12);
    head.add(eyeL, eyeR);

    // Limbs
    const legH = 0.045;
    const lf = new THREE.Mesh(new THREE.BoxGeometry(0.016, legH, 0.025), animalMat);
    lf.name = 'lf'; lf.position.set(-w * 0.45, -h * 0.5 - legH * 0.5, l * 0.25);
    const rf = new THREE.Mesh(new THREE.BoxGeometry(0.016, legH, 0.025), animalMat);
    rf.name = 'rf'; rf.position.set(w * 0.45, -h * 0.5 - legH * 0.5, l * 0.25);
    const lb = new THREE.Mesh(new THREE.BoxGeometry(0.016, legH, 0.025), animalMat);
    lb.name = 'lb'; lb.position.set(-w * 0.45, -h * 0.5 - legH * 0.5, -l * 0.25);
    const rb = new THREE.Mesh(new THREE.BoxGeometry(0.016, legH, 0.025), animalMat);
    rb.name = 'rb'; rb.position.set(w * 0.45, -h * 0.5 - legH * 0.5, -l * 0.25);
    torso.add(lf, rf, lb, rb);

    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.004, 0.06, 4), plateMat);
    tail.name = 'tail';
    tail.position.set(0, -0.01, -l * 0.52);
    tail.rotation.x = -Math.PI / 4;
    torso.add(tail);

  } else if (['Deer', 'Elk', 'Antelope', 'PrismHornAntelope', 'TuskedShagBeast', 'Sheep', 'WildGoat'].includes(animal.type)) {
    // --- MEDIUM HERBIVORES (Duneskimmer / Antelope) ---
    const w = 0.14, h = 0.17, l = 0.33;
    torso = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), animalMat);
    torso.position.y = h / 2 + 0.10;
    torso.castShadow = true;
    group.add(torso);

    // Stegosaurid Back Plates
    for (let i = 0; i < 4; i++) {
      const plate = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.13, 3), plateMat);
      plate.position.set(0, h * 0.52 + 0.03, -l * 0.3 + i * 0.18);
      plate.rotation.y = Math.PI / 6;
      plate.rotation.x = -0.15;
      plate.castShadow = true;
      torso.add(plate);
    }

    // High neck & head
    const neck = new THREE.Mesh(new THREE.BoxGeometry(w * 0.45, h * 0.75, w * 0.45), animalMat);
    neck.position.set(0, h * 0.45, l * 0.42);
    neck.rotation.x = -Math.PI / 5;
    torso.add(neck);

    head = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, h * 0.4, l * 0.32), animalMat);
    head.name = 'head';
    head.position.set(0, h * 0.35, l * 0.18);
    neck.add(head);

    // Glowing Crystal Horns
    if (animal.type === 'PrismHornAntelope' || animal.type === 'Deer' || animal.type === 'Elk') {
      const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.16, 4), cyanGlowMat);
      hornL.position.set(-w * 0.22, h * 0.32, l * 0.05);
      hornL.rotation.set(0.35, 0, -0.15);
      const hornR = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.16, 4), cyanGlowMat);
      hornR.position.set(w * 0.22, h * 0.32, l * 0.05);
      hornR.rotation.set(0.35, 0, 0.15);
      head.add(hornL, hornR);
    }

    // Eyes
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.01, 3, 3), cyanGlowMat);
    eyeL.position.set(-w * 0.34, 0.01, l * 0.1);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.01, 3, 3), cyanGlowMat);
    eyeR.position.set(w * 0.34, 0.01, l * 0.1);
    head.add(eyeL, eyeR);

    // Legs
    const legH = 0.14;
    const lf = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.012, legH, 4), animalMat);
    lf.name = 'lf'; lf.position.set(-w * 0.38, -h * 0.5 - legH * 0.5, l * 0.3);
    const rf = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.012, legH, 4), animalMat);
    rf.name = 'rf'; rf.position.set(w * 0.38, -h * 0.5 - legH * 0.5, l * 0.3);
    const lb = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.012, legH, 4), animalMat);
    lb.name = 'lb'; lb.position.set(-w * 0.38, -h * 0.5 - legH * 0.5, -l * 0.3);
    const rb = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.012, legH, 4), animalMat);
    rb.name = 'rb'; rb.position.set(w * 0.38, -h * 0.5 - legH * 0.5, -l * 0.3);
    torso.add(lf, rf, lb, rb);

    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.005, 0.14, 4), plateMat);
    tail.name = 'tail';
    tail.position.set(0, -0.01, -l * 0.52);
    tail.rotation.x = -Math.PI / 3;
    torso.add(tail);

  } else if (animal.type === 'PackBird') {
    // --- LARGE PACK BIRD (Ostrich / Dustialon) ---
    const w = 0.16, h = 0.18, l = 0.34;
    torso = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), animalMat);
    torso.position.y = h / 2 + 0.18;
    torso.castShadow = true;
    group.add(torso);

    // Feather shell wings
    const leftWing = new THREE.Mesh(new THREE.BoxGeometry(0.018, h * 1.1, l * 1.1), darkPlateMat);
    leftWing.name = 'left_wing';
    leftWing.position.set(-w * 0.52, 0.04, 0);
    leftWing.rotation.z = -0.15;
    const rightWing = new THREE.Mesh(new THREE.BoxGeometry(0.018, h * 1.1, l * 1.1), darkPlateMat);
    rightWing.name = 'right_wing';
    rightWing.position.set(w * 0.52, 0.04, 0);
    rightWing.rotation.z = 0.15;
    torso.add(leftWing, rightWing);

    // Long bird neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.32, 4), animalMat);
    neck.position.set(0, h * 0.5 + 0.14, l * 0.35);
    neck.rotation.x = -0.22;
    torso.add(neck);

    head = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.13), animalMat);
    head.name = 'head';
    head.position.y = 0.18;
    neck.add(head);

    // Beak
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xd05a30, roughness: 0.6, flatShading: true });
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 4), beakMat);
    beak.position.set(0, -0.01, 0.11);
    beak.rotation.x = Math.PI / 2;
    head.add(beak);

    // Expressive Head Crest
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.08, 0.08), plateMat);
    crest.position.set(0, 0.07, -0.04);
    crest.rotation.x = -0.4;
    head.add(crest);

    // Legs
    const legH = 0.22;
    const lf = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.01, legH, 4), animalMat);
    lf.name = 'lf'; lf.position.set(-w * 0.35, -h * 0.5 - legH * 0.5, 0.02);
    const rf = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.01, legH, 4), animalMat);
    rf.name = 'rf'; rf.position.set(w * 0.35, -h * 0.5 - legH * 0.5, 0.02);
    torso.add(lf, rf);

    // Harness saddle for packs
    const strapMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
    const strap = new THREE.Mesh(new THREE.BoxGeometry(w * 1.1, h * 1.1, 0.04), strapMat);
    strap.name = 'strap';
    strap.position.set(0, 0, 0);
    strap.visible = false;
    torso.add(strap);

    const pack = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, h * 0.6, l * 0.45), darkPlateMat);
    pack.name = 'pack';
    pack.position.set(0, h * 0.6, -l * 0.05);
    pack.visible = false;
    torso.add(pack);

  } else if (['AncientDomeBack', 'FrilledShieldHorn', 'Bear', 'Boar', 'Cattle', 'SiltCamel'].includes(animal.type)) {
    // --- LARGE BEASTS (Colossi & Apex Herbivores) ---
    const w = 0.28, h = 0.24, l = 0.45;
    torso = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), animalMat);
    torso.position.y = h / 2 + 0.14;
    torso.castShadow = true;
    group.add(torso);

    if (animal.type === 'AncientDomeBack') {
      // Giant dome shell
      const domeShell = new THREE.Mesh(new THREE.SphereGeometry(w * 0.72, 6, 6), darkPlateMat);
      domeShell.scale.set(1.0, 0.75, 1.25);
      domeShell.position.set(0, h * 0.4, -l * 0.05);
      domeShell.castShadow = true;
      torso.add(domeShell);
    } else {
      // Shaggy/Spikey Back ridge
      for (let i = 0; i < 3; i++) {
        const spine = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 4), plateMat);
        spine.position.set(0, h * 0.52, -l * 0.25 + i * 0.22);
        spine.rotation.x = -0.25;
        torso.add(spine);
      }
    }

    // Heavy Head
    head = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, h * 0.8, l * 0.36), animalMat);
    head.name = 'head';
    head.position.set(0, h * 0.42, l * 0.45);
    torso.add(head);

    const jaw = new THREE.Mesh(new THREE.BoxGeometry(w * 0.75, h * 0.32, l * 0.24), animalMat);
    jaw.position.set(0, -h * 0.35, l * 0.08);
    jaw.rotation.x = 0.2;
    head.add(jaw);

    // Glowing eyes
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.015, 3, 3), cyanGlowMat);
    eyeL.position.set(-w * 0.42, 0.08, l * 0.14);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.015, 3, 3), cyanGlowMat);
    eyeR.position.set(w * 0.42, 0.08, l * 0.14);
    head.add(eyeL, eyeR);

    // Triceratops frill & horns for FrilledShieldHorn
    if (animal.type === 'FrilledShieldHorn') {
      const frill = new THREE.Mesh(new THREE.BoxGeometry(w * 1.5, h * 1.2, 0.04), plateMat);
      frill.position.set(0, h * 0.35, -l * 0.08);
      frill.rotation.x = -0.32;
      head.add(frill);

      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.15, 4), plateMat);
      horn.position.set(0, 0.14, l * 0.16);
      horn.rotation.x = 0.35;
      head.add(horn);
    }

    // Elephantine heavy legs
    const legH = 0.13;
    const lf = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.022, legH, 4), animalMat);
    lf.name = 'lf'; lf.position.set(-w * 0.36, -h * 0.5 - legH * 0.5, l * 0.28);
    const rf = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.022, legH, 4), animalMat);
    rf.name = 'rf'; rf.position.set(w * 0.36, -h * 0.5 - legH * 0.5, l * 0.28);
    const lb = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.022, legH, 4), animalMat);
    lb.name = 'lb'; lb.position.set(-w * 0.36, -h * 0.5 - legH * 0.5, -l * 0.28);
    const rb = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.022, legH, 4), animalMat);
    rb.name = 'rb'; rb.position.set(w * 0.36, -h * 0.5 - legH * 0.5, -l * 0.28);
    torso.add(lf, rf, lb, rb);

    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.01, 0.2, 4), plateMat);
    tail.name = 'tail';
    tail.position.set(0, -0.01, -l * 0.52);
    tail.rotation.x = -Math.PI / 3.5;
    torso.add(tail);

  } else if (animal.category === 'SmallPredator') {
    // --- SMALL PREDATORS (Jackal / Scythe Skitterer) ---
    const w = 0.12, h = 0.12, l = 0.30;
    torso = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), animalMat);
    torso.position.y = h / 2 + 0.08;
    torso.castShadow = true;
    group.add(torso);

    // Razor thin back spikes
    for (let i = 0; i < 3; i++) {
      const spine = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.08, 4), plateMat);
      spine.position.set(0, h * 0.52, -l * 0.18 + i * 0.15);
      spine.rotation.x = -0.35;
      torso.add(spine);
    }

    head = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, h * 0.8, l * 0.32), animalMat);
    head.name = 'head';
    head.position.set(0, h * 0.45, l * 0.42);
    torso.add(head);

    // Glowing red predator eyes!
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.008, 3, 3), redGlowMat);
    eyeL.position.set(-w * 0.36, 0.04, l * 0.12);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.008, 3, 3), redGlowMat);
    eyeR.position.set(w * 0.36, 0.04, l * 0.12);
    head.add(eyeL, eyeR);

    // Athletic running legs
    const legH = 0.10;
    const lf = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.010, legH, 4), animalMat);
    lf.name = 'lf'; lf.position.set(-w * 0.38, -h * 0.5 - legH * 0.5, l * 0.28);
    const rf = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.010, legH, 4), animalMat);
    rf.name = 'rf'; rf.position.set(w * 0.38, -h * 0.5 - legH * 0.5, l * 0.28);
    const lb = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.010, legH, 4), animalMat);
    lb.name = 'lb'; lb.position.set(-w * 0.38, -h * 0.5 - legH * 0.5, -l * 0.28);
    const rb = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.010, legH, 4), animalMat);
    rb.name = 'rb'; rb.position.set(w * 0.38, -h * 0.5 - legH * 0.5, -l * 0.28);
    torso.add(lf, rf, lb, rb);

    // Tail
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.005, 0.16, 4), plateMat);
    tail.name = 'tail';
    tail.position.set(0, -0.01, -l * 0.52);
    tail.rotation.x = -Math.PI / 3;
    torso.add(tail);

  } else if (animal.category === 'ApexPredator') {
    // --- APEX PREDATORS (Wolf / DireWolf / LargeCat / ChitinSlasher) ---
    const w = 0.18, h = 0.18, l = 0.38;
    torso = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), animalMat);
    torso.position.y = h / 2 + 0.12;
    torso.castShadow = true;
    group.add(torso);

    // Segmented back plates
    for (let i = 0; i < 4; i++) {
      const spine = new THREE.Mesh(new THREE.BoxGeometry(w * 1.05, 0.03, l * 0.2), darkPlateMat);
      spine.position.set(0, h * 0.5, -l * 0.3 + i * 0.2);
      torso.add(spine);
    }

    head = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, h * 0.8, l * 0.32), animalMat);
    head.name = 'head';
    head.position.set(0, h * 0.45, l * 0.44);
    torso.add(head);

    // Glowing menacing RED organs/eyes
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.012, 3, 3), redGlowMat);
    eyeL.position.set(-w * 0.36, 0.05, l * 0.12);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.012, 3, 3), redGlowMat);
    eyeR.position.set(w * 0.36, 0.05, l * 0.12);
    head.add(eyeL, eyeR);

    // Heavy Saber teeth cones protruding down
    const toothL = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.08, 4), plateMat);
    toothL.position.set(-w * 0.28, -h * 0.28, l * 0.24);
    toothL.rotation.x = Math.PI / 4;
    const toothR = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.08, 4), plateMat);
    toothR.position.set(w * 0.28, -h * 0.28, l * 0.24);
    toothR.rotation.x = Math.PI / 4;
    head.add(toothL, toothR);

    // Claws & heavy athletic legs
    const legH = 0.14;
    const lf = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.016, legH, 4), animalMat);
    lf.name = 'lf'; lf.position.set(-w * 0.4, -h * 0.5 - legH * 0.5, l * 0.26);
    const rf = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.016, legH, 4), animalMat);
    rf.name = 'rf'; rf.position.set(w * 0.4, -h * 0.5 - legH * 0.5, l * 0.26);
    const lb = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.016, legH, 4), animalMat);
    lb.name = 'lb'; lb.position.set(-w * 0.4, -h * 0.5 - legH * 0.5, -l * 0.26);
    const rb = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.016, legH, 4), animalMat);
    rb.name = 'rb'; rb.position.set(w * 0.4, -h * 0.5 - legH * 0.5, -l * 0.26);
    torso.add(lf, rf, lb, rb);

    // Scorpion-like stinger tail for ChitinSlasher
    if (animal.type === 'ChitinSlasher') {
      const stinger = new THREE.Group();
      stinger.name = 'tail';
      stinger.position.set(0, h * 0.2, -l * 0.5);
      for (let i = 0; i < 4; i++) {
        const seg = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.024, 0.07), darkPlateMat);
        seg.position.set(0, i * 0.05, -i * 0.02);
        seg.rotation.x = -i * 0.35;
        stinger.add(seg);
      }
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.02, 4, 4), redGlowMat);
      bulb.position.set(0, 0.18, -0.08);
      stinger.add(bulb);
      torso.add(stinger);
    } else {
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.006, 0.2, 4), plateMat);
      tail.name = 'tail';
      tail.position.set(0, -0.01, -l * 0.52);
      tail.rotation.x = -Math.PI / 3;
      torso.add(tail);
    }

  } else {
    // --- DEFAULT SCAVENGER (Vulture / Crow / Flier) ---
    const w = 0.11, h = 0.11, l = 0.24;
    torso = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), animalMat);
    torso.position.y = h / 2 + 0.14;
    torso.castShadow = true;
    group.add(torso);

    // Segmented bone-wings
    const leftWing = new THREE.Mesh(new THREE.BoxGeometry(0.015, h * 1.15, l * 1.15), darkPlateMat);
    leftWing.name = 'left_wing';
    leftWing.position.set(-w * 0.52, 0, 0);
    const rightWing = new THREE.Mesh(new THREE.BoxGeometry(0.015, h * 1.15, l * 1.15), darkPlateMat);
    rightWing.name = 'right_wing';
    rightWing.position.set(w * 0.52, 0, 0);
    torso.add(leftWing, rightWing);

    // Hunched long neck
    const neck = new THREE.Mesh(new THREE.BoxGeometry(w * 0.4, h * 0.6, w * 0.4), plateMat);
    neck.position.set(0, h * 0.3, l * 0.4);
    neck.rotation.x = -0.55; // hunched posture!
    torso.add(neck);

    head = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.1), plateMat);
    head.name = 'head';
    head.position.y = 0.12;
    neck.add(head);

    // Hooked bone beak
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.09, 4), new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.6 }));
    beak.position.set(0, -0.02, 0.08);
    beak.rotation.x = Math.PI / 2 + 0.15;
    head.add(beak);

    const legH = 0.08;
    const lf = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, legH, 4), animalMat);
    lf.name = 'lf'; lf.position.set(-w * 0.3, -h * 0.5 - legH * 0.5, 0.02);
    const rf = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, legH, 4), animalMat);
    rf.name = 'rf'; rf.position.set(w * 0.3, -h * 0.5 - legH * 0.5, 0.02);
    torso.add(lf, rf);
  }

  // Floating selection status indicator jewel
  const targetJewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 0), new THREE.MeshStandardMaterial({ color: 0xff3333, roughness: 0.2, metalness: 0.8 }));
  targetJewel.name = 'statusIndicator';
  targetJewel.position.set(0, 0.48, 0);
  targetJewel.visible = false;
  group.add(targetJewel);

  // Raycasting tags
  torso.userData = { animal };
  head.userData = { animal };

  return group;
}

// --- SYSTEM 5: ANIMAL ANIMATION CONTROLLER ---
export function updateAnimalAnimation(
  mesh: THREE.Group,
  animal: Animal,
  elapsed: number,
  timeSpeed: string,
  isMoving: boolean,
  terrainY: number
) {
  // Cooldown scale sizes based on age phase
  const isDead = animal.isDead;
  const decayProgress = isDead ? Math.max(0, Math.min(1.0, (animal.decayTimer ?? 0) / 2.5)) : 0;
  
  let scaleSize = animal.agePhase === 'Baby' ? 0.55 : (animal.HP < animal.maxHP * 0.5 ? 0.9 : 1.0);
  let categoryMult = 1.0;
  if (animal.category === 'SmallPredator') categoryMult = 1.4;
  else if (animal.category === 'ApexPredator') categoryMult = 1.95;
  scaleSize *= categoryMult * (1.0 - decayProgress);
  
  mesh.scale.set(scaleSize, scaleSize, scaleSize);

  const torso = mesh.children[0] as THREE.Mesh;
  if (!torso) return;

  const head = torso.getObjectByName('head');
  const lf = torso.getObjectByName('lf');
  const rf = torso.getObjectByName('rf');
  const lb = torso.getObjectByName('lb');
  const rb = torso.getObjectByName('rb');
  const tail = torso.getObjectByName('tail');
  const leftWing = torso.getObjectByName('left_wing');
  const rightWing = torso.getObjectByName('right_wing');

  let animSpeed = 16.0;
  if (timeSpeed === 'fast') animSpeed = 30.0;
  if (timeSpeed === 'super') animSpeed = 50.0;

  if (isDead) {
    // FALL OVER FLAT ON DEATH
    mesh.rotation.z = Math.PI / 2.1;
    mesh.rotation.x = 0.1;
    mesh.position.y = terrainY - 0.22 * decayProgress;

    // Rigid limbs
    if (lf) lf.rotation.x = 0.35;
    if (rf) rf.rotation.x = -0.35;
    if (lb) lb.rotation.x = -0.35;
    if (rb) rb.rotation.x = 0.35;
    return;
  }

  // Reset base rotational values
  mesh.rotation.z = 0;
  mesh.rotation.x = 0;
  if (lf) lf.rotation.set(0, 0, 0);
  if (rf) rf.rotation.set(0, 0, 0);
  if (lb) lb.rotation.set(0, 0, 0);
  if (rb) rb.rotation.set(0, 0, 0);
  if (head) head.rotation.set(0, 0, 0);
  if (tail) tail.rotation.set(0, 0, 0);

  if (animal.isSleeping) {
    // Sleeping flat pose
    mesh.rotation.z = Math.PI / 2.6;
    mesh.position.y = terrainY - 0.05;
    if (head) head.rotation.x = -0.15 + Math.sin(elapsed * 1.5) * 0.04;
    return;
  }

  if (isMoving) {
    // --- 1. RUNNING/WALKING ANIMATIONS ---
    const runLean = Math.sin(elapsed * animSpeed) * 0.08;
    mesh.rotation.x = runLean; // galloping body bob

    const swing = Math.sin(elapsed * animSpeed) * 0.52;
    if (lf) lf.rotation.x = swing;
    if (rf) rf.rotation.x = -swing;
    if (lb) lb.rotation.x = -swing;
    if (rb) rb.rotation.x = swing;

    if (head) head.rotation.x = Math.sin(elapsed * animSpeed * 1.4) * 0.15;
    if (tail) tail.rotation.y = Math.sin(elapsed * animSpeed * 0.8) * 0.35;
    
    // Wing flaps for scavengers and pack birds
    if (leftWing) leftWing.rotation.z = -0.2 + Math.sin(elapsed * animSpeed * 1.3) * 0.5;
    if (rightWing) rightWing.rotation.z = 0.2 - Math.sin(elapsed * animSpeed * 1.3) * 0.5;

    // Gallop height bobbing
    const runBob = Math.abs(Math.sin(elapsed * animSpeed)) * 0.06;
    mesh.position.y = terrainY + runBob;

  } else {
    // --- 2. IDLE & INTERACTIVE STATES (GRAZING, ALERT, TAMING) ---
    const isAlert = animal.fear > 50 || animal.stress > 60;
    const isGrazing = !isAlert && (elapsed % 15.0 < 6.0); // Grazing in 6-second periods

    if (isGrazing) {
      // Lower head to grass/soil
      if (head) {
        head.rotation.x = 0.52 + Math.sin(elapsed * 5.0) * 0.08; // Nibbling chewing motion
      }
      mesh.position.y = terrainY - 0.02;
    } else if (isAlert) {
      // Alert high posture
      if (head) {
        head.rotation.x = -0.22;
        head.rotation.y = Math.sin(elapsed * 4.0) * 0.25; // Quick scan left/right
      }
      // Nervous tail shake
      if (tail) tail.rotation.y = Math.sin(elapsed * 18.0) * 0.35;
      mesh.position.y = terrainY + 0.01;
    } else {
      // Steady idle breathing
      mesh.position.y = terrainY + Math.sin(elapsed * 1.8) * 0.012;
      if (head) head.rotation.x = Math.sin(elapsed * 1.5) * 0.03;
      if (tail) tail.rotation.y = Math.sin(elapsed * 1.0) * 0.12;
      if (leftWing) leftWing.rotation.z = -0.15 + Math.sin(elapsed * 1.0) * 0.05;
      if (rightWing) rightWing.rotation.z = 0.15 - Math.sin(elapsed * 1.0) * 0.05;
    }
  }
}
