import React, { useState, useEffect } from 'react';

interface ColorPickerProps {
  color: string;
  onColorChange: (color: string) => void;
  className?: string;
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#84cc16',
  '#10b981', '#14b8a6', '#0ea5e9', '#6366f1', '#a855f7',
  '#f59e0b', '#000000', '#ffffff'
];

const ColorPicker: React.FC<ColorPickerProps> = ({
  color,
  onColorChange,
  className = ''
}) => {
  const [inputValue, setInputValue] = useState(color);
  const [showPicker, setShowPicker] = useState(false);
  const [isValid, setIsValid] = useState(true);

  // Update input value when color prop changes
  useEffect(() => {
    setInputValue(color);
    setIsValid(true);
  }, [color]);

  const normalizeHexColor = (value: string): string => {
    // Remove any existing # and convert to lowercase
    let hex = value.replace(/^#/, '').toLowerCase();

    // Handle 3-digit hex colors
    if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
    }

    // Add # prefix if missing
    return hex.length === 6 ? `#${hex}` : hex;
  };

  const isValidHexColor = (value: string): boolean => {
    const hex = value.replace(/^#/, '');
    // Allow partial input for better UX
    return /^[0-9a-f]{0,6}$/i.test(hex);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    const hex = value.replace(/^#/, '');

    // Check if it's a valid partial or complete hex color
    if (isValidHexColor(value)) {
      setIsValid(true);

      // Only call onColorChange for complete colors (3 or 6 digits)
      if (hex.length === 3 || hex.length === 6) {
        const normalizedColor = normalizeHexColor(value);
        if (normalizedColor !== color) {
          onColorChange(normalizedColor);
        }
      }
    } else {
      setIsValid(false);
    }
  };

  const handleColorSelect = (selectedColor: string) => {
    onColorChange(selectedColor);
    setShowPicker(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const normalizedColor = normalizeHexColor(inputValue);
      if (normalizedColor.length === 7) {
        onColorChange(normalizedColor);
        setShowPicker(false);
      }
    }
  };

  return (
    <div className={`color-picker ${className}`}>
      <div className="color-input-group">
        <div className="color-preview-container">
          <button
            type="button"
            className="color-preview-button"
            style={{ backgroundColor: color }}
            onClick={() => setShowPicker(!showPicker)}
            aria-label="Open color picker"
            title="Click to choose color"
          />
        </div>
        <div className="color-input-container">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            className={`color-input ${!isValid ? 'invalid' : ''}`}
            placeholder="#RRGGBB"
            aria-label="Color (hex code)"
            aria-describedby="color-help"
            aria-invalid={!isValid}
            maxLength={7}
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>

      {showPicker && (
        <div className="color-picker-popover">
          <div className="color-picker-content">
            <div className="color-picker-header">
              <h4 className="color-picker-title">Choose a color</h4>
              <p className="color-picker-description">
                Pick from presets or enter a hex code
              </p>
            </div>

            <div className="color-picker-body">
              <div className="color-input-section">
                <label htmlFor="hex-input" className="color-input-label">
                  Hex Color
                </label>
                <div className="color-input-row">
                  <input
                    id="hex-input"
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleInputKeyDown}
                    placeholder="#000000"
                    className="color-hex-input"
                    maxLength={7}
                  />
                  <div
                    className="color-preview-small"
                    style={{
                      backgroundColor: isValidHexColor(inputValue)
                        ? normalizeHexColor(inputValue)
                        : '#ffffff'
                    }}
                  />
                </div>
              </div>

              <div className="color-presets-section">
                <label className="color-presets-label">Presets</label>
                <div className="color-presets-grid">
                  {PRESET_COLORS.map((presetColor) => (
                    <button
                      key={presetColor}
                      className="color-preset-button"
                      style={{ backgroundColor: presetColor }}
                      onClick={() => handleColorSelect(presetColor)}
                      title={presetColor}
                      aria-label={`Select color ${presetColor}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div id="color-help" className="color-help">
        Enter a hex color code (e.g., #FF0000 or #f00)
      </div>
    </div>
  );
};

export default ColorPicker;