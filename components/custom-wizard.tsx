"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface WizardStep {
  target: string;
  content: React.ReactNode;
  placement?: "top" | "bottom" | "left" | "right" | "center";
  disableBeacon?: boolean;
}

interface CustomWizardProps {
  steps: WizardStep[];
  run: boolean;
  continuous?: boolean;
  showProgress?: boolean;
  showSkipButton?: boolean;
  stepIndex?: number; // External control of step index
  onCallback?: (data: { status: "finished" | "skipped"; index: number }) => void;
  onClose?: () => void;
}

export function CustomWizard({
  steps,
  run,
  continuous = true,
  showProgress = true,
  showSkipButton = true,
  stepIndex: externalStepIndex,
  onCallback,
  onClose,
}: CustomWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Use external step index if provided, otherwise use internal state
  const activeStepIndex = externalStepIndex !== undefined ? externalStepIndex : currentStep;

  useEffect(() => {
    if (run && steps.length > 0) {
      setIsVisible(true);
      if (externalStepIndex === undefined) {
        setCurrentStep(0);
      } else {
        setCurrentStep(externalStepIndex);
      }
    } else {
      setIsVisible(false);
    }
  }, [run, steps.length, externalStepIndex]);

  // Sync external step index changes
  useEffect(() => {
    if (externalStepIndex !== undefined && externalStepIndex !== currentStep) {
      setCurrentStep(externalStepIndex);
    }
  }, [externalStepIndex, currentStep]);

  useEffect(() => {
    if (!isVisible || activeStepIndex >= steps.length) return;

    const step = steps[activeStepIndex];
    let retryCount = 0;
    const maxRetries = 20; // Try for up to 2 seconds (20 * 100ms)

    const findElement = () => {
      const element = document.querySelector(step.target) as HTMLElement;

      if (element) {
        setTargetElement(element);
        updateTooltipPosition(element, step.placement || "bottom");
        // Scroll element into view if needed
        element.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      } else if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(findElement, 100);
      }
    };

    findElement();
  }, [isVisible, currentStep, steps]);

  const updateTooltipPosition = (element: HTMLElement, placement: string) => {
    const rect = element.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;
    const tooltipWidth = 350;
    const tooltipHeight = 200;
    const spacing = 20;

    let top = 0;
    let left = 0;

    switch (placement) {
      case "top":
        top = rect.top + scrollY - tooltipHeight - spacing;
        left = rect.left + scrollX + rect.width / 2 - tooltipWidth / 2;
        break;
      case "bottom":
        top = rect.bottom + scrollY + spacing;
        left = rect.left + scrollX + rect.width / 2 - tooltipWidth / 2;
        break;
      case "left":
        top = rect.top + scrollY + rect.height / 2 - tooltipHeight / 2;
        left = rect.left + scrollX - tooltipWidth - spacing;
        break;
      case "right":
        top = rect.top + scrollY + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + scrollX + spacing;
        break;
      case "center":
        top = window.innerHeight / 2 + scrollY - tooltipHeight / 2;
        left = window.innerWidth / 2 + scrollX - tooltipWidth / 2;
        break;
      default:
        top = rect.bottom + scrollY + spacing;
        left = rect.left + scrollX + rect.width / 2 - tooltipWidth / 2;
    }

    // Keep tooltip within viewport
    left = Math.max(10, Math.min(left, window.innerWidth - tooltipWidth - 10));
    top = Math.max(10, Math.min(top, window.innerHeight + scrollY - tooltipHeight - 10));

    setTooltipPosition({ top, left });
  };

  useEffect(() => {
    if (!isVisible || !targetElement) return;

    const handleResize = () => {
      updateTooltipPosition(targetElement, steps[activeStepIndex].placement || "bottom");
    };

    const handleScroll = () => {
      updateTooltipPosition(targetElement, steps[activeStepIndex].placement || "bottom");
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isVisible, targetElement, activeStepIndex, steps]);

  const handleFinish = useCallback(() => {
    if (onCallback) {
      onCallback({ status: "finished", index: activeStepIndex });
    }
    setIsVisible(false);
    if (onClose) onClose();
  }, [activeStepIndex, onCallback, onClose]);

  const handleNext = useCallback(() => {
    if (activeStepIndex < steps.length - 1) {
      // Call callback BEFORE moving to next step, with the current step index
      if (onCallback) {
        onCallback({ status: "finished" as const, index: activeStepIndex });
      }
      // Only update internal state if not externally controlled
      if (externalStepIndex === undefined) {
        const nextStep = activeStepIndex + 1;
        setCurrentStep(nextStep);
      }
    } else {
      handleFinish();
    }
  }, [activeStepIndex, steps.length, onCallback, handleFinish, externalStepIndex]);

  const handleBack = useCallback(() => {
    if (activeStepIndex > 0) {
      // Only update internal state if not externally controlled
      if (externalStepIndex === undefined) {
        setCurrentStep(activeStepIndex - 1);
      }
    }
  }, [activeStepIndex, externalStepIndex]);

  const handleSkip = useCallback(() => {
    if (onCallback) {
      onCallback({ status: "skipped", index: activeStepIndex });
    }
    setIsVisible(false);
    if (onClose) onClose();
  }, [activeStepIndex, onCallback, onClose]);

  if (!isVisible || activeStepIndex >= steps.length || !targetElement) {
    return null;
  }

  const step = steps[activeStepIndex];
  const isFirst = activeStepIndex === 0;
  const isLast = activeStepIndex === steps.length - 1;

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[9998]"
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.5)",
        }}
        onClick={(e) => {
          // Don't close on overlay click, only allow skip/close button
          e.stopPropagation();
        }}
      >
        {/* Spotlight effect */}
        <div
          className="absolute"
          style={{
            top: targetElement.getBoundingClientRect().top - 4,
            left: targetElement.getBoundingClientRect().left - 4,
            width: targetElement.getBoundingClientRect().width + 8,
            height: targetElement.getBoundingClientRect().height + 8,
            borderRadius: "8px",
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5), 0 0 0 4px #9333ea",
            pointerEvents: "none",
            zIndex: 9999,
          }}
        />
      </div>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-[10000] bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-6 max-w-sm"
        style={{
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
        }}
      >
        {/* Close button */}
        <div className="flex justify-end mb-3 -mt-1 -mr-1">
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-4">{step.content}</div>

        {/* Progress */}
        {showProgress && steps.length > 1 && (
          <div className="mb-4 text-xs text-gray-500 dark:text-gray-400 text-center font-medium">
            {currentStep + 1} of {steps.length}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            {!isFirst && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBack}
                className="text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
          </div>

          <div className="flex gap-2 ml-auto">
            {showSkipButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Skip
              </Button>
            )}
            <Button
              size="sm"
              onClick={isLast ? handleFinish : handleNext}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-sm"
            >
              {isLast ? "Got it" : "Next"}
              {!isLast && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

