/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { detectObjects, changeColor, getDesignThemes, DetectedObject, DesignTheme } from '../services/geminiService';
import Header from '../components/Header';
import ImageUploader from '../components/ImageUploader';
import Spinner from '../components/Spinner';

enum AppState {
  Initial,
  Detecting,
  Editing,
  Generating,
}

type EditorTab = 'manual' | 'themes';
type ColorAccordion = 'ai' | 'standard';

// --- UI Components ---
const UndoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>;
const RedoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>;
const ZoomInIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>;
const ZoomOutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>;
const ResetViewIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 4l16 16" /></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;

const standardPalettes = [
    { name: 'Vibrant Accents', colors: ['#D32F2F', '#FFC107', '#0288D1', '#388E3C', '#7B1FA2', '#F57C00'] },
    { name: 'Architectural Neutrals', colors: ['#212121', '#616161', '#BDBDBD', '#F5F5F5', '#FFFFFF', '#E8E8E8'] },
    { name: 'Earthy Tones', colors: ['#A1887F', '#795548', '#8D6E63', '#5D4037', '#607D8B', '#455A64'] },
    { name: 'Soft Pastels', colors: ['#F3E5F5', '#E1F5FE', '#E8F5E9', '#FFFDE7', '#FCE4EC', '#F1F8E9'] },
];

const Index: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.Initial);
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [displayImageUrl, setDisplayImageUrl] = useState<string | null>(null);
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const [designThemes, setDesignThemes] = useState<DesignTheme[]>([]);
  const [themesLoading, setThemesLoading] = useState(false);
  const [selectedObject, setSelectedObject] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('#E8E8E8');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [recentColors, setRecentColors] = useState<string[]>([]);

  // State for history, zoom, and pan
  const [history, setHistory] = useState<File[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ startX: 0, startY: 0, startPanX: 0, startPanY: 0 });
  
  // State for highlights and editor
  const [hoveredObject, setHoveredObject] = useState<DetectedObject | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>('manual');
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [openColorAccordion, setOpenColorAccordion] = useState<ColorAccordion | null>('ai');

  const cleanupUrls = useCallback(() => {
    if (originalImageUrl) {
      URL.revokeObjectURL(originalImageUrl);
    }
  }, [originalImageUrl]);

  useEffect(() => {
    let objectUrl: string | null = null;
    if (history.length > 0 && historyIndex >= 0 && history[historyIndex]) {
        const currentFile = history[historyIndex];
        objectUrl = URL.createObjectURL(currentFile);
        setDisplayImageUrl(objectUrl);
    } else {
        setDisplayImageUrl(null);
    }

    return () => {
        if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
        }
    };
  }, [history, historyIndex]);

  const addColorToHistory = useCallback((color: string) => {
      if (!/^#[0-9A-F]{6}$/i.test(color)) return;
      setRecentColors(prev => {
          const newHistory = [color.toUpperCase(), ...prev.filter(c => c.toUpperCase() !== color.toUpperCase())];
          return newHistory.slice(0, 8);
      });
  }, []);

  const handleImageUpload = useCallback(async (file: File) => {
    cleanupUrls();
    setError(null);
    setAppState(AppState.Detecting);
    setOriginalImage(file);
    setOriginalImageUrl(URL.createObjectURL(file));
    setHistory([file]);
    setHistoryIndex(0);
    setDetectedObjects([]);
    setDesignThemes([]);
    setRecentColors([]);

    try {
      const objects = await detectObjects(file);
      setDetectedObjects(objects);
      setAppState(AppState.Editing);
      setThemesLoading(true);

      const primaryObject = objects.find(o => o.is_primary) || (objects.length > 0 ? objects[0] : null);
      if (primaryObject) {
        setSelectedObject(primaryObject.name);
      }
      
      const themes = await getDesignThemes(file, objects);
      setDesignThemes(themes);
      setOpenAccordion(themes.length > 0 ? themes[0].name : null);

      if (primaryObject && themes.length > 0 && themes[0].suggestions.length > 0) {
        const suggestionForPrimary = themes[0].suggestions.find(s => s.objectName.toLowerCase() === primaryObject.name.toLowerCase());
        if(suggestionForPrimary) {
            setSelectedColor(suggestionForPrimary.hex.toUpperCase());
        }
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to analyze the image. Please try again. ${errorMessage}`);
      setAppState(AppState.Initial);
      console.error(err);
    } finally {
        setThemesLoading(false);
    }
  }, [cleanupUrls]);

  const handleColorPickerChange = useCallback((hex: string) => {
    const upperHex = hex.toUpperCase();
    setSelectedColor(upperHex);
    setCustomPrompt('');
    addColorToHistory(upperHex);
  }, [addColorToHistory]);
  
  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase();
    if (!value.startsWith('#')) {
        value = '#' + value.replace(/[^0-9A-F]/ig, '');
    } else {
        value = '#' + value.substring(1).replace(/[^0-9A-F]/ig, '');
    }
    
    if (value.length > 7) return;
    setSelectedColor(value);
    if (/^#[0-9A-F]{6}$/i.test(value)) {
        handleColorPickerChange(value);
    }
  };
  
  const generateImage = useCallback(async (prompt: string) => {
    const currentImageFile = history[historyIndex];
    if (!currentImageFile) return;

    setError(null);
    setAppState(AppState.Generating);

    try {
        const generatedDataUrl = await changeColor(currentImageFile, null, null, prompt);
        
        const response = await fetch(generatedDataUrl);
        const blob = await response.blob();
        const newFile = new File([blob], `generated-${Date.now()}.png`, { type: blob.type });

        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newFile);
        
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        handleResetView();

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to generate the new image. ${errorMessage}`);
        console.error(err);
    } finally {
        setAppState(AppState.Editing);
    }
  }, [history, historyIndex]);

  const handleManualGenerate = () => {
      let prompt = '';
      if (customPrompt) {
          prompt = customPrompt;
      } else if (selectedObject && selectedColor) {
          prompt = `Change the ${selectedObject} to the color ${selectedColor}.`;
      } else {
          setError("Please select an object and a color, or provide a custom prompt.");
          return;
      }
      generateImage(prompt);
  };

  const handleThemeApply = (theme: DesignTheme) => {
      const changes = theme.suggestions
          .map(s => `change the ${s.objectName} to ${s.colorName} (${s.hex})`)
          .join(', ');
      const prompt = `Apply a cohesive "${theme.name}" design theme to the room. Specifically: ${changes}.`;
      generateImage(prompt);
  };

  const handleReset = useCallback(() => {
    cleanupUrls();
    setAppState(AppState.Initial);
    setOriginalImage(null);
    setOriginalImageUrl(null);
    setHistory([]);
    setHistoryIndex(-1);
    setDetectedObjects([]);
    setDesignThemes([]);
    setSelectedObject(null);
    setSelectedColor('#E8E8E8');
    setCustomPrompt('');
    setError(null);
    handleResetView();
  }, [cleanupUrls]);

  const handleUndo = () => { if (historyIndex > 0) setHistoryIndex(historyIndex - 1); };
  const handleRedo = () => { if (historyIndex < history.length - 1) setHistoryIndex(historyIndex + 1); };
  
  const handleDownload = () => {
      if (!displayImageUrl) return;
      const link = document.createElement('a');
      link.href = displayImageUrl;
      link.download = `room-painter-ai-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };
  
  const handleZoom = (scale: number) => { setZoom(prev => Math.max(0.5, Math.min(prev * scale, 5))); };
  const handleResetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };
  const handleObjectClick = (objectName: string) => { setSelectedObject(objectName === selectedObject ? null : objectName); setCustomPrompt(''); };

  const findObjectAtCoords = useCallback((clientX: number, clientY: number): DetectedObject | null => {
    if (!imageContainerRef.current) return null;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const clickFromCenter = { x: relX - centerX, y: relY - centerY };
    const unscaledFromCenter = { x: clickFromCenter.x / zoom, y: clickFromCenter.y / zoom };
    const unpannedFromCenter = { x: unscaledFromCenter.x - pan.x, y: unscaledFromCenter.y - pan.y };
    const imageX = unpannedFromCenter.x + centerX;
    const imageY = unpannedFromCenter.y + centerY;
    const normX = imageX / rect.width;
    const normY = imageY / rect.height;

    let bestMatch: DetectedObject | null = null;
    let smallestArea = Infinity;
    for (const obj of detectedObjects) {
        const bbox = obj.bounding_box;
        if (normX >= bbox.x_min && normX <= bbox.x_max && normY >= bbox.y_min && normY <= bbox.y_max) {
            const area = (bbox.x_max - bbox.x_min) * (bbox.y_max - bbox.y_min);
            if (area < smallestArea) {
                smallestArea = area;
                bestMatch = obj;
            }
        }
    }
    return bestMatch;
}, [detectedObjects, zoom, pan]);

  const onMouseDown = (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = { startX: e.clientX, startY: e.clientY, startPanX: pan.x, startPanY: pan.y };
  };

  const handleContainerMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
        e.preventDefault();
        const dx = e.clientX - panStartRef.current.startX;
        const dy = e.clientY - panStartRef.current.startY;
        setPan({ x: panStartRef.current.startPanX + dx / zoom, y: panStartRef.current.startPanY + dy / zoom });
    } else {
        setHoveredObject(findObjectAtCoords(e.clientX, e.clientY));
    }
  };
  
  const handleContainerMouseLeave = () => { if (isPanning) setIsPanning(false); setHoveredObject(null); };
  
  const handleImageClick = (e: React.MouseEvent) => {
    if (isPanning) return;
    const dx = e.clientX - panStartRef.current.startX;
    const dy = e.clientY - panStartRef.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) return;

    const obj = findObjectAtCoords(e.clientX, e.clientY);
    if (obj) handleObjectClick(obj.name);
  };

  const onWheel = (e: React.WheelEvent) => { e.preventDefault(); handleZoom(e.deltaY > 0 ? 0.9 : 1.1); };

  useEffect(() => {
    const handleMouseUp = () => setIsPanning(false);
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const getUniqueColors = (suggestions: { hex: string; colorName: string }[]) => {
      const unique = new Map<string, { hex: string; colorName: string }>();
      suggestions.forEach(s => {
          if (s.hex && !unique.has(s.hex.toUpperCase())) {
              unique.set(s.hex.toUpperCase(), s);
          }
      });
      return Array.from(unique.values());
  };

  const renderEditorPanel = () => {
    const isGenerating = appState === AppState.Generating;
    
    return (
      <div className="w-full bg-zinc-50 p-6 rounded-lg shadow-sm border border-zinc-200">
        <div className="flex border-b border-zinc-200 mb-4">
            <button onClick={() => setActiveTab('manual')} className={`px-4 py-2 text-sm font-bold ${activeTab === 'manual' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-zinc-500'}`}>Manual Painter</button>
            <button onClick={() => setActiveTab('themes')} className={`px-4 py-2 text-sm font-bold ${activeTab === 'themes' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-zinc-500'}`}>Design Themes</button>
        </div>
        
        {activeTab === 'manual' && (
            <div className="animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="flex flex-col gap-8">
                        <div>
                            <h3 className="text-lg font-bold text-zinc-800 mb-2">1. Select an Object</h3>
                            <p className="text-xs text-zinc-500 mb-3 -mt-1">Click on the image or the buttons below.</p>
                            <div className="flex flex-wrap gap-2">
                                {detectedObjects.map(obj => (
                                    <button key={obj.name} onClick={() => handleObjectClick(obj.name)} onMouseEnter={() => setHoveredObject(obj)} onMouseLeave={() => setHoveredObject(null)}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${selectedObject === obj.name ? 'bg-blue-600 text-white shadow' : 'bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-300'}`}>
                                    {obj.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-zinc-800 mb-4">2. Choose a Color</h3>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-md font-semibold text-zinc-700 mb-3">Custom Color</h4>
                                    <div className="relative flex items-center gap-3 p-1 border border-zinc-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-500">
                                        <input ref={colorInputRef} type="color" value={selectedColor} onChange={(e) => handleColorPickerChange(e.target.value)} className="absolute opacity-0 w-8 h-8 cursor-pointer" />
                                        <button onClick={() => colorInputRef.current?.click()} className="w-8 h-8 rounded-md border border-zinc-200 shrink-0" style={{ backgroundColor: /^#[0-9A-F]{6}$/i.test(selectedColor) ? selectedColor : '#FFFFFF' }} aria-label="Open color picker"></button>
                                        <input type="text" value={selectedColor} onChange={handleHexInputChange} className="w-full border-none text-md font-mono focus:ring-0" placeholder="#FFFFFF" />
                                    </div>
                                </div>
                                {recentColors.length > 0 && (
                                    <div>
                                        <h4 className="text-md font-semibold text-zinc-700 mb-3">Recent Colors</h4>
                                        <div className="flex flex-wrap gap-3">
                                            {recentColors.map(color => (
                                                <button key={color} onClick={() => handleColorPickerChange(color)} className={`w-9 h-9 rounded-md border-2 transition-transform hover:scale-110 ${selectedColor === color ? 'border-blue-500 ring-2 ring-blue-500 ring-offset-2' : 'border-zinc-200'}`} style={{ backgroundColor: color }} title={color} aria-label={`Select color ${color}`} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <div className="border border-zinc-200 rounded-lg">
                                        <button onClick={() => setOpenColorAccordion(openColorAccordion === 'standard' ? null : 'standard')} className="w-full flex justify-between items-center p-3 text-left font-semibold text-sm text-zinc-700 hover:bg-zinc-100">
                                            <span>Standard Palettes</span>
                                            <svg className={`w-5 h-5 transition-transform ${openColorAccordion === 'standard' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                        </button>
                                        {openColorAccordion === 'standard' && (
                                            <div className="p-4 border-t border-zinc-200 bg-white space-y-4">
                                                {standardPalettes.map(palette => (
                                                    <div key={palette.name}>
                                                        <p className="text-sm font-medium text-zinc-800 mb-2">{palette.name}</p>
                                                        <div className="flex flex-wrap gap-3">
                                                            {palette.colors.map(color => (
                                                                <button key={color} onClick={() => handleColorPickerChange(color)} className={`w-9 h-9 rounded-md border-2 transition-transform hover:scale-110 ${selectedColor === color ? 'border-blue-500 ring-2 ring-blue-500 ring-offset-2' : 'border-zinc-200'}`} style={{ backgroundColor: color }} title={color} aria-label={`Select color ${color}`} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="border border-zinc-200 rounded-lg">
                                        <button onClick={() => setOpenColorAccordion(openColorAccordion === 'ai' ? null : 'ai')} className="w-full flex justify-between items-center p-3 text-left font-semibold text-sm text-zinc-700 hover:bg-zinc-100">
                                            <span>AI Palette Suggestions</span>
                                            <svg className={`w-5 h-5 transition-transform ${openColorAccordion === 'ai' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                        </button>
                                        {openColorAccordion === 'ai' && (
                                            <div className="p-4 border-t border-zinc-200 bg-white">
                                                {themesLoading ? <div className="h-24 flex items-center justify-center"><Spinner/></div> : (
                                                    <div className="space-y-4">
                                                        {designThemes.map(theme => (
                                                            <div key={theme.name}>
                                                                <p className="text-sm font-medium text-zinc-800 mb-2">{theme.name}</p>
                                                                <div className="flex flex-wrap gap-3">
                                                                    {getUniqueColors(theme.suggestions).map(color => (
                                                                        <button key={color.hex} onClick={() => handleColorPickerChange(color.hex)} className={`w-9 h-9 rounded-md border-2 transition-transform hover:scale-110 ${selectedColor === color.hex ? 'border-blue-500 ring-2 ring-blue-500 ring-offset-2' : 'border-zinc-200'}`} style={{ backgroundColor: color.hex }} title={`${color.colorName} (${color.hex})`} aria-label={`Select color ${color.colorName}`} />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-zinc-800 mb-2">Or Use a Custom Prompt</h3>
                        <textarea value={customPrompt}
                        onChange={(e) => { setCustomPrompt(e.target.value); setSelectedObject(null);}}
                        placeholder="e.g. 'Make the floor a light oak wood'"
                        className="w-full p-2 border border-zinc-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" rows={5}/>
                    </div>
                </div>
                <div className="mt-8 pt-6 border-t border-zinc-200 flex justify-center">
                    <button onClick={handleManualGenerate} disabled={isGenerating || (!customPrompt && !selectedObject)}
                        className={`w-full max-w-sm text-white font-bold py-3 px-4 rounded-lg text-lg transition-colors shadow-md ${
                            isGenerating ? 'bg-zinc-400 cursor-not-allowed' : (customPrompt || selectedObject) ? 'bg-blue-600 hover:bg-blue-700' : 'bg-zinc-400 cursor-not-allowed'}`}>
                        {isGenerating ? 'Applying...' : 'Apply Color Change'}
                    </button>
                </div>
            </div>
        )}

        {activeTab === 'themes' && (
             <div className="animate-fade-in">
                 <h3 className="text-lg font-bold text-zinc-800 mb-2">AI-Powered Design Themes</h3>
                 <p className="text-sm text-zinc-600 mb-4">Select a theme to see a detailed palette, then apply it to your entire room with one click.</p>
                 {themesLoading ? <div className="h-40 flex items-center justify-center"><Spinner/></div> :
                    <div className="space-y-2">
                        {designThemes.map(theme => (
                            <div key={theme.name} className="border border-zinc-200 rounded-lg">
                                <button onClick={() => setOpenAccordion(openAccordion === theme.name ? null : theme.name)} className="w-full flex justify-between items-center p-4 text-left font-semibold text-zinc-700 hover:bg-zinc-100">
                                    <span>{theme.name}</span>
                                    <svg className={`w-5 h-5 transition-transform ${openAccordion === theme.name ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                </button>
                                {openAccordion === theme.name && (
                                    <div className="p-4 border-t border-zinc-200 bg-white">
                                        <p className="text-sm text-zinc-600 mb-4">{theme.description}</p>
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                                            {theme.suggestions.map(s => (
                                                <div key={s.objectName} className="flex items-center gap-2">
                                                    <div className="w-4 h-4 rounded-full border border-zinc-300" style={{backgroundColor: s.hex}}></div>
                                                    <div>
                                                        <p className="text-xs font-bold text-zinc-800">{s.objectName}</p>
                                                        <p className="text-xs text-zinc-500">{s.colorName}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <button onClick={() => handleThemeApply(theme)} disabled={isGenerating}
                                            className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-zinc-400">
                                            {isGenerating ? 'Generating...' : `Apply "${theme.name}" Theme`}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                 }
             </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    if (appState === AppState.Initial) {
      return (
        <div className="w-full max-w-2xl mx-auto animate-fade-in text-center">
            {error && <p className="text-red-600 bg-red-100 p-3 rounded-md mb-4">{error}</p>}
            <ImageUploader id="scene-uploader" onFileSelect={handleImageUpload} imageUrl={null} />
        </div>
      );
    }
    
    if (appState === AppState.Detecting) {
        return (
            <div className="text-center animate-fade-in">
                <Spinner />
                <p className="text-xl mt-4 text-zinc-600">Analyzing your space...</p>
            </div>
        );
    }
    
    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;
    const actionButtonClasses = "p-2 bg-white rounded-md shadow-sm border border-zinc-200 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

    const renderHighlights = () => (
      <>
        {selectedObject && (() => {
          const obj = detectedObjects.find(o => o.name === selectedObject);
          if (!obj) return null;
          const { bounding_box: bbox } = obj;
          return <div style={{ position: 'absolute', top: `${bbox.y_min * 100}%`, left: `${bbox.x_min * 100}%`, width: `${(bbox.x_max - bbox.x_min) * 100}%`, height: `${(bbox.y_max - bbox.y_min) * 100}%`, border: '3px solid #2563EB', borderRadius: '4px', pointerEvents: 'none', boxShadow: '0 0 15px rgba(37, 99, 235, 0.5)' }} key={`${obj.name}-selected`} />;
        })()}
        
        {hoveredObject && hoveredObject.name !== selectedObject && (() => {
          const { bounding_box: bbox } = hoveredObject;
          return <div style={{ position: 'absolute', top: `${bbox.y_min * 100}%`, left: `${bbox.x_min * 100}%`, width: `${(bbox.x_max - bbox.x_min) * 100}%`, height: `${(bbox.y_max - bbox.y_min) * 100}%`, backgroundColor: 'rgba(59, 130, 246, 0.25)', borderRadius: '4px', pointerEvents: 'none', transition: 'opacity 0.1s ease-in-out', border: '2px solid rgba(59, 130, 246, 0.7)' }} key={`${hoveredObject.name}-hover`} />;
        })()}
      </>
    );
    
    return (
      <div className="w-full max-w-7xl mx-auto animate-fade-in flex flex-col gap-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
              <h2 className="text-2xl font-bold text-zinc-800 text-center mb-2">Before</h2>
              <div className="relative aspect-video bg-zinc-100 rounded-lg shadow-sm border border-zinc-200 overflow-hidden">
                  {originalImageUrl && <img src={originalImageUrl} alt="Original scene" className="w-full h-full object-contain" />}
              </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-zinc-800 text-center">After</h2>
                <div className="flex items-center gap-2">
                    <button onClick={handleUndo} disabled={!canUndo || appState === AppState.Generating} className={actionButtonClasses} aria-label="Undo"><UndoIcon /></button>
                    <button onClick={handleRedo} disabled={!canRedo || appState === AppState.Generating} className={actionButtonClasses} aria-label="Redo"><RedoIcon /></button>
                    <button onClick={() => handleZoom(1.2)} disabled={appState === AppState.Generating} className={actionButtonClasses} aria-label="Zoom In"><ZoomInIcon/></button>
                    <button onClick={() => handleZoom(0.8)} disabled={appState === AppState.Generating} className={actionButtonClasses} aria-label="Zoom Out"><ZoomOutIcon/></button>
                    <button onClick={handleResetView} disabled={appState === AppState.Generating} className={actionButtonClasses} aria-label="Reset View"><ResetViewIcon/></button>
                    <button onClick={handleDownload} disabled={!displayImageUrl || appState === AppState.Generating} className={actionButtonClasses} aria-label="Download Image"><DownloadIcon /></button>
                </div>
            </div>
            <div ref={imageContainerRef}
              className={`relative aspect-video bg-zinc-100 rounded-lg shadow-sm border border-zinc-200 overflow-hidden ${isPanning ? 'cursor-grabbing' : appState === AppState.Editing ? 'cursor-pointer' : 'cursor-grab'}`}
              onMouseDown={onMouseDown} onMouseMove={handleContainerMouseMove} onMouseLeave={handleContainerMouseLeave} onClick={handleImageClick} onWheel={onWheel}>
                <div className="w-full h-full" style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`, transformOrigin: 'center center', transition: isPanning ? 'none' : 'transform 0.1s' }}>
                  {displayImageUrl && <img src={displayImageUrl} alt="Current scene" className="w-full h-full object-contain" />}
                </div>
                {renderHighlights()}
                {appState === AppState.Generating && (
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center">
                        <Spinner />
                        <p className="text-xl mt-4 text-zinc-600">Generating new image...</p>
                    </div>
                )}
            </div>
          </div>
        </div>
        {renderEditorPanel()}
        {error && <p className="text-red-600 bg-red-100 p-3 rounded-md mt-4 text-center">{error}</p>}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center p-4 md:p-8">
      <div className="flex flex-col items-center gap-8 w-full">
        <Header />
         {appState !== AppState.Initial && (
            <div className="w-full max-w-7xl text-center mb-4">
                <button onClick={handleReset} className="text-primary hover:text-primary-hover font-semibold underline">
                    Start Over
                </button>
            </div>
         )}
        <main className="w-full flex-grow flex items-start justify-center">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Index;
