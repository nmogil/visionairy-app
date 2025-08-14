import React from "react";
import { Slider as BaseSlider } from "@/components/ui/slider";

export type SliderProps = React.ComponentProps<typeof BaseSlider> & {
  onChange?: (value: number[]) => void;
};

export const Slider: React.FC<SliderProps> = ({ onChange, onValueChange, ...rest }) => {
  return (
    <BaseSlider
      {...rest}
      onValueChange={(v) => {
        onValueChange?.(v as any);
        onChange?.(v);
      }}
    />
  );
};
