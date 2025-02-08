import React, { useEffect, useRef, forwardRef } from "react";

interface AutoGrowTextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minHeight?: number;
  maxHeight?: number;
}

const AutoGrowTextArea = forwardRef<HTMLTextAreaElement, AutoGrowTextAreaProps>(
  (
    {
      minHeight = 50,
      maxHeight = 100,
      value,
      onChange,
      className = "",
      ...props
    },
    ref
  ) => {
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    // Merge refs
    const mergedRef = (node: HTMLTextAreaElement) => {
      textAreaRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    const autoGrow = () => {
      const element = textAreaRef.current;
      if (!element) return;

      // Reset height to allow shrinking
      element.style.height = `${minHeight}px`;
      // Set the height to match content
      const newHeight = Math.min(
        Math.max(element.scrollHeight, minHeight),
        maxHeight
      );
      element.style.height = `${newHeight}px`;
    };

    // Adjust height when value changes
    useEffect(() => {
      autoGrow();
    }, [value]);

    return (
      <textarea
        ref={mergedRef}
        value={value}
        onChange={(e) => {
          onChange?.(e);
          autoGrow();
        }}
        className={`resize-none overflow-hidden ${className}`}
        style={{
          minHeight: `${minHeight}px`,
          maxHeight: `${maxHeight}px`,
          ...props.style,
        }}
        {...props}
      />
    );
  }
);

AutoGrowTextArea.displayName = "AutoGrowTextArea";

export default AutoGrowTextArea;
