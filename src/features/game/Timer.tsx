import React from "react";

interface Props {
  time: number;
}

const Timer: React.FC<Props> = ({ time }) => {
  return (
    <div className={`text-sm ${time <= 5 ? "pulse" : ""}`}>{time}s</div>
  );
};

export default Timer;
