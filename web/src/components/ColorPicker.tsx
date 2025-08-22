import React, { useState, useEffect } from 'react';

interface ColorPickerProps {
  color: string;
  onColorChange: (color: string) => void;
  className?: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({
  color,
  onColorChange,
  className = ''
}) => {
  const [inputValue, setInputValue] = useState(color);
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

  const handlePreviewClick = () => {
    // Focus the input when preview is clicked
    const input = document.getElementById('color-input');
    input?.focus();
  };

  return (
    <div className={`color-picker ${className}`}>
      <div className="color-input-group">
        <div className="color-preview-container">
          <button
            type="button"
            className="color-preview"
            style={{ backgroundColor: isValid ? color : '#cccccc' }}
            onClick={handlePreviewClick}
            aria-label="Color preview - click to edit"
            title="Click to edit color"
          />
        </div>
        <div className="color-input-container">
          <input
            id="color-input"
            type="text"
            value={inputValue}
            onChange={handleInputChange}
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
      <div id="color-help" className="color-help">
        Enter a hex color code (e.g., #FF0000 or #f00)
      </div>
    </div>
  );
};

export default ColorPicker;