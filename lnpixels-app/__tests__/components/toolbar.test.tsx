import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { Toolbar } from '@/components/toolbar'

// Mock the pixel store
const mockUsePixelStore = vi.fn()
vi.mock('@/hooks/use-pixel-store', () => ({
  usePixelStore: () => mockUsePixelStore(),
}))

// Mock child components
vi.mock('@/components/color-picker', () => ({
  ColorPicker: ({ onChange, onClose }: any) => (
    <div data-testid="color-picker">
      <button onClick={() => onChange('#ff0000')} data-testid="color-change">Change Color</button>
      <button onClick={onClose} data-testid="color-close">Close</button>
    </div>
  ),
}))

vi.mock('@/components/theme-toggle', () => ({
  ThemeToggle: () => <button data-testid="theme-toggle">Theme Toggle</button>,
}))

describe('Toolbar', () => {
  const mockOnToggleActivity = vi.fn()
  const defaultStoreState = {
    selectedColor: '#000000',
    setSelectedColor: vi.fn(),
    brushSize: 1,
    setBrushSize: vi.fn(),
    zoom: 1,
    setZoom: vi.fn(),
    toolMode: 'paint' as const,
    setToolMode: vi.fn(),
    resetView: vi.fn(),
    openSaveModal: vi.fn(),
    clearCanvas: vi.fn(),
    pixels: [],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUsePixelStore.mockReturnValue(defaultStoreState)
  })

  it('should render toolbar with all controls', () => {
    render(<Toolbar onToggleActivity={mockOnToggleActivity} />)

    // Check for main toolbar elements
    expect(screen.getAllByTestId('theme-toggle')).toHaveLength(2) // Desktop and mobile versions

    // Check for tool mode buttons
    expect(screen.getAllByRole('button', { name: /paint tool/i })).toHaveLength(2) // Desktop and mobile versions
    expect(screen.getAllByRole('button', { name: /text tool/i })).toHaveLength(2) // Desktop and mobile versions

    // Check for zoom controls
    expect(screen.getAllByRole('button', { name: /zoom in/i })).toHaveLength(2) // Desktop and mobile versions
    expect(screen.getAllByRole('button', { name: /zoom out/i })).toHaveLength(2) // Desktop and mobile versions
    expect(screen.getAllByRole('button', { name: /reset view/i })).toHaveLength(2) // Desktop and mobile versions

    // Check for action buttons
    expect(screen.getAllByRole('button', { name: /toggle activity/i })).toHaveLength(2) // Desktop and mobile versions
    expect(screen.getAllByRole('button', { name: /save/i })).toHaveLength(2) // Desktop and mobile versions
    expect(screen.getAllByRole('button', { name: /clear/i })).toHaveLength(2) // Desktop and mobile versions
  })

  it('should call setToolMode when paint tool is clicked', () => {
    render(<Toolbar onToggleActivity={mockOnToggleActivity} />)

    const paintButtons = screen.getAllByRole('button', { name: /paint tool/i })
    const paintButton = paintButtons[0] // Desktop version
    fireEvent.click(paintButton)

    expect(defaultStoreState.setToolMode).toHaveBeenCalledWith('paint')
  })

  it('should call setToolMode when text tool is clicked', () => {
    render(<Toolbar onToggleActivity={mockOnToggleActivity} />)

    const textButtons = screen.getAllByRole('button', { name: /text tool/i })
    const textButton = textButtons[0] // Desktop version
    fireEvent.click(textButton)

    expect(defaultStoreState.setToolMode).toHaveBeenCalledWith('text')
  })

  it('should call setZoom with increased value when zoom in is clicked', () => {
    render(<Toolbar onToggleActivity={mockOnToggleActivity} />)

    const zoomInButtons = screen.getAllByRole('button', { name: /zoom in/i })
    const zoomInButton = zoomInButtons[0] // Desktop version
    fireEvent.click(zoomInButton)

    expect(defaultStoreState.setZoom).toHaveBeenCalledWith(1.5)
  })

  it('should call setZoom with decreased value when zoom out is clicked', () => {
    render(<Toolbar onToggleActivity={mockOnToggleActivity} />)

    const zoomOutButtons = screen.getAllByRole('button', { name: /zoom out/i })
    const zoomOutButton = zoomOutButtons[0] // Desktop version
    fireEvent.click(zoomOutButton)

    expect(defaultStoreState.setZoom).toHaveBeenCalledWith(1 / 1.5)
  })

  it('should call resetView when reset view button is clicked', () => {
    render(<Toolbar onToggleActivity={mockOnToggleActivity} />)

    const resetButtons = screen.getAllByRole('button', { name: /reset view/i })
    const resetButton = resetButtons[0] // Desktop version
    fireEvent.click(resetButton)

    expect(defaultStoreState.resetView).toHaveBeenCalled()
  })

  it('should call onToggleActivity when activity button is clicked', () => {
    render(<Toolbar onToggleActivity={mockOnToggleActivity} />)

    const activityButtons = screen.getAllByRole('button', { name: /activity/i })
    const activityButton = activityButtons[0] // Desktop version
    fireEvent.click(activityButton)

    expect(mockOnToggleActivity).toHaveBeenCalled()
  })

  it('should call openSaveModal when save button is clicked', () => {
    mockUsePixelStore.mockReturnValue({
      ...defaultStoreState,
      pixels: [{ x: 0, y: 0, color: '#000000' }], // Add a pixel so save button is enabled
    })

    render(<Toolbar onToggleActivity={mockOnToggleActivity} />)

    const saveButtons = screen.getAllByRole('button', { name: /save/i })
    const saveButton = saveButtons[0] // Desktop version
    fireEvent.click(saveButton)

    expect(defaultStoreState.openSaveModal).toHaveBeenCalled()
  })

  it('should call clearCanvas when clear button is clicked', () => {
    mockUsePixelStore.mockReturnValue({
      ...defaultStoreState,
      pixels: [{ x: 0, y: 0, color: '#000000' }], // Add a pixel so clear button is enabled
    })

    render(<Toolbar onToggleActivity={mockOnToggleActivity} />)

    const clearButtons = screen.getAllByRole('button', { name: /clear/i })
    const clearButton = clearButtons[0] // Desktop version
    fireEvent.click(clearButton)

    expect(defaultStoreState.clearCanvas).toHaveBeenCalled()
  })

  it('should show color picker when color button is clicked', () => {
    render(<Toolbar onToggleActivity={mockOnToggleActivity} />)

    const colorButtons = screen.getAllByRole('button', { name: /current color/i })
    const colorButton = colorButtons[0] // Desktop version
    fireEvent.click(colorButton)

    const colorPickers = screen.getAllByTestId('color-picker')
    expect(colorPickers[0]).toBeInTheDocument() // Desktop version
  })

  it('should hide color picker when close is clicked', () => {
    render(<Toolbar onToggleActivity={mockOnToggleActivity} />)

    // Open color picker
    const colorButtons = screen.getAllByRole('button', { name: /current color/i })
    const colorButton = colorButtons[0] // Desktop version
    fireEvent.click(colorButton)

    const colorPickers = screen.getAllByTestId('color-picker')
    expect(colorPickers[0]).toBeInTheDocument() // Desktop version

    // Close color picker
    const closeButtons = screen.getAllByTestId('color-close')
    const closeButton = closeButtons[0] // Desktop version
    fireEvent.click(closeButton)

    expect(screen.queryByTestId('color-picker')).not.toBeInTheDocument()
  })

  it('should call setSelectedColor when color is changed', () => {
    render(<Toolbar onToggleActivity={mockOnToggleActivity} />)

    // Open color picker
    const colorButtons = screen.getAllByRole('button', { name: /current color/i })
    const colorButton = colorButtons[0] // Desktop version
    fireEvent.click(colorButton)

    // Change color
    const colorChangeButtons = screen.getAllByTestId('color-change')
    const colorChangeButton = colorChangeButtons[0] // Desktop version
    fireEvent.click(colorChangeButton)

    expect(defaultStoreState.setSelectedColor).toHaveBeenCalledWith('#ff0000')
  })

  it('should handle brush size controls', () => {
    mockUsePixelStore.mockReturnValue({
      ...defaultStoreState,
      brushSize: 2, // Use 2 so both increase and decrease are enabled
      toolMode: 'paint', // Ensure paint mode is active
    })

    render(<Toolbar onToggleActivity={mockOnToggleActivity} />)

    const decreaseButtons = screen.getAllByRole('button', { name: /decrease brush size/i })
    const increaseButtons = screen.getAllByRole('button', { name: /increase brush size/i })
    const decreaseButton = decreaseButtons[0] // Desktop version
    const increaseButton = increaseButtons[0] // Desktop version

    fireEvent.click(decreaseButton)
    expect(defaultStoreState.setBrushSize).toHaveBeenCalledWith(1) // 2 - 1 = 1

    fireEvent.click(increaseButton)
    expect(defaultStoreState.setBrushSize).toHaveBeenCalledWith(3) // 2 + 1 = 3
  })

  it('should clamp brush size between 0 and 10', () => {
    mockUsePixelStore.mockReturnValue({
      ...defaultStoreState,
      brushSize: 10,
    })

    render(<Toolbar onToggleActivity={mockOnToggleActivity} />)

    const increaseButtons = screen.getAllByRole('button', { name: /increase brush size/i })
    const increaseButton = increaseButtons[0] // Desktop version

    expect(increaseButton).toBeDisabled() // Should be disabled when brushSize >= 10
  })

  it('should disable decrease button when brush size is 1', () => {
    mockUsePixelStore.mockReturnValue({
      ...defaultStoreState,
      brushSize: 1,
    })

    render(<Toolbar onToggleActivity={mockOnToggleActivity} />)

    const decreaseButtons = screen.getAllByRole('button', { name: /decrease brush size/i })
    const decreaseButton = decreaseButtons[0] // Desktop version

    expect(decreaseButton).toBeDisabled() // Should be disabled when brushSize <= 1
  })

  it('should display current brush size', () => {
    mockUsePixelStore.mockReturnValue({
      ...defaultStoreState,
      brushSize: 5,
    })

    render(<Toolbar onToggleActivity={mockOnToggleActivity} />)

    expect(screen.getAllByText('5')).toHaveLength(2) // Desktop and mobile versions
  })

  it('should display current zoom level', () => {
    mockUsePixelStore.mockReturnValue({
      ...defaultStoreState,
      zoom: 2.5,
    })

    render(<Toolbar onToggleActivity={mockOnToggleActivity} />)

    expect(screen.getAllByText('250%')).toHaveLength(2) // Desktop and mobile versions
  })
})
