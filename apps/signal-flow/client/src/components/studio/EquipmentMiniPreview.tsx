import React, { useEffect, useRef } from 'react';
import { renderEquipmentGraphics } from '@/lib/canvas-equipment-graphics';
import type { EquipmentDef } from '@/lib/equipment-library';

interface Props {
  def: EquipmentDef;
  className?: string;
}

const EquipmentMiniPreview: React.FC<Props> = ({ def, className }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = 76;
    const h = 44;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const nodeH = def.heightUnits > 0 ? def.heightUnits * 44 : 88;
    const scale = Math.min(w / def.width, h / nodeH) * 0.9;
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(scale, scale);
    ctx.translate(-def.width / 2, -nodeH / 2);
    renderEquipmentGraphics({
      ctx,
      x: 0,
      y: 0,
      w: def.width,
      h: nodeH,
      zoom: 1,
      node: {
        id: 'preview',
        defId: def.id,
        x: 0,
        y: 0,
        rotation: 0,
        state: {},
      },
    });
    ctx.restore();
  }, [def]);

  return (
    <canvas
      ref={ref}
      className={className}
      aria-hidden
    />
  );
};

export default EquipmentMiniPreview;
