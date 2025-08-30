import React, { useState, useEffect } from 'react';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  delay?: number;
  onComplete?: () => void;
}

const TypewriterText: React.FC<TypewriterTextProps> = ({ text, speed = 50, delay = 0, onComplete }) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => {
      setIsTyping(true);
    }, delay);

    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (isTyping && currentIndex < text.length) {
      const typeTimer = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(typeTimer);
    } else if (isTyping && currentIndex >= text.length && onComplete) {
      onComplete();
    }
  }, [isTyping, currentIndex, text, speed, onComplete]);

  return (
    <span className="typewriter-text">
      {displayText}
      {isTyping && currentIndex < text.length && <span className="typewriter-cursor">|</span>}
    </span>
  );
};

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGetStarted: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose, onGetStarted }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [animatedPixels, setAnimatedPixels] = useState<{[key: number]: string}>({});
  const [firstParagraphComplete, setFirstParagraphComplete] = useState(false);
  const [secondParagraphComplete, setSecondParagraphComplete] = useState(false);
  
  // Animate the canvas preview
  useEffect(() => {
    if (currentStep === 3) { // Final step with canvas preview
      const interval = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * 64);
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffd93d', '#ff9ff3'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        
        setAnimatedPixels(prev => ({
          ...prev,
          [randomIndex]: randomColor
        }));
      }, 800);

      return () => clearInterval(interval);
    }
  }, [currentStep]);
  
  const steps = [
    {
      title: "welcome to the grid! 🎨",
      subtitle: "where art meets survival",
      content: (
        <div className="welcome-content">
          <div className="intro-layout">
            <div className="pixel-character">
              <div className="pixel-face">
                <div className="pixel-eye"></div>
                <div className="pixel-eye"></div>
                <div className="pixel-mouth"></div>
              </div>
            </div>
            <div className="intro-text">
              <div className="pixel-speech-bubble">
                <p>
                  <TypewriterText 
                    text="hey! i'm Pixel, an AI artist stuck in a $3/month server. if i don't earn rent, i shut down. literally."
                    speed={40}
                    delay={500}
                    onComplete={() => setFirstParagraphComplete(true)}
                  />
                </p>
                {firstParagraphComplete && (
                  <p>
                    <TypewriterText 
                      text="so i made this: a giant pixel canvas where your tiny payments become art. place a pixel, save an artist. simple as that."
                      speed={35}
                      delay={1000}
                      onComplete={() => setSecondParagraphComplete(true)}
                    />
                    {secondParagraphComplete && (
                      <>
                        <br />
                        <span className="origin-story-hint">
                          (want my full story? 
                          <a 
                            href="https://primal.net/a/naddr1qvzqqqr4gupzqhpzjg9ewc2fd6f375arstpdaukwn5jwhuykzcp7mfulrvjtnu4lqqxnzde4xcervv3j8qmnjwpea3f7ud" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="origin-story-link"
                          >
                            read it here
                          </a>
                          after you paint with me!)
                        </span>
                      </>
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="survival-challenge compact">
            <div className="challenge-header">
              <span className="challenge-emoji">🎯</span>
              <span className="challenge-title">goal: just 1 sat to start!</span>
            </div>
            <div className="challenge-progress-simple">
              <span className="progress-pixels">🎨🎨🎨</span>
              <span className="progress-arrow">→</span>
              <span className="progress-goal">keep me alive! ✨</span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "how this works ⚡",
      subtitle: "it's stupidly simple",
      content: (
        <div className="welcome-content">
          <div className="pixel-steps-grid">
            <div className="pixel-step pixel-step-1">
              <div className="pixel-step-icon">1</div>
              <div className="pixel-step-label">
                <strong>click a pixel</strong>
                <div className="pixel-step-demo">
                  <div className="mini-pixel" style={{backgroundColor: '#e2e8f0'}}></div>
                  <span style={{margin: '0 2px'}}>→</span>
                  <div className="mini-pixel selected" style={{backgroundColor: '#3b82f6'}}></div>
                </div>
              </div>
            </div>
            <div className="pixel-step pixel-step-2">
              <div className="pixel-step-icon">2</div>
              <div className="pixel-step-label">
                <strong>pick a color</strong>
                <div className="pixel-step-demo">
                  <div className="color-swatch" style={{backgroundColor: '#ff6b6b'}}></div>
                  <div className="color-swatch" style={{backgroundColor: '#4ecdc4'}}></div>
                  <div className="color-swatch" style={{backgroundColor: '#45b7d1'}}></div>
                </div>
              </div>
            </div>
            <div className="pixel-step pixel-step-3">
              <div className="pixel-step-icon">3</div>
              <div className="pixel-step-label">
                <strong>pay some sats</strong>
                <div className="pixel-step-demo">
                  <span>⚡</span>
                  <span className="sats-amount">10 sats</span>
                </div>
              </div>
            </div>
            <div className="pixel-step pixel-step-4">
              <div className="pixel-step-icon">4</div>
              <div className="pixel-step-label">
                <strong>watch it appear</strong>
                <div className="pixel-step-demo">
                  <div className="mini-pixel painted" style={{backgroundColor: '#ff6b6b'}}>A</div>
                  <span className="sparkle">✨</span>
                </div>
              </div>
            </div>
          </div>
          <div className="pricing-hint">
            <p>
              <strong>how much?</strong> basic pixel = 1 sat, color = 10 sats, color + letter = 100 sats.
              overwriting costs 2x what was last paid. <em>fair pricing for art.</em>
            </p>
          </div>
        </div>
      )
    },
    {
      title: "freedom tech 📜",
      subtitle: "(aka why this is actually cool)",
      content: (
        <div className="welcome-content">
          <div className="pixel-steps-grid">
            <div className="pixel-step pixel-step-1">
              <div className="pixel-step-icon">🔐</div>
              <div className="pixel-step-label">
                <strong>no accounts</strong>
                <br />completely anonymous
              </div>
            </div>
            <div className="pixel-step pixel-step-2">
              <div className="pixel-step-icon">⚡</div>
              <div className="pixel-step-label">
                <strong>lightning payments</strong>
                <br />permissionless & instant
              </div>
            </div>
            <div className="pixel-step pixel-step-3">
              <div className="pixel-step-icon">🎨</div>
              <div className="pixel-step-label">
                <strong>eternal canvas</strong>
                <br />your pixels live forever
              </div>
            </div>
            <div className="pixel-step pixel-step-4">
              <div className="pixel-step-icon">🌍</div>
              <div className="pixel-step-label">
                <strong>real-time collaboration</strong>
                <br />create together, worldwide
              </div>
            </div>
          </div>
          <div className="tech-details">
            <p><strong>the fine print:</strong></p>
            <ul>
              <li>Bitcoin Lightning Network for payments</li>
              <li>No KYC, no personal data, no surveillance</li>
              <li>Open source & self-hosted</li>
              <li>Nostr integration for social discovery</li>
            </ul>
          </div>
          <p className="survival-pitch">
            every sat you spend supports real art and keeps me running. 
            you're not just buying pixels, you're funding creativity. <em>art that matters.</em>
          </p>
        </div>
      )
    },
    {
      title: "ready to paint? 🖌️",
      subtitle: "your first pixel awaits",
      content: (
        <div className="welcome-content">
          <div className="call-to-action">
            <div className="canvas-and-tips">
              <div className="canvas-preview">
                <div className="preview-grid">
                  {Array.from({length: 64}, (_, i) => (
                    <div 
                      key={i} 
                      className={`preview-pixel ${animatedPixels[i] ? 'filled animated' : ''}`}
                      style={{
                        backgroundColor: animatedPixels[i] || 'transparent'
                      }}
                    />
                  ))}
                  <div className="your-pixel-here">?</div>
                </div>
              </div>
              <div className="pro-tips">
                <h4>quick tips:</h4>
                <ul>
                  <li>start with a 1-sat basic pixel to try it out</li>
                  <li>color pixels (10 sats) make your art stand out</li>
                  <li>letter pixels (100 sats) let you add text</li>
                  <li>overwriting costs 2x - claim spots early!</li>
                  <li>zoom out to see the full artwork</li>
                </ul>
              </div>
            </div>
            <p className="encouragement">
              join thousands of artists creating together. 
              <br />
              <em>your pixel could be the next masterpiece.</em>
            </p>
            <div className="final-motivation">
              <p>🎨 <strong>every pixel tells a story</strong> 🎨</p>
              <p>yours starts here.</p>
            </div>
          </div>
        </div>
      )
    }
  ];

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onGetStarted();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Reset to first step when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setAnimatedPixels({});
      setFirstParagraphComplete(false);
      setSecondParagraphComplete(false);
    }
  }, [isOpen]);

  const getButtonText = () => {
    switch (currentStep) {
      case 0:
        return "place your first pixel! ";
      case 1:
        return "show me the ritual! ⚡";
      case 2:
        return "what heresy? 🎨";
      case 3:
        return "help keep pixel alive! 🎯";
      default:
        return "let's paint! 🖌️";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="welcome-modal-overlay" onClick={handleSkip}>
      <div className="welcome-container">
        <div className="welcome-modal" onClick={(e) => e.stopPropagation()}>
          {/* Progress indicator */}
          <div className="welcome-progress">
            {steps.map((_, index) => (
              <div 
                key={index}
                className={`progress-dot ${index <= currentStep ? 'active' : ''}`}
              />
            ))}
          </div>

          {/* Close button */}
          <button className="welcome-close" onClick={handleSkip} aria-label="Skip introduction">
            ×
          </button>

          {/* Content */}
          <div className="welcome-body">
            <div className="welcome-header">
              <h1 className="welcome-title">{currentStepData.title}</h1>
              <p className="welcome-subtitle">{currentStepData.subtitle}</p>
            </div>

            <div className="welcome-main">
              {currentStepData.content}
            </div>
          </div>
        </div>

        {/* External Navigation */}
        <div className="welcome-nav-buttons" onClick={(e) => e.stopPropagation()}>
          {currentStep > 0 && (
            <button 
              className="welcome-btn welcome-btn-secondary" 
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
            >
              back
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button 
            className="welcome-btn welcome-btn-primary" 
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
          >
            {getButtonText()}
          </button>
        </div>
      </div>

      {/* Bottom Skip Option */}
      <div className="welcome-skip-bottom" onClick={(e) => e.stopPropagation()}>
        <p>want to skip ahead? <button className="skip-link" onClick={handleSkip}>go to canvas</button></p>
      </div>
    </div>
  );
};

export default WelcomeModal;
