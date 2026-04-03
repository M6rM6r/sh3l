import React, { useRef, useEffect } from 'react';
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  SphereGeometry,
  MeshPhongMaterial,
  MeshBasicMaterial,
  LineBasicMaterial,
  Mesh,
  Line,
  BufferGeometry,
  Vector3,
  Color,
  AmbientLight,
  DirectionalLight
} from 'three';

interface BrainVisualizationProps {
  cognitiveData: { [key: string]: number };
  size?: number;
}

export const BrainVisualization: React.FC<BrainVisualizationProps> = ({
  cognitiveData,
  size = 300
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new Scene();
    const camera = new PerspectiveCamera(75, size / size, 0.1, 1000);
    const renderer = new WebGLRenderer({ antialias: true, alpha: true });

    renderer.setSize(size, size);
    mountRef.current.appendChild(renderer.domElement);

    // Brain geometry (simplified)
    const brainGeometry = new SphereGeometry(1, 32, 32);
    const brainMaterial = new MeshPhongMaterial({
      color: 0x4fc3f7,
      transparent: true,
      opacity: 0.8,
      shininess: 100
    });
    const brain = new Mesh(brainGeometry, brainMaterial);
    scene.add(brain);

    // Neural connections
    const connections: Line[] = [];
    const areas = Object.keys(cognitiveData);

    areas.forEach((area, i) => {
      const angle = (i / areas.length) * Math.PI * 2;
      const x = Math.cos(angle) * 1.2;
      const z = Math.sin(angle) * 1.2;

      // Connection point
      const pointGeometry = new SphereGeometry(0.05, 8, 8);
      const intensity = cognitiveData[area] / 100;
      const pointMaterial = new MeshBasicMaterial({
        color: new Color().setHSL(intensity * 0.3, 1, 0.5)
      });
      const point = new Mesh(pointGeometry, pointMaterial);
      point.position.set(x, 0, z);
      scene.add(point);

      // Connection line to center
      const lineGeometry = new BufferGeometry().setFromPoints([
        new Vector3(0, 0, 0),
        new Vector3(x, 0, z)
      ]);
      const lineMaterial = new LineBasicMaterial({
        color: 0xffffff,
        opacity: intensity,
        transparent: true
      });
      const line = new Line(lineGeometry, lineMaterial);
      scene.add(line);
      connections.push(line);
    });

    // Lighting
    const ambientLight = new AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    camera.position.z = 3;

    // Animation
    const animate = () => {
      requestAnimationFrame(animate);
      brain.rotation.y += 0.005;
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [cognitiveData, size]);

  return <div ref={mountRef} className="brain-visualization" style={{ width: size, height: size }} />;
};