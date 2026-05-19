import React, { useRef, useState } from 'react';

interface PinInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: () => void;
  isShaking?: boolean;
}

export const PinInput: React.FC<PinInputProps> = ({ value, onChange, onComplete, isShaking = false }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [animatingIndex, setAnimatingIndex] = useState<number | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/\D/g, '').slice(0, 4);

    // Если удаляем цифру, запускаем анимацию исчезновения
    if (numericValue.length < value.length) {
      setAnimatingIndex(value.length - 1);
      setTimeout(() => setAnimatingIndex(null), 200);
    }

    onChange(numericValue);

    if (numericValue.length === 4) {
      onComplete?.();
      inputRef.current?.blur();
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleClick = () => {
    // Если уже заполнено 4 цифры, очищаем при клике
    if (value.length === 4) {
      onChange('');
    }
    inputRef.current?.focus();
  };

  return (
    <div className="relative" onClick={handleClick}>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="absolute inset-0 opacity-0 cursor-pointer"
        maxLength={4}
      />
      <div
        className={`flex gap-0 justify-center`}
        style={isShaking ? {
          animation: 'shake 0.5s ease-in-out'
        } : {}}
      >
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={`w-16 h-16 flex items-center justify-center transition-all duration-300 ease-in-out
              ${index === 0 ? 'rounded-l-lg' : ''}
              ${index === 3 ? 'rounded-r-lg' : ''}
              ${isFocused ? 'border-gray-600 border bg-gray-200 z-10' : 'border-gray-300 border bg-white/60 hover:border-gray-500 hover:bg-gray-100'}
              ${value[index] ? 'bg-gray-100' : ''}
              ${index < 3 ? '-mr-px' : ''}
            `}
          >
            {value[index] && (
              <div
                className={`w-2 h-2 bg-gray-900 rounded-full transition-all duration-200 ease-out
                  ${animatingIndex === index ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}
                `}
                style={{
                  animation: animatingIndex === null && value.length - 1 === index ? 'scaleIn 0.3s ease-out' : undefined
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
