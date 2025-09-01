/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef, useCallback } from 'react';

interface ColorPickerPopoverProps {
    currentColor: string;
    onColorChange: (color: string) => void;
    onClose: () => void;
}

// --- Color Conversion Utilities ---
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
    } : null;
};

const rgbToHex = (r: number, g: number, b: number): string => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
};

const rgbToHsv = (r: number, g: number, b: number): { h: number; s: number; v: number } => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, v = max;
    const d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max !== min) {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: h * 360, s: s * 100, v: v * 100 };
};

const hsvToRgb = (h: number, s: number, v: number): { r: number; g: number; b: number } => {
    s /= 100; v /= 100;
    let r = 0, g = 0, b = 0;
    const i = Math.floor(h / 60);
    const f = h / 60 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: [r, g, b] = [v, t, p]; break;
        case 1: [r, g, b] = [q, v, p]; break;
        case 2: [r, g, b] = [p, v, t]; break;
        case 3: [r, g, b] = [p, q, v]; break;
        case 4: [r, g, b] = [t, p, v]; break;
        case 5: [r, g, b] = [v, p, q]; break;
    }
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255),
    };
};

// --- Main Component ---
const ColorPickerPopover: React.FC<ColorPickerPopoverProps> = ({ currentColor, onColorChange, onClose }) => {
    const initialRgb = hexToRgb(currentColor) || { r: 224, g: 224, b: 224 };
    const initialHsv = rgbToHsv(initialRgb.r, initialRgb.g, initialRgb.b);

    const [hsv, setHsv] = useState(initialHsv);
    const [rgb, setRgb] = useState(initialRgb);
    const [hex, setHex] = useState(currentColor);

    const colorFieldRef = useRef<HTMLDivElement>(null);
    const hueSliderRef = useRef<HTMLDivElement>(null);

    const updateColor = useCallback((newHsv: { h: number; s: number; v: number }) => {
        const clampedHsv = {
            h: Math.max(0, Math.min(359.99, newHsv.h)),
            s: Math.max(0, Math.min(100, newHsv.s)),
            v: Math.max(0, Math.min(100, newHsv.v)),
        };
        const newRgb = hsvToRgb(clampedHsv.h, clampedHsv.s, clampedHsv.v);
        const newHex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
        setHsv(clampedHsv);
        setRgb(newRgb);
        setHex(newHex);
    }, []);
    
    // This effect synchronizes the picker's internal state when the `currentColor` prop changes.
    // It's crucial that this only depends on `currentColor` to avoid fighting with user interactions
    // within the picker (like dragging), which modify the internal state but not the prop.
    useEffect(() => {
        const newRgb = hexToRgb(currentColor);
        if (newRgb) {
            const newHsv = rgbToHsv(newRgb.r, newRgb.g, newRgb.b);
            setHsv(newHsv);
            setRgb(newRgb);
            setHex(currentColor.toUpperCase());
        }
    }, [currentColor]);


    const handleMouseEvent = (
        e: MouseEvent,
        ref: React.RefObject<HTMLDivElement>,
        callback: (x: number, y: number) => void
    ) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
        callback(x, y);
    };

    const createMouseHandler = (
        ref: React.RefObject<HTMLDivElement>,
        callback: (x: number, y: number) => void
    ) => {
        return (startEvent: React.MouseEvent) => {
            startEvent.preventDefault();
            const onMouseMove = (moveEvent: MouseEvent) => handleMouseEvent(moveEvent, ref, callback);
            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            handleMouseEvent(startEvent.nativeEvent, ref, callback);
        };
    };

    const handleColorFieldChange = createMouseHandler(colorFieldRef, (x, y) => {
        updateColor({ ...hsv, s: x * 100, v: 100 - y * 100 });
    });

    const handleHueSliderChange = createMouseHandler(hueSliderRef, (_, y) => {
        updateColor({ ...hsv, h: y * 360 });
    });

    const handleRgbHexChange = (value: string, type: 'r' | 'g' | 'b' | 'hex') => {
        if (type === 'hex') {
            setHex(value.toUpperCase());
            const newRgb = hexToRgb(value);
            if (newRgb) {
                updateColor(rgbToHsv(newRgb.r, newRgb.g, newRgb.b));
            }
        } else {
            const numValue = parseInt(value, 10);
            if (!isNaN(numValue) && numValue >= 0 && numValue <= 255) {
                const newRgb = { ...rgb, [type]: numValue };
                updateColor(rgbToHsv(newRgb.r, newRgb.g, newRgb.b));
            }
        }
    };
    
    const handleSelect = () => {
        onColorChange(hex);
        onClose();
    };

    const colorFieldStyle = { backgroundColor: `hsl(${hsv.h}, 100%, 50%)` };
    const saturationPos = { left: `${hsv.s}%`, top: `${100 - hsv.v}%` };
    const huePos = { top: `${(hsv.h / 360) * 100}%` };

    return (
        <>
            <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true"></div>
            <div
                className="absolute top-full left-0 mt-2 w-[280px] bg-white rounded-lg shadow-2xl border border-zinc-200 p-4 z-50 animate-fade-in"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex space-x-3">
                    {/* Color Field */}
                    <div ref={colorFieldRef} onMouseDown={handleColorFieldChange} className="relative w-full h-40 cursor-crosshair rounded-md overflow-hidden" style={colorFieldStyle}>
                        <div className="absolute inset-0" style={{background: 'linear-gradient(to right, white, transparent)'}}></div>
                        <div className="absolute inset-0" style={{background: 'linear-gradient(to top, black, transparent)'}}></div>
                        <div className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md pointer-events-none ring-1 ring-black/30" style={saturationPos}></div>
                    </div>

                    {/* Hue Slider */}
                    <div ref={hueSliderRef} onMouseDown={handleHueSliderChange} className="relative w-4 h-40 cursor-pointer rounded-full overflow-hidden" style={{background: 'linear-gradient(to bottom, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)'}}>
                        <div className="absolute w-full h-1.5 -translate-y-1/2 bg-white/70 rounded-full pointer-events-none border border-black/20" style={huePos}></div>
                    </div>
                </div>

                <hr className="my-4 border-zinc-200" />

                <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-md border" style={{ backgroundColor: hex }}></div>
                    <div className="flex-1 space-y-2">
                        <div className="relative">
                            <input
                                type="text"
                                value={hex}
                                onChange={(e) => handleRgbHexChange(e.target.value, 'hex')}
                                className="w-full border rounded-md p-1.5 font-mono text-sm focus:ring-2 focus:ring-blue-500 transition pl-10"
                                maxLength={7}
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-400">HEX</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {([ 'r', 'g', 'b' ] as const).map(channel => (
                                <div key={channel} className="relative">
                                    <input
                                        type="number"
                                        value={rgb[channel]}
                                        onChange={(e) => handleRgbHexChange(e.target.value, channel)}
                                        className="w-full border rounded-md p-1.5 text-sm focus:ring-2 focus:ring-blue-500 transition pl-6"
                                        min="0" max="255"
                                    />
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-400 uppercase">{channel}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                
                <div className="flex justify-end space-x-2 mt-4 pt-4 border-t border-zinc-200">
                    <button onClick={onClose} className="px-4 py-1.5 rounded-md text-sm font-semibold hover:bg-zinc-100 transition-colors">Cancel</button>
                    <button onClick={handleSelect} className="px-4 py-1.5 rounded-md text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors">Select</button>
                </div>
            </div>
        </>
    );
};

export default ColorPickerPopover;