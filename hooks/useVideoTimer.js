// hooks/useVideoTimer.js
import { useState, useEffect, useRef } from 'react';

export function useVideoTimer(isPlaying = false, startTime = 0) {
  const [currentTime, setCurrentTime] = useState(startTime);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isPlaying]);

  const jumpToTime = (time) => {
    setCurrentTime(time);
  };

  const reset = () => {
    setCurrentTime(startTime);
  };

  return {
    currentTime,
    jumpToTime,
    reset
  };
}